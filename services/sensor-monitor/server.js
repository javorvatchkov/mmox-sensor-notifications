const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import shared utilities
const { Database, RedisClient } = require('../../shared');

const app = express();
const port = process.env.PORT || 3001;

// Initialize services
const db = new Database();
const redis = new RedisClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'sensor-monitor',
        timestamp: new Date().toISOString()
    });
});

// Process incoming sensor alerts
app.post('/api/alerts', async (req, res) => {
    try {
        console.log('📥 Received sensor alert data');
        
        const { attempts } = req.body;
        
        if (!attempts || !Array.isArray(attempts)) {
            return res.status(400).json({ 
                error: 'Invalid alert format: attempts array required' 
            });
        }

        let processedCount = 0;
        const errors = [];

        // Process each attempt in the alert batch
        for (const attempt of attempts) {
            try {
                // Get a random customer for demo purposes
                // In production, this would be determined by the sensor/network
                const customers = await db.getCustomers();
                const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
                
                console.log(`🔍 Debug: Found ${customers.length} customers, selected:`, randomCustomer ? randomCustomer._id : 'none');

                // Transform the alert data to match our schema
                const alertData = {
                    id: uuidv4(),
                    timestamp: new Date(attempt.timestamp),
                    hostname: attempt.hostname,
                    direction: attempt.direction,
                    type: attempt.type,
                    threat_ip: attempt.threat,
                    target_ip: attempt.target,
                    country: attempt.country,
                    source_port: attempt.details.sourcePort,
                    source_ip: attempt.details.sourceIp,
                    destination_port: attempt.details.destinationPort,
                    destination_ip: attempt.details.destinationIp,
                    protocol: attempt.details.protocol,
                    url: attempt.details.url,
                    hash_name: attempt.details.hashName,
                    tcp_state: attempt.details.tcpState,
                    customer_id: randomCustomer ? randomCustomer._id : null
                };

                // Publish to Redis queue for processing
                await redis.publishAlert(alertData);
                processedCount++;

                console.log(`✅ Alert published: ${attempt.threat} -> ${attempt.target}`);

            } catch (error) {
                console.error('❌ Failed to process alert:', error);
                errors.push({
                    alert: attempt,
                    error: error.message
                });
            }
        }

        res.json({
            message: 'Alerts processed',
            processed: processedCount,
            total: attempts.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('❌ Alert processing error:', error);
        res.status(500).json({ 
            error: 'Failed to process alerts',
            details: error.message 
        });
    }
});

// Simulate incoming alerts for testing
app.post('/api/alerts/simulate', async (req, res) => {
    try {
        console.log('🎭 Simulating sensor alerts...');

        // Sample threat IPs and countries for simulation
        const threatIPs = [
            { ip: '109.205.176.19', country: 'FR' },
            { ip: '167.71.177.14', country: 'US' },
            { ip: '104.234.115.44', country: 'CA' },
            { ip: '44.220.185.4', country: 'US' },
            { ip: '152.32.211.69', country: 'HK' },
            { ip: '37.18.100.219', country: 'RU' },
            { ip: '36.50.176.144', country: 'VN' },
            { ip: '20.84.152.213', country: 'US' }
        ];

        const count = req.body.count || 5;
        const attempts = [];

        for (let i = 0; i < count; i++) {
            const threat = threatIPs[Math.floor(Math.random() * threatIPs.length)];
            const sourcePort = Math.floor(Math.random() * 65535) + 1024;
            
            attempts.push({
                timestamp: new Date().toISOString(),
                hostname: "CLD-1-NL-TEST-1-1.cdc.lan",
                direction: "OUTBOUND",
                type: "IP",
                threat: threat.ip,
                target: "172.30.0.250",
                country: threat.country,
                details: {
                    sourcePort: sourcePort,
                    sourceIp: "172.30.0.250",
                    destinationPort: 443,
                    destinationIp: threat.ip,
                    protocol: "tcp",
                    url: null,
                    hashName: null,
                    tcpState: "S"
                }
            });
        }

        // Send the simulated data to our own endpoint
        const simulatedAlert = {
            total: count,
            requestPeriod: {
                from: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                to: new Date().toISOString()
            },
            limit: 50,
            offset: 0,
            filter: "direction:outbound",
            attempts: attempts
        };

        // Process the simulated alerts
        const response = await fetch(`http://localhost:${port}/api/alerts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(simulatedAlert)
        });

        if (response.ok) {
            const result = await response.json();
            res.json({
                message: 'Simulation completed',
                simulated: count,
                ...result
            });
        } else {
            throw new Error('Failed to process simulated alerts');
        }

    } catch (error) {
        console.error('❌ Simulation error:', error);
        res.status(500).json({ 
            error: 'Simulation failed',
            details: error.message 
        });
    }
});

// Get queue statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await redis.getQueueStats();
        res.json({
            service: 'sensor-monitor',
            queues: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({ 
            error: 'Failed to get stats',
            details: error.message 
        });
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down Sensor Monitor Service...');
    await redis.disconnect();
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Shutting down Sensor Monitor Service...');
    await redis.disconnect();
    await db.close();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`🚀 Sensor Monitor Service running on port ${port}`);
    console.log(`📡 Ready to receive alerts at http://localhost:${port}/api/alerts`);
    console.log(`🎭 Simulate alerts at http://localhost:${port}/api/alerts/simulate`);
});
