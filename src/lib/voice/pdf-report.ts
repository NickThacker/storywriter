import PDFDocument from 'pdfkit'
import type { AuthorPersonaRow } from '@/types/database'
import type { VoiceAnalysisResult } from './schema'

// ── Design tokens — warm dark + gold (matches Meridian website) ──────────────
const C = {
  bg:              '#0e0d0b',
  bgCard:          '#1a1916',
  bgCardAlt:       '#15140f',
  gold:            '#b8935a',
  goldLight:       '#d4b683',
  goldMuted:       '#8a7044',
  goldSubtle:      'rgba(184,147,90,0.15)',
  cream:           '#f5f1ea',
  creamMuted:      '#c4bfb4',
  warmGray:        '#7a7368',
  warmGrayLight:   '#9e958a',
  border:          '#2a2722',
  borderGold:      'rgba(184,147,90,0.25)',
  text:            '#e8e4dc',
  textMuted:       '#9e958a',
  white:           '#f5f1ea',
  // Callout backgrounds
  calloutWarm:     '#1f1d18',
  calloutGreen:    '#141a14',
  calloutAmber:    '#1a1810',
  // Stat box
  statBg:          '#1a1916',
  statBorder:      'rgba(184,147,90,0.3)',
  statNum:         '#d4b683',
  // Temperature row colors
  tempCool:        '#12161a',
  tempWarm:        '#1a1610',
  tempRising:      '#1a1212',
  tempMelancholic: '#16141a',
  tempCharged:     '#1a1214',
  // Section header
  sectionBg:       '#1a1916',
  tableAlt:        '#15140f',
} as const

const MARGIN      = 50
const PAGE_W      = 612
const PAGE_H      = 792
const CONTENT_W   = PAGE_W - MARGIN * 2
const SAFE_BOTTOM = PAGE_H - 55

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any

// ── Pagination guard ──────────────────────────────────────────────────────────
function maybeNewPage(doc: Doc, required = 60) {
  if ((doc.y as number) + required > SAFE_BOTTOM) {
    doc.addPage()
    // Paint dark background on every new page
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bg)
    doc.rect(0, 0, 4, PAGE_H).fill(C.gold)
    doc.y = MARGIN
  }
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

/** Section header: gold accent + dark band */
function sectionHeader(doc: Doc, num: string, title: string) {
  maybeNewPage(doc, 50)
  const y = doc.y as number
  doc.rect(MARGIN, y, CONTENT_W, 28).fill(C.sectionBg)
  doc.rect(MARGIN, y, 3, 28).fill(C.gold)
  doc.rect(MARGIN + 3, y, 29, 28).fill(C.bgCard)
  doc
    .font('Helvetica-Bold').fontSize(11).fillColor(C.gold)
    .text(num, MARGIN + 3, y + 8, { width: 29, align: 'center', lineBreak: false })
  doc
    .font('Helvetica-Bold').fontSize(10).fillColor(C.cream)
    .text(title.toUpperCase(), MARGIN + 42, y + 9, { width: CONTENT_W - 52, lineBreak: false })
  doc.y = y + 34
  doc.fillColor(C.text)
}

/** Meridian usage note — explains how the engine uses this data */
function usageNote(doc: Doc, text: string) {
  if (!text) return
  const textX = MARGIN + 11
  const textW = CONTENT_W - 19
  doc.font('Helvetica').fontSize(9)
  const contentH = doc.heightOfString(text, { width: textW, lineGap: 2 }) as number
  const totalH = 8 + contentH + 8
  maybeNewPage(doc, totalH + 4)
  const startY = doc.y as number
  doc.rect(MARGIN, startY, CONTENT_W, totalH).fill(C.calloutWarm)
  doc.rect(MARGIN, startY, 3, totalH).fill(C.goldMuted)
  doc.font('Helvetica').fontSize(9).fillColor(C.warmGrayLight)
    .text(text, textX, startY + 8, { width: textW, lineGap: 2 })
  doc.y = startY + totalH + 8
  doc.fillColor(C.text)
}

/** Body paragraph — measures height first to avoid orphans */
function para(
  doc: Doc,
  text: string,
  opts: { muted?: boolean; fontSize?: number; bold?: boolean; indent?: number } = {}
) {
  if (!text) return
  const font  = opts.bold ? 'Helvetica-Bold' : 'Helvetica'
  const fsize = opts.fontSize ?? 10
  const x     = MARGIN + (opts.indent ?? 0)
  const w     = CONTENT_W - (opts.indent ?? 0)
  doc.font(font).fontSize(fsize)
  const h = doc.heightOfString(text, { width: w, lineGap: 3 }) as number
  maybeNewPage(doc, h + 12)
  doc
    .fillColor(opts.muted ? C.warmGray : C.text)
    .text(text, x, doc.y, { width: w, lineGap: 3 })
  doc.moveDown(0.4)
  doc.fillColor(C.text)
}

