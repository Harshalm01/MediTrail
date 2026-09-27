# MediTrail — AGENTS.md

## Purpose

This file contains the permanent engineering rules for the MediTrail project.

Every AI agent, coding assistant, automation agent, or developer working on this repository MUST read and follow this file before inspecting, modifying, generating, refactoring, or deleting code.

These rules take priority over convenience.

The goal is to keep MediTrail:

- clean
- maintainable
- modular
- scalable
- easy for humans to understand
- easy for AI agents to modify safely
- compatible with a future Java backend
- free from unnecessary complexity

---

# 1. PROJECT OVERVIEW & REPOSITORY STRUCTURE

MediTrail is a centralized, chronological medical history management system frontend prototype.

Current frontend technology:

- HTML5
- CSS3
- Vanilla JavaScript
- JavaScript ES Modules

Backend will be implemented separately in Java in the future (`backend/` is reserved).

The current frontend uses dummy/mock clinical data accessed via a dedicated service layer.

Do NOT introduce backend functionality unless explicitly requested.

### Dual HTML Entry Points

The frontend is organized into two distinct HTML entry points:

1. `frontend/index.html` — Marketing Landing Experience:
   - Apple-inspired showcase with scroll snapping and progressive section element reveals.
   - Interactive timeline preview card and hero hover interactions.
   - Call-to-action button linking directly to the prototype portal (`portal.html`).

2. `frontend/portal.html` — Clinical Patient Portal Shell:
   - The full prototype application layout featuring a responsive sidebar navigation.
   - Views: Dashboard, Chronological Timeline, Medications, Shared Doctor Access, and Emergency Profile.
   - Drawers and Modals: Slide-over record detail drawer, PDF policy certificate viewer, QR code sharing modal, Patient Profile modal, and Edit Emergency Profile modal.
   - Logo in the sidebar links back to `index.html`.

### Repository Structure

```text
MediTrail/
├── frontend/
│   ├── index.html          # Marketing Landing experience
│   ├── portal.html         # Clinical Patient Portal shell
│   ├── image.png           # Brand logo and favicon
│   ├── css/
│   │   ├── style.css       # Design tokens (CSS custom properties), reset, base typography
│   │   └── components.css  # Component layouts, views, modals, drawer, animations, media queries
│   └── js/
│       ├── main.js         # Bootstrap and event listener initialization
│       ├── app.js          # App coordinator & window-scope compatibility bridges
│       ├── data.js         # Raw mock clinical dataset (window.MEDITRAIL_DATA)
│       ├── core/
│       │   ├── navigation.js# View switching and sidebar tab routing
│       │   └── ui.js       # Shared UI utilities (slide-over drawer, modals, toast system)
│       ├── services/
│       │   └── data.js     # Data access service layer (future Java REST API gateway)
│       ├── views/
│       │   ├── landing.js  # Landing scroll experience and presentation behavior
│       │   ├── dashboard.js# Dashboard rendering and metric carousel
│       │   ├── timeline.js # Medical timeline grouping, search, and category filters
│       │   ├── medications.js# Medication regimen view and refill actions
│       │   ├── shared-access.js# Doctor authorization list and access controls
│       │   └── emergency.js# Emergency overview and edit profile modal
│       └── utils/
│           ├── debug.js    # Centralized debug logging utility (debugLog)
│           └── qr.js       # Standalone mathematical QR code SVG generator
├── backend/                # Reserved for future Java backend service
├── agents/
│   └── agent.md            # Agent engineering rules reference
├── scanner/
│   ├── .gitignore          # Scanner report ignore rules
│   ├── audit_scanner.py    # Static analyzer for code metrics and DOM checks
│   └── deep_scan.py        # Token and architectural dependency scanner
├── runner.py               # Lightweight multi-threaded local Python development server
├── README.md               # Developer onboarding guide
├── AGENTS.md               # Authoritative engineering rules (this file)
└── .gitignore              # Git ignore rules for caches, artifacts, and OS files
```

---

# 2. TECHNOLOGY RULES

## Allowed

Use:

- HTML5
- CSS3
- Vanilla JavaScript
- JavaScript ES Modules
- browser APIs
- small standalone/minified utilities when genuinely required

## Not allowed unless explicitly requested

Do NOT introduce:

- React
- Vue
- Angular
- Svelte
- Next.js
- Nuxt
- Bootstrap
- Tailwind
- jQuery
- Node.js
- npm
- webpack
- Vite
- Parcel
- unnecessary build systems
- unnecessary package managers
- unnecessary external dependencies

