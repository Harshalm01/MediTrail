package com.meditrail.config;

import java.io.File;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * MediTrail Server and Database Configuration.
 * Loads settings from environment variables with safe development defaults.
 * Built for both local development (H2) and cloud deployment (PostgreSQL).
 */
public class AppConfig {

    private final String host;
    private final int port;
    private final String dbType;          // "h2" or "postgres"
    private final String dbUrl;
    private final String dbUser;
    private final String dbPassword;
    private final Set<String> allowedOrigins;
    private final String dbPath;
    private final boolean isProduction;
    private final boolean seedDemoData;

    // Cloudflare R2 Object Storage
    private final String r2AccountId;
    private final String r2AccessKeyId;
    private final String r2SecretAccessKey;
    private final String r2BucketName;
    private final String r2Endpoint;

    // Brevo Transactional Email Configuration
    private final String brevoApiKey;
    private final String brevoSenderEmail;
    private final String brevoSenderName;
    private final String demoPatientEmail;

    public AppConfig() {
        // Load key-value pairs from .env in project root if present
        loadDotEnvFile();

        // Environment Profile: development vs production
        String env = getEnvOrDotEnv("ENV");
        if (env == null || env.trim().isEmpty()) {
            env = getEnvOrDotEnv("ENVIRONMENT");
        }
        this.isProduction = "production".equalsIgnoreCase(env) || "prod".equalsIgnoreCase(env);

        // Host binding: 0.0.0.0 binds to all available network interfaces in cloud containers
        String hostEnv = System.getenv("HOST");
        if (hostEnv == null || hostEnv.trim().isEmpty()) {
            hostEnv = System.getenv("SERVER_HOST");
        }
        this.host = (hostEnv != null && !hostEnv.trim().isEmpty()) ? hostEnv.trim() : "0.0.0.0";

        // Port configuration:
        // Precedence: API_PORT -> SERVER_PORT -> PORT -> default 8080
        String portEnv = System.getenv("API_PORT");
        if (portEnv == null || portEnv.trim().isEmpty()) {
            portEnv = System.getenv("SERVER_PORT");
        }
        if (portEnv == null || portEnv.trim().isEmpty()) {
            portEnv = System.getenv("PORT");
        }
        int parsedPort = 8080;
        if (portEnv != null) {
            try {
                parsedPort = Integer.parseInt(portEnv.trim());
            } catch (NumberFormatException ignored) {}
        }
        this.port = parsedPort;

        // Database engine type ("h2" default for local development, "postgres" for deployment)
        String type = getEnvOrDotEnv("DB_TYPE");
        this.dbType = (type != null && type.equalsIgnoreCase("postgres")) ? "postgres" : "h2";

        // Data directory for local H2 storage
        String baseDataDir = getEnvOrDotEnv("MEDITRAIL_DATA_DIR");
        if (baseDataDir == null || baseDataDir.trim().isEmpty()) {
            baseDataDir = new File(System.getProperty("user.dir"), "backend/java-server/data").getAbsolutePath();
        }
        File dataDir = new File(baseDataDir);
        if (!dataDir.exists()) {
            dataDir.mkdirs();
        }
        this.dbPath = new File(dataDir, "meditraildb").getAbsolutePath().replace('\\', '/');

        // JDBC URL & Credentials
        if ("postgres".equals(this.dbType)) {
            String pgUrl = getEnvOrDotEnv("DB_URL");
            if (pgUrl == null || pgUrl.trim().isEmpty()) {
                pgUrl = getEnvOrDotEnv("DATABASE_URL");
            }
            if (pgUrl == null || pgUrl.trim().isEmpty()) {
                if (isProduction) {
                    throw new IllegalStateException("CRITICAL: DB_URL or DATABASE_URL must be provided when DB_TYPE=postgres in production.");
                }
                pgUrl = "jdbc:postgresql://localhost:5432/meditrail";
            }

            // Extract credentials if embedded in URL (e.g. postgresql://user:password@host/db)
            String extractedUser = null;
            String extractedPassword = null;
            String cleanUrl = pgUrl.trim();

            if (cleanUrl.contains("@")) {
                int atIdx = cleanUrl.indexOf('@');
                int schemeEnd = cleanUrl.indexOf("://");
                if (schemeEnd != -1 && schemeEnd + 3 < atIdx) {
                    String scheme = cleanUrl.substring(0, schemeEnd + 3);
                    String userInfo = cleanUrl.substring(schemeEnd + 3, atIdx);
                    String remainder = cleanUrl.substring(atIdx + 1);
                    if (userInfo.contains(":")) {
                        int colonIdx = userInfo.indexOf(':');
                        extractedUser = userInfo.substring(0, colonIdx);
                        extractedPassword = userInfo.substring(colonIdx + 1);
                    } else {
                        extractedUser = userInfo;
                    }
                    cleanUrl = scheme + remainder;
                }
            }

            this.dbUrl = normalizePostgresJdbcUrl(cleanUrl);
            String u = getEnvOrDotEnv("DB_USER");
            if (u != null && !u.trim().isEmpty()) {
                this.dbUser = u.trim();
            } else if (extractedUser != null && !extractedUser.trim().isEmpty()) {
                this.dbUser = extractedUser.trim();
            } else {
                this.dbUser = "postgres";
            }

            String p = getEnvOrDotEnv("DB_PASSWORD");
            if (p != null && !p.trim().isEmpty()) {
                this.dbPassword = p;
            } else if (extractedPassword != null) {
                this.dbPassword = extractedPassword;
            } else {
                this.dbPassword = "";
            }
        } else {
            // Local H2 file-based persistence: AUTO_SERVER=TRUE ensures thread safety and inspectability
            String h2Url = getEnvOrDotEnv("DB_URL");
            this.dbUrl = (h2Url != null && !h2Url.trim().isEmpty())
                    ? h2Url
                    : "jdbc:h2:file:" + this.dbPath + ";AUTO_SERVER=TRUE;DB_CLOSE_DELAY=-1";
            String u = getEnvOrDotEnv("DB_USER");
            this.dbUser = (u != null && !u.trim().isEmpty()) ? u.trim() : "sa";
            String p = getEnvOrDotEnv("DB_PASSWORD");
            this.dbPassword = (p != null) ? p : "";
        }

        // Demo data seeding flag: defaults to true in development, false in production unless SEED_DEMO_DATA=true
        String seedEnv = getEnvOrDotEnv("SEED_DEMO_DATA");
        if (seedEnv != null) {
            this.seedDemoData = Boolean.parseBoolean(seedEnv.trim());
        } else {
            this.seedDemoData = !this.isProduction;
        }

        // Configurable CORS origins: parses comma-separated list of allowed origins
        String origins = System.getenv("ALLOWED_ORIGINS");
        this.allowedOrigins = new HashSet<>();
        if (origins != null && !origins.trim().isEmpty()) {
            for (String o : origins.split(",")) {
                if (!o.trim().isEmpty()) {
                    this.allowedOrigins.add(o.trim());
                }
            }
        } else {
            // Local development trusted defaults
            this.allowedOrigins.addAll(Arrays.asList(
                    "http://localhost:8000",
                    "http://127.0.0.1:8000",
                    "http://localhost:8080",
                    "http://127.0.0.1:8080"
            ));
        }

        // Cloudflare R2 Object Storage Initialization
        this.r2AccountId = getEnvOrDotEnv("R2_ACCOUNT_ID");
        this.r2AccessKeyId = getEnvOrDotEnv("R2_ACCESS_KEY_ID");
        this.r2SecretAccessKey = getEnvOrDotEnv("R2_SECRET_ACCESS_KEY");
        String bucket = getEnvOrDotEnv("R2_BUCKET_NAME");
        this.r2BucketName = (bucket != null && !bucket.trim().isEmpty()) ? bucket.trim() : "meditrail";

        String endpoint = getEnvOrDotEnv("R2_ENDPOINT");
        if (endpoint != null && !endpoint.trim().isEmpty()) {
            this.r2Endpoint = endpoint.trim();
        } else if (this.r2AccountId != null && !this.r2AccountId.trim().isEmpty()) {
            this.r2Endpoint = "https://" + this.r2AccountId.trim() + ".r2.cloudflarestorage.com";
        } else {
            this.r2Endpoint = null;
        }

        // Brevo Transactional Email Configuration
        this.brevoApiKey = getEnvOrDotEnv("BREVO_API_KEY");
        this.brevoSenderEmail = getEnvOrDotEnv("BREVO_SENDER_EMAIL");
        String senderName = getEnvOrDotEnv("BREVO_SENDER_NAME");
        this.brevoSenderName = (senderName != null && !senderName.trim().isEmpty()) ? senderName.trim() : "MediTrail";
        this.demoPatientEmail = getEnvOrDotEnv("DEMO_PATIENT_EMAIL");
    }

