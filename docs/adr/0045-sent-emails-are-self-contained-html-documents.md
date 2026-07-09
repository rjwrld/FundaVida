# Sent emails are self-contained HTML documents

_Accepted (design grilling 2026-07-08). Extends ADR-0041._

A campaign row in the history table is proof that a send happened; it is not proof of _what was sent_. Under ADR-0041 the send is simulated — nothing leaves the browser — so the only artifact a demo visitor can ever inspect is the one we render. A subject line and a recipient count read like a database row, not like an email. We make the artifact credible instead: the thing a campaign produces is a real, self-contained HTML email document, and the app can show it.

## Decision

**The artifact.** A pure `buildEmailHtml(input)` in `src/lib/emailHtml.ts` returns a complete HTML document string: inline styles only, no external assets, no scripts, no network reachability. The FundaVida mark is an inline SVG in the four brand colours; accents are Figure Green (hue 138, ADR's brand palette). The footer carries the demo disclaimer ("demo — no email was actually sent"), localized. The function is pure and total: chrome copy is _passed in_ already localized (i18next resolves it at render time, at the call site), so the generator never touches i18n and its tests are plain string assertions.

**The body is verbatim.** Blank lines become `<p>`; single newlines become `<br />`; every character is HTML-escaped. Nothing else — no markdown, no auto-linking. There are **no merge fields and no personalization**: the ADR-0041 send path never personalized, so a per-recipient rendering would fabricate an email that was never composed. One campaign, one document. The composer stays a plain textarea.

**The rendering.** A sandboxed `<iframe srcDoc>` with `sandbox=""` — no scripts, no same-origin, no forms. The document is **light-themed always**, independent of the app theme, and declares `color-scheme: light`: an inbox does not inherit the reader's app preferences, and a dark-mode "preview" of a light email would be a lie about the artifact.

**The viewer.** An `EmailPreviewDialog` (`max-w-3xl`), opened from the subject cell of the history table on `BulkEmailPage`. The dialog frames the document with app-side chrome the document itself does not carry — sender, filter, audience, recipient **email** count (ADR-0041 semantics: emails, not Students), sentAt. **No new route and no new permission**: the viewer rides whatever gate already guards the surface it sits on, and the scope seam is untouched.

A teacher therefore meets the viewer through the composer, not the history. ADR-0041's `bulkEmail: { view: courseOwned }` is a _context-free deny_ at the nav and route layer — `/app/bulk-email` and its history table stay admin-only, and the teacher's own-scoped campaign list has no UI mount today. Their path to a rendered email is the Preview button inside "Message the class", which opens with the Course in context. Granting the teacher the history surface would be a permission change, and this ADR does not make one.

**The composer preview.** `EmailCampaignForm` gains a "Preview" button that opens the same dialog fed the current draft — same generator, same iframe, so what you preview is what the history will show. Disabled until subject and body are both non-empty (there is no document to render otherwise).

**The seed.** The four seeded campaign bodies and subjects are rewritten as realistic Spanish two-to-three-paragraph emails. Seeded campaign copy is domain data, not UI chrome: a Costa Rican non-profit writes to its families in Spanish, and it does not re-translate its outbox when a reader flips the locale switch. An English-locale visitor sees Spanish seeded emails framed by English chrome — which is exactly what a real inbox looks like.

## Consequences

- Rewritten seed bodies make a v14 snapshot _stale by content_ while still structurally valid, so `isValidSnapshot` cannot catch it. **STATE_KEY bumps v14 → v15** and v14 joins the legacy purge list: returning visitors reseed rather than keep an English outbox (reseed, never migrate — ADR-0003). `pinDemoEpoch` imports the exported constant, so no e2e mirror drifts.
- The generator's contract is a string, so its unit tests are string assertions: no `<script>`, no `http(s)://`, escaped injection, the mark and the disclaimer present, blank-line paragraph splitting. This is the whole test seam — the iframe needs no DOM test to prove the document is inert.
- The mark is a compact hand-authored SVG, not the traced `public/logo-mark.svg` (77 KB): an email document that inlines everything cannot afford the artwork, and a data-URI of it would be worse. The four brand colours carry the recognition.
- `emailFilterLabel(filter, programs, t)` lands beside `resolveRecipients` in `src/lib/emailRecipients.ts` — the history table and the dialog chrome had begun to describe the same filter two ways.
- No permission, route, matrix, or scope change. Any diff that touches those while implementing this is over-broadening and should be rejected in review.
