import type { TaskType } from '@/types/database'

export const RECOMMENDED_MODELS: Record<TaskType, { id: string; name: string; description: string }> = {
  outline: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Fast, structured output for outlines' },
  prose: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Creative, nuanced prose generation' },
  editing: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Balanced quality for editing suggestions' },
  reviewer: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Direction options, impact analysis, voice analysis' },
  planner: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Outline generation and fast planning tasks' },
  summarizer: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Chapter compression and memory analysis' },
  validation: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Continuity auditing before generation' },
  oracle: { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Long-range manuscript context retrieval' },
  arc_synthesis: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Character arc synthesis across chapters' },
}

export const DEFAULT_MODELS = RECOMMENDED_MODELS

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
] as const

export const TASK_TYPES: { value: TaskType; label: string; description: string }[] = [
  { value: 'prose', label: 'Prose Writing', description: 'Generating chapter content and narrative' },
  { value: 'reviewer', label: 'Reviewer', description: 'Direction options, impact analysis, voice analysis' },
  { value: 'planner', label: 'Planner', description: 'Premise prefill and fast planning tasks' },
  { value: 'summarizer', label: 'Summarizer', description: 'Chapter compression and memory analysis' },
  { value: 'validation', label: 'Continuity Auditor', description: 'Pre-generation continuity checking' },
  { value: 'oracle', label: 'Manuscript Oracle', description: 'Long-range manuscript context retrieval' },
  { value: 'arc_synthesis', label: 'Arc Synthesis', description: 'Character arc synthesis across chapters' },
  { value: 'outline', label: 'Outline Generation', description: 'Creating novel outlines and story structure' },
  { value: 'editing', label: 'Editing & Revision', description: 'Rewriting, style adjustments, and feedback' },
]
