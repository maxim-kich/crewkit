## Slop-Disclaimer

It's a vibe coded experiment that helped me personally as a lead of 15 Designers to manage their data and prepare my exit from company, without clear process. Use it as you wish. There is no contribution expected.

# CrewKit

A local-first team evaluation tool. No server, no build step, no dependencies. All state lives in your browser's `localStorage`.

---

## About CrewKit

CrewKit is a local-first, open-source team evaluation platform built with vanilla JavaScript. It helps design teams and leaders:

- **Define evaluation frameworks** — Create skill matrices, scoring grids, and assessment templates
- **Track team members** — Manage profiles, skills, proficiency levels, and growth over time
- **Share selectively** — Export individual artifacts, crew profiles, or your complete setup
- **Stay in control** — All data lives in your browser. No backend, no accounts, no data leaving your machine

---

## How to open

### Quick start
Open `index.html` directly in Chrome or Firefox. No server required.

### Setup locally
1. Clone or download the repository: `git clone https://github.com/maxim-kich/crewkit.git`
2. Navigate to the `crewkit` folder
3. Open `index.html` in your browser
4. Create your `setup.json` using the onboarding wizard

---

## File structure

```
crewkit/
├── index.html               # Dashboard (entry point)
├── wizard.html              # Initial setup / onboarding (create setup.json)
├── artifact-builder.html    # Create / edit evaluation artifacts and frameworks
├── crew-member.html         # Create / view / edit team members
├── how-it-works.html        # Help / documentation page
│
├── app.js                   # Core: storage, router, toast, modal, utilities
├── validator.js             # Setup JSON validation (returns { valid, level, errors, warnings })
├── module-base.js           # Shared module utilities: safeSave(), confirmDelete()
├── styles.css               # Structural base styles and spacing tokens
├── design-system.css        # Dark interface tokens and shared components
├── assets/                  # Local cursor assets
│
└── tests/
    └── tests.html           # Browser-runnable validator test suite (open directly)
```

---

## Script load order (module pages)

Each module HTML file loads scripts in this order:

```html
<script src="validator.js"></script>
<script src="app.js"></script>
<script src="module-base.js"></script>
<script>/* page-specific code */</script>
```

`module-base.js` depends on `Validator`, `App`, `Toast`, and `Modal` — all defined by the preceding scripts.

---

## setup.json schema

The setup object stored in `localStorage` under the key `crewkit_setup`:

```jsonc
{
  "meta": {
    "version": "1.0",          // required string
    "createdAt": "ISO date",   // recommended
    "updatedAt": "ISO date"    // recommended
  },
  "company": {
    "name": "string"           // required
  },
  "user": {
    "name": "string"           // required
  },
  "artifacts": [
    {
      "id": "uuid",            // required
      "name": "string",        // required
      "model": "matrix|questionnaire",
      "type": "score|scale|selective",
      "scoreMax": 5,
      "scaleMax": 3,
      "columns": [{ "id": "uuid", "label": "string", "description": "" }],
      "poles":   [{ "id": "uuid", "label": "string", "description": "" }],
      "groups": [
        {
          "id": "uuid",
          "label": "string",
          "rows": [
            { "id": "uuid", "label": "string", "description": "", "poleRight": "", "values": {} }
          ]
        }
      ]
    }
  ],
  "crewMembers": [
    {
      "id": "uuid",
      "name": "string",
      "fields": [],
      "linkedFrameworks": [],
      "notes": [],
      "changeLog": [],
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ],
  "initiatives": {
    "columns": { "todo": "To-do" },
    "columnOrder": ["todo"],
    "todo": []
  }
}
```

---

## Validator

`Validator.validateSetup(data)` returns:

```js
{ valid: boolean, level: 0|1|2, errors: [...], warnings: [...] }
```

- **Level 0** — clean, no issues
- **Level 1** — blocking errors (app redirects to dashboard)
- **Level 2** — warnings only (app continues, banner shown)

---

## Running tests

Open `tests/tests.html` directly in a browser. No server required.

The harness loads `../validator.js` and runs assertions covering root shape, meta, company, user, artifact structure, nested groups/rows/columns, crew members, and initiatives.

---

