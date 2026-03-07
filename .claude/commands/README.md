# StoryWriter — Claude Code Slash Commands

Drop this entire folder into `.claude/commands/` in the repo root. Commands become available immediately in Claude Code.

## Available Commands

| Command | What it builds |
|---|---|
| `/phase1-analysis-validator` | Confidence-scoring validator for every `project_memory` write. Prevents drift from compounding silently across 40 chapters. Build this first — everything else depends on trustworthy trackers. |
| `/phase2-manuscript-oracle` | Gemini 1.5 Pro reads the full manuscript before each chapter and surfaces callbacks, contradiction risks, and setup/payoff opportunities. Biggest quality unlock. |
| `/phase3-arc-synthesizer` | Every 5 chapters, synthesizes each character's full narrative arc trajectory. The Writer sees where characters have been, not just where they are. |
| `/phase4-polish` | Three improvements: tiered compression (no more hard caps), continuity auditor (pre-flight contradiction check), and model registry (swap any role to any OpenRouter model from the UI). |
| `/series-support` | Multi-book series support with `series_memory`, Volume Close (Sonnet decides what's permanently true), and series context injection into every chapter prompt. Architecturally independent — can run in any order. |

## Recommended Order

1. Phase 1 (foundation — makes trackers trustworthy)
2. Phase 2 (biggest quality lift)
3. Phase 3 (character arc depth)
4. Phase 4 (polish + flexibility)
5. Series Support (when needed)

## How They Work

Each command file is a structured brief. When you invoke `/phase1-analysis-validator` in Claude Code, it:
1. Runs the **Pre-flight** audit first — reads real files, reports what exists
2. Integrates with what's already there rather than overwriting
3. Works through each implementation section in order
4. Verifies against the **Definition of Done** checklist before finishing

The pre-flights are specific to your actual codebase:
- Migration numbering starts from `00009` (you have `00001`–`00008` with a duplicate `00006`)
- Project is at `/Users/nickthacker/storywriter`
- Tables: `projects`, `project_memory`, `chapter_checkpoints`, `outlines`, `author_personas`, `user_model_preferences`, `user_settings`
- Stack: Next.js 15, Supabase, OpenRouter (direct fetch, not Vercel AI SDK), Tailwind 4, shadcn/ui, Tiptap 3