    private final java.util.Map<String, String> dotEnvProps = new java.util.HashMap<>();

    private void loadDotEnvFile() {
        // Look for .env in current working dir or parent paths
        String[] candidatePaths = {
            ".env",
            "../.env",
            "../../.env",
            new File(System.getProperty("user.dir"), ".env").getAbsolutePath(),
            new File(System.getProperty("user.dir"), "../.env").getAbsolutePath()
        };

        for (String p : candidatePaths) {
            File f = new File(p);
            if (f.exists() && f.isFile()) {
                try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(f))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) continue;
                        int idx = line.indexOf('=');
                        String k = line.substring(0, idx).trim();
                        String v = line.substring(idx + 1).trim();
                        if (v.length() >= 2 && ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'")))) {
                            v = v.substring(1, v.length() - 1);
                        }
                        if (!k.isEmpty() && !dotEnvProps.containsKey(k)) {
                            dotEnvProps.put(k, v);
                        }
                    }
                } catch (Exception ignored) {
                }
                break;
            }
        }
    }

    private String getEnvOrDotEnv(String key) {
        String sysVal = System.getenv(key);
        if (sysVal != null && !sysVal.trim().isEmpty()) {
            return sysVal.trim();
        }
        String dotVal = dotEnvProps.get(key);
        if (dotVal != null && !dotVal.trim().isEmpty()) {
            return dotVal.trim();
        }
        return null;
    }

    public String getHost() { return host; }
    public int getPort() { return port; }
    public String getDbType() { return dbType; }
    public String getDbUrl() { return dbUrl; }
    public String getDbUser() { return dbUser; }
    public String getDbPassword() { return dbPassword; }
    public Set<String> getAllowedOrigins() { return allowedOrigins; }
    public String getDbPath() { return dbPath; }
    public boolean isProduction() { return isProduction; }
    public boolean isSeedDemoData() { return seedDemoData; }

    public String getR2AccountId() { return r2AccountId; }
    public String getR2AccessKeyId() { return r2AccessKeyId; }
    public String getR2SecretAccessKey() { return r2SecretAccessKey; }
    public String getR2BucketName() { return r2BucketName; }
    public String getR2Endpoint() { return r2Endpoint; }

    /**
     * Checks if all required Cloudflare R2 credentials and endpoint are present.
     */
    public boolean isR2Configured() {
        return r2AccessKeyId != null && !r2AccessKeyId.trim().isEmpty()
                && r2SecretAccessKey != null && !r2SecretAccessKey.trim().isEmpty()
                && r2Endpoint != null && !r2Endpoint.trim().isEmpty();
    }

    public String getBrevoApiKey() { return brevoApiKey; }
    public String getBrevoSenderEmail() { return brevoSenderEmail; }
    public String getBrevoSenderName() { return brevoSenderName; }
    public String getDemoPatientEmail() { return demoPatientEmail; }

    /**
     * Checks if Brevo API Key and verified sender email are configured.
     */
    public boolean isBrevoConfigured() {
        return brevoApiKey != null && !brevoApiKey.trim().isEmpty()
                && brevoSenderEmail != null && !brevoSenderEmail.trim().isEmpty();
    }

    public boolean isOriginAllowed(String origin) {
        if (origin == null || origin.trim().isEmpty()) return true;
        // In local development, allow any localhost origin
        if (!isProduction && (origin.contains("localhost") || origin.contains("127.0.0.1"))) {
            return true;
        }
        return allowedOrigins.contains(origin) || allowedOrigins.contains("*");
    }

    /**
     * Standardizes PostgreSQL connection URIs (e.g. postgres://, postgresql://, or jdbc:postgresql://)
     * into a valid JDBC URL for org.postgresql.Driver without duplicate prefixes.
     *
     * @param rawUrl Raw URL from environment or configuration
     * @return Formatted JDBC URL (e.g. jdbc:postgresql://host:port/db?sslmode=require)
     */
    public static String normalizePostgresJdbcUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return "jdbc:postgresql://localhost:5432/meditrail";
        }
        String trimmed = rawUrl.trim();
        if (trimmed.startsWith("jdbc:postgresql://")) {
            return trimmed;
        }
        if (trimmed.startsWith("jdbc:postgres://")) {
            return "jdbc:postgresql://" + trimmed.substring("jdbc:postgres://".length());
        }
        if (trimmed.startsWith("postgresql://")) {
            return "jdbc:" + trimmed;
        }
        if (trimmed.startsWith("postgres://")) {
            return "jdbc:postgresql://" + trimmed.substring("postgres://".length());
        }
        if (trimmed.startsWith("jdbc:")) {
            return trimmed;
        }
        return "jdbc:postgresql://" + trimmed;
    }
}
