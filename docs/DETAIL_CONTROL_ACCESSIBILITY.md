# Event and proof controls — 18 November 2026

The Event Details and Merkle Proof pages previously exposed icon-only back
links and copy buttons without accessible names. Their neighboring field labels
did not name the buttons. The earlier accessibility workflow covered the
dashboard, certificate and search filters, but did not test these detail routes.

The controls now have brief names that identify their destinations or copied
fields: **Back to dashboard**, **Back to event**, **Copy Event ID**, **Copy Trace
ID**, **Copy event hash**, **Copy previous hash**, **Copy Merkle root** and
**Copy audit path hash L0**, **L1**, etc. The audit-path level names match the
visible level labels. Complete hash or identifier values are not included in
control names. The copy controls remain native buttons, use `type="button"`
and hide their decorative SVG icons from assistive technology.

At narrow widths, the detail header also pushed its actions outside the
viewport: Event Details measured 420px wide in both 320px and 390px viewports,
and Merkle Proof measured 332px in a 320px viewport. Both headers now stack at
narrow widths, allow title/identifier wrapping and keep their action groups
inside the viewport, including the proof's additional Reset action.

The Merkle Proof page also previously showed a successful-copy icon when the
Clipboard API rejected a write. It now changes that icon only after
`copyToClipboard` reports success, matching the existing Event Details and
certificate behavior. This change does not add native clipboard permissions
or turn a rejected write into a successful copy.

## Bounded checks

`tools/tests/check-accessibility.cjs` now visits both detail routes at **320px,
390px, 768px and 1440px**. The added checks require:

- Unambiguous back-link and copy-button names for every displayed control.
- No `button-name` or `link-name` violations or incomplete results in the
  scoped main-content scan.
- A test-only removal of the added names that detects every affected control,
  followed by a successful restored-state scan.
- Enter and Space activation of each copy button, retained focus and an
  unchanged action name while the feedback icon changes.
- Clipboard API writes equal to the complete adjacent displayed value.
- No success icon after a rejected proof clipboard write.
- Enter activation of each back link reaches its stated destination.
- Document width and main-content action bounds remain within each viewport,
  including the proof header after verification reveals its Reset button.

The clipboard checks substitute a test-only `navigator.clipboard.writeText`.
They do not access the host clipboard or establish operating-system clipboard
behavior. The existing verification algorithm, mock records, labels about
unverified demo data and non-certification caveats are unchanged.

Local validation used Node **24.22.1**, Playwright **1.56.1**, Chromium
**141.0.7390.37** and axe-core **4.13.0**. The production build, lint, **58 unit
tests**, **13 dashboard/search query-state cases**, **19 detail query-state
cases** and the bounded browser gate passed. In the sample proof, the negative
control detected five unnamed event controls and seven unnamed proof controls
at each tested width. Reverting only the rejected-write handling made exactly the new
clipboard regression fail; the other 18 detail cases still passed.

CI uploads the full browser report and screenshots as
`explorer-accessibility-evidence`. Hosted and published-site results must be
recorded from their actual runs; these local results do not claim deployment.

## Limits

These checks validate the named controls and selected native keyboard actions.
They do not establish complete page contrast, screen-reader behavior, WCAG
conformance, native Print/Save-as-PDF reading order or PDF/UA conformance. The
existing whole-dashboard scan still reports **114 inconclusive contrast nodes**
in this bounded local run. Those findings remain unresolved, rather than being
counted as passing contrast checks.

[Issue #6](https://github.com/veritaschain/vcp-explorer-gui/issues/6) remains open
for its supported-profile, native-output and manual acceptance criteria. See
[PDF print accessibility status](PDF_PRINT_ACCESSIBILITY.md) and
[search filter controls](SEARCH_FILTER_ACCESSIBILITY.md) for their separate
scopes.

## Primary guidance

- [W3C APG: Providing Accessible Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)
- [W3C APG: Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