MediTrail is intentionally designed to remain a simple HTML/CSS/JavaScript frontend.

Do not turn a simple problem into a framework problem.

---

# 3. CORE ENGINEERING PRINCIPLE

## Change the minimum amount of code necessary.

Before modifying anything:

1. Understand the existing implementation.
2. Identify the actual cause of the problem.
3. Determine the affected dependencies.
4. Make the smallest safe change.
5. Verify the result.
6. Stop.

Do NOT rewrite working code merely because another implementation looks cleaner.

Do NOT refactor unrelated code while fixing another issue.

Do NOT combine multiple architectural changes into one change unless explicitly requested.

---

# 4. ONE CHANGE AT A TIME

MediTrail is being incrementally improved.

When given a specific task:

- perform that task only
- preserve everything unrelated
- do not automatically continue to the next refactor
- do not "clean up" unrelated files
- do not redesign other systems

After completing the requested task:

STOP.

Report what was changed and wait for the next instruction.

---

# 5. INSPECT BEFORE EDITING

Never modify code based solely on assumptions.

Before making changes:

- inspect relevant files
- search for references
- identify callers
- identify dependencies
- identify imports/exports
- identify DOM dependencies
- identify global dependencies
- identify inline HTML handlers
- identify initialization order

For larger changes, use automated/static analysis whenever possible instead of manually reading thousands of lines.

Useful techniques include:

- grep/search
- regex analysis
- import/export scanning
- dependency graph generation
- duplicate-definition detection
- missing-reference detection
- DOM ID/reference scanning
- syntax checking
- existing project scanners

If automated analysis can answer a question reliably, use it.

---

# 6. DO NOT GUESS

Never assume:

- a function is unused
- a variable is obsolete
- a DOM element is unnecessary
- an import is unnecessary
- a global can be removed
- a function belongs in a particular module
- a CSS selector is dead
- a data field is unused

Search the entire project first.

A function may be referenced from:

- HTML
- another JS module
- dynamically generated HTML
- event handlers
- global window properties
- callbacks
- string-based references

Confirm before deleting or moving anything.

---

# 7. JAVASCRIPT ARCHITECTURE

The project uses ES Modules.

Prefer explicit:

```js
import { something } from './module.js';
```

and:

```js
export function something() {
}
```

Avoid unnecessary globals.

Avoid circular dependencies.

Never solve an architecture problem by creating:

```text
A → B → A
```

If extracting functionality would create a circular dependency:

1. stop
2. analyze the dependency
3. choose a cleaner dependency direction
4. or leave the code where it is

Do not force an extraction.

---

# 8. CURRENT JAVASCRIPT STRUCTURE

The JavaScript architecture is located in `frontend/js/`:

```text
frontend/js/
├── main.js
├── app.js
├── data.js
├── core/
│   ├── navigation.js
│   └── ui.js
├── services/
│   └── data.js
├── views/
│   ├── landing.js
│   ├── dashboard.js
│   ├── timeline.js
│   ├── medications.js
│   ├── shared-access.js
│   └── emergency.js
└── utils/
    ├── debug.js
    └── qr.js
```

This structure should remain simple.

Do NOT create a file for every tiny function.

Do NOT over-modularize.

A module should represent a meaningful responsibility.

---

# 9. MODULE RESPONSIBILITY RULE

Each module should have one clear primary responsibility:

```text
main.js
→ application bootstrap/startup and top-level DOM event binding

app.js
→ remaining application coordination and window-scope compatibility bridges

core/navigation.js
→ navigation, view switching, and sidebar tab routing

core/ui.js
→ shared UI behavior such as modals, slide-over record drawer, toasts

services/data.js
→ data access service layer (frontend API gateway over mock data, mapping to future Java REST endpoints)

views/dashboard.js
→ dashboard-specific rendering and metric carousel behavior

views/timeline.js
→ timeline-specific rendering, search, and category filters

views/medications.js
→ medication-specific rendering and refill behavior

views/shared-access.js
→ shared-access-specific rendering and permission controls

views/emergency.js
→ emergency-specific rendering, tag inputs, and profile edit modal

views/landing.js
→ landing-page scroll snap, progressive reveals, and presentation behavior

utils/debug.js
→ centralized toggleable debug logging utility (debugLog)

utils/qr.js
→ QR-specific mathematical SVG generation utility

data.js
→ raw mock clinical dataset store (window.MEDITRAIL_DATA)
```

