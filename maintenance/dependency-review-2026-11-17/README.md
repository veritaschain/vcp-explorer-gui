# Supported minimatch remediation — 2026-11-17

The remaining development-tool finding in [issue #23](https://github.com/veritaschain/vcp-explorer-gui/issues/23)
can now be removed through a supported typescript-eslint update. The published
`@typescript-eslint/typescript-estree` **8.73.0** package requires
`minimatch ^11.0.1`; the earlier 8.72.2 package still requires `^10.2.2`.
The registry's latest 10.x remains 10.2.6. Registry observations and response
hashes are retained in `registry-observations.json`.

Primary sources:

- [typescript-eslint 8.73.0 release, 2026-11-16](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.73.0)
- [Published typescript-estree 8.73.0 metadata](https://registry.npmjs.org/@typescript-eslint%2Ftypescript-estree/8.73.0)
- [Published minimatch 11.0.9 metadata](https://registry.npmjs.org/minimatch/11.0.9)
- [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)

## Change and compatibility boundary

The existing direct development dependencies `@typescript-eslint/parser` and
`@typescript-eslint/eslint-plugin` now declare `^8.73.0`. The lock selects 8.73.0
for all ten typescript-eslint packages, minimatch 11.0.9, and its newly required
`@isaacs/nonrecursive-glob-match` 1.1.0 dependency. The parent now supports that
minimatch major version; no override or audit suppression is used.

Node 24.22.1 satisfies minimatch 11.0.9's `20 || >=22` engine range and the
typescript-eslint engine range. The new `@typescript/native` peer is optional
and is not added to this lock. The current ESLint configuration remains
unchanged, with neither `project` nor `projectService` enabled.

The targeted npm operation also attempted unrelated changes. Before candidate
installation or testing, the original **14 libc metadata arrays**, semver 7.8.5
and brace-expansion 5.0.12 entries were retained. Both retained package versions
satisfy the new parent's declared dependency ranges. `lock-scope-adjustment.json`
records the intermediate and final lock digests and exactly what was restored;
`selected-range-checks.json` records the relevant semver checks.

The final parsed lock has 13 changed entries: the root declaration, ten
typescript-eslint packages, minimatch, and the one new dependency. All other
package entries are equal to the baseline. Application source, runtime package
entries, bundler/compiler versions and ESLint configuration are unchanged.

## Inputs and observed results

Baseline source: `31db0e1dcb001e3887cd970cd05249659a6b7b85`.
The source base remained checked out while the candidate package/lock bytes were
modified and tested. These are first-party observations on that working tree,
not an execution attributed to a later commit or an independent security review.

| Input | SHA-256 |
| --- | --- |
| Baseline package-lock.json | `0ff4914fe53ea2a4790bae4acce476b07bcd01b2596d615b12908d7c55445f47` |
| Candidate package-lock.json | `333294eb6cfb9f71b99f16f93ab97391564fc06a6097a80ee080349dbf7a6368` |
| Candidate package.json | `b14e9724c835197fae2675b6b6e8c4a4e36b60195896a8473dc5fda0d889f119` |

Toolchain: Node **24.22.1**, npm **11.9.0**, Linux x86-64; isolated component
renderer **react-test-renderer 18.3.1**. Commands, exact UTC timestamps, exit
codes, input hashes and the component renderer's actual local path are recorded
in the `commands*.json` files.

| Registry audit | Baseline | Final candidate |
| --- | --- | --- |
| Full dependency graph | 6 moderate package entries; exit 1 | 0 findings; exit 0 |
| Omit development dependencies | 0 findings; exit 0 | 0 findings; exit 0 |

The baseline's six entries propagate the single minimatch advisory; they are not
six separately reproduced defects. Both candidate audits used the final lock
digest above. The raw before/after audit JSON is retained without rewriting.
Two initial invocations failed before npm could load its configuration because
the same empty config file was selected twice; their empty stdout and diagnostic
stderr remain under `*-config-attempt1.*`. They are not audit results. The retry
used distinct empty user/global config paths and produced the reports above.

The final candidate was installed with `npm ci --ignore-scripts --no-audit
--no-fund` **after** the scoped lock restoration. It then passed:

- ESLint with zero warnings.
- All **58** existing unit tests.
- All **31** query-state component scenarios: 13 dashboard/search and 18 detail.
- TypeScript/Vite builds for both the default and static Explorer profiles.

For each profile, all four emitted file paths and SHA-256 digests are identical
between baseline and candidate. The `*-dist-*.json` files retain those manifests.
The static profile used `VITE_USE_MOCK=true`, `VITE_ROUTER_MODE=hash`, an empty
`VITE_API_BASE_URL`,
`VITE_EVIDENCE_API_BASE_URL=https://veritaschain-evidence-demo.kamimura0000.chatgpt.site/v1`,
and `--base=/explorer/app/`. This dependency change therefore produces no new
browser bundle bytes for either compared profile. No deployment was performed.

Hosted browser, accessibility and container gates are left to the existing PR
workflows; this record does not claim that they ran locally. Audit zero describes
the registry result at the recorded time, not a universal security guarantee.

## Evidence files

`summary.json` contains the audit and build comparison summary.
`package-entry-diff.json` records the complete parsed lock-entry changes.
`commands*.json` and matching stdout/stderr files retain actual executions.
`evidence-sha256.json` inventories this evidence directory, excluding itself.
The baseline dependency bytes are available at the pinned Git commit; the final
candidate bytes are the repository's ordinary package and lock files.
