const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import shared utilities
const { Database, RedisClient } = require('../../shared');

const app = express();
const port = process.env.PORT || 3003;

// Initialize services
const db = new Database();
const redis = new RedisClient();

// Service state
let isRunning = false;
let lastRunTime = null;
let emailsProduced = 0;
let errorCount = 0;
let instanceId = uuidv4();

// Configuration
const EMAIL_BUNDLE_INTERVAL = process.env.EMAIL_BUNDLE_INTERVAL_MINUTES || 5;
const MIN_ALERTS_FOR_EMAIL = parseInt(process.env.MIN_ALERTS_FOR_EMAIL) || 1;
const MAX_ALERTS_PER_EMAIL = parseInt(process.env.MAX_ALERTS_PER_EMAIL) || 50;
const EMAIL_BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE) || 10;
const INSTANCE_LOCK_TTL = parseInt(process.env.INSTANCE_LOCK_TTL_SECONDS) || 300;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'email-producer',
        instanceId: instanceId,
        running: isRunning,
        lastRun: lastRunTime,
        emailsProduced: emailsProduced,
        errors: errorCount,
        timestamp: new Date().toISOString()
    });
});

// Get service statistics
app.get('/api/stats', async (req, res) => {
    try {
        const queueStats = await redis.getQueueStats();
        
        // Get pending notifications count
        const pendingNotificationsResult = await db.query(`
            SELECT COUNT(*) as count 
            FROM notifications 
            WHERE email_sent = false
        `);

        // Get email jobs stats
        const emailJobsResult = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM email_jobs 
            GROUP BY status
        `);

        const emailJobStats = {};
        emailJobsResult.rows.forEach(row => {
            emailJobStats[row.status] = parseInt(row.count);
        });

        res.json({
            service: 'email-producer',
            instanceId: instanceId,
            running: isRunning,
            lastRun: lastRunTime,
            emailsProduced: emailsProduced,
            errors: errorCount,
            queues: queueStats,
            pendingNotifications: parseInt(pendingNotificationsResult.rows[0].count),
            emailJobs: emailJobStats,
            config: {
                intervalMinutes: EMAIL_BUNDLE_INTERVAL,
                minAlertsForEmail: MIN_ALERTS_FOR_EMAIL,
                maxAlertsPerEmail: MAX_ALERTS_PER_EMAIL,
                batchSize: EMAIL_BATCH_SIZE
            },
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

// Manual trigger endpoint
app.post('/api/process', async (req, res) => {
    try {
        console.log('🔄 Manual email processing triggered');
        const result = await processEmailBundles();
        res.json({
            message: 'Email processing completed',
            ...result
        });
    } catch (error) {
        console.error('❌ Manual processing error:', error);
        res.status(500).json({ 
            error: 'Processing failed',
            details: error.message 
        });
    }
});

// Acquire distributed lock to ensure single instance
async function acquireLock() {
    try {
        const lockKey = 'email-producer:lock';
        const lockValue = instanceId;
        
        // Try to set lock with TTL
        const result = await redis.client.set(lockKey, lockValue, {
            PX: INSTANCE_LOCK_TTL * 1000, // TTL in milliseconds
            NX: true // Only set if key doesn't exist
        });
        
        return result === 'OK';
    } catch (error) {
        console.error('❌ Failed to acquire lock:', error);
        return false;
    }
}

// Release distributed lock
async function releaseLock() {
    try {
        const lockKey = 'email-producer:lock';
        await redis.del(lockKey);
    } catch (error) {
        console.error('❌ Failed to release lock:', error);
    }
}

// Main email bundling process
async function processEmailBundles() {
    if (isRunning) {
        console.log('⚠️ Email processing already running, skipping...');
        return { skipped: true };
    }

    // Try to acquire distributed lock
    const lockAcquired = await acquireLock();
    if (!lockAcquired) {
        console.log('🔒 Another instance is processing emails, skipping...');
        return { skipped: true, reason: 'Another instance is running' };
    }

    isRunning = true;
    lastRunTime = new Date().toISOString();
    let processedNotifications = 0;
    let createdEmailJobs = 0;

    try {
        console.log('🚀 Starting email bundle processing...');

        // Get pending notifications that haven't been emailed
        const pendingNotifications = await db.query(`
            SELECT n.*, c.name as customer_name, c.email as customer_email
            FROM notifications n
            JOIN customers c ON n.customer_id = c.id
            WHERE n.email_sent = false 
              AND n.alert_count >= $1
              AND c.notification_enabled = true
            ORDER BY n.created_at ASC
            LIMIT $2
        `, [MIN_ALERTS_FOR_EMAIL, EMAIL_BATCH_SIZE]);

        console.log(`📬 Found ${pendingNotifications.rows.length} pending notifications`);

        for (const notification of pendingNotifications.rows) {
            try {
                // Get alerts for this notification
                const alertsResult = await db.query(`
                    SELECT a.* 
                    FROM alerts a
                    JOIN notification_alerts na ON a.id = na.alert_id
                    WHERE na.notification_id = $1
                    ORDER BY a.timestamp DESC
                    LIMIT $2
                `, [notification.id, MAX_ALERTS_PER_EMAIL]);

                const alerts = alertsResult.rows;

                // Create email job
                const emailJob = {
                    id: uuidv4(),
                    notification_id: notification.id,
                    recipient_email: notification.customer_email,
                    subject: createEmailSubject(notification, alerts),
                    body: createEmailBody(notification, alerts),
                    status: 'pending',
                    attempts: 0,
                    max_attempts: 3,
                    scheduled_at: new Date().toISOString()
                };

                // Insert email job into database
                await db.query(`
                    INSERT INTO email_jobs (id, notification_id, recipient_email, subject, body, status, attempts, max_attempts, scheduled_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    emailJob.id,
                    emailJob.notification_id,
                    emailJob.recipient_email,
                    emailJob.subject,
                    emailJob.body,
                    emailJob.status,
                    emailJob.attempts,
                    emailJob.max_attempts,
                    emailJob.scheduled_at
                ]);

                // Publish email job to Redis queue
                await redis.publishEmailJob(emailJob);

                console.log(`✅ Email job created for ${notification.customer_email} (${notification.alert_count} alerts)`);

                processedNotifications++;
                createdEmailJobs++;
                emailsProduced++;

            } catch (error) {
                console.error(`❌ Failed to process notification ${notification.id}:`, error);
                errorCount++;
            }
        }

        console.log(`🎉 Email processing completed: ${processedNotifications} notifications, ${createdEmailJobs} email jobs`);

        return {
            processedNotifications,
            createdEmailJobs,
            timestamp: lastRunTime
        };

    } catch (error) {
        console.error('❌ Email bundle processing error:', error);
        errorCount++;
        throw error;
    } finally {
        isRunning = false;
        await releaseLock();
    }
}