/** Small uppercase label */
function miniLabel(doc: Doc, text: string, color = C.warmGrayLight) {
  maybeNewPage(doc, 20)
  doc
    .font('Helvetica-Bold').fontSize(7.5).fillColor(color)
    .text(text.toUpperCase(), MARGIN, doc.y, { width: CONTENT_W, characterSpacing: 0.5 })
  doc.y += 3
}

/** Bullet list — each item measured individually to prevent orphans */
function bulletList(doc: Doc, items: string[], indent = 0, fontSize = 10) {
  for (const item of items) {
    const w = CONTENT_W - indent
    doc.font('Helvetica').fontSize(fontSize)
    const h = doc.heightOfString(`•  ${item}`, { width: w, lineGap: 2, indent: 10 }) as number
    maybeNewPage(doc, h + 6)
    doc
      .fillColor(C.text)
      .text(`•  ${item}`, MARGIN + indent, doc.y, { width: w, lineGap: 2, indent: 10, paragraphGap: 1 })
    doc.y += 2
  }
}

/**
 * Callout box with left accent bar.
 */
function callout(
  doc: Doc,
  label: string,
  content: string,
  bgColor: string,
  labelColor: string,
  borderColor?: string,
) {
  if (!content) return
  const textX = MARGIN + (borderColor ? 11 : 8)
  const textW = CONTENT_W - (borderColor ? 19 : 16)
  doc.font('Helvetica').fontSize(10)
  const contentH = doc.heightOfString(content, { width: textW, lineGap: 2.5 }) as number
  const totalH   = 21 + contentH + 12

  maybeNewPage(doc, totalH + 8)
  const startY = doc.y as number

  doc.rect(MARGIN, startY, CONTENT_W, totalH).fill(bgColor)
  if (borderColor) {
    doc.rect(MARGIN, startY, 3, totalH).fill(borderColor)
  }
  doc
    .font('Helvetica-Bold').fontSize(7.5).fillColor(labelColor)
    .text(label.toUpperCase(), textX, startY + 8, {
      width: textW, lineBreak: false, characterSpacing: 0.5,
    })
  doc
    .font('Helvetica').fontSize(10).fillColor(C.text)
    .text(content, textX, startY + 21, { width: textW, lineGap: 2.5 })
  doc.y = startY + totalH + 10
  doc.fillColor(C.text)
}

/**
 * Two-column label/value table with dynamic row heights.
 */
function metricTable(doc: Doc, rows: [string, string | number][], labelW = 210) {
  if (rows.length === 0) return
  const valueW = CONTENT_W - labelW
  const VPAD   = 7

  doc.font('Helvetica').fontSize(9)
  const rowHeights = rows.map(([, val]) => {
    const h = doc.heightOfString(String(val ?? '—'), { width: valueW - 12, lineGap: 2 }) as number
    return Math.max(22, Math.ceil(h) + VPAD * 2)
  })
  const totalH = rowHeights.reduce((a, b) => a + b, 0)
  maybeNewPage(doc, totalH + 4)
  const startY = doc.y as number

  let rowY = startY
  for (const [i, [lbl, val]] of rows.entries()) {
    const rowH = rowHeights[i]
    if (i % 2 === 0) doc.rect(MARGIN, rowY, CONTENT_W, rowH).fill(C.tableAlt)

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.warmGray)
      .text(String(lbl), MARGIN + 6, rowY + VPAD, { width: labelW - 12, lineBreak: false })
    doc.moveTo(MARGIN + labelW, rowY).lineTo(MARGIN + labelW, rowY + rowH)
      .lineWidth(0.5).strokeColor(C.border).stroke()
    doc.font('Helvetica').fontSize(9).fillColor(C.text)
      .text(String(val ?? '—'), MARGIN + labelW + 6, rowY + VPAD, { width: valueW - 12, lineGap: 2 })
    if (i < rows.length - 1) {
      doc.moveTo(MARGIN, rowY + rowH).lineTo(MARGIN + CONTENT_W, rowY + rowH)
        .lineWidth(0.5).strokeColor(C.border).stroke()
    }
    rowY += rowH
  }

  doc.rect(MARGIN, startY, CONTENT_W, totalH).lineWidth(0.5).stroke(C.border)
  doc.y = startY + totalH + 12
  doc.fillColor(C.text).strokeColor(C.text).lineWidth(1)
}

