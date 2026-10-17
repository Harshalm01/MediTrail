"""
Focused unit tests for PostgreSQL JDBC URL normalization and Database configuration.
Validates AppConfig.normalizePostgresJdbcUrl logic without modifying live databases.
"""

import subprocess
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN_DIR = os.path.join(PROJECT_ROOT, "backend", "java-server", "bin")
LIB_DIR = os.path.join(PROJECT_ROOT, "backend", "java-server", "lib")

def run_java_test():
    print("=== Testing PostgreSQL JDBC URL Normalization in AppConfig ===")

    cp_sep = ";" if os.name == "nt" else ":"
    classpath = f"{BIN_DIR}{cp_sep}{LIB_DIR}/*"

    # Small Java snippet to execute normalizePostgresJdbcUrl and verify all variations
    java_test_code = """
import com.meditrail.config.AppConfig;

public class TestUrlNorm {
    public static void main(String[] args) {
        // Test 1: Standard Neon postgresql:// URI
        String neonUrl = "postgresql://neondb_owner:npg_secret123@ep-fragrant-pond.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
        String normalized1 = AppConfig.normalizePostgresJdbcUrl(neonUrl);
        assert normalized1.equals("jdbc:postgresql://neondb_owner:npg_secret123@ep-fragrant-pond.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")
            : "Failed Test 1: " + normalized1;
        System.out.println("[PASS] Test 1: postgresql:// normalized to " + normalized1);

        // Test 2: Heroku/Legacy postgres:// URI
        String legacyUrl = "postgres://usr:pwd@host.compute.amazonaws.com:5432/dbname";
        String normalized2 = AppConfig.normalizePostgresJdbcUrl(legacyUrl);
        assert normalized2.equals("jdbc:postgresql://usr:pwd@host.compute.amazonaws.com:5432/dbname")
            : "Failed Test 2: " + normalized2;
        System.out.println("[PASS] Test 2: postgres:// normalized to " + normalized2);

        // Test 3: Already correct jdbc:postgresql:// URI (idempotency, no duplicate jdbc:)
        String alreadyJdbc = "jdbc:postgresql://ep-fragrant-pond.neon.tech/neondb?sslmode=require";
        String normalized3 = AppConfig.normalizePostgresJdbcUrl(alreadyJdbc);
        assert normalized3.equals(alreadyJdbc)
            : "Failed Test 3: " + normalized3;
        System.out.println("[PASS] Test 3: Already jdbc:postgresql:// preserved without duplicate prefix");

        // Test 4: jdbc:postgres:// URI
        String jdbcPostgres = "jdbc:postgres://host/db";
        String normalized4 = AppConfig.normalizePostgresJdbcUrl(jdbcPostgres);
        assert normalized4.equals("jdbc:postgresql://host/db")
            : "Failed Test 4: " + normalized4;
        System.out.println("[PASS] Test 4: jdbc:postgres:// normalized to jdbc:postgresql://");

        // Test 5: Null / Empty fallback
        String fallback = AppConfig.normalizePostgresJdbcUrl("");
        assert fallback.equals("jdbc:postgresql://localhost:5432/meditrail")
            : "Failed Test 5: " + fallback;
        System.out.println("[PASS] Test 5: Empty fallback verified: " + fallback);

        // Test 6: Verify Neon sslmode=require presence check
        assert normalized1.contains("sslmode=require") : "Failed Test 6: sslmode missing";
        System.out.println("[PASS] Test 6: sslmode=require preserved in Neon connection string");

        System.out.println("\\nALL 6 JDBC URL NORMALIZATION TESTS PASSED SUCCESSFULLY!");
    }
}
"""

    temp_java_file = os.path.join(PROJECT_ROOT, "TestUrlNorm.java")
    with open(temp_java_file, "w", encoding="utf-8") as f:
        f.write(java_test_code)

    try:
        # Compile test class
        compile_cmd = ["javac", "-cp", classpath, "-d", BIN_DIR, temp_java_file]
        res = subprocess.run(compile_cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print("[FAIL] Compilation of test class failed:", res.stderr)
            sys.exit(1)

        # Run test class
        run_cmd = ["java", "-ea", "-cp", classpath, "TestUrlNorm"]
        res = subprocess.run(run_cmd, capture_output=True, text=True)
        print(res.stdout)
        if res.returncode != 0:
            print("[FAIL] Test run failed:", res.stderr)
            sys.exit(1)

    finally:
        if os.path.exists(temp_java_file):
            os.remove(temp_java_file)
        # Clean up compiled TestUrlNorm.class
        test_class = os.path.join(BIN_DIR, "TestUrlNorm.class")
        if os.path.exists(test_class):
            os.remove(test_class)

if __name__ == "__main__":
    run_java_test()
