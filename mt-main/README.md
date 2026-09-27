# MediTrail

MediTrail is a centralized, chronological medical history management system designed for patients and healthcare providers. It provides a clean, unified platform to view clinical events, track active prescriptions, inspect diagnostic reports, manage health insurance policies, and grant time-limited record access to attending physicians.

This repository hosts the frontend prototype, built with browser-native technologies and organized into modular ES modules designed to connect to a future Java backend service.

## Features

- **Marketing Landing Experience (`index.html`)**: Apple-inspired showcase with scroll-snapped visual stages, progressive element reveals, interactive timeline preview card with hover dwell, and floating header navigation.
- **Clinical Patient Portal (`portal.html`)**: Full prototype application shell featuring responsive sidebar navigation, deep-dive record drawer, and tab-based routing.
- **Patient Dashboard**: Clinical overview displaying active patient demographics, vitals summary, interactive metric carousel, recent clinical activity, and a quick timeline strip.
- **Chronological Medical Timeline**: Complete medical history organized and grouped by year, featuring category filter pills (`All`, `Surgeries`, `Diagnostics`, `Prescriptions`, etc.), real-time search, and year section jumping.
- **Slide-Over Record Detail Drawer**: Deep-dive clinical inspection drawer displaying physician notes, diagnoses, procedures, prescribed medications, and downloadable official record summaries.
- **Medications & Prescriptions**: Dedicated regimen tracker showing dosage, frequency, prescribing physician, start dates, and refill request actions.
- **Shared Doctor Access**: Access-control management panel displaying authorized healthcare providers, validity periods, permission scopes, and one-click access revocation.
- **Emergency Profile Modal**: Quick-access critical medical ID displaying blood group, severe allergies tag input, dynamic health insurance policy document uploads, pre-existing chronic conditions, and friendly "Nothing added yet. Update it?" empty states.
- **Health Insurance Policy Viewer**: Digital policy certificate modal with cashless hospital coverage details and mock PDF schedule export.
- **QR-Based Sharing Modal**: Temporary encrypted QR code session generator and shareable doctor verification link for contactless clinical handoffs.
- **Responsive Architecture**: Fully responsive design supporting desktop, tablet, and mobile off-canvas drawer navigation.

## Tech Stack

- **HTML5**: Semantic document structure with dual entry points (`index.html` landing page and `portal.html` clinical portal).
- **CSS3**: Vanilla CSS with custom properties (CSS variables), CSS Grid, Flexbox, custom scrollbars, and keyframe animations (no Tailwind or Bootstrap). Organized into `style.css` (design tokens, reset, typography) and `components.css` (components, views, modals, drawer, animations).
- **JavaScript (ES6+)**: Browser-native Vanilla JavaScript utilizing ES Modules (`import`/`export`) without frameworks, bundlers, or npm dependencies.
- **Python**: Standard library multi-threaded HTTP development server (`runner.py`) and static code scanner utilities (`scanner/`).

## Project Structure

```text
MediTrail/
├── frontend/
│   ├── index.html          # Marketing Landing experience
│   ├── portal.html         # Clinical Patient Portal shell
│   ├── image.png           # Brand logo and favicon asset
│   ├── css/
│   │   ├── style.css       # Global design tokens, reset, typography, and base styles
│   │   └── components.css  # Component rules, view layouts, modals, animations, and media queries
│   └── js/
│       ├── main.js         # Application bootstrap & DOM event listener initialization
│       ├── app.js          # Application coordinator and backward-compatibility window bridges
│       ├── data.js         # Raw mock patient and clinical history dataset (window.MEDITRAIL_DATA)
│       ├── core/
│       │   ├── navigation.js# High-level view switching and sidebar tab routing
│       │   └── ui.js       # Shared UI utilities (slide-over drawer, modals, toast system)
│       ├── services/
│       │   └── data.js     # Data access service layer (future Java REST API gateway)
│       ├── views/
│       │   ├── landing.js  # Landing page scroll reveal and presentation behavior
│       │   ├── dashboard.js# Dashboard view rendering and metric carousel
│       │   ├── timeline.js # Medical timeline grouping, search, and category filters
│       │   ├── medications.js# Medications regimen view and refill actions
│       │   ├── shared-access.js# Doctor authorization list and access controls
│       │   └── emergency.js# Emergency summary section and full profile modal
│       └── utils/
│           ├── debug.js    # Centralized toggleable debug logging utility (debugLog)
│           └── qr.js       # Standalone mathematical QR code SVG generator
├── backend/
│   └── [reserved for future Java backend service]
├── agents/
│   └── agent.md            # Agent engineering rules reference
├── scanner/
│   ├── .gitignore          # Scanner report ignore rules
│   ├── audit_scanner.py    # Static analyzer for code metrics and DOM checks
│   └── deep_scan.py        # Token and architectural dependency scanner
├── runner.py               # Lightweight multi-threaded local Python development HTTP server
├── README.md               # Project overview and developer onboarding guide
├── AGENTS.md               # Authoritative engineering rules and multi-agent guidelines
└── .gitignore              # Git ignore rules for caches, artifacts, and OS files
```

## Getting Started

Because MediTrail relies on JavaScript ES Modules (`<script type="module">`), it must be served over a local HTTP server (browsers block ES modules when loaded via `file://` URLs).

### Running Locally

Run the included Python runner from the project root:

```bash
python runner.py
```

The multi-threaded runner serves `frontend/` at `http://localhost:8000/`, injects dynamic debug configuration via virtual `/js/debug-config.js`, and opens the application in your default web browser.

Alternatively, serve the frontend directly using Python's built-in HTTP server:

```bash
cd frontend
python -m http.server 8000
```

### URLs

- **Marketing Landing Experience**: `http://localhost:8000/` (or `http://localhost:8000/index.html`)
- **Clinical Patient Portal**: `http://localhost:8000/portal.html`
