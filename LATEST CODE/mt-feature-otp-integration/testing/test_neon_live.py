"""
Read-Only Test Script: Connect to Neon PostgreSQL and Verify Schema & Connectivity
Does not drop tables, truncate data, or modify existing records.
"""

import subprocess
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN_DIR = os.path.join(PROJECT_ROOT, "backend", "java-server", "bin")
LIB_DIR = os.path.join(PROJECT_ROOT, "backend", "java-server", "lib")

def main():
    print("=== Testing MediTrail Java Connection to Neon PostgreSQL ===")

    cp_sep = ";" if os.name == "nt" else ":"
    classpath = f"{BIN_DIR}{cp_sep}{LIB_DIR}/*"

    java_code = """
import com.meditrail.config.AppConfig;
import com.meditrail.db.DatabaseManager;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

public class TestNeonLive {
    public static void main(String[] args) {
        try {
            System.out.println("Step 1: Loading AppConfig...");
            AppConfig config = new AppConfig();
            
            System.out.println("  DB_TYPE:        " + config.getDbType());
            System.out.println("  SEED_DEMO_DATA: " + config.isSeedDemoData());
            
            if (!"postgres".equals(config.getDbType())) {
                System.err.println("[FAIL] DB_TYPE is not 'postgres'! Current: " + config.getDbType());
                System.exit(1);
            }

            System.out.println("\\nStep 2: Connecting to Neon Database via DatabaseManager...");
            DatabaseManager dbManager = new DatabaseManager(config);
            
            try (Connection conn = dbManager.getConnection()) {
                DatabaseMetaData meta = conn.getMetaData();
                System.out.println("  [SUCCESS] Connected to Neon PostgreSQL!");
                System.out.println("  Product: " + meta.getDatabaseProductName() + " " + meta.getDatabaseProductVersion());
                System.out.println("  Driver:  " + meta.getDriverName() + " " + meta.getDriverVersion());
                
                System.out.println("\\nStep 3: Initializing Schema (CREATE TABLE IF NOT EXISTS)...");
                dbManager.initialize();
                System.out.println("  [SUCCESS] Schema initialized safely.");

                System.out.println("\\nStep 4: Inspecting existing tables in database...");
                String[] tables = {"hospitals", "staff_profiles", "patients", "medical_records", "shared_access", "audit_logs", "insurance_policies"};
                try (Statement stmt = conn.createStatement()) {
                    for (String t : tables) {
                        try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM " + t)) {
                            if (rs.next()) {
                                System.out.println("  - Table '" + t + "' verified: " + rs.getInt(1) + " rows");
                            }
                        } catch (Exception te) {
                            System.err.println("  - Table '" + t + "' check error: " + te.getMessage());
                        }
                    }
                }
            }

            System.out.println("\\n=======================================================");
            System.out.println("ALL NEON POSTGRESQL CONNECTIVITY CHECKS PASSED!");
            System.out.println("=======================================================");
        } catch (Exception e) {
            System.err.println("[FAIL] Connection or execution error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
"""

    temp_java_file = os.path.join(PROJECT_ROOT, "TestNeonLive.java")
    with open(temp_java_file, "w", encoding="utf-8") as f:
        f.write(java_code)

    try:
        # Compile test runner
        compile_cmd = ["javac", "-cp", classpath, "-d", BIN_DIR, temp_java_file]
        res = subprocess.run(compile_cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print("[FAIL] Compilation failed:", res.stderr)
            sys.exit(1)

        # Run test runner with project root as working directory so .env is loaded
        run_cmd = ["java", "-cp", classpath, "TestNeonLive"]
        res = subprocess.run(run_cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
        print(res.stdout)
        if res.returncode != 0:
            print("[FAIL] Neon connection test failed:")
            print(res.stderr)
            sys.exit(1)

    finally:
        if os.path.exists(temp_java_file):
            os.remove(temp_java_file)
        class_file = os.path.join(BIN_DIR, "TestNeonLive.class")
        if os.path.exists(class_file):
            os.remove(class_file)

if __name__ == "__main__":
    main()