Do not move functionality simply because it is long.

Move it when its responsibility belongs somewhere else.

---

# 10. APP.JS RULE

`app.js` is allowed to exist.

Do NOT treat a large file as automatically bad.

Only extract functionality when there is a clear responsibility boundary.

Before extracting code from `app.js`:

* identify all callers
* identify dependencies
* identify global exposure
* identify initialization requirements
* check for circular dependencies

Never split `app.js` just to reduce its line count.

Architecture quality matters more than line count.

---

# 11. HTML ↔ JAVASCRIPT COMPATIBILITY

MediTrail currently contains some inline HTML event handlers.

Examples:

```html
onclick="navigateToView(...)"
onclick="selectTab(...)"
```

These may depend on functions exposed through:

```js
window.functionName = functionName;
```

Until the inline-handler architecture is deliberately migrated:

* preserve existing handlers
* preserve required `window.*` bridges
* do not delete global functions without checking HTML references
* do not create duplicate implementations

Before removing a global function:

1. search the entire project
2. verify no HTML or JS references it
3. verify it is not required during startup

---

# 12. DOM SAFETY

Before JavaScript accesses an element:

```js
document.getElementById('some-id')
```

or:

```js
document.querySelector('.some-class')
```

verify that the element actually exists in the relevant application state.

Be careful with views that are dynamically rendered.

Do not introduce unnecessary null checks everywhere, but do handle genuinely optional elements safely.

Never silently ignore a missing required DOM element.

---

# 13. DATA ARCHITECTURE & RULES

MediTrail uses a two-tier frontend data architecture designed for a clean separation between UI components and future backend endpoints:

1. **Raw Mock Data Store (`frontend/js/data.js`)**:
   Contains the raw mock clinical dataset initialized as `window.MEDITRAIL_DATA`.
   Do NOT mix UI rendering logic or DOM manipulation into `data.js`.

2. **Data Access Service Layer (`frontend/js/services/data.js`)**:
   Provides clean, centralized getter functions:
   - `getPatientData()`
   - `getMedicalRecords()`
   - `getRecordById(recordId)`
   - `getActiveMedications()`
   - `getRecentReports()`
   - `getSharedAccessList()`
   - `formatDate(dateString)`
   Views MUST consume `services/data.js` rather than querying `data.js` or global objects directly.

Do NOT:

* redesign the data model without being asked
* rename fields casually
* remove records
* change medical values
* add backend/API calls
* mix UI rendering logic into `data.js` or `services/data.js`
* bypass `services/data.js` in view modules

The future Java backend will replace the service layer implementation with `fetch()` calls without requiring changes to view components.

Keep the conceptual boundary:

```text
Data Source (data.js / future Java REST API)
   ↓
Service Interface (services/data.js)
   ↓
Application/View Logic (views/*)
   ↓
DOM
```

Do not tightly couple UI markup to future backend implementation.

---

# 14. FUTURE JAVA BACKEND COMPATIBILITY

The backend will eventually be Java (`backend/` directory is reserved).

Write frontend code so that replacing mock data with API data is reasonably straightforward.

Prefer:

```text
view → services/data.js interface → data source
```

rather than scattering assumptions about the backend throughout UI code.

However:

DO NOT implement an API abstraction, fetch layer, authentication system, Java backend, DTOs, or database integration unless explicitly requested.

Prepare the architecture without prematurely building the backend.

---

# 15. CSS ARCHITECTURE & RULES

CSS is located in `frontend/css/` and separated into two core files:

1. `frontend/css/style.css`:
   - Design tokens (CSS custom properties: colors, spacing, typography, radii, shadows)
   - Modern CSS reset
   - Base typography and layout scaffolding

2. `frontend/css/components.css`:
   - Component styles (cards, buttons, tags, pills, inputs, icons)
   - Layout grids (2x2 modal grid, form grids, dashboard metric grid)
   - View containers (landing sections, dashboard, timeline, medications, shared-access, emergency)
   - Overlay systems (slide-over record drawer, modals, toast notifications)
   - Responsive media queries

CSS should remain readable and responsibility-based.

Do NOT modify CSS when the requested task is unrelated to styling.

Do NOT rewrite large CSS files to fix a JavaScript issue.

Avoid:

