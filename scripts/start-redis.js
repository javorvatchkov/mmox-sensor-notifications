const { spawn, exec } = require('child_process');
const path = require('path');

async function checkRedis() {
    return new Promise((resolve) => {
        exec('redis-cli ping', (error, stdout) => {
            if (error) {
                resolve(false);
            } else {
                resolve(stdout.trim() === 'PONG');
            }
        });
    });
}

async function startRedis() {
    console.log('🔍 Checking if Redis is running...');
    
    const isRunning = await checkRedis();
    if (isRunning) {
        console.log('✅ Redis is already running');
        return;
    }

    console.log('🚀 Starting Redis server...');
    
    // Try different Redis startup methods
    const redisPaths = [
        'redis-server',
        'redis-server.exe',
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Redis', 'redis-server.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'redis-server.exe')
    ];

    let redisStarted = false;

    for (const redisPath of redisPaths) {
        try {
            console.log(`🔄 Trying to start Redis with: ${redisPath}`);
            
            const redis = spawn(redisPath, ['--port', '6379'], {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });

            redis.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('Ready to accept connections')) {
                    console.log('✅ Redis server started successfully');
                    redisStarted = true;
                }
                // Only show important Redis messages
                if (output.includes('Server initialized') || 
                    output.includes('Ready to accept connections') ||
                    output.includes('Background saving')) {
                    console.log(`📡 Redis: ${output.trim()}`);
                }
            });

            redis.stderr.on('data', (data) => {
                const error = data.toString();
                if (!error.includes('WARNING') && !error.includes('notice')) {
                    console.error(`❌ Redis error: ${error.trim()}`);
                }
            });

            redis.on('error', (error) => {
                console.log(`⚠️ Could not start Redis with ${redisPath}: ${error.message}`);
            });

            redis.on('exit', (code) => {
                if (code !== 0 && code !== null) {
                    console.log(`⚠️ Redis exited with code ${code}`);
                }
            });

            // Wait a moment to see if Redis starts successfully
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const isNowRunning = await checkRedis();
            if (isNowRunning) {
                console.log('✅ Redis is now running and responding');
                redisStarted = true;
                break;
            }

        } catch (error) {
            console.log(`⚠️ Failed to start Redis with ${redisPath}: ${error.message}`);
            continue;
        }
    }

    if (!redisStarted) {
        console.log('❌ Could not start Redis automatically.');
        console.log('📋 Please install Redis manually:');
        console.log('   • Download from: https://redis.io/download');
        console.log('   • Or use Docker: docker run -d -p 6379:6379 redis:alpine');
        console.log('   • Or use WSL: sudo apt-get install redis-server');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Redis startup script...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Redis startup script...');
    process.exit(0);
});

if (require.main === module) {
    startRedis().catch(console.error);
}

module.exports = { startRedis, checkRedis };
