# StoryWriter — Manual QA Checklist

Run through before each release. Check items as you go.

---

## Auth

- [ ] Sign up with new email — confirmation email received
- [ ] Sign in with existing account — redirects to dashboard
- [ ] Sign in with wrong password — shows error, no redirect
- [ ] "Forgot password" flow — email sent, reset link works
- [ ] Sign out — redirected to login, cannot access /dashboard
- [ ] Refresh page while logged in — stays logged in (session persists)

## Dashboard

- [ ] Empty state shows "Start Writing" CTA
- [ ] Create new project — dialog opens, title + genre required
- [ ] Project card shows correct status badge (Draft / Writing / Complete)
- [ ] Project card shows word count and last updated
- [ ] Delete project via 3-dot menu — confirmation dialog, project removed
- [ ] Click project card — navigates to correct phase page

## Settings

- [ ] API key tab: save key → shows masked value
- [ ] API key tab: "Test key" validates against OpenRouter
- [ ] API key tab: remove key → confirmation, key cleared
- [ ] Model preferences tab: all 9 task types visible with dropdowns
- [ ] Model preferences tab: change model → save → refreshes correctly
- [ ] Voice profile tab: shows profile or "no profile" state
- [ ] Voice profile tab: "Re-analyze" navigates to onboarding

## Voice Onboarding

- [ ] Paste text sample → "Add Sample" → sample appears in list
- [ ] Upload PDF/DOCX/TXT → file parsed, sample added
- [ ] Remove a sample → removed from list
- [ ] Trigger analysis → rotating status messages shown
- [ ] Analysis completes → CompletionModal with voice profile
- [ ] Download PDF → well-formatted voice report (check cover page, sections)
- [ ] "Back to Dashboard" → returns to dashboard

## Intake Wizard

- [ ] "Build Step by Step" path → advances to genre
- [ ] "I Already Have an Idea" → premise textarea, AI pre-fill works
- [ ] Genre step: select genre → Next enabled
- [ ] Themes step: multi-select works, Next enabled
- [ ] Characters step: add/remove characters, name + role + archetype
- [ ] Setting step: selection works
- [ ] Tone + Beat Sheet step: both required to proceed
- [ ] Review screen: all choices displayed, edit pencil icons work
- [ ] "Generate Outline" → navigates to outline page

## Outline

- [ ] Outline streams in — text appears progressively
- [ ] Timeline visualization renders with chapter dots
- [ ] Chapters tab: all chapters listed with title, summary, characters
- [ ] Characters tab: all characters with roles
- [ ] Locations tab: all locations with descriptions
- [ ] "Continue to Editor" → two-panel editor mode
- [ ] Edit chapter title/summary → changes persist
- [ ] "Regenerate" dialog: full / directed / per-chapter options work
- [ ] "Approve Outline" → confirmation dialog → navigates to chapters

## Chapter Generation

- [ ] "Generate Next" button visible on first pending chapter
- [ ] Click generate → streaming view with real-time text
- [ ] Stop button halts generation mid-stream
- [ ] Chapter completes → "Approve" button works → status changes to green
- [ ] Continuity conflict dialog shows if issues detected
- [ ] "Generate anyway" (force) bypasses continuity check
- [ ] Rewrite dialog: direction input + rewrite triggers new stream
- [ ] Chapter editor: click to edit → textarea → save → spinner → closes
- [ ] Chapter list: correct status badges (Pending / Generating / Draft / Approved)
- [ ] Word count updates after generation/editing

## Memory & Context (verify via Prompt Logs)

- [ ] After chapter approve: analyze-chapter fires (check prompt logs)
- [ ] Memory panel (if visible): shows open threads, character states, timeline
- [ ] Thread pressure activates in Act 3 chapters (check chapter prompt for pressure language)

## Export

- [ ] DOCX export downloads correctly, opens in Word
- [ ] ePub export downloads, opens in reader app
- [ ] RTF export downloads (Vellum-compatible)
- [ ] Plain text export downloads
- [ ] "Approved only" mode excludes draft chapters
- [ ] "All chapters" mode includes drafts marked as [DRAFT]
- [ ] Pen name field pre-fills, custom name appears in file

## Streaming & Error Handling

- [ ] Slow network: streaming doesn't break, reconnects or shows error
- [ ] Invalid API key: clear error message, not a crash
- [ ] Rate limit: appropriate message shown
- [ ] Navigate away during generation: guard dialog prevents accidental leave
- [ ] Browser refresh during generation: can re-trigger generation

## Responsive / UI

- [ ] Dashboard: grid collapses on mobile (1 col)
- [ ] Chapter panel: sidebar collapses on small screens
- [ ] Dialogs: scrollable content on small viewports
- [ ] Theme toggle: dark/light mode works across all pages
