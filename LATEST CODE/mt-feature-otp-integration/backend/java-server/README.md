# MediTrail Java Backend Server

Lightweight, dependency-free Java backend server for MediTrail using standard Java SE (JDK `HttpServer`, standard JDBC) and H2/PostgreSQL database support.

## Architecture

- **Server**: JDK `com.sun.net.httpserver.HttpServer` with cached thread pool.
- **Local Database**: H2 file-based embedded SQL database (`AUTO_SERVER=TRUE` mode).
- **Deployment Database**: PostgreSQL via standard JDBC driver.
- **Port**: `8080` (configurable via `PORT` environment variable).

## Directory Structure

```text
backend/java-server/
├── bin/                       # Compiled .class files & runtime schema resources
├── data/                      # Persistent H2 file storage (e.g. meditraildb.mv.db)
├── lib/                       # Standalone JDBC drivers
│   ├── h2-2.3.232.jar
│   └── postgresql-42.7.4.jar
├── src/main/
│   ├── java/com/meditrail/
│   │   ├── MediTrailServer.java   # Server entry point
│   │   ├── config/
│   │   │   └── AppConfig.java     # Config & environment variable loader
│   │   ├── db/
│   │   │   └── DatabaseManager.java # Connection pooling, migrations, seed data
│   │   └── handlers/
│   │       └── HealthHandler.java   # /api/health JSON endpoint
│   └── resources/
│       ├── schema-h2.sql          # Local H2 schema DDL
│       └── schema-postgres.sql    # Production PostgreSQL schema DDL
└── README.md
```

## Compilation (Windows PowerShell)

```powershell
# From project root:
Copy-Item backend/java-server/src/main/resources/* backend/java-server/bin/ -Force
javac -cp "backend/java-server/lib/*" -d backend/java-server/bin (Get-ChildItem -Recurse -Filter *.java backend/java-server/src/main/java | Select-Object -ExpandProperty FullName)
```

## Running the Server

### Local Development (Default: H2 File Database)

```powershell
java -cp "backend/java-server/bin;backend/java-server/lib/*" com.meditrail.MediTrailServer
```

Health endpoint: `http://localhost:8080/api/health`

### Deployment (PostgreSQL Mode)

Provide standard environment variables:

```powershell
$env:DB_TYPE="postgres"
$env:DB_URL="jdbc:postgresql://<host>:5432/<dbname>"
$env:DB_USER="<user>"
$env:DB_PASSWORD="<password>"
$env:PORT="8080"
java -cp "backend/java-server/bin;backend/java-server/lib/*" com.meditrail.MediTrailServer
```