* duplicate selectors
* contradictory declarations
* unnecessary !important
* deeply nested selectors
* arbitrary magic numbers
* repeated media queries when a shared rule can solve the problem

When modifying CSS:

1. search for existing selectors first
2. reuse existing variables/classes where appropriate
3. avoid creating duplicate styles
4. preserve responsive behavior
5. test desktop and mobile layouts

Do not reorganize the entire CSS architecture unless explicitly requested.

---

# 16. RESPONSIVE DESIGN

MediTrail must remain responsive.

Any UI modification must be checked at:

* large desktop
* normal laptop
* tablet
* mobile

Do not solve desktop problems by breaking mobile.

Do not solve mobile problems by unnecessarily duplicating desktop markup.

Prefer CSS responsive behavior over JavaScript viewport calculations where practical.

---

# 17. AVOID JAVASCRIPT LAYOUT HACKS

Do not use JavaScript to calculate dimensions when CSS can naturally solve the problem.

Avoid unnecessary:

```js
element.style.height = `${...}px`;
element.style.maxHeight = `${...}px`;
```

especially when those values depend on flex/grid layout.

If JavaScript must calculate layout:

* explain why
* measure the correct non-stretched element
* avoid stale inline styles
* clean up temporary styles
* account for resize and view transitions

Prefer CSS for layout.

JavaScript should control behavior, not unnecessarily reproduce the CSS layout engine.

---

# 18. ANIMATION RULES

MediTrail uses cinematic/Apple-inspired presentation behavior.

When modifying animation code:

* preserve existing timing unless explicitly asked to change it
* keep animations subtle
* avoid flashy effects
* avoid scroll-jacking
* do not intercept the mouse wheel unnecessarily
* respect `prefers-reduced-motion`

Do not change animation behavior during an unrelated refactor.

---

# 19. LANDING PAGE & PORTAL PAGES

### Marketing Landing Page (`frontend/index.html`)

The landing page features:

* section-based scrolling with vertical dot navigation (`.landing-dot-nav`)
* scroll snapping
* cinematic element reveals
* progressive content animation
* transforming floating header (`.landing-header`)
* interactive hover timeline preview card
* responsive behavior

Treat this as an established presentation system. Do not redesign or rewrite it during unrelated tasks.

### Clinical Patient Portal (`frontend/portal.html`)

The patient portal shell features:

* responsive collapsible sidebar with navigation links
* tab-based view switching without full page reloads
* slide-over record detail drawer (`#record-drawer`)
* interactive modals: QR sharing, Policy certificate, Patient profile, Edit emergency details
* responsive layout adapting to mobile off-canvas drawer navigation

### Page Cross-Linking

- `index.html` header contains the call-to-action button: `<a href="portal.html">Open Prototype Portal</a>`.
- `portal.html` sidebar header contains the brand logo linking back: `<a href="index.html">`.

---

# 20. NAVIGATION

Navigation is centralized in:

```text
frontend/js/core/navigation.js
```

Navigation functions should remain responsible for navigation.

Do not duplicate navigation logic inside views.

If a view needs navigation, import the navigation function rather than recreating it.

Avoid navigation code that directly depends on unrelated application internals unless necessary.

---

# 21. VIEWS

Each view should own its own rendering and behavior.

Examples:

```text
dashboard.js
→ dashboard

timeline.js
→ timeline

medications.js
→ medications

shared-access.js
→ shared access

emergency.js
→ emergency

landing.js
→ landing
```

Do not make dashboard.js responsible for timeline rendering.

Do not make timeline.js responsible for navigation implementation.

Do not create cross-view duplication.

Use shared modules when functionality is genuinely shared.

---

# 22. SHARED UI

Reusable UI behavior belongs in the shared UI layer when appropriate.

Examples:

* modal handling
* drawer handling
* toast notifications
* reusable overlay behavior

Do not put view-specific UI logic there.

Do not create a generic component abstraction for every HTML element.

---

# 23. ERROR HANDLING

Do not hide errors.

Avoid:

```js
try {
    ...
} catch {
}
```

unless there is a deliberate reason.

If an error can be handled meaningfully:

* handle it
* log useful diagnostic information during development
* preserve application stability

Do not use broad error suppression to make tests appear successful.

---

# 24. DEBUGGING

When debugging:

1. reproduce the issue
2. inspect the console
3. identify the first meaningful error
4. trace its dependency chain
5. fix the root cause
6. retest