/** Horizontal bar chart with gold bars */
function barChart(
  doc: Doc,
  items: { label: string; value: number; max: number }[],
  labelW = 80,
  barW   = CONTENT_W - 130,
) {
  if (items.length === 0) return
  const rowH = 26
  const barH = 14
  maybeNewPage(doc, items.length * rowH + 8)
  const startY = doc.y as number

  for (const [i, item] of items.entries()) {
    const rowY  = startY + i * rowH
    const ratio = Math.min(Math.max(item.value / item.max, 0), 1)
    const filled = Math.round(barW * ratio)

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.warmGray)
      .text(item.label, MARGIN, rowY + 6, { width: labelW - 4, lineBreak: false })
    doc.rect(MARGIN + labelW, rowY + 6, barW, barH).fill(C.bgCard)
    if (filled > 0) doc.rect(MARGIN + labelW, rowY + 6, filled, barH).fill(C.gold)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.goldLight)
      .text(`${item.value}/${item.max}`, MARGIN + labelW + barW + 8, rowY + 6, { lineBreak: false })
  }

  doc.y = startY + items.length * rowH + 8
  doc.fillColor(C.text)
}

/**
 * Full-width data table with dynamic row heights.
 */
function dataTable(
  doc: Doc,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  rowBgFn?: (row: string[]) => string | null,
) {
  if (rows.length === 0) return
  const headerH = 26
  const VPAD    = 7
  const tableW  = colWidths.reduce((a, b) => a + b, 0)

  doc.font('Helvetica').fontSize(8.5)
  const rowHeights = rows.map(row =>
    row.reduce((maxH, cell, ci) => {
      const h = doc.heightOfString(cell ?? '—', { width: colWidths[ci] - 12, lineGap: 1.5 }) as number
      return Math.max(maxH, Math.ceil(h) + VPAD * 2)
    }, 22)
  )
  const totalH = headerH + rowHeights.reduce((a, b) => a + b, 0)
  maybeNewPage(doc, totalH + 8)
  const startY = doc.y as number

  // Header row
  doc.rect(MARGIN, startY, tableW, headerH).fill(C.sectionBg)
  doc.rect(MARGIN, startY, tableW, 2).fill(C.gold)
  let hx = MARGIN
  for (const [i, h] of headers.entries()) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.cream)
      .text(h, hx + 6, startY + 9, { width: colWidths[i] - 12, lineBreak: false })
    hx += colWidths[i]
  }

  // Data rows
  let rowY = startY + headerH
  for (const [ri, row] of rows.entries()) {
    const rowH    = rowHeights[ri]
    const customBg = rowBgFn ? rowBgFn(row) : null
    if (customBg) {
      doc.rect(MARGIN, rowY, tableW, rowH).fill(customBg)
    } else if (ri % 2 === 0) {
      doc.rect(MARGIN, rowY, tableW, rowH).fill(C.tableAlt)
    }
    doc.moveTo(MARGIN, rowY).lineTo(MARGIN + tableW, rowY)
      .lineWidth(0.5).strokeColor(C.border).stroke()

    let cx = MARGIN
    for (const [ci, cell] of row.entries()) {
      if (ci > 0) {
        doc.moveTo(cx, rowY).lineTo(cx, rowY + rowH)
          .lineWidth(0.5).strokeColor(C.border).stroke()
      }
      doc.font('Helvetica').fontSize(8.5).fillColor(C.text)
        .text(cell ?? '—', cx + 6, rowY + VPAD, { width: colWidths[ci] - 12, lineGap: 1.5 })
      cx += colWidths[ci]
    }
    rowY += rowH
  }

  doc.rect(MARGIN, startY, tableW, totalH).lineWidth(0.5).stroke(C.border)
  doc.y = startY + totalH + 12
  doc.fillColor(C.text).strokeColor(C.text).lineWidth(1)
}

/**
 * Side-by-side DO NOT / PRESERVE columns.
 */
