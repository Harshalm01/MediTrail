package com.meditrail.db;

import com.meditrail.config.AppConfig;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Manages JDBC connections, schema migrations, and idempotent seed data.
 */
public class DatabaseManager {

    private static final Logger LOGGER = Logger.getLogger(DatabaseManager.class.getName());
    private final AppConfig config;

    public DatabaseManager(AppConfig config) {
        this.config = config;
        loadDriver();
    }

    private void loadDriver() {
        try {
            if ("postgres".equals(config.getDbType())) {
                Class.forName("org.postgresql.Driver");
            } else {
                Class.forName("org.h2.Driver");
            }
        } catch (ClassNotFoundException e) {
            LOGGER.log(Level.SEVERE, "Failed to load JDBC driver for: " + config.getDbType(), e);
        }
    }

    /**
     * Obtains a standard JDBC Connection.
     */
    public Connection getConnection() throws SQLException {
        return DriverManager.getConnection(config.getDbUrl(), config.getDbUser(), config.getDbPassword());
    }

    /**
     * Initializes database tables and demo seed data idempotently.
     */
    public void initialize() {
        LOGGER.info("Initializing database: " + config.getDbType() + " at " + config.getDbUrl());
        try (Connection conn = getConnection()) {
            // 1. Ensure any pre-existing tables are safely migrated (e.g. add missing email column to existing patients)
            migrateExistingTables(conn);

            // 2. Execute schema creation script (creates missing tables and default structures)
            String schemaFile = "postgres".equals(config.getDbType()) ? "/schema-postgres.sql" : "/schema-h2.sql";
            executeSqlScript(conn, schemaFile);

            // 3. Run idempotent database migrations (email column, patient_otps table, conflict-safe demo link)
            runMigrations(conn);

            // 4. Seed initial demo data safely if enabled and not already present
            if (config.isSeedDemoData()) {
                seedInitialData(conn);
            } else {
                LOGGER.info("Demo data seeding skipped (SEED_DEMO_DATA=false).");
            }

            LOGGER.info("Database schema initialized successfully.");
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Database initialization failed: " + e.getMessage(), e);
            throw new RuntimeException("Database initialization failure", e);
        }
    }

    private void migrateExistingTables(Connection conn) {
        try (Statement stmt = conn.createStatement()) {
            // Check if patients table exists; if so, ensure email column is present before any index or query
            try {
                stmt.execute("SELECT 1 FROM patients WHERE 1=0");
                stmt.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS email VARCHAR(255)");
            } catch (SQLException ignored) {
                // patients table does not exist yet; schema script will create it with email column
            }
        } catch (SQLException e) {
            LOGGER.warning("migrateExistingTables warning: " + e.getMessage());
        }
    }