Do not fix secondary errors before understanding the primary failure.

Example:

```text
main.js fails to load
        ↓
application initialization never runs
        ↓
navigateToView undefined
        ↓
buttons appear broken
```

Do not independently "fix" every symptom.

---

# 25. LOCALHOST TESTING

Because MediTrail uses ES Modules, do NOT treat:

```text
file://
```

as the authoritative runtime environment. Browsers block local module loading over `file://` due to CORS security restrictions.

Use the local HTTP runner:

```bash
# Recommended: multi-threaded Python development server from project root
python runner.py
```

`runner.py` runs a multi-threaded HTTP server on port 8000, injects dynamic debug configuration via virtual `/js/debug-config.js`, serves `frontend/`, and automatically opens the browser.

Alternatively:

```bash
cd frontend
python -m http.server 8000
```

Then test:

- Marketing Landing: `http://localhost:8000/` (or `http://localhost:8000/index.html`)
- Clinical Patient Portal: `http://localhost:8000/portal.html`

A browser CORS error caused solely by opening an ES-module application through `file://` is an environment issue, not automatically an application bug.

Do NOT remove ES modules to make `file://` work.

---

# 26. VERIFICATION AFTER EVERY CODE CHANGE

After modifying code, verify at minimum:

### JavaScript

* imports resolve
* exports resolve
* no duplicate function definitions
* no circular dependencies
* no obvious unresolved identifiers

### HTML

* referenced scripts exist
* referenced stylesheets exist
* inline handlers resolve
* required IDs exist

### Runtime

Run through localhost.

Check:

* browser console
* application startup
* navigation
* affected functionality
* major existing functionality for regressions

### Existing scanners

Run:

```bash
python scanner/audit_scanner.py
python scanner/deep_scan.py
```

Do not remove or bypass scanner checks simply because they report inconvenient findings.

---

# 27. NEVER FAKE VERIFICATION

Do not claim:

* "tested"
* "verified"
* "working"
* "zero errors"

unless the corresponding check was actually performed.

Clearly distinguish:

```text
Static analysis passed
```

from:

```text
Browser runtime tested
```

from:

```text
Not tested
```

---

# 28. FILE DELETION RULE

Never delete a file because it appears unused from one search.

Before deletion:

1. search all references
2. check HTML references
3. check imports
4. check dynamic references
5. check configuration/scripts
6. verify it is genuinely obsolete

If uncertain, do not delete it.

---

# 29. DEPENDENCY RULE

Every dependency should have a reason.

Before adding a dependency ask:

1. Can the browser API solve this?
2. Can existing project code solve it?
3. Can a small local utility solve it?
4. Is the dependency genuinely necessary?

Do not add dependencies for trivial functionality.

---

# 30. CODE STYLE

Prefer code that is:

* explicit
* readable
* predictable
* boring when boring is appropriate
* easy to debug
* easy for another developer to understand

Avoid clever code.

Avoid unnecessary one-liners.

Avoid premature abstraction.

Avoid excessive comments that merely restate the code.

Use comments when they explain:

* why something exists
* a non-obvious constraint
* an architectural decision
* a browser-specific behavior
* a workaround that must not be casually removed

---

# 31. NAMING

Use descriptive names.

Prefer:

```js
renderDashboard()
navigateToView()
openRecordDrawer()
closePolicyModal()
```

over:

```js
doThing()
handleIt()
processData()
```

Use consistent naming throughout the project.

Do not rename existing public functions without a concrete reason because other code may depend on them.

---

# 32. NO MAGIC REFACTORING

AI agents must NOT interpret:

"make this cleaner"

as permission to:

* rewrite the project
* change architecture everywhere
* rename everything
* migrate frameworks
* reorganize all files
* redesign the UI

First identify the specific improvement required.

Make the smallest coherent change.

---

# 33. PRESERVE WORKING FEATURES

When changing one feature, assume every other existing feature is intentional unless proven otherwise.

Do not remove behavior because:

* "it looks unnecessary"
* "I would implement it differently"
* "this is outdated"
* "this could be simplified"

Verify its purpose first.

---

# 34. MEDICAL DATA SAFETY

MediTrail is a medical-record application prototype.

Even though the current dataset is dummy data:

* do not casually alter clinical values
* do not fabricate medical records as if they were real
* do not expose unnecessary sensitive information
* do not move medical data into logs
* do not include patient data in debugging output unless explicitly required

