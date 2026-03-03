# Phase 5: Export and Billing - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can export their completed novel as a formatted document and the platform has a functioning billing model with Stripe subscriptions, credit packs, and token tracking. BYOK users bypass billing entirely. This is the final gate before public launch.

</domain>

<decisions>
## Implementation Decisions

### Export format & structure
- Full book structure: title page, table of contents, chapter headers, page breaks between chapters
- Formats: DOCX and plain text (per EXPT-01/02), plus ePub and RTF (RTF specifically for Vellum import)
- Export assembles chapters into a single document (EXPT-03)
- User chooses which chapters to include: "approved only" or "all chapters" — draft chapters get a visible marker in the export
- Pen name field in export dialog, defaults to account name but editable

### Export UI placement
- Export action lives in the project settings/actions area, not in the chapters page toolbar

### Payment provider
- Stripe for all subscription and credit pack payments
- Stripe Checkout for purchase flow, Customer Portal for subscription management

### Subscription model
- Hybrid: subscription tiers + purchasable credit packs
- Tiers provide a monthly token budget
- Credit packs are one-time purchases that add tokens on top of the tier budget
- Specific tier names, prices, and budget amounts are Claude's discretion

### Overage handling
- Soft warning at 80% budget used (toast notification)
- Hard block at 100% — generation disabled
- User prompted to upgrade tier or buy a credit pack to continue

### BYOK billing visibility
- Billing is completely invisible to BYOK users
- No billing pages, upgrade prompts, or token budgets shown
- BYOK users use their own OpenRouter credits directly

### Token tracking
- Per-chapter granularity within each project
- Tokens tracked per generation request, aggregated to chapter and project level
- Display: tokens only, no dollar estimate conversion

### Usage display
- Dedicated /usage page (new route)
- Budget progress bar showing used/remaining for the current billing cycle
- Total token counts

### Budget warnings UX
- 80% threshold triggers a toast notification after generation completes
- At 100% exhausted: modal dialog with upgrade/credit pack options when user tries to generate
- Warning also appears as persistent banner on the /usage page when over threshold

### Claude's Discretion
- Stripe webhook handler design and event types
- Token counting implementation (from OpenRouter response headers vs manual counting)
- Credit pack denomination options and pricing
- Subscription tier names and budget amounts
- DOCX generation library choice
- ePub generation library choice
- RTF formatting approach
- Export file naming convention
- Usage page layout and chart design

</decisions>

<specifics>
## Specific Ideas

- RTF export specifically for Vellum import workflow — many authors use Vellum for final book formatting
- ePub added to export formats (was previously v2/PLAT-02, pulled into Phase 5)
- Credit packs complement tiers — users who have a burst of writing can buy more without upgrading

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/actions/settings.ts`: API key save/upsert pattern with RLS — extend for subscription tier updates
- `src/components/settings/api-key-form.tsx` + `model-selector.tsx`: Settings component patterns to follow
- `src/actions/chapters.ts`: Chapter data access patterns — use for assembling export content
- `src/types/database.ts`: `SubscriptionTier` type already exists ('none' | 'hosted') — extend with tier names

### Established Patterns
- Server actions with Zod validation for all mutations
- Supabase RLS for data access control
- OpenRouter API calls in route handlers (`src/app/api/generate/`)
- Zustand stores with React Context providers

### Integration Points
- `user_settings` table: already has `subscription_tier` column — add token budget, usage tracking columns
- Settings page (`/settings`): add billing/subscription management links
- Route handlers in `src/app/api/generate/*`: instrument with token tracking after each OpenRouter call
- Dashboard: no billing display needed (BYOK invisible), but project cards could show token usage if desired
- New route: `/usage` page for token tracking display

</code_context>

<deferred>
## Deferred Ideas

- MOBI export format — PLAT-02 (v2)
- Per-project cost breakdown table on usage page — could be added later
- Dollar estimate conversion for token counts — user prefers tokens only for now

</deferred>

---

*Phase: 05-export-and-billing*
*Context gathered: 2026-03-03*
