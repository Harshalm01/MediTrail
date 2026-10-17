package com.meditrail;

import com.meditrail.config.AppConfig;
import com.meditrail.db.DatabaseManager;
import com.meditrail.handlers.*;
import com.meditrail.repositories.*;
import com.meditrail.services.AuthService;
import com.sun.net.httpserver.HttpServer;

import java.net.InetSocketAddress;
import java.util.concurrent.Executors;
import java.util.logging.Logger;

/**
 * MediTrail Java Backend Server entry point.
 * Hosts REST endpoints for Patients, Medical Records, Medications, Shared Access, and Hospital Admin.
 */
public class MediTrailServer {

    private static final Logger LOGGER = Logger.getLogger(MediTrailServer.class.getName());

    public static void main(String[] args) {
        try {
            AppConfig config = new AppConfig();
            LOGGER.info("Starting MediTrail Java Backend Server on port " + config.getPort());

            // Initialize database schema and idempotent seed data
            DatabaseManager dbManager = new DatabaseManager(config);
            dbManager.initialize();

            // Repositories
            PatientRepository patientRepository = new PatientRepository(dbManager);
            MedicalRecordRepository recordRepository = new MedicalRecordRepository(dbManager);
            SharedAccessRepository sharedAccessRepository = new SharedAccessRepository(dbManager);
            StaffRepository staffRepository = new StaffRepository(dbManager);
            AuditRepository auditRepository = new AuditRepository(dbManager);
            InsurancePolicyRepository policyRepository = new InsurancePolicyRepository(dbManager);
            OtpRepository otpRepository = new OtpRepository(dbManager);
            com.meditrail.repositories.PatientAccessOtpRepository patientAccessOtpRepository = new com.meditrail.repositories.PatientAccessOtpRepository(dbManager);

            // Services
            AuthService authService = new AuthService(staffRepository);
            com.meditrail.services.StorageService storageService = new com.meditrail.services.StorageService(config);
            com.meditrail.services.BrevoEmailService brevoEmailService = new com.meditrail.services.BrevoEmailService(config);

            // Create HTTP Server binding to configured host interface (e.g. 0.0.0.0 or 127.0.0.1)
            HttpServer server = HttpServer.create(new InetSocketAddress(config.getHost(), config.getPort()), 0);

            // Register REST Endpoints
            server.createContext("/api/health", new HealthHandler(config, dbManager, storageService));
            server.createContext("/api/patient", new PatientAuthHandler(config, patientRepository, authService, dbManager, otpRepository, brevoEmailService));
            server.createContext("/api/records", new RecordsHandler(config, recordRepository, sharedAccessRepository, auditRepository, authService, patientAccessOtpRepository));
            server.createContext("/api/medications", new MedicationsHandler(config, recordRepository));
            server.createContext("/api/shared-access", new SharedAccessHandler(config, sharedAccessRepository, auditRepository, authService));
            server.createContext("/api/admin", new AdminHandler(config, staffRepository, patientRepository, auditRepository, authService, patientAccessOtpRepository, brevoEmailService, sharedAccessRepository));
            server.createContext("/api/policies", new PoliciesHandler(config, policyRepository, storageService, authService));

            // Serve frontend static files at root context /
            server.createContext("/", new StaticFileHandler(config));

            // Cached thread pool for concurrent request execution
            server.setExecutor(Executors.newCachedThreadPool());
            server.start();

            System.out.println("============================================================");
            System.out.println(" MediTrail Java Backend Server is RUNNING");
            System.out.println(" Health Check : http://localhost:" + config.getPort() + "/api/health");
            System.out.println(" REST API Base: http://localhost:" + config.getPort() + "/api");
            System.out.println(" Database     : " + config.getDbType().toUpperCase());
            System.out.println(" JDBC URL     : " + config.getDbUrl());
            System.out.println("============================================================");

            // Register shutdown hook
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                System.out.println("\nShutting down MediTrail Java Server...");
                server.stop(1);
            }));

        } catch (Exception e) {
            LOGGER.severe("Fatal error starting MediTrail server: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