Keep mock/demo data clearly separated from application logic.

---

# 35. SECURITY

Never introduce:

* hardcoded credentials
* API keys
* passwords
* tokens
* secrets
* private keys

Never commit secrets.

Do not weaken browser security simply to make development easier.

Do not disable security checks as a workaround.

---

# 36. GIT SAFETY

Do not automatically:

* reset the repository
* checkout another branch
* discard user changes
* delete untracked files
* force-push
* rewrite history

Before destructive Git operations, explicitly ask for confirmation.

Preserve existing user work.

---

# 37. AUTOMATED ANALYSIS PREFERENCE

For large codebases, prefer automated analysis before spending large amounts of context reading files manually.

Useful checks:

```text
file existence
↓
HTML references
↓
JS imports/exports
↓
dependency graph
↓
function references
↓
DOM references
↓
duplicate definitions
↓
runtime testing
```

Use the result to focus manual inspection on actual problem areas.

---

# 38. WHEN A TASK IS AMBIGUOUS

If the requested result can be safely inferred, choose the smallest reasonable implementation.

If multiple interpretations would produce substantially different architecture or behavior:

ASK before modifying.

Do not make a large architectural decision silently.

---

# 39. WHEN A REQUEST CONFLICTS WITH THIS FILE

If a user explicitly requests an architectural change that conflicts with these defaults:

* follow the user's explicit request
* preserve unrelated project rules
* minimize the scope of the exception
* document the exception if it affects future maintainability

---

# 40. REQUIRED WORKFLOW FOR CODE CHANGES

Every meaningful code change should follow:

```text
1. READ
   ↓
2. SEARCH
   ↓
3. ANALYZE DEPENDENCIES
   ↓
4. PLAN MINIMAL CHANGE
   ↓
5. MODIFY
   ↓
6. STATIC VALIDATION
   ↓
7. RUNTIME TEST
   ↓
8. REPORT
   ↓
9. STOP
```

Do not skip directly from:

```text
request → rewrite
```

---

# 41. FINAL RESPONSE FORMAT FOR AGENTS

After completing a task, report:

## Changed

List exact files changed.

## What Changed

Briefly explain the implementation.

## Verification

Report actual checks performed.

Example:

```text
ES module imports: PASS
Circular dependency scan: PASS
Inline handler scan: PASS
Static scanners: PASS
Localhost runtime: PASS
Browser console: 0 application errors
```

## Remaining Issues

List only genuine unresolved issues.

If nothing remains:

```text
Remaining issues: None found.
```

Then STOP.

Do not automatically continue to another improvement.

---

# 42. MOST IMPORTANT RULE

When uncertain:

> Preserve existing behavior over cleverness.
>
> Prefer the smallest safe change over a broad rewrite.
>
> Verify before assuming.
>
> Keep dependencies explicit.
>
> Keep modules responsibility-based.
>
> Keep the code understandable to both humans and AI agents.

---

# 43. CONSOLE LOGGING AND DEBUGGING POLICY

## No Direct Console Logs

Do NOT use raw `console.log()`, `console.info()`, or `console.debug()` for application diagnostics or routine execution tracing.

MediTrail must remain completely silent in the browser console during normal startup, navigation, and user interaction.

## Centralized Debug Logging via debugLog()

Whenever diagnostic logging or debugging output is needed:

- Import and use `debugLog()` from `frontend/js/utils/debug.js` (or `../utils/debug.js` from within views/core):
  ```javascript
  import { debugLog } from '../utils/debug.js';
  debugLog('Diagnostic message', data);
  ```
- `debugLog()` will output ONLY when debug mode is enabled. When debug mode is disabled, it produces zero output.

## How Debug Mode is Controlled

Debug mode is controlled in two ways:

1. **Server Flag (Persistent)**: Set `DEBUG_MODE = True` or `DEBUG_MODE = False` in `runner.py`. The server automatically injects this configuration via `/js/debug-config.js`.
2. **Browser Console (Runtime on-the-fly)**: Call `window.enableDebug()` or `window.disableDebug()` directly in DevTools to toggle debug logging dynamically without restarting.

## Clean Up Temporary Logs

- Remove temporary troubleshooting logs when completing a task.
- If a diagnostic log is kept for development, ensure it is wrapped with `debugLog()` so it respects the debug toggle.
- Do NOT disable or suppress real browser errors (`console.error` for uncaught runtime exceptions).

