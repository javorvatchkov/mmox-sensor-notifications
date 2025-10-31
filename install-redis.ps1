# Redis Installation Script for Windows
Write-Host "🚀 Installing Redis for Windows..." -ForegroundColor Green

# Create Redis directory
$redisDir = "C:\Redis"
if (!(Test-Path $redisDir)) {
    New-Item -ItemType Directory -Path $redisDir -Force
    Write-Host "📁 Created Redis directory: $redisDir" -ForegroundColor Yellow
}

# Download Redis
$redisUrl = "https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.zip"
$zipPath = "$redisDir\redis.zip"

Write-Host "📥 Downloading Redis..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $redisUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "✅ Redis downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download Redis: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Extract Redis
Write-Host "📦 Extracting Redis..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $zipPath -DestinationPath $redisDir -Force
    Remove-Item $zipPath -Force
    Write-Host "✅ Redis extracted successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to extract Redis: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Add Redis to PATH
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$redisDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$redisDir", "User")
    Write-Host "✅ Added Redis to PATH" -ForegroundColor Green
}

# Create Redis service (optional)
Write-Host "🔧 Setting up Redis service..." -ForegroundColor Yellow
$redisExe = "$redisDir\redis-server.exe"
if (Test-Path $redisExe) {
    # Install Redis as Windows service
    try {
        & $redisExe --service-install --service-name "Redis" --port 6379
        Write-Host "✅ Redis service installed" -ForegroundColor Green
        
        # Start Redis service
        Start-Service -Name "Redis" -ErrorAction SilentlyContinue
        Write-Host "✅ Redis service started" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Could not install Redis as service, but manual start will work" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Redis executable not found at $redisExe" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Redis installation completed!" -ForegroundColor Green
Write-Host "📋 You can now:" -ForegroundColor Cyan
Write-Host "   • Test Redis: redis-cli ping" -ForegroundColor White
Write-Host "   • Start Redis manually: redis-server" -ForegroundColor White
Write-Host "   • Run your MMOX system: npm run dev:all" -ForegroundColor White

# Test Redis
Write-Host "🧪 Testing Redis connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $testResult = & "$redisDir\redis-cli.exe" ping 2>$null
    if ($testResult -eq "PONG") {
        Write-Host "✅ Redis is running and responding!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Redis installed but not responding. Try restarting your terminal." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Redis installed but test failed. Try restarting your terminal." -ForegroundColor Yellow
}
