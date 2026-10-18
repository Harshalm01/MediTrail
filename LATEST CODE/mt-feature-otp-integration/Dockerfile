# ==============================================================================
# MediTrail — Production Multi-Stage Dockerfile
# Serves both the Static Frontend and Java REST API on Render
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build stage (compiles Java backend sources against local JAR libraries)
# ------------------------------------------------------------------------------
FROM eclipse-temurin:17-jdk-jammy AS builder

WORKDIR /app

# Copy Java backend source code, resources, and dependencies
COPY backend/java-server/src/ /app/backend/java-server/src/
COPY backend/java-server/lib/ /app/backend/java-server/lib/

# Compile Java source files into /app/backend/java-server/bin
RUN mkdir -p /app/backend/java-server/bin && \
    find /app/backend/java-server/src/main/java -name "*.java" > /app/sources.txt && \
    javac -encoding UTF-8 \
          -cp "/app/backend/java-server/lib/*" \
          -d /app/backend/java-server/bin \
          @/app/sources.txt && \
    rm /app/sources.txt && \
    cp -r /app/backend/java-server/src/main/resources/* /app/backend/java-server/bin/

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM eclipse-temurin:17-jre-jammy AS runtime

WORKDIR /app

# Set non-root system user for container security
RUN groupadd -r meditrail && useradd -r -g meditrail -d /app -s /sbin/nologin meditrail

# Copy compiled classes, resource files, and dependency JARs
COPY --from=builder /app/backend/java-server/bin /app/backend/java-server/bin
COPY --from=builder /app/backend/java-server/lib /app/backend/java-server/lib

# Copy frontend static assets (HTML, CSS, JS, assets)
COPY frontend/ /app/frontend/

# Create data directory with proper ownership
RUN mkdir -p /app/backend/java-server/data && \
    chown -R meditrail:meditrail /app

USER meditrail

# Default container environment variables (Render overrides PORT, DATABASE_URL, etc.)
ENV HOST=0.0.0.0 \
    PORT=8080 \
    ENV=production \
    DB_TYPE=h2 \
    SEED_DEMO_DATA=true

# Expose Render default port
EXPOSE 8080

# Launch the unified MediTrail Java server
ENTRYPOINT ["sh", "-c", "exec java -cp 'backend/java-server/bin:backend/java-server/lib/*:backend/java-server/bin' com.meditrail.MediTrailServer"]

