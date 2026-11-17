# Search filter controls — 18 November 2026

The search page's expanded **Filters** panel previously displayed four labels
without associating them with their controls: **Event Type**, **Symbol**,
**Start Time** and **End Time**. The disclosure button also omitted its expanded
state. The earlier accessibility workflow visited the dashboard and certificate;
it did not exercise this expanded search state.

Each visible label now names its corresponding native select or datetime input
through a matching `for`/`id`. The native button exposes `aria-expanded` and
`aria-controls`. Its panel remains present but uses `hidden` when collapsed, so
the reference remains valid and collapsed controls do not enter the accessibility
tree or tab order. Collapsing the panel preserves the selected filter values.

## Bounded regression checks

`tools/tests/check-accessibility.cjs` exercises the search disclosure at 1440 and
390 pixels in the existing hosted browser workflow. Its added checks cover:

- Four unambiguous label/control associations and named select controls.
- Enter/Space activation and the corresponding expanded/hidden state.
- Native tab order from Filters through Search, Event Type and Symbol.
- Clicking either time label focuses its associated datetime input.
- Filter values survive closing and reopening the panel.
- A test-only negative control removes the associations and must identify all
  four unnamed controls; restoring them must pass the scoped label checks.

Local lint, production build, all 58 unit tests and the 13 dashboard/search
query-state scenarios passed while preparing this change. Local Chromium could
not start because the execution environment rejected its process singleton Unix
socket with `EPERM`; no successful local browser observation is claimed. Hosted
browser results must be established from the change's actual workflow run.

These checks cover the HTML control names, disclosure state and selected native
keyboard interactions. They do not complete manual contrast checks across the
search page or establish screen-reader behavior, native Print/Save-as-PDF reading
order, PDF/UA or WCAG conformance. [Issue #6](https://github.com/veritaschain/vcp-explorer-gui/issues/6)
remains open for its separate native-output and manual acceptance criteria.
The existing demo and non-certification labels remain in force.

## Primary guidance

- [W3C WAI: Labeling Controls](https://www.w3.org/WAI/tutorials/forms/labels/)
- [W3C APG: Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