// Create email subject line
function createEmailSubject(notification, alerts) {
    const threatCount = notification.alert_count;
    const threatIP = notification.threat_ip;
    const countries = notification.countries ? notification.countries.join(', ') : 'Unknown';
    
    return `🚨 Security Alert: ${threatCount} threat${threatCount > 1 ? 's' : ''} detected from ${threatIP} (${countries})`;
}

// Create email body content
function createEmailBody(notification, alerts) {
    const customerName = notification.customer_name || 'Valued Customer';
    const threatIP = notification.threat_ip;
    const alertCount = notification.alert_count;
    const countries = notification.countries ? notification.countries.join(', ') : 'Unknown';
    const firstSeen = new Date(notification.first_seen).toLocaleString();
    const lastSeen = new Date(notification.last_seen).toLocaleString();

    let body = `Dear ${customerName},

🚨 SECURITY ALERT 🚨

We have detected ${alertCount} security threat${alertCount > 1 ? 's' : ''} from IP address ${threatIP}.

THREAT SUMMARY:
• Threat IP: ${threatIP}
• Country/Region: ${countries}
• Total Alerts: ${alertCount}
• First Detected: ${firstSeen}
• Last Detected: ${lastSeen}

RECENT ALERT DETAILS:
`;

    // Add details for recent alerts (up to 10)
    const recentAlerts = alerts.slice(0, 10);
    recentAlerts.forEach((alert, index) => {
        const timestamp = new Date(alert.timestamp).toLocaleString();
        body += `
${index + 1}. ${timestamp}
   • Direction: ${alert.direction}
   • Target: ${alert.target_ip}
   • Protocol: ${alert.protocol?.toUpperCase() || 'Unknown'}
   • Port: ${alert.destination_port}
   • Hostname: ${alert.hostname}`;
    });

    if (alerts.length > 10) {
        body += `\n\n... and ${alerts.length - 10} more alert${alerts.length - 10 > 1 ? 's' : ''}`;
    }

    body += `

RECOMMENDED ACTIONS:
• Review your network security policies
• Consider blocking the threat IP: ${threatIP}
• Monitor for additional suspicious activity
• Contact support if you need assistance

This is an automated security notification from your sensor system.

Best regards,
Security Team

---
This email was generated automatically. Please do not reply to this email.
For support, contact: support@example.com
`;

    return body;
}

// Setup cron job for automatic processing
const cronExpression = `*/${EMAIL_BUNDLE_INTERVAL} * * * *`; // Every N minutes
console.log(`⏰ Scheduling email processing every ${EMAIL_BUNDLE_INTERVAL} minutes`);

cron.schedule(cronExpression, async () => {
    try {
        await processEmailBundles();
    } catch (error) {
        console.error('❌ Scheduled email processing failed:', error);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down Email Producer Service...');
    isRunning = false;
    await releaseLock();
    await redis.disconnect();
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Shutting down Email Producer Service...');
    isRunning = false;
    await releaseLock();
    await redis.disconnect();
    await db.close();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`🚀 Email Producer Service running on port ${port}`);
    console.log(`📧 Processing emails every ${EMAIL_BUNDLE_INTERVAL} minutes`);
    console.log(`🆔 Instance ID: ${instanceId}`);
    
    // Run initial processing after startup
    setTimeout(async () => {
        try {
            await processEmailBundles();
        } catch (error) {
            console.error('❌ Initial email processing failed:', error);
        }
    }, 5000);
});