function twocolBullets(
  doc: Doc,
  leftTitle: string,
  leftItems: string[],
  rightTitle: string,
  rightItems: string[],
) {
  const colW = (CONTENT_W - 14) / 2
  const rx   = MARGIN + colW + 14

  doc.font('Helvetica').fontSize(9)
  const measureItems = (items: string[]) =>
    items.reduce((sum, item) => {
      const h = doc.heightOfString(`•  ${item}`, { width: colW - 8, lineGap: 1.5, indent: 8 }) as number
      return sum + Math.ceil(h) + 4
    }, 0)

  const leftH  = measureItems(leftItems)
  const rightH = measureItems(rightItems)
  const totalH = 28 + Math.max(leftH, rightH) + 10
  maybeNewPage(doc, totalH)
  const startY = doc.y as number

  // Left header — red/avoid
  doc.rect(MARGIN, startY, colW, 24).fill('#1a1212')
  doc.rect(MARGIN, startY, 3, 24).fill('#c44')
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#e88')
    .text(leftTitle, MARGIN + 10, startY + 8, { width: colW - 16, lineBreak: false })

  // Right header — green/preserve
  doc.rect(rx, startY, colW, 24).fill('#141a14')
  doc.rect(rx, startY, 3, 24).fill('#4a4')
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#8c8')
    .text(rightTitle, rx + 10, startY + 8, { width: colW - 16, lineBreak: false })

  doc.fillColor(C.text)

  let ly = startY + 30
  for (const item of leftItems) {
    doc.font('Helvetica').fontSize(9).fillColor(C.text)
      .text(`•  ${item}`, MARGIN + 4, ly, { width: colW - 8, lineGap: 1.5, indent: 8 })
    ly = (doc.y as number) + 3
  }

  let ry = startY + 30
  for (const item of rightItems) {
    doc.font('Helvetica').fontSize(9).fillColor(C.text)
      .text(`•  ${item}`, rx + 4, ry, { width: colW - 8, lineGap: 1.5, indent: 8 })
    ry = (doc.y as number) + 3
  }

  doc.y = Math.max(ly, ry) + 10
  doc.fillColor(C.text)
}

/** Stat box card with gold accent */
function statBox(doc: Doc, x: number, y: number, w: number, h: number, value: string, label: string) {
  doc.rect(x, y, w, h).fill(C.statBg)
  doc.rect(x, y, w, h).lineWidth(0.5).stroke(C.statBorder)
  doc.rect(x, y, w, 3).fill(C.gold)
  doc.font('Helvetica-Bold').fontSize(28).fillColor(C.statNum)
    .text(value, x, y + 18, { width: w, align: 'center', lineBreak: false })
  doc.font('Helvetica').fontSize(8).fillColor(C.warmGray)
    .text(label.toUpperCase(), x, y + h - 20, {
      width: w, align: 'center', lineBreak: false, characterSpacing: 0.3,
    })
  doc.fillColor(C.text)
}

/** Row background color keyed on emotional temperature */
function tempBg(row: string[]): string | null {
  const temp = (row[4] ?? '').toLowerCase()
  if (temp.includes('cool'))        return C.tempCool
  if (temp.includes('warm'))        return C.tempWarm
  if (temp.includes('rising'))      return C.tempRising
  if (temp.includes('melancholic')) return C.tempMelancholic
  if (temp.includes('charged'))     return C.tempCharged
  return null
}

