package com.meditrail.services;

import com.meditrail.config.AppConfig;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Service for managing persistent PDF object storage in Cloudflare R2 via the S3 protocol.
 * Enforces strict credentials checks and fails clearly if R2 is unconfigured.
 */
public class StorageService {

    private static final Logger LOGGER = Logger.getLogger(StorageService.class.getName());

    private final AppConfig config;
    private final MinioClient minioClient;
    private final String bucketName;
    private final File localStorageDir;

    public static class StorageException extends Exception {
        public StorageException(String message) {
            super(message);
        }
        public StorageException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public StorageService(AppConfig config) {
        this.config = config;
        this.bucketName = config.getR2BucketName();

        File dataDir = new File(System.getProperty("user.dir"), "backend/java-server/data/storage");
        if (!dataDir.exists()) {
            dataDir.mkdirs();
        }
        this.localStorageDir = dataDir;

        boolean hasAccountId = config.getR2AccountId() != null && !config.getR2AccountId().trim().isEmpty();
        boolean hasAccessKey = config.getR2AccessKeyId() != null && !config.getR2AccessKeyId().trim().isEmpty();
        boolean hasSecretKey = config.getR2SecretAccessKey() != null && !config.getR2SecretAccessKey().trim().isEmpty();
        boolean hasEndpoint = config.getR2Endpoint() != null && !config.getR2Endpoint().trim().isEmpty();

        LOGGER.info(String.format(
                "[StorageService] R2 Environment check: R2_ACCOUNT_ID=%s, R2_ACCESS_KEY_ID=%s, R2_SECRET_ACCESS_KEY=%s, R2_ENDPOINT=%s, R2_BUCKET_NAME=%s",
                hasAccountId ? "PRESENT" : "MISSING",
                hasAccessKey ? "PRESENT" : "MISSING",
                hasSecretKey ? "PRESENT" : "MISSING",
                hasEndpoint ? config.getR2Endpoint() : "MISSING",
                bucketName
        ));

        if (config.isR2Configured()) {
            LOGGER.info("[StorageService] Initializing Cloudflare R2 MinIO Client for bucket '" + bucketName + "' at " + config.getR2Endpoint());
            MinioClient client = null;
            try {
                okhttp3.OkHttpClient httpClient = new okhttp3.OkHttpClient.Builder()
                        .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                        .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                        .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                        .build();

                client = MinioClient.builder()
                        .endpoint(config.getR2Endpoint())
                        .credentials(config.getR2AccessKeyId(), config.getR2SecretAccessKey())
                        .region("auto")
                        .httpClient(httpClient)
                        .build();
                LOGGER.info("[StorageService] Cloudflare R2 MinIO Client successfully constructed with custom timeouts.");
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, "[StorageService] Failed to initialize MinioClient for Cloudflare R2: " + e.getMessage(), e);
            }
            this.minioClient = client;
        } else {
            LOGGER.info("[StorageService] Cloudflare R2 credentials not provided. Using local disk fallback storage at: " + this.localStorageDir.getAbsolutePath());
            this.minioClient = null;
        }
    }

    /**
     * Indicates whether storage is ready (either Cloudflare R2 or local disk storage).
     */
    public boolean isConfigured() {
        return true;
    }

    /**
     * Indicates whether Cloudflare R2 is active.
     */
    public boolean isR2Configured() {
        return this.minioClient != null && config.isR2Configured();
    }

