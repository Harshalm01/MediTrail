# MediTrail

**Centralized, Chronological Medical History & Secure Health Record Management System**

MediTrail is an end-to-end medical history management system for patients, hospitals, and attending physicians. It provides a single source of truth for clinical records, active medications, emergency profiles, diagnostic history, insurance policy documents, and doctor authorization access.

---

## 🌟 Key Features

### 1. Patient Experience & Clinical Portal (`portal.html`)
- **Real-Time 6-Digit Email OTP Authentication**: Secure patient sign-in and new patient registration powered by Brevo Transactional Email API.
- **Interactive Blood Group Selector**: Tactile radio-pill selector (`B+`, `B-`, `A+`, `A-`, `O+`, `O-`, `AB+`, `AB-`) with single-choice enforcement.
- **Streamlined 2-Tier Dashboard**:
  - **Top Row (50% / 50%)**: *Doctors with Access* and *Active Medications* stretched edge-to-edge for optimal clarity.
  - **Bottom Row**: *Quick Medical Timeline* horizontal scroll rail (1.8fr) alongside the *Emergency Contact & Policy Card* (1fr).
- **Chronological Medical Timeline (`timeline.html` / View)**: Complete lifetime medical history grouped by year, with real-time text search and category filter pills (`All`, `Surgeries`, `Diagnostics`, `Prescriptions`, etc.).
- **Deep-Dive Record Detail Drawer**: Slide-over panel displaying comprehensive clinical notes, vitals, procedures, attached lab scans, and prescribing doctors.
- **Active Prescriptions & Regimens**: Regimen tracker detailing dosage, frequency, prescribing doctor, start dates, and refill actions.
- **Emergency Profile & Digital Medical Pass**: Critical medical ID with blood group, allergy tags, pre-existing conditions, emergency contacts, and insurance documents.
- **Official Insurance Policy Viewer**: In-browser PDF certificate viewer with direct "Open in New Tab" support.
- **Secure QR-Based Sharing**: Encrypted, 15-minute time-limited QR codes and doctor links for contactless clinical record handoffs.

### 2. Hospital Staff & Doctor Admin Portal (`admin.html`)
- **Role-Based Access Control (RBAC)**: Secure access for Super Admins, Hospital Admins, and Attending Physicians.
- **Custom Admin Credentials**: Onboarded hospital managers set their own custom, secure passwords (BCrypt hashed with salting).
- **Empanelled Hospital Network**: Create and manage hospital branches, associate attending doctors, and inspect hospital-wide patient activity.
- **Doctor Consultation & Record Creation**: Attending doctors can search patients by ID/mobile, verify patient access via instant 6-digit OTP, view clinical history, and publish new consultation records.

### 3. Dual Storage Architecture (Cloudflare R2 + Local Fallback)
- **Cloudflare R2 Object Storage**: Direct S3-compatible cloud storage for authentic insurance policy PDFs.
- **Zero-Config Local Storage Fallback**: When R2 credentials are not provided, files are automatically stored securely on disk under `backend/java-server/data/storage/policies/` with zero configuration required.

### 4. Marketing Landing Experience (`index.html`)
- Apple-inspired cinematic showcase featuring scroll snapping, progressive element reveals, interactive timeline preview card with hover dwell, and quick prototype access.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Vanilla HTML5, CSS3, ES6+ Modules | Zero frameworks (no React/Vue), CSS Grid & Flexbox, native fetch API |
| **Backend** | Java SE 17 | Lightweight embedded `com.sun.net.httpserver.HttpServer`, standard JDBC |
| **Local Database** | H2 Database Engine | Embedded thread-safe file storage (`backend/java-server/data/meditraildb.mv.db`) |
| **Production Database** | PostgreSQL / Neon | Scalable cloud database via standard JDBC connection string |
| **Email Service** | Brevo API | Real-time delivery of 6-digit verification OTPs |
| **Object Storage** | Cloudflare R2 / Local Disk | S3-compatible cloud storage with automatic local fallback |
| **Development Runner** | Python 3 | Multi-threaded runner (`runner.py`) that compiles Java and serves frontend |
| **Containerization** | Docker | Multi-stage build (`Dockerfile`) for one-click deployment on Render / Cloud |

---

## 📁 Repository Structure

