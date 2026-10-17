# MediTrail Java Backend Build Script
Write-Host "Copying resources..."
Copy-Item backend/java-server/src/main/resources/* backend/java-server/bin/ -Force

Write-Host "Finding Java source files..."
$sources = Get-ChildItem -Recurse -Filter *.java backend/java-server/src/main/java | Select-Object -ExpandProperty FullName

Write-Host "Compiling Java files..."
javac -encoding UTF-8 -cp "backend/java-server/lib/*" -d backend/java-server/bin $sources

if ($LASTEXITCODE -eq 0) {
    Write-Host "JAVA_BUILD_SUCCESS"
} else {
    Write-Host "JAVA_BUILD_FAILED with code $LASTEXITCODE"
    exit 1
}
