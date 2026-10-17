package com.meditrail.handlers;

import com.meditrail.config.AppConfig;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Serves static assets from the frontend directory for single-service deployment.
 * Enforces strict canonical path verification to prevent path traversal attacks.
 */
public class StaticFileHandler implements HttpHandler {

    private static final Logger LOGGER = Logger.getLogger(StaticFileHandler.class.getName());

    private final AppConfig config;
    private final File frontendDir;
    private final String canonicalFrontendPath;

    private static final Map<String, String> MIME_TYPES = new HashMap<>();

    static {
        MIME_TYPES.put("html", "text/html; charset=UTF-8");
        MIME_TYPES.put("htm", "text/html; charset=UTF-8");
        MIME_TYPES.put("css", "text/css; charset=UTF-8");
        MIME_TYPES.put("js", "application/javascript; charset=UTF-8");
        MIME_TYPES.put("mjs", "application/javascript; charset=UTF-8");
        MIME_TYPES.put("json", "application/json; charset=UTF-8");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("gif", "image/gif");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("ico", "image/x-icon");
        MIME_TYPES.put("pdf", "application/pdf");
        MIME_TYPES.put("txt", "text/plain; charset=UTF-8");
        MIME_TYPES.put("woff", "font/woff");
        MIME_TYPES.put("woff2", "font/woff2");
        MIME_TYPES.put("ttf", "font/ttf");
    }

    public StaticFileHandler(AppConfig config) {
        this.config = config;

        // Locate frontend directory relative to current working directory or known project paths
        File candidate = new File("frontend");
        if (!candidate.isDirectory()) {
            candidate = new File("../frontend");
        }
        if (!candidate.isDirectory()) {
            candidate = new File("../../frontend");
        }

        this.frontendDir = candidate;
        String canonical;
        try {
            canonical = this.frontendDir.getCanonicalPath();
        } catch (IOException e) {
            canonical = this.frontendDir.getAbsolutePath();
        }
        this.canonicalFrontendPath = canonical;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        if (!"GET".equalsIgnoreCase(method) && !"HEAD".equalsIgnoreCase(method)) {
            sendResponse(exchange, 405, "text/plain", "Method Not Allowed".getBytes(StandardCharsets.UTF_8));
            return;
        }

        String rawPath = exchange.getRequestURI().getPath();

        // 1. Handle virtual /js/debug-config.js
        if ("/js/debug-config.js".equals(rawPath) || "js/debug-config.js".equals(rawPath)) {
            boolean isDebug = !config.isProduction();
            String script = "window.__MEDITRAIL_DEBUG__ = " + isDebug + ";\n"
                    + "window.__MEDITRAIL_API_URL__ = '/api';\n";
            byte[] bytes = script.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Cache-Control", "no-cache, no-store, must-revalidate");
            sendResponse(exchange, 200, "application/javascript; charset=UTF-8", bytes);
            return;
        }

        // 2. Normalize route to clean relative path
        String relativePath = rawPath;
        if (relativePath.startsWith("/")) {
            relativePath = relativePath.substring(1);
        }

        // Default root to index.html
        if (relativePath.isEmpty()) {
            relativePath = "index.html";
        }

        // Clean query strings or internal hashes if present in relativePath
        if (relativePath.contains("?")) {
            relativePath = relativePath.substring(0, relativePath.indexOf('?'));
        }

        // Friendly admin routing
        if ("admin".equals(relativePath) || "admin/".equals(relativePath)) {
            relativePath = "admin.html";
        } else if ("portal".equals(relativePath) || "portal/".equals(relativePath)) {
            relativePath = "portal.html";
        }

        // 3. Resolve target file and enforce strict path traversal protection
        File targetFile = new File(frontendDir, relativePath);
        String targetCanonical;
        try {
            targetCanonical = targetFile.getCanonicalPath();
        } catch (IOException e) {
            sendNotFound(exchange);
            return;
        }

        // Check canonical prefix to prevent escaping frontend/
        if (!targetCanonical.startsWith(canonicalFrontendPath)) {
            LOGGER.warning("Path traversal attempt blocked: " + rawPath);
            sendResponse(exchange, 403, "text/plain", "Forbidden".getBytes(StandardCharsets.UTF_8));
            return;
        }

        // Never serve hidden files, .env, or directories
        if (targetFile.getName().startsWith(".") || targetFile.isDirectory() || !targetFile.exists()) {
            sendNotFound(exchange);
            return;
        }

        // 4. Determine content type and transmit bytes
        String ext = getFileExtension(targetFile.getName()).toLowerCase();
        String contentType = MIME_TYPES.getOrDefault(ext, "application/octet-stream");

        long length = targetFile.length();
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("Cache-Control", "no-cache, must-revalidate");

        if ("HEAD".equalsIgnoreCase(method)) {
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
            return;
        }

        exchange.sendResponseHeaders(200, length);
        try (FileInputStream fis = new FileInputStream(targetFile);
             OutputStream os = exchange.getResponseBody()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = fis.read(buffer)) != -1) {
                os.write(buffer, 0, read);
            }
        }
    }

    private void sendNotFound(HttpExchange exchange) throws IOException {
        byte[] bytes = "404 Not Found".getBytes(StandardCharsets.UTF_8);
        sendResponse(exchange, 404, "text/plain; charset=UTF-8", bytes);
    }

    private void sendResponse(HttpExchange exchange, int code, String contentType, byte[] body) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(code, body.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(body);
        }
    }

    private String getFileExtension(String name) {
        int idx = name.lastIndexOf('.');
        return (idx > 0 && idx < name.length() - 1) ? name.substring(idx + 1) : "";
    }
}
