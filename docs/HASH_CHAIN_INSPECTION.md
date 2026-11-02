# Hash Chain inspection scope

The Hash Chain page groups events by Trace ID and compares the supplied hash
values of adjacent returned records. It checks whether a record's `prev_hash`
matches the preceding record's `event_hash`. This is a link-value comparison;
it does not establish the cryptographic integrity of the event contents.

## Reading the result

| Result | Meaning |
| --- | --- |
| `LINKS_MATCH` | At least two records were inspected, and the compared link values match. |
| `LINK_MISMATCH` | A compared link value differs from the preceding supplied event hash. |
| `INSUFFICIENT_DATA` | There are too few records to compare links. This is not a successful check. |
| `INVALID_DATA` | The supplied data fails an input check, such as matching event/trace IDs, unique event IDs or full 32-byte hexadecimal hash values. |

The result applies to the supplied records in their returned order. A mismatch
does not establish tampering: the selection or order may omit an intervening
record. The first record's predecessor is outside the comparison, so this page
does not authenticate a genesis event or the start of the history. The number
of compared links is distinct from the number of loaded events.

Unavailable API responses and failed detail requests are errors, not matching
links. Missing evidence must not be interpreted as evidence of no activity.

## What remains unchecked

The page does not recompute event hashes from payload bytes, verify signatures
or trusted keys, verify an external anchor, or establish the completeness of
the selected history. Its result therefore keeps cryptographic integrity
`NOT_CHECKED` and completeness `NOT_ESTABLISHED`, including when all compared
links match. A matching result does not establish VCP/VAP conformance.

Legacy mock mode supplies synthetic demonstration records. Switching to API
mode changes the data source; it does not authenticate the returned records as
production evidence. Neither source mode establishes an independent assessment.

## Separate SDK Evidence Demo

The [SDK Evidence Demo](EVIDENCE_DEMO_INTEGRATION.md) uses its own API/SDK
verification path and reports its checks and unresolved evidence separately.
Those checks do not apply to the legacy Hash Chain page or promote its mock
records into verified evidence. The Evidence Demo also uses synthetic inputs;
its verification limits remain as documented in the integration recipe.
