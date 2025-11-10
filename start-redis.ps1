# Simple Redis installer and starter for Windows
$redisDir = "C:\Redis"
$redisUrl = "https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.zip"

# Create Redis directory
if (!(Test-Path $redisDir)) {
    New-Item -ItemType Directory -Path $redisDir -Force
    Write-Host "Created Redis directory: $redisDir"
}

# Download Redis if not exists
$redisExe = "$redisDir\redis-server.exe"
if (!(Test-Path $redisExe)) {
    Write-Host "Downloading Redis..."
    $zipPath = "$redisDir\redis.zip"
    Invoke-WebRequest -Uri $redisUrl -OutFile $zipPath -UseBasicParsing
    
    Write-Host "Extracting Redis..."
    Expand-Archive -Path $zipPath -DestinationPath $redisDir -Force
    Remove-Item $zipPath -Force
}

# Start Redis
Write-Host "Starting Redis server on port 6379..."
& $redisExe --port 6379
