## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## App Architecture Notes

CrewKit is a static, local-first browser app. There is no backend, package manager,
build step, or server requirement. The app can be opened directly from
`index.html`; persistent state is a single JSON object stored in `localStorage`
under `crewkit_setup`.

Core runtime flow:
- `app.js` defines `STORAGE_KEY`, the global `App` object, implicit router,
  `Pages` registry, shell rendering, theme handling, download helpers, `Toast`,
  `Modal`, and `Utils`.
- Each HTML page loads `validator.js`, then `app.js`, then optional shared/page
  code. Page-specific controllers are mostly inline scripts registered through
  `Pages[...]` or direct boot functions.
- `App.loadFromStorage()` hydrates `App.setup`; page controllers mutate
  `App.setup` in memory; `App.saveToStorage()` writes the full setup back to
  `localStorage` and marks the app dirty.
- `validator.js` exposes `Validator.validateSetup(data)` with level `0` clean,
  level `1` blocking errors, and level `2` warnings. `module-base.js` exposes
  `ModuleBase.safeSave(data)`, which blocks only level-1 validation errors.

Main pages and responsibilities:
- `wizard.html`: creates or edits the base setup object with `meta`, `company`,
  `user`, `artifacts`, `crewMembers`, and `initiatives`.
- `index.html`: dashboard for artifacts, crew, and initiatives. It also handles
  setup/artifact imports, dashboard tab state, and the initiatives kanban board.
- `artifact-builder.html`: creates, views, edits, downloads, and deletes
  artifacts in `setup.artifacts`. It supports matrix artifacts (`score`,
  `scale`, `selective`) and questionnaire artifacts (`fields`).
- `crew-member.html`: creates, views, edits, downloads, and deletes crew members
  in `setup.crewMembers`. Crew members have custom `fields`,
  `linkedFrameworks`, `notes`, and `changeLog`.
- `how-it-works.html`: static help content.
- `tests/tests.html`: browser-runnable validator tests; open directly in a
  browser.

Current source-of-truth data names in code:
- `setup.artifacts`
- `setup.crewMembers`
- `setup.initiatives`
- crew member `linkedFrameworks`
- legacy migration/support paths include `crewTemplates`, `templateId`,
  missing artifact `model`, and older framework-shaped imports.

Be careful with `README.md`: parts of its schema section are stale relative to
the current implementation. The code currently uses `artifacts`, `crewMembers`,
and `initiatives`, while older docs may mention `frameworks`, `teamMembers`, or
`teamTemplates`.