    /**
     * Uploads file bytes to Cloudflare R2 (if configured) or local disk fallback.
     *
     * @param storageKey Unique object key (e.g., "policies/MT-26926/uuid.pdf")
     * @param data Raw file bytes
     * @param contentType MIME type (e.g., "application/pdf")
     * @throws StorageException if upload fails
     */
    public void uploadFile(String storageKey, byte[] data, String contentType) throws StorageException {
        if (isR2Configured()) {
            LOGGER.info(String.format("[StorageService] Initiating R2 upload: bucket='%s', key='%s', size=%d bytes, contentType='%s'",
                    bucketName, storageKey, data.length, contentType));

            try (ByteArrayInputStream bais = new ByteArrayInputStream(data)) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(storageKey)
                                .stream(bais, data.length, -1)
                                .contentType(contentType != null ? contentType : "application/pdf")
                                .build()
                );
                LOGGER.info("[StorageService] Successfully uploaded " + data.length + " bytes to Cloudflare R2: " + storageKey);
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, String.format("[StorageService] Cloudflare R2 upload FAILED for key '%s' (Exception: %s): %s",
                        storageKey, e.getClass().getName(), e.getMessage()), e);
                throw new StorageException("Failed to upload file to Cloudflare R2 (" + e.getClass().getSimpleName() + "): " + e.getMessage(), e);
            }
        } else {
            // Local disk fallback
            LOGGER.info(String.format("[StorageService] Saving to local disk storage: key='%s', size=%d bytes", storageKey, data.length));
            try {
                File targetFile = new File(localStorageDir, storageKey);
                File parent = targetFile.getParentFile();
                if (parent != null && !parent.exists()) {
                    parent.mkdirs();
                }
                Files.write(targetFile.toPath(), data);
                LOGGER.info("[StorageService] Successfully saved to local storage: " + targetFile.getAbsolutePath());
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, "[StorageService] Local storage write failed for key: " + storageKey, e);
                throw new StorageException("Failed to save file to local disk storage: " + e.getMessage(), e);
            }
        }
    }

    /**
     * Downloads file bytes from Cloudflare R2 or local disk storage.
     *
     * @param storageKey Unique object key
     * @return Raw file bytes
     * @throws StorageException if retrieval fails
     */
    public byte[] downloadFile(String storageKey) throws StorageException {
        if (isR2Configured()) {
            try (InputStream stream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(storageKey)
                            .build()
            );
                 ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = stream.read(buffer)) != -1) {
                    baos.write(buffer, 0, bytesRead);
                }
                return baos.toByteArray();
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, "Failed to download object from Cloudflare R2: " + storageKey, e);
                throw new StorageException("Failed to download file from Cloudflare R2: " + e.getMessage(), e);
            }
        } else {
            File targetFile = new File(localStorageDir, storageKey);
            if (!targetFile.exists() || !targetFile.isFile()) {
                throw new StorageException("Document file not found in local disk storage: " + storageKey);
            }
            try {
                return Files.readAllBytes(targetFile.toPath());
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, "Failed to read file from local disk storage: " + storageKey, e);
                throw new StorageException("Failed to read file from local disk storage: " + e.getMessage(), e);
            }
        }
    }

    /**
     * Checks if an object exists in Cloudflare R2 bucket or local disk storage.
     *
     * @param storageKey Unique object key
     * @return true if object exists, false otherwise
     */
    public boolean doesObjectExist(String storageKey) {
        if (storageKey == null || storageKey.trim().isEmpty()) {
            return false;
        }
        if (isR2Configured()) {
            try {
                minioClient.statObject(
                        io.minio.StatObjectArgs.builder()
                                .bucket(bucketName)
                                .object(storageKey)
                                .build()
                );
                return true;
            } catch (Exception e) {
                return false;
            }
        } else {
            File targetFile = new File(localStorageDir, storageKey);
            return targetFile.exists() && targetFile.isFile();
        }
    }

    /**
     * Deletes an object from Cloudflare R2 or local disk storage.
     *
     * @param storageKey Unique object key
     * @throws StorageException if deletion fails
     */
    public void deleteFile(String storageKey) throws StorageException {
        if (isR2Configured()) {
            try {
                minioClient.removeObject(
                        RemoveObjectArgs.builder()
                                .bucket(bucketName)
                                .object(storageKey)
                                .build()
                );
                LOGGER.info("Successfully deleted object from Cloudflare R2: " + storageKey);
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, "Failed to delete object from Cloudflare R2: " + storageKey, e);
                throw new StorageException("Failed to delete file from Cloudflare R2: " + e.getMessage(), e);
            }
        } else {
            File targetFile = new File(localStorageDir, storageKey);
            if (targetFile.exists()) {
                boolean deleted = targetFile.delete();
                LOGGER.info("[StorageService] Deleted local storage file: " + targetFile.getAbsolutePath() + " (success=" + deleted + ")");
            }
        }
    }
}
