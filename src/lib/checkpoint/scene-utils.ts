/**
 * Scene boundary detection and context stitching for scene-level rewrites.
 *
 * Scene breaks are detected by conventional prose markers: ***, ---, * * *
 * (surrounded by blank lines). If no markers are found, returns null to
 * signal "chapter-level rewrite only" (graceful fallback).
 */

export interface DetectedScene {
  index: number         // 0-based scene index
  label: string         // First sentence truncated to 80 chars, for display
  startOffset: number   // char offset in original text
  endOffset: number     // char offset (exclusive) in original text
  text: string          // full text of this scene
}

// Regex matches scene break markers: ***, ---, * * * (with surrounding blank lines)
const SCENE_BREAK_PATTERN = /\n\n(?:\*\s?\*\s?\*|---|\* \* \*)\n\n/g

/**
 * Splits chapter text into scenes based on conventional break markers.
 * Returns null if no scene breaks are found (caller should fall back to chapter-level).
 * Returns an array of DetectedScene objects if breaks are found (at least 2 scenes).
 */
export function detectScenes(chapterText: string): DetectedScene[] | null {
  const breaks: { start: number; end: number }[] = []
  let match: RegExpExecArray | null

  // Reset lastIndex before exec loop (regex is module-level with /g flag)
  SCENE_BREAK_PATTERN.lastIndex = 0

  while ((match = SCENE_BREAK_PATTERN.exec(chapterText)) !== null) {
    breaks.push({ start: match.index, end: match.index + match[0].length })
  }

  if (breaks.length === 0) return null

  const scenes: DetectedScene[] = []
  let cursor = 0

  for (let i = 0; i <= breaks.length; i++) {
    const start = cursor
    const end = i < breaks.length ? breaks[i].start : chapterText.length
    const text = chapterText.slice(start, end).trim()

    if (text.length > 0) {
      // Label: first sentence, truncated to 80 chars
      const firstSentence = text.split(/[.!?]\s/)[0] ?? text
      const label =
        firstSentence.length > 80
          ? firstSentence.slice(0, 77) + '...'
          : firstSentence + (firstSentence.endsWith('.') ? '' : '...')

      scenes.push({ index: scenes.length, label, startOffset: start, endOffset: end, text })
    }

    if (i < breaks.length) {
      cursor = breaks[i].end
    }
  }

  // Need at least 2 scenes for scene-level rewrite to be meaningful
  return scenes.length > 1 ? scenes : null
}

/**
 * Stitches a rewritten scene back into the full chapter text.
 * Replaces the scene at the given index with newSceneText, preserving all other scenes
 * and the original scene break markers between them.
 */
export function stitchScenes(
  originalText: string,
  scene: DetectedScene,
  newSceneText: string
): string {
  const before = originalText.slice(0, scene.startOffset)
  const after = originalText.slice(scene.endOffset)
  return before + newSceneText + after
}
