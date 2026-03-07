import type { TaskType } from '@/types/database'

export const RECOMMENDED_MODELS = {
  outline: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Fast, structured output for outlines' },
  prose: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Creative, nuanced prose generation' },
  editing: { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Balanced quality for editing suggestions' },
} as const

export const DEFAULT_MODELS = RECOMMENDED_MODELS

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude Haiku 3.5', provider: 'Anthropic' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
] as const

export const TASK_TYPES: { value: TaskType; label: string; description: string }[] = [
  { value: 'outline', label: 'Outline Generation', description: 'Creating novel outlines and story structure' },
  { value: 'prose', label: 'Prose Writing', description: 'Generating chapter content and narrative' },
  { value: 'editing', label: 'Editing & Revision', description: 'Rewriting, style adjustments, and feedback' },
]
