# MediTrail

MediTrail is a centralized, chronological medical history management system designed for patients and healthcare providers. It provides a clean, unified platform to view clinical events, track active prescriptions, inspect diagnostic reports, manage health insurance policies, and grant time-limited record access to attending physicians.

This repository hosts the frontend prototype, built with browser-native technologies and organized into modular ES modules designed to connect to a future Java backend service.

## Features

- **Marketing Landing Experience (`index.html`)**: Apple-inspired showcase with scroll-snapped visual stages, progressive element reveals, interactive timeline preview card with hover dwell, and floating header navigation.
- **Clinical Patient Portal (`portal.html`)**: Full application shell featuring responsive sidebar navigation, deep-dive record drawer, and tab-based routing.
- **Hospital Staff & Doctor Admin Portal (`admin.html`)**: Encrypted Role-Based Access Control (RBAC) portal for Super Admins, Hospital Admins, and Attending Doctors to manage empanelled physicians, hospital branches, and clinical records.
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

- **Frontend**: HTML5, Vanilla CSS3 (custom properties, Grid, Flexbox), Vanilla JavaScript (ES6+ Modules).
- **Backend**: Plain Java SE (JDK `com.sun.net.httpserver.HttpServer`, standard JDBC, BCrypt password hashing).
- **Local Database**: H2 file-based SQL database with persistent storage (`backend/java-server/data/meditraildb.mv.db`).
- **Production Database**: PostgreSQL (environment-configured via JDBC URL).
- **Development Server**: Python 3 multi-threaded HTTP runner (`runner.py`) with automatic Java compilation and orchestration.

## Project Structure

```text
MediTrail/
├── runner.py               # Single development launcher (auto-compiles Java & serves frontend)
├── README.md               # Project overview and run instructions
├── AGENTS.md               # Authoritative engineering rules
├── frontend/
│   ├── index.html          # Marketing Landing experience & Patient sign-in
│   ├── portal.html         # Clinical Patient Portal shell
│   ├── admin.html          # Hospital Staff & Doctor Admin portal (RBAC)
│   ├── image.png           # Brand logo and favicon asset
│   ├── css/
│   │   ├── style.css       # Global design tokens, reset, typography, and base styles
│   │   └── components.css  # Component rules, view layouts, modals, animations
│   └── js/
│       ├── main.js         # Application bootstrap & DOM event listener initialization
│       ├── app.js          # Application coordinator and backward-compatibility window bridges
│       ├── data.js         # Raw mock patient and clinical history dataset (window.MEDITRAIL_DATA)
│       ├── core/           # Navigation and shared UI utilities
│       ├── services/
│       │   ├── api.js      # Centralized REST API client (connects to Java backend)
│       │   └── data.js     # Data access service layer
│       ├── views/          # Dashboard, timeline, medications, shared-access, emergency, admin
│       ├── utils/          # QR generation and debug utilities
│       └── vendor/         # Bundled jsPDF and QRCode libraries
└── backend/
    ├── supabase_schema.sql # Historical Supabase SQL reference schema
    └── java-server/        # Portable Java SE backend (port 8080)
        ├── lib/            # Standalone JDBC & utility JARs (H2, PostgreSQL, org.json, jbcrypt)
        ├── data/           # Persistent local H2 database storage
        ├── src/main/java/  # Java REST endpoints, services, repositories, and models
        └── src/main/resources/ # DDL schemas (schema-h2.sql, schema-postgres.sql)
```

## Environment Configuration & Getting Started

### 1. Local Environment Setup (.env)

MediTrail supports local configuration via a `.env` file at the project root. A safe template with all supported parameters is tracked in [`.env.example`](.env.example).

**Step-by-step setup:**

1. **Copy `.env.example` to `.env`:**
   ```powershell
   # In PowerShell:
   Copy-Item .env.example .env

   # Or in Command Prompt / Bash:
   cp .env.example .env
   ```

2. **Fill in your Cloudflare R2 credentials in `.env`:**
   Open `.env` in your text editor and update the R2 lines:
   ```ini
   R2_ACCOUNT_ID=your_cloudflare_account_id_here
   R2_ACCESS_KEY_ID=your_r2_access_key_id_here
   R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
   R2_BUCKET_NAME=meditrail
   R2_ENDPOINT=https://435c56d41181e0a6801e630e2c8bd30e.r2.cloudflarestorage.com
   ```
   *Where to find them in Cloudflare Dashboard:*
   - **Account ID**: Navigate to **R2 Overview** > look under **Account Details** on the right side.
   - **Access Key ID & Secret Access Key**: Displayed on screen when creating your R2 API Token (with Object Read & Write permissions).

3. **Keep `.env` out of Git:**
   `.env` and any `.env.*` variants are automatically ignored by Git in `.gitignore`. Only `.env.example` is committed. **Never commit real credentials.**

4. **Production on Render:**
   In production, do not create a `.env` file. Instead, configure the exact same variable names (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `DB_TYPE=postgres`, `DB_URL`, etc.) under your web service's **Environment** tab in the Render Dashboard.

### 2. One-Command Development Launcher (Recommended)

From the project root directory, run:

```powershell
python runner.py
```

The launcher automatically:
1. Loads `.env` if present (shell environment variables take precedence).
2. Detects `javac` and `java` in PATH and compiles Java classes in `backend/java-server/src/`.
3. Passes the loaded environment variables to the Java backend process.
4. Starts the Java backend server on port `8080` (with H2 database persistence in `backend/java-server/data/`).
5. Verifies backend health at `http://localhost:8080/api/health`.
6. Starts the frontend web server on port `8000` (serving `frontend/`).
7. Automatically opens `http://localhost:8000/`.
8. Shuts down both services cleanly on `Ctrl+C`.

### 3. Configurable Ports & Shell Overrides

Environment variables set directly in your shell take precedence over `.env`:

```powershell
# Custom frontend port (default 8000) and custom API port (default 8080)
$env:FRONTEND_PORT="3000"
$env:API_PORT="8085"
python runner.py
```

**Port Precedence**:
- Frontend: `$env:FRONTEND_PORT` -> `$env:PORT` -> `.env` -> default `8000`
- Backend: `$env:API_PORT` -> `$env:JAVA_PORT` -> `$env:SERVER_PORT` -> `.env` -> default `8080`

### 4. Independent Java Server Startup (Production / PaaS)

In a containerized or cloud production deployment (such as Render or Docker), the Java backend can run standalone without the Python runner:

```powershell
# Set production environment variables
$env:ENV="production"
$env:PORT="8080"
$env:DB_TYPE="postgres"
$env:DB_URL="jdbc:postgresql://<host>:5432/<dbname>"
$env:DB_USER="<db_user>"
$env:DB_PASSWORD="<db_password>"
$env:ALLOWED_ORIGINS="https://yourfrontend.domain.com"

# Run standalone Java server
java -cp "backend/java-server/bin;backend/java-server/lib/*" com.meditrail.MediTrailServer
```

### URLs

- **Marketing Landing & Patient Sign In**: `http://localhost:8000/`
- **Clinical Patient Portal**: `http://localhost:8000/portal.html`
- **Hospital Staff & Doctor Admin Portal**: `http://localhost:8000/admin.html` (or `http://localhost:8000/admin`)
- **Backend API Base**: `http://localhost:8080/api`
- **Health Check Endpoint**: `http://localhost:8080/api/health`

