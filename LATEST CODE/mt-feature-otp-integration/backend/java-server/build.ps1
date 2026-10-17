# MediTrail Java Server Build & Compilation Script
$ErrorActionPreference = "Stop"

$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$ProjectDir = Resolve-Path "$PSScriptRoot"
$SrcDir = Join-Path $ProjectDir "src\main\java"
$BinDir = Join-Path $ProjectDir "bin"
$LibDir = Join-Path $ProjectDir "lib"
$SourcesFile = Join-Path $ProjectDir "sources.txt"

Write-Host "Compiling MediTrail Java Backend..."
if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir | Out-Null
}

# Collect all java files
Get-ChildItem -Path $SrcDir -Filter "*.java" -Recurse | ForEach-Object { "`"$($_.FullName.Replace('\', '/'))`"" } | Out-File -FilePath $SourcesFile -Encoding ascii

$cp = "$LibDir\*"
Write-Host "Running javac..."
& javac -encoding UTF-8 -cp "$cp" -d "$BinDir" "@$SourcesFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Compilation successful!" -ForegroundColor Green
} else {
    Write-Error "Compilation failed with exit code $LASTEXITCODE"
}