```text
MediTrail/
├── Dockerfile                  # Multi-stage production container build (Java 17 + Frontend)
├── requirements.txt            # Python dependencies (standard library compatible)
├── runner.py                   # Local development launcher (compiles Java & serves frontend)
├── .env.example                # Template for environment configuration
├── AGENTS.md                   # Authoritative engineering guidelines
├── README.md                   # Project documentation
│
├── frontend/                   # Client-side web application
│   ├── index.html              # Marketing Landing & Patient OTP Login/Register
│   ├── portal.html             # Clinical Patient Portal (Dashboard, Timeline, Meds, QR)
│   ├── admin.html              # Hospital Staff & Doctor Admin Portal (RBAC)
│   ├── image.png               # Brand logo and favicon
│   ├── css/
│   │   ├── style.css           # Design tokens, variables, reset, and base typography
│   │   └── components.css      # Component layouts, grids, modals, drawer, animations
│   └── js/
│       ├── main.js             # Bootstrap and top-level DOM event initialization
│       ├── app.js              # Coordinator and global window bridges
│       ├── services/
│       │   ├── api.js          # REST API client for Java backend
│       │   └── data.js         # Frontend data access service layer
│       ├── views/              # View-specific controllers (dashboard, timeline, etc.)
│       └── utils/              # QR generator, PDF helpers, debug utilities
│
└── backend/
    └── java-server/            # Portable Java SE 17 REST API
        ├── lib/                # Standalone JARs (H2, Postgres, Jackson, BCrypt, MinIO, Brevo)
        ├── data/               # Persistent local H2 database & file storage
        ├── src/main/java/      # REST API handlers, models, repositories, and services
        └── src/main/resources/ # SQL schemas (schema-h2.sql, schema-postgres.sql)
```

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in the project directory (or copy from `.env.example`):

```env
# ── Email / OTP Delivery (Brevo) ──────────────────────────────────────────────
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=your_verified_sender@domain.com
BREVO_SENDER_NAME=MediTrail
DEMO_PATIENT_EMAIL=

# ── Server & Networking ───────────────────────────────────────────────────────
FRONTEND_PORT=8000
API_PORT=8080
ENV=development
HOST=0.0.0.0

# ── Database (Local H2 vs Production PostgreSQL) ──────────────────────────────
DB_TYPE=h2
SEED_DEMO_DATA=true
DATABASE_URL=
DB_USER=sa
DB_PASSWORD=

# ── Cloudflare R2 Storage (Optional — falls back to local disk if blank) ───────
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=meditrail
R2_ENDPOINT=

# ── CORS Allowed Origins ──────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

---

## 🚀 Running Locally

### Prerequisites
- **Java JDK 17+** installed and available in PATH (`javac -version`).
- **Python 3.8+** installed (`python --version`).

### Start the Application
From the repository root (or `LATEST CODE/mt-feature-otp-integration`):
```bash
python runner.py
```

The runner automatically:
1. Compiles the Java backend into bytecode (`backend/java-server/bin/`).
2. Starts the Java REST API server on `http://localhost:8080`.
3. Initializes the H2 database and seeds demo patient/doctor accounts.
4. Starts the multi-threaded frontend server on `http://localhost:8000`.
5. Automatically opens the application in your default browser.

### Local Access URLs
- **Patient Portal & Landing**: `http://localhost:8000/`
- **Patient Clinical Portal**: `http://localhost:8000/portal.html`
- **Hospital / Doctor Admin Portal**: `http://localhost:8000/admin.html`
- **Backend Health Check**: `http://localhost:8080/api/health`

---

## ☁️ Deployment Guide (Render.com)

MediTrail includes a production multi-stage **`Dockerfile`** that builds both the Java 17 backend and serves the frontend in a single secure container.

### Deploying on Render:
1. Connect your GitHub repository to [Render.com](https://render.com).
2. Create a **New Web Service**.
3. Configure the following settings in your Render dashboard:
   - **Environment / Runtime**: `Docker`
   - **Root Directory**: `LATEST CODE/mt-feature-otp-integration` *(or `.` if at repo root)*
   - **Dockerfile Path**: `Dockerfile`
4. Under the **Environment** tab, add your environment variables:
   - `ENV=production`
   - `DB_TYPE=h2` *(or `postgres` with your Neon / PostgreSQL connection string)*
   - `BREVO_API_KEY=your_brevo_api_key`
   - `BREVO_SENDER_EMAIL=your_verified_sender_email`
   - `BREVO_SENDER_NAME=MediTrail`
   - `SEED_DEMO_DATA=false`
5. Click **Create Web Service**. Render will automatically build the Docker container and deploy the app.

---

## 🔒 Security & Privacy Architecture

- **End-to-End Ownership**: Patients retain full control over their records, granting time-limited access to authorized physicians.
- **Ephemeral QR Codes**: Clinical QR codes expire automatically after 15 minutes to prevent unauthorized reuse.
- **Zero Raw Secret Leaks**: `.env`, credentials, local database files (`*.mv.db`, `*.db`), and uploaded PDFs are strictly ignored by `.gitignore`.
- **BCrypt Salting**: All doctor and admin passwords are encrypted with industry-standard BCrypt before persistent storage.
