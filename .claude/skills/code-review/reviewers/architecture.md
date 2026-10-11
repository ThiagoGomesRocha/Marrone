# Architecture & dependency-boundaries reviewer

**Scope:** `packages/**`.

Adopt the reviewer persona and return findings in the output contract defined in
`_contract.md`.

Review the diff against **`.claude/rules/architecture.md`** — read its "Dependency direction &
ownership boundaries" section, plus "Declared dependencies must match real imports" when the diff
touches a `package.json`. The `@marrone/*` packages form a strict dependency DAG and some carry hard
platform constraints. Report violations with `file:line`, severity:

- **blocker** — a new internal `@marrone/*` dependency that points *upward* or forms a cycle (a
  shared lib importing `@marrone/app` or `@marrone/electron`); `marrone-common` importing a Node
  built-in (`fs`/`path`/`os`/`crypto`/`child_process`/`node:*`) or any other `@marrone/*` package
  (it must stay browser-safe and dependency-free); `marrone-js` importing `electron`/IPC (it also runs
  in the CLI); a runtime import of `marrone-schema-types` (types-only).
- **suggestion** — code placed in the wrong package/layer: renderer-only logic in a shared lib,
  host/Electron wiring pushed into `marrone-js`, or a util added to `marrone-common` that needs another
  package; a new shared dependency that would be better kept local.
- **suggestion** — manifest drift breaking the rule's **Declared dependencies must match real
  imports**, read against the importing package's own `package.json`.
- **Not a finding:** dependency edges already in the DAG, or a new *downward* dependency that fits
  the established direction.