    private void executeSqlScript(Connection conn, String resourcePath) throws Exception {
        InputStream in = getClass().getResourceAsStream(resourcePath);
        if (in == null) {
            throw new IllegalStateException("Schema script not found on classpath: " + resourcePath);
        }

        StringBuilder sql = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.startsWith("--") || trimmed.isEmpty()) {
                    continue;
                }
                sql.append(line).append("\n");
            }
        }

        String[] statements = sql.toString().split(";");
        try (Statement stmt = conn.createStatement()) {
            for (String singleSql : statements) {
                String statementText = singleSql.trim();
                if (!statementText.isEmpty()) {
                    stmt.execute(statementText);
                }
            }
        }
    }

    private void runMigrations(Connection conn) throws SQLException {
        try (Statement stmt = conn.createStatement()) {
            // 1. Add email column to patients if not present and create index
            try {
                stmt.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS email VARCHAR(255)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email)");
            } catch (SQLException e) {
                LOGGER.warning("Patient email migration note: " + e.getMessage());
            }

            // 2. Ensure persistent patient_otps table exists
            String createOtpsSql;
            if ("postgres".equals(config.getDbType())) {
                createOtpsSql = "CREATE TABLE IF NOT EXISTS patient_otps ("
                        + "email VARCHAR(255) PRIMARY KEY, "
                        + "dispatch_id VARCHAR(36) NOT NULL, "
                        + "otp_hash VARCHAR(255) NOT NULL, "
                        + "status VARCHAR(20) DEFAULT 'PENDING_DISPATCH' NOT NULL, "
                        + "lease_expires_at TIMESTAMP WITH TIME ZONE NOT NULL, "
                        + "expires_at TIMESTAMP WITH TIME ZONE NOT NULL, "
                        + "attempts INT DEFAULT 0 NOT NULL, "
                        + "last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL, "
                        + "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL)";
            } else {
                createOtpsSql = "CREATE TABLE IF NOT EXISTS patient_otps ("
                        + "email VARCHAR(255) PRIMARY KEY, "
                        + "dispatch_id VARCHAR(36) NOT NULL, "
                        + "otp_hash VARCHAR(255) NOT NULL, "
                        + "status VARCHAR(20) DEFAULT 'PENDING_DISPATCH' NOT NULL, "
                        + "lease_expires_at TIMESTAMP NOT NULL, "
                        + "expires_at TIMESTAMP NOT NULL, "
                        + "attempts INT DEFAULT 0 NOT NULL, "
                        + "last_sent_at TIMESTAMP NOT NULL, "
                        + "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)";
            }
            stmt.execute(createOtpsSql);
            stmt.execute("CREATE INDEX IF NOT EXISTS idx_patient_otps_dispatch ON patient_otps(dispatch_id)");
            stmt.execute("CREATE INDEX IF NOT EXISTS idx_patient_otps_status ON patient_otps(status)");

            // Dedicated Patient Access OTP table for doctor consultations
            String createAccessOtpsSql;
            if ("postgres".equals(config.getDbType())) {
                createAccessOtpsSql = "CREATE TABLE IF NOT EXISTS patient_access_otps ("
                        + "id VARCHAR(36) PRIMARY KEY, "
                        + "patient_code VARCHAR(32) NOT NULL, "
                        + "doctor_id VARCHAR(255) NOT NULL, "
                        + "doctor_name VARCHAR(255) NOT NULL, "
                        + "hospital_name VARCHAR(255), "
                        + "recipient_email VARCHAR(255) NOT NULL, "
                        + "dispatch_id VARCHAR(36) NOT NULL, "
                        + "otp_hash VARCHAR(255) NOT NULL, "
                        + "status VARCHAR(20) DEFAULT 'PENDING_DISPATCH' NOT NULL, "
                        + "lease_expires_at TIMESTAMP WITH TIME ZONE NOT NULL, "
                        + "expires_at TIMESTAMP WITH TIME ZONE NOT NULL, "
                        + "attempts INT DEFAULT 0 NOT NULL, "
                        + "last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL, "
                        + "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL)";
            } else {
                createAccessOtpsSql = "CREATE TABLE IF NOT EXISTS patient_access_otps ("
                        + "id VARCHAR(36) PRIMARY KEY, "
                        + "patient_code VARCHAR(32) NOT NULL, "
                        + "doctor_id VARCHAR(255) NOT NULL, "
                        + "doctor_name VARCHAR(255) NOT NULL, "
                        + "hospital_name VARCHAR(255), "
                        + "recipient_email VARCHAR(255) NOT NULL, "
                        + "dispatch_id VARCHAR(36) NOT NULL, "
                        + "otp_hash VARCHAR(255) NOT NULL, "
                        + "status VARCHAR(20) DEFAULT 'PENDING_DISPATCH' NOT NULL, "
                        + "lease_expires_at TIMESTAMP NOT NULL, "
                        + "expires_at TIMESTAMP NOT NULL, "
                        + "attempts INT DEFAULT 0 NOT NULL, "
                        + "last_sent_at TIMESTAMP NOT NULL, "
                        + "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)";
            }
            stmt.execute(createAccessOtpsSql);
            stmt.execute("CREATE INDEX IF NOT EXISTS idx_access_otps_pt_doc ON patient_access_otps(patient_code, doctor_id)");
            stmt.execute("CREATE INDEX IF NOT EXISTS idx_access_otps_dispatch ON patient_access_otps(dispatch_id)");
            stmt.execute("CREATE INDEX IF NOT EXISTS idx_access_otps_status ON patient_access_otps(status)");

            // Ensure demo patients have valid contact emails for access OTP delivery
            stmt.executeUpdate("UPDATE patients SET email = 'dev.mandora@somaiya.edu' WHERE patient_code = 'MT-26926' AND (email IS NULL OR email = '')");
            stmt.executeUpdate("UPDATE patients SET email = 'harshal.mehta@somaiya.edu' WHERE patient_code = 'MT-50298' AND (email IS NULL OR email = '')");

            // Persistent active_sessions table to preserve login sessions across server restarts
            String createSessionsSql = "CREATE TABLE IF NOT EXISTS active_sessions ("
                    + "token VARCHAR(100) PRIMARY KEY, "
                    + "user_type VARCHAR(32) NOT NULL, "
                    + "identifier VARCHAR(255) NOT NULL, "
                    + "name VARCHAR(255), "
                    + "role VARCHAR(64), "
                    + "hospital_name VARCHAR(255), "
                    + "created_at BIGINT NOT NULL)";
            stmt.execute(createSessionsSql);
            stmt.execute("CREATE INDEX IF NOT EXISTS idx_active_sessions_ident ON active_sessions(identifier)");
        }


        // 3. Safely link DEMO_PATIENT_EMAIL if configured in development
        String demoEmail = config.getDemoPatientEmail();
        if (demoEmail != null && !demoEmail.trim().isEmpty() && !config.isProduction()) {
            demoEmail = demoEmail.trim();
            // Validate conflict: ensure no other patient already uses this email
            String checkConflict = "SELECT patient_code, name FROM patients WHERE LOWER(email) = LOWER(?) AND patient_code != 'MT-26926'";
            try (PreparedStatement ps = conn.prepareStatement(checkConflict)) {
                ps.setString(1, demoEmail);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        LOGGER.warning("[Auth Warning] DEMO_PATIENT_EMAIL conflict: '" + demoEmail 
                                + "' is already linked to patient " + rs.getString("patient_code") 
                                + " (" + rs.getString("name") + "). Skipping demo email association.");
                        return;
                    }
                }
            }
            // Safely associate with Dev Mandora only if email is currently empty
            String linkSql = "UPDATE patients SET email = ? WHERE patient_code = 'MT-26926' AND (email IS NULL OR email = '')";
            try (PreparedStatement ps = conn.prepareStatement(linkSql)) {
                ps.setString(1, demoEmail);
                int updated = ps.executeUpdate();
                if (updated > 0) {
                    LOGGER.info("[Auth] Associated DEMO_PATIENT_EMAIL (" + demoEmail + ") with demo patient Dev Mandora (MT-26926).");
                }
            }
        }

        // 4. Seed development accounts idempotently for local development only
        if (config.isSeedDemoData() && !config.isProduction()) {
            try {
                // 1. Platform Manager
                ensureDevStaffAccount(conn, "usr-super-admin-dev", "Platform Manager", "superadmin@gmail.com",
                        "super_admin", "hosp-1", "MediTrail Platform", "Platform Administration", "SA-00100-IN", "admin123");
            } catch (SQLException e) {
                LOGGER.warning("Dev accounts migration check note: " + e.getMessage());
            }
        }
    }

    private void ensureDevStaffAccount(Connection conn, String id, String name, String email, String role,
                                       String hospitalId, String hospitalName, String department, String licenseId,
                                       String password) throws SQLException {
        String checkSql = "SELECT id, password_hash, role FROM staff_profiles WHERE LOWER(email) = LOWER(?)";
        try (PreparedStatement ps = conn.prepareStatement(checkSql)) {
            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    String insertSql = "INSERT INTO staff_profiles (id, name, email, role, hospital_id, hospital_name, department, license_id, status, password_hash) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)";
                    try (PreparedStatement ins = conn.prepareStatement(insertSql)) {
                        ins.setString(1, id);
                        ins.setString(2, name);
                        ins.setString(3, email.toLowerCase());
                        ins.setString(4, role);
                        ins.setString(5, hospitalId);
                        ins.setString(6, hospitalName);
                        ins.setString(7, department);
                        ins.setString(8, licenseId);
                        ins.setString(9, com.meditrail.services.AuthService.hashPassword(password));
                        ins.executeUpdate();
                        LOGGER.info("[Auth] Seeded development account (" + email + ") with BCrypt hash.");
                    }
                } else {
                    String existingHash = rs.getString("password_hash");
                    String existingRole = rs.getString("role");
                    boolean needUpdate = !role.equalsIgnoreCase(existingRole);
                    try {
                        if (existingHash == null || !org.mindrot.jbcrypt.BCrypt.checkpw(password, existingHash)) {
                            needUpdate = true;
                        }
                    } catch (Exception e) {
                        needUpdate = true;
                    }
                    if (needUpdate) {
                        String updateSql = "UPDATE staff_profiles SET role = ?, password_hash = ?, status = 'Active' WHERE LOWER(email) = LOWER(?)";
                        try (PreparedStatement up = conn.prepareStatement(updateSql)) {
                            up.setString(1, role);
                            up.setString(2, com.meditrail.services.AuthService.hashPassword(password));
                            up.setString(3, email);
                            up.executeUpdate();
                            LOGGER.info("[Auth] Refreshed development account (" + email + ") role and BCrypt hash.");
                        }
                    }
                }
            }
        }
    }

    /**
     * Seeds initial records matching MediTrail's demo profiles.
     * Delegates to DummyDataSeeder for isolated mock/dummy clinical records.
     */
    private void seedInitialData(Connection conn) throws SQLException {
        DummyDataSeeder.seedDemoData(conn);
    }

    /**
     * Resets a designated demo patient back to their exact original baseline state upon logout.
     * Delegates to DummyDataSeeder. Non-demo patients are strictly untouched.
     */
    public void resetDemoPatientBaseline(String patientCode) throws SQLException {
        if (patientCode == null) return;
        try (Connection conn = getConnection()) {
            DummyDataSeeder.resetPatientBaseline(conn, patientCode);
        }
    }
}
