# Search and dashboard request states

## Search contract

The event-list API supports a `trace_id` filter. Individual events are fetched
through `/v1/events/:id`; neither an `event_id` nor a hash filter is defined for
the list endpoint. The GUI therefore treats a UUID in the search box as a Trace
ID and displays **Open as Event ID** for explicit event-detail navigation.

The text box also recognizes the symbols shown in its existing symbol selector
and event types. Leading/trailing whitespace and letter case are normalized for
these query values. An empty search intentionally requests the unfiltered list.
A nonempty unsupported string, including a hash, shows a message and performs
no list request. The GUI does not silently ignore an unsupported search value.

Navigation from the global search resets the mounted search page to the new
URL's query, including repeat navigation to the same URL after local edits.
Changing text, event type, symbol or either date resets pagination to page one.
The real API's `total` is a returned-page count, not the number of all matching
events. The GUI therefore shows the returned row count and current page, without
a global total, last-page button or claimed number of pages. A full 20-row page
allows trying **Next**; it does not guarantee another row exists. **First** and
**Previous** remain available if that next page is empty. Pagination controls are
disabled during an active request, and unknown/error/paused results cannot retain
a cached **Next** decision. An empty page reports `0 records returned` and does
not report a reversed range. Errors display unavailable results and a retry control.

## Dashboard states

System metadata and recent events have independent loading, error and empty
states. Failed or offline-paused refreshes hide cached values, rather than
presenting them as current. A paused search likewise waits for a connection
without retaining the previous result list. Each failed request can be retried.
An absent anchor record after a
completed response is shown as absent; a failed system request is shown as
unavailable. Neither state is an endless loading message.

The existing anchor/tier/demo disclosures still apply. A supplied anchor record
is metadata, and displaying it does not establish an on-chain transaction or
authenticated anchor. These UI changes do not change cryptographic checks,
Evidence Demo verdicts, exact evidence downloads or fixed sample bytes.

## Regression checks and limits

`npm test` includes query classification checks alongside the existing byte,
Merkle, trace and evidence-report tests. The normal build CI also runs component
behavior tests against the actual dashboard/search components and React Query.
For a local run, install the test renderer in an isolated directory:

```bash
npm install --prefix .query-tools --ignore-scripts --no-audit --no-fund --save-exact react-test-renderer@18.3.1
REACT_TEST_RENDERER_MODULE="$PWD/.query-tools/node_modules/react-test-renderer/index.js" node tools/tests/check-query-states.mjs
```

The isolated renderer is not an application dependency. It checks pending/error/
empty and offline-paused states, failed refreshes, retry, same-route navigation, page resets,
unsupported queries and explicit Event ID links. These are component behavior
checks, not browser rendering or accessibility validation.

The existing Hash Chain browser CI additionally runs
`tools/tests/check-search-dashboard.cjs` against the production API-mode build
with controlled local HTTP responses. Its bounded browser result and screenshots
are saved under the workflow artifact's `query-states/` directory. It covers the
corresponding real DOM controls, navigation, error recovery and query parameters.
It does not use a public API or live trading records.

Neither test path assesses native Print/Save-as-PDF behavior, assistive technology,
full accessibility conformance, authentication or VCP/VAP conformance. The separate
manual/native-output acceptance criteria in issue #6 remain open.