// ── Meridian usage descriptions per section ──────────────────────────────────
const USAGE = {
  voiceIdentity: 'Meridian uses your voice identity as the foundation for every chapter. Your POV type, narrative distance, and literary sensibility are injected into the generation prompt so the AI writes from the correct vantage point — never drifting into a generic third-person omniscient when your voice calls for close-limited.',
  sentenceArchitecture: 'Your sentence metrics set hard constraints on the prose engine. Average sentence length, dialogue-to-prose ratio, and punctuation habits are enforced during generation so the output mirrors your natural rhythm — not the model\'s default.',
  pacing: 'Meridian adapts pacing per scene type. Your default pace and tension architecture tell the engine when to compress time (summaries, transitions) and when to expand it (emotional beats, action). This prevents the common AI failure of writing every scene at the same speed.',
  characterization: 'Your characterization method determines how Meridian reveals character in prose. If you show character through action and subtext rather than interior monologue, the engine follows suit — avoiding the verbose internal narration that plagues generic AI writing.',
  dialogue: 'Dialogue frequency, function, and attribution patterns are applied as guardrails. If your style uses sparse "said" tags and lets subtext carry the weight, Meridian won\'t generate dialogue heavy with adverbs and attribution.',
  sensory: 'Your sensory palette weights determine which senses Meridian emphasizes in descriptive passages. A high visual / low gustatory score means the engine will paint scenes through sight and light rather than defaulting to generic five-sense dumps.',
  sceneRules: 'These rules let Meridian shift register within your voice. An action scene gets shorter sentences and higher emotional temperature; a reflective scene gets longer, more interior prose. The core voice stays constant — only these parameters flex.',
  guardrails: 'These are hard rules the engine checks against every generation. "Do not" patterns are flagged and rewritten if they appear. "Preserve" patterns are actively maintained. This is how Meridian prevents voice drift over a 50-chapter novel.',
  themes: 'Meridian tracks your thematic concerns across the full manuscript. When generating new chapters, the engine references these themes to weave consistent motifs and avoid the thematic amnesia that occurs when AI writes chapter-by-chapter without memory.',
  tendencies: 'These patterns are monitored across generations. If a tendency appears more than expected, Meridian adjusts the next chapter\'s prompt to counterbalance — preventing the repetition that makes AI-generated novels feel mechanical.',
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildVoiceReportPdf(persona: AuthorPersonaRow): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: MARGIN,
      size: 'letter',
      bufferPages: true,
      info: { Title: 'Voice DNA Profile — Meridian', Author: 'Meridian' },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const a       = (persona.style_descriptors as unknown as VoiceAnalysisResult | null) ?? null
    const hasRich = !!(a?.voice_identity)
    const genre   = a?.voice_identity?.genre_classification ?? 'Fiction'
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })

    // ── COVER PAGE ─────────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bg)

    // Subtle warm diagonal bands
    doc.moveTo(0, PAGE_H * 0.55).lineTo(PAGE_W, PAGE_H * 0.35)
      .lineWidth(140).strokeColor(C.bgCard, 1).stroke()
    doc.moveTo(0, PAGE_H * 0.45).lineTo(PAGE_W, PAGE_H * 0.28)
      .lineWidth(2).strokeColor(C.gold, 0.2).stroke()

    // Left gold accent bar
    doc.rect(0, 0, 4, PAGE_H).fill(C.gold)

    // Branding
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.goldLight)
      .text('MERIDIAN', MARGIN + 8, 34, { width: CONTENT_W, characterSpacing: 2.5, lineBreak: false })
    doc.font('Helvetica-Bold').fontSize(38).fillColor(C.cream)
      .text('VOICE DNA', MARGIN + 8, 60, { width: CONTENT_W, lineBreak: false })
    doc.font('Helvetica-Bold').fontSize(38).fillColor(C.cream)
      .text('PROFILE', MARGIN + 8, 102, { width: CONTENT_W, lineBreak: false })
    doc.moveTo(MARGIN + 8, 150).lineTo(MARGIN + 88, 150)
      .lineWidth(2).strokeColor(C.gold).stroke()
    doc.font('Helvetica').fontSize(13).fillColor(C.goldLight)
      .text('Author Style Analysis', MARGIN + 8, 162, { width: CONTENT_W, lineBreak: false })
    doc.font('Helvetica').fontSize(10).fillColor(C.creamMuted)
      .text(genre, MARGIN + 8, 186, { width: CONTENT_W, lineBreak: false })

    if (a?.voice_description) {
      doc.rect(MARGIN + 8, 240, CONTENT_W - 8, 2).fill(C.gold)
      doc.font('Helvetica').fontSize(10.5).fillColor(C.creamMuted)
        .text(a.voice_description, MARGIN + 8, 254, {
          width: CONTENT_W - 8,
          lineGap: 5,
          height: PAGE_H - 52 - 30 - 254,
          ellipsis: true,
        })
    }

    // Cover footer
    doc.rect(0, PAGE_H - 52, PAGE_W, 52).fill('#0a0908')
    doc.font('Helvetica').fontSize(8.5).fillColor(C.warmGray)
      .text(`Generated ${dateStr}  ·  Meridian Voice Analysis`, MARGIN + 8, PAGE_H - 32, {
        width: CONTENT_W, lineBreak: false,
      })

    // ── OVERVIEW PAGE ───────────────────────────────────────────────────────────
    doc.addPage()
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bg)
    doc.rect(0, 0, 4, PAGE_H).fill(C.gold)

    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.warmGrayLight)
      .text('AUTHOR STYLE ANALYSIS', MARGIN + 12, 60, {
        width: CONTENT_W, characterSpacing: 1.5, lineBreak: false,
      })

    const genreDisplay = a?.voice_identity?.genre_classification ?? genre
    doc.font('Helvetica-Bold').fontSize(26).fillColor(C.cream)
      .text(genreDisplay, MARGIN + 12, 80, { width: CONTENT_W })

    doc.font('Helvetica').fontSize(9).fillColor(C.warmGray)
      .text(`Generated ${dateStr}`, MARGIN + 12, (doc.y as number) + 2, {
        width: CONTENT_W, lineBreak: false,
      })

    const subtitleRuleY = (doc.y as number) + 20
    doc.moveTo(MARGIN + 12, subtitleRuleY).lineTo(MARGIN + CONTENT_W, subtitleRuleY)
      .lineWidth(1).strokeColor(C.border).stroke()
    doc.y = subtitleRuleY + 22

    // Voice portrait
    if (persona.voice_description) {
      miniLabel(doc, 'Voice Portrait')
      doc.y += 6
      doc.font('Helvetica').fontSize(11.5).fillColor(C.text)
        .text(persona.voice_description, MARGIN + 12, doc.y, {
          width: CONTENT_W - 24, lineGap: 5,
        })
      doc.moveDown(1.4)
    }

    // How Meridian uses this
    usageNote(doc, 'This profile is your fingerprint inside Meridian. Every element below is actively used during chapter generation to keep AI-written prose indistinguishable from your own writing. Nothing here is decorative — it all feeds the engine.')

    // At-a-glance stat boxes
    if (hasRich && a?.sentence_metrics && a?.sensory_palette) {
      const sm = a.sentence_metrics
      const sp = a.sensory_palette
      const senseKeys = ['visual', 'tactile', 'auditory', 'olfactory', 'gustatory'] as const
      type SenseKey = typeof senseKeys[number]
      const senseLabels: Record<SenseKey, string> = {
        visual: 'Visual', tactile: 'Tactile', auditory: 'Auditory',
        olfactory: 'Olfactory', gustatory: 'Gustatory',
      }
      const topSense = senseKeys.reduce<SenseKey>(
        (best, k) => (sp[k] as number) > (sp[best] as number) ? k : best, 'visual'
      )

      const boxW = 150
      const boxH = 80
      const gap  = (CONTENT_W - boxW * 3) / 2
      maybeNewPage(doc, boxH + 24)
      const row1Y = (doc.y as number) + 8

      statBox(doc, MARGIN,                    row1Y, boxW, boxH, `~${Math.round(sm.avg_length_words)}`, 'Avg Words per Sentence')
      statBox(doc, MARGIN + boxW + gap,       row1Y, boxW, boxH, `${Math.round(sm.dialogue_percentage)}%`, 'Dialogue Percentage')
      statBox(doc, MARGIN + (boxW + gap) * 2, row1Y, boxW, boxH, senseLabels[topSense], 'Dominant Sense')
      doc.y = row1Y + boxH + 16
    }

    if (hasRich && a?.voice_identity?.comparable_voices) {
      callout(doc, 'Comparable Voices', a.voice_identity.comparable_voices, C.calloutWarm, C.gold, C.gold)
    }
    if (hasRich && a?.voice_identity && a?.pacing) {
      doc.y += 4
      metricTable(doc, [
        ['Genre',                a.voice_identity.genre_classification],
        ['POV',                  a.voice_identity.pov_type],
        ['Narrative Distance',   a.voice_identity.narrative_distance],
        ['Literary Sensibility', a.voice_identity.literary_sensibility],
        ['Default Pace',         a.pacing.default_pace],
      ])
    }
    if (hasRich && a?.characterization) {
      callout(doc, 'Primary Characterization Technique', a.characterization.primary_technique,
        C.calloutGreen, '#8c8', '#6a6')
    }

    // ── SECTION 1: VOICE IDENTITY ──────────────────────────────────────────────
    doc.y += 20
    sectionHeader(doc, '1', 'Voice Identity')
    doc.y += 4
    usageNote(doc, USAGE.voiceIdentity)
    doc.y += 4

    const voiceSummary = persona.voice_description ?? 'Voice analysis not yet complete.'
    callout(doc, 'Voice Essence', voiceSummary, C.calloutWarm, C.goldMuted, C.goldMuted)

    if (hasRich && a?.voice_identity) {
      const vi = a.voice_identity
      doc.y += 4
      metricTable(doc, [
        ['POV Type',                vi.pov_type],
        ['Narrative Distance',      vi.narrative_distance],
        ['Literary Sensibility',    vi.literary_sensibility],
        ['Free Indirect Discourse', vi.free_indirect_discourse],
      ])
    }

    // ── SECTION 2: SENTENCE ARCHITECTURE ─────────────────────────────────────
    doc.y += 16
    sectionHeader(doc, '2', 'Sentence Architecture')
    doc.y += 4
    usageNote(doc, USAGE.sentenceArchitecture)
    doc.y += 4

    if (hasRich && a?.sentence_metrics) {
      const sm = a.sentence_metrics
      const statY = doc.y as number
      doc.rect(MARGIN, statY, 90, 52).fill(C.statBg)
      doc.rect(MARGIN, statY, 90, 3).fill(C.gold)
      doc.font('Helvetica-Bold').fontSize(30).fillColor(C.statNum)
        .text(`~${Math.round(sm.avg_length_words)}`, MARGIN, statY + 10, { width: 90, align: 'center', lineBreak: false })
      doc.font('Helvetica').fontSize(7.5).fillColor(C.warmGray)
        .text('AVG WORDS / SENTENCE', MARGIN, statY + 40, { width: 90, align: 'center', lineBreak: false })
      doc.fillColor(C.text)
      doc.y = statY + 62

      metricTable(doc, [
        ['Sentence Range',        sm.sentence_range],
        ['Avg. Paragraph Length', `~${sm.avg_paragraph_sentences.toFixed(1)} sentences`],
        ['Dialogue Percentage',   `~${Math.round(sm.dialogue_percentage)}%`],
        ['Semicolon Frequency',   sm.semicolon_frequency],
        ['Em-Dash Frequency',     sm.em_dash_frequency],
      ])
      doc.y += 2
      miniLabel(doc, 'Dialogue vs. Prose Balance')
      doc.y += 4
      const dlgPct = Math.max(0, Math.min(100, Math.round(sm.dialogue_percentage)))
      barChart(doc, [
        { label: 'Dialogue', value: dlgPct,       max: 100 },
        { label: 'Prose',    value: 100 - dlgPct, max: 100 },
      ], 70, CONTENT_W - 120)
      doc.y += 4
      miniLabel(doc, 'Dominant Structural Pattern')
      para(doc, sm.structural_pattern, { fontSize: 10 })
      miniLabel(doc, 'What Triggers Longer Sentences')
      para(doc, sm.long_sentence_trigger, { muted: true, fontSize: 9.5 })
    } else {
      const sd = persona.style_descriptors as Record<string, string> | null
      if (sd) {
        metricTable(doc, Object.entries(sd).map(([k, v]) => [k.replace(/_/g, ' '), v] as [string, string]))
      }
    }

    // ── SECTION 3: PACING & RHYTHM ─────────────────────────────────────────────
    doc.y += 16
    sectionHeader(doc, '3', 'Pacing & Rhythm')
    doc.y += 4
    usageNote(doc, USAGE.pacing)
    doc.y += 4

    if (hasRich && a?.pacing) {
      const pac = a.pacing
      callout(doc, 'Default Pace', pac.default_pace, C.calloutAmber, C.gold, C.goldMuted)
      doc.y += 4
      metricTable(doc, [
        ['Time Compression', pac.time_compression_usage],
        ['Time Expansion',   pac.time_expansion_usage],
      ])
      doc.y += 4
      miniLabel(doc, 'Scene Construction Pattern')
      para(doc, pac.scene_construction_pattern)
      miniLabel(doc, 'Tension Architecture')
      para(doc, pac.tension_architecture)
    }

    // ── SECTION 4: CHARACTERIZATION ───────────────────────────────────────────
    doc.y += 16
    sectionHeader(doc, '4', 'Characterization Method')
    doc.y += 4
    usageNote(doc, USAGE.characterization)
    doc.y += 4

    if (hasRich && a?.characterization) {
      const ch = a.characterization
      callout(doc, 'Primary Technique', ch.primary_technique, C.calloutGreen, '#8c8', '#6a6')
      doc.y += 4
      para(doc, ch.technique_description)
      metricTable(doc, [
        ['Emotional Expression Mode', ch.emotional_expression_mode],
        ['Emotional Pattern',         ch.emotional_pattern],
      ])
    }

    // ── SECTION 5: DIALOGUE STYLE ──────────────────────────────────────────────
    doc.y += 16
    sectionHeader(doc, '5', 'Dialogue Style')
    doc.y += 4
    usageNote(doc, USAGE.dialogue)
    doc.y += 4

    if (hasRich && a?.dialogue_style) {
      const dlg = a.dialogue_style
      metricTable(doc, [
        ['Frequency',          dlg.frequency],
        ['Function',           dlg.function],
        ['Style Notes',        dlg.style_notes],
        ['Attribution Pattern', dlg.attribution_pattern],
      ])
    }

    // ── SECTION 6: SENSORY PALETTE ─────────────────────────────────────────────
    doc.y += 16
    sectionHeader(doc, '6', 'Sensory Palette')
    doc.y += 4
    usageNote(doc, USAGE.sensory)
    doc.y += 4

    if (hasRich && a?.sensory_palette) {
      const sp = a.sensory_palette
      doc.font('Helvetica').fontSize(8.5).fillColor(C.warmGray)
        .text('Score:  1 = Absent  ·  2 = Rare  ·  3 = Selective  ·  4 = Frequent  ·  5 = Primary',
          MARGIN, doc.y, { width: CONTENT_W })
      doc.y += 10
      barChart(doc, [
        { label: 'Visual',    value: sp.visual,    max: 5 },
        { label: 'Tactile',   value: sp.tactile,   max: 5 },
        { label: 'Auditory',  value: sp.auditory,  max: 5 },
        { label: 'Olfactory', value: sp.olfactory, max: 5 },
        { label: 'Gustatory', value: sp.gustatory, max: 5 },
      ], 72, CONTENT_W - 122)
      doc.y += 6
      miniLabel(doc, 'Figurative Language')
      para(doc, sp.figurative_language_notes, { fontSize: 9.5 })
    }

    // ── SECTION 7: SCENE-TYPE VARIATION RULES ─────────────────────────────────
    doc.y += 16
    sectionHeader(doc, '7', 'Scene-Type Variation Rules')
    doc.y += 4
    usageNote(doc, USAGE.sceneRules)
    doc.y += 4
    doc.font('Helvetica').fontSize(8.5).fillColor(C.warmGray)
      .text('Core voice remains constant. These parameters flex by scene type. Row color indicates emotional temperature.',
        MARGIN, doc.y, { width: CONTENT_W })
    doc.y += 10

    const rules = a?.scene_type_rules ?? []
    if (rules.length > 0) {
      dataTable(
        doc,
        ['Scene Type', 'Sentence Length', 'Reflection', 'Detail Level', 'Emotional Temp'],
        rules.map(r => [r.scene_type, r.sentence_length, r.reflection_density, r.technical_detail, r.emotional_temp]),
        [148, 128, 72, 90, 74],
        tempBg,
      )
    }

    // ── SECTION 8: VOICE GUARDRAILS ────────────────────────────────────────────
    doc.y += 16
    sectionHeader(doc, '8', 'Voice Guardrails')
    doc.y += 4
    usageNote(doc, USAGE.guardrails)
    doc.y += 4

    if (hasRich && a?.voice_guardrails) {
      twocolBullets(
        doc,
        'DO NOT — Patterns that break this voice',
        a.voice_guardrails.do_not,
        'PRESERVE — Patterns that define this voice',
        a.voice_guardrails.preserve,
      )
    }

    // ── SECTION 9: THEMES & THEMATIC DELIVERY ─────────────────────────────────
    doc.y += 16
    sectionHeader(doc, '9', 'Themes & Thematic Delivery')
    doc.y += 4
    usageNote(doc, USAGE.themes)
    doc.y += 4

    if (hasRich) {
      if (a?.themes && a.themes.length > 0) {
        miniLabel(doc, 'Identified Themes')
        doc.y += 4
        bulletList(doc, a.themes, 0, 9.5)
        doc.y += 8
      }
      if (a?.thematic_delivery) {
        miniLabel(doc, 'How Themes Are Delivered')
        para(doc, a.thematic_delivery, { fontSize: 9.5 })
      }
    }

    // ── SECTION 10: TENDENCIES TO MONITOR ──────────────────────────────────────
    doc.y += 16
    sectionHeader(doc, '10', 'Tendencies to Monitor')
    doc.y += 4
    usageNote(doc, USAGE.tendencies)
    doc.y += 4

    if (hasRich && a?.tendencies_to_monitor && a.tendencies_to_monitor.length > 0) {
      bulletList(doc, a.tendencies_to_monitor, 0, 9.5)
    }

    // ── PAGE BACKGROUNDS + FOOTERS ──────────────────────────────────────────────
    const range = doc.bufferedPageRange() as { start: number; count: number }
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i)
      if (i === 0) continue  // cover handled above

      // Dark background for all content pages (drawn behind existing content
      // via bufferPages — but pdfkit draws in z-order per page, so we paint
      // the bg first only on the cover. For inner pages the bg was already
      // set via the addPage flow. We just add footers here.)

      doc.page.margins.bottom = 0

      doc.moveTo(MARGIN, PAGE_H - 38).lineTo(MARGIN + CONTENT_W, PAGE_H - 38)
        .lineWidth(0.5).strokeColor(C.border).stroke()
      doc.font('Helvetica').fontSize(7.5).fillColor(C.warmGray)
        .text('Voice DNA Profile  ·  Meridian', MARGIN, PAGE_H - 28, {
          width: CONTENT_W / 2, lineBreak: false,
        })
      doc.font('Helvetica').fontSize(7.5).fillColor(C.warmGray)
        .text(`Page ${i} of ${range.count - 1}`, MARGIN + CONTENT_W / 2, PAGE_H - 28, {
          width: CONTENT_W / 2, align: 'right', lineBreak: false,
        })
      doc.y = MARGIN
    }

    doc.flushPages()
    doc.end()
  })
}
