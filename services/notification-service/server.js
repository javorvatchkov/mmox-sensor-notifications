const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
// Removed MongoDB dependency
require('dotenv').config();

// Import shared utilities
const { Database, RedisClient } = require('../../shared');

const app = express();
const port = process.env.PORT || 3002;

// Initialize services
const db = new Database();
const redis = new RedisClient();

// Service state
let isProcessing = false;
let processedCount = 0;
let errorCount = 0;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'notification-service',
        processing: isProcessing,
        processed: processedCount,
        errors: errorCount,
        timestamp: new Date().toISOString()
    });
});

// Get alerts with filtering
app.get('/api/alerts', async (req, res) => {
    try {
        const filters = {
            direction: req.query.direction,
            threat_ip: req.query.threat_ip,
            country: req.query.country,
            from_date: req.query.from_date,
            to_date: req.query.to_date,
            limit: parseInt(req.query.limit) || 100
        };

        // Remove undefined filters
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) {
                delete filters[key];
            }
        });

        const alerts = await db.getAlerts(filters);
        
        res.json({
            alerts,
            count: alerts.length,
            filters: filters
        });

    } catch (error) {
        console.error('❌ Failed to get alerts:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve alerts',
            details: error.message 
        });
    }
});

// Get notifications with filtering
app.get('/api/notifications', async (req, res) => {
    try {
        const filters = {
            email_sent: req.query.email_sent !== undefined ? req.query.email_sent === 'true' : undefined,
            customer_id: req.query.customer_id,
            limit: parseInt(req.query.limit) || 100
        };

        // Remove undefined filters
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) {
                delete filters[key];
            }
        });

        const notifications = await db.getNotifications(filters);
        
        res.json({
            notifications,
            count: notifications.length,
            filters: filters
        });

    } catch (error) {
        console.error('❌ Failed to get notifications:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve notifications',
            details: error.message 
        });
    }
});

// Get service statistics
app.get('/api/stats', async (req, res) => {
    try {
        const queueStats = await redis.getQueueStats();
        
        // Get database stats using MongoDB
        const stats = await db.getStats();

        res.json({
            service: 'notification-service',
            processing: isProcessing,
            processed: processedCount,
            errors: errorCount,
            queues: queueStats,
            database: stats,
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

// Process alerts from Redis queue
async function processAlerts() {
    if (isProcessing) {
        return;
    }

    isProcessing = true;
    console.log('🔄 Starting alert processing...');

    try {
        while (true) {
            try {
                // Consume alert from queue (blocking call with timeout)
                const alert = await redis.consumeAlert();
                
                if (!alert) {
                    console.log('📭 No alerts in queue, waiting...');
                    continue;
                }

                console.log(`📥 Processing alert: ${alert.threat_ip} -> ${alert.target_ip}`);

                // Store alert in database
                const alertId = await db.insertAlert(alert);
                console.log(`✅ Alert stored with ID: ${alertId}`);

                // Create or update notification
                await createOrUpdateNotification(alert, alertId);

                // Don't mark alerts as processed automatically - let "Check for Alerts" handle it

                processedCount++;

            } catch (error) {
                console.error('❌ Error processing alert:', error);
                errorCount++;
                
                // Wait a bit before retrying to avoid rapid error loops
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

    } catch (error) {
        console.error('❌ Alert processing loop error:', error);
    } finally {
        isProcessing = false;
        console.log('⏹️ Alert processing stopped');
    }
}

// Create or update notification for an alert
async function createOrUpdateNotification(alert, alertId) {
    try {
        if (!alert.customer_id) {
            console.log('⚠️ Alert has no customer_id, skipping notification');
            return;
        }

        console.log(`📬 Creating/updating notification for ${alert.threat_ip} (customer: ${alert.customer_id})`);

        // Use MongoDB upsert notification method
        const notificationData = {
            customer_id: alert.customer_id,
            threat_ip: alert.threat_ip,
            alert_count: 1,
            first_seen: alert.timestamp,
            last_seen: alert.timestamp,
            countries: [alert.country].filter(Boolean),
            email_sent: false  // Ensure notifications start as not emailed
        };

        const notificationId = await db.upsertNotification(notificationData);
        console.log(`✅ Notification processed with ID: ${notificationId}`);

    } catch (error) {
        console.error('❌ Failed to create/update notification:', error);
        throw error;
    }
}

// Check for alerts and create notifications
app.post('/api/check-alerts', async (req, res) => {
    try {
        console.log('🔍 Checking for unprocessed alerts...');
        
        const database = await db.connect();
        const timeWindow = 60 * 60 * 1000; // 1 hour in milliseconds
        
        // Find alerts that haven't been included in notifications
        const unprocessedAlerts = await database.collection('alerts')
            .find({ notification_processed: { $ne: true } })
            .sort({ timestamp: -1 })
            .toArray();
        
        console.log(`📊 Found ${unprocessedAlerts.length} unprocessed alerts`);
        
        if (unprocessedAlerts.length === 0) {
            return res.json({
                message: 'No unprocessed alerts found',
                processed: 0,
                notifications: 0
            });
        }
        
        // Group alerts by customer_id and threat_ip within time windows
        const alertGroups = {};
        const now = new Date();
        
        for (const alert of unprocessedAlerts) {
            const alertTime = new Date(alert.timestamp);
            const timeDiff = now - alertTime;
            
            // Only process alerts from the last 24 hours
            if (timeDiff > 24 * 60 * 60 * 1000) continue;
            
            const groupKey = `${alert.customer_id}_${alert.threat_ip}`;
            
            if (!alertGroups[groupKey]) {
                alertGroups[groupKey] = {
                    customer_id: alert.customer_id,
                    threat_ip: alert.threat_ip,
                    alerts: [],
                    countries: new Set(),
                    first_seen: alertTime,
                    last_seen: alertTime
                };
            }
            
            alertGroups[groupKey].alerts.push(alert);
            alertGroups[groupKey].countries.add(alert.country);
            
            if (alertTime < alertGroups[groupKey].first_seen) {
                alertGroups[groupKey].first_seen = alertTime;
            }
            if (alertTime > alertGroups[groupKey].last_seen) {
                alertGroups[groupKey].last_seen = alertTime;
            }
        }
        
        let notificationsCreated = 0;
        let alertsProcessed = 0;
        
        // Create or update notifications for each group
        for (const [groupKey, group] of Object.entries(alertGroups)) {
            try {
                // Check if notification already exists
                const existingNotification = await database.collection('notifications')
                    .findOne({
                        customer_id: group.customer_id,
                        threat_ip: group.threat_ip,
                        email_sent: false
                    });
                
                if (existingNotification) {
                    // Update existing notification
                    await database.collection('notifications').updateOne(
                        { _id: existingNotification._id },
                        {
                            $inc: { alert_count: group.alerts.length },
                            $set: { 
                                last_seen: group.last_seen,
                                countries: Array.from(group.countries),
                                updated_at: new Date()
                            }
                        }
                    );
                    console.log(`📝 Updated notification for ${group.threat_ip} (+${group.alerts.length} alerts)`);
                } else {
                    // Create new notification
                    const notification = {
                        customer_id: group.customer_id,
                        threat_ip: group.threat_ip,
                        alert_count: group.alerts.length,
                        first_seen: group.first_seen,
                        last_seen: group.last_seen,
                        countries: Array.from(group.countries),
                        email_sent: false,  // Always start as not emailed
                        created_at: new Date(),
                        updated_at: new Date()
                    };
                    
                    await database.collection('notifications').insertOne(notification);
                    console.log(`📬 Created notification for ${group.threat_ip} (${group.alerts.length} alerts)`);
                    notificationsCreated++;
                }
                
                // Mark alerts as processed
                const alertIds = group.alerts.map(a => a._id);
                await database.collection('alerts').updateMany(
                    { _id: { $in: alertIds } },
                    { $set: { notification_processed: true, processed_at: new Date() } }
                );
                
                alertsProcessed += group.alerts.length;
                
            } catch (error) {
                console.error(`❌ Error processing group ${groupKey}:`, error);
            }
        }
        
        console.log(`✅ Processing complete: ${alertsProcessed} alerts, ${notificationsCreated} new notifications`);
        
        res.json({
            message: `Successfully processed ${alertsProcessed} alerts into notifications`,
            processed: alertsProcessed,
            notifications: notificationsCreated,
            groups: Object.keys(alertGroups).length,
            timeWindow: '1 hour grouping window'
        });
        
    } catch (error) {
        console.error('❌ Failed to check alerts:', error);
        res.status(500).json({ 
            error: 'Failed to check alerts',
            details: error.message 
        });
    }
});

// Get email jobs
app.get('/api/email-jobs', async (req, res) => {
    try {
        console.log('📧 Fetching email jobs...');
        
        if (!db) {
            console.error('❌ Database instance not initialized');
            return res.status(500).json({ 
                error: 'Database not initialized',
                details: 'Database instance is null' 
            });
        }
        
        const database = await db.connect();
        console.log('📧 Database connected successfully');
        
        // Simply try to query the collection - MongoDB will handle if it doesn't exist
        const emails = await database.collection('email_jobs')
            .find({})
            .sort({ created_at: -1 })
            .limit(100)
            .toArray();
        
        console.log(`📧 Found ${emails.length} email jobs`);
        
        res.json({
            emails: emails || [],
            count: emails ? emails.length : 0
        });

    } catch (error) {
        console.error('❌ Failed to get email jobs:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to retrieve email jobs',
            details: error.message,
            stack: error.stack
        });
    }
});

// Send pending emails
app.post('/api/send-pending-emails', async (req, res) => {
    try {
        console.log('📧 Processing pending notifications for email...');
        
        const database = await db.connect();
        
        // Debug: Check all notifications
        const allNotifications = await database.collection('notifications').find({}).toArray();
        console.log(`🔍 Debug: Total notifications in DB: ${allNotifications.length}`);
        allNotifications.forEach(n => {
            console.log(`   - ${n.threat_ip}: email_sent=${n.email_sent}, customer=${n.customer_id}`);
        });
        
        // Find notifications that haven't been emailed
        const pendingNotifications = await database.collection('notifications')
            .find({ email_sent: false })
            .toArray();
        
        console.log(`📊 Found ${pendingNotifications.length} pending notifications`);
        
        if (pendingNotifications.length === 0) {
            return res.json({
                message: 'No pending notifications to send',
                processed: 0,
                sent: 0,
                failed: 0
            });
        }
        
        let emailsCreated = 0;
        let emailsSent = 0;
        let emailsFailed = 0;
        
        // Create email jobs for each notification
        for (const notification of pendingNotifications) {
            try {
                // Get customer details
                console.log(`🔍 Looking for customer with ID: ${notification.customer_id}`);
                const customer = await database.collection('customers')
                    .findOne({ _id: notification.customer_id });
                
                if (!customer || !customer.email) {
                    console.log(`⚠️ No email found for customer ${notification.customer_id}`);
                    continue;
                }
                
                // Create email job
                const emailJob = {
                    notification_id: notification._id,
                    customer_id: notification.customer_id,
                    to_email: customer.email,
                    to_name: customer.name,
                    subject: `Security Alert: Threat detected from ${notification.threat_ip}`,
                    body: `
Dear ${customer.name},

We have detected ${notification.alert_count} security alert${notification.alert_count !== 1 ? 's' : ''} from the threat IP: ${notification.threat_ip}

Threat Details:
- IP Address: ${notification.threat_ip}
- Alert Count: ${notification.alert_count}
- Countries: ${notification.countries?.join(', ') || 'Unknown'}
- First Seen: ${new Date(notification.first_seen).toLocaleString()}
- Last Seen: ${new Date(notification.last_seen).toLocaleString()}

Please review your security systems and take appropriate action.

Best regards,
MMOX Security Team
                    `.trim(),
                    priority: notification.alert_count > 10 ? 'high' : notification.alert_count > 5 ? 'medium' : 'low',
                    status: 'pending',
                    created_at: new Date(),
                    attempts: 0
                };
                
                await database.collection('email_jobs').insertOne(emailJob);
                emailsCreated++;
                
                // Mark notification as emailed
                await database.collection('notifications').updateOne(
                    { _id: notification._id },
                    { 
                        $set: { 
                            email_sent: true, 
                            email_sent_at: new Date() 
                        } 
                    }
                );
                
                // Simulate email sending (in real app, this would use SMTP)
                const mockSuccess = Math.random() > 0.1; // 90% success rate
                
                if (mockSuccess) {
                    await database.collection('email_jobs').updateOne(
                        { _id: emailJob._id },
                        { 
                            $set: { 
                                status: 'sent', 
                                sent_at: new Date(),
                                attempts: 1
                            } 
                        }
                    );
                    emailsSent++;
                    console.log(`✅ Email sent to ${customer.email} for threat ${notification.threat_ip}`);
                } else {
                    await database.collection('email_jobs').updateOne(
                        { _id: emailJob._id },
                        { 
                            $set: { 
                                status: 'failed', 
                                error_message: 'Mock SMTP failure',
                                attempts: 1
                            } 
                        }
                    );
                    emailsFailed++;
                    console.log(`❌ Email failed to ${customer.email} for threat ${notification.threat_ip}`);
                }
                
            } catch (error) {
                console.error(`❌ Error processing notification ${notification._id}:`, error);
                emailsFailed++;
            }
        }
        
        console.log(`✅ Email processing complete: ${emailsCreated} created, ${emailsSent} sent, ${emailsFailed} failed`);
        
        res.json({
            message: `Successfully processed ${emailsCreated} email notifications`,
            processed: emailsCreated,
            sent: emailsSent,
            failed: emailsFailed
        });
        
    } catch (error) {
        console.error('❌ Failed to send emails:', error);
        res.status(500).json({ 
            error: 'Failed to send emails',
            details: error.message 
        });
    }
});

// Clear email jobs
app.post('/api/clear-emails', async (req, res) => {
    try {
        console.log('🗑️ Clearing all email jobs...');
        
        const database = await db.connect();
        
        // Delete all email jobs
        await database.collection('email_jobs').deleteMany({});
        
        console.log('✅ All email jobs cleared');
        
        res.json({ 
            message: 'All email jobs cleared successfully'
        });

    } catch (error) {
        console.error('❌ Failed to clear email jobs:', error);
        res.status(500).json({ 
            error: 'Failed to clear email jobs',
            details: error.message 
        });
    }
});

// Clear all data endpoint
app.post('/api/clear-all', async (req, res) => {
    try {
        console.log('🗑️ Clearing all database entities...');
        
        const database = await db.connect();
        
        // Delete all collections data
        await database.collection('alerts').deleteMany({});
        await database.collection('notifications').deleteMany({});
        await database.collection('email_jobs').deleteMany({});
        
        console.log('✅ All database entities cleared');
        
        res.json({ 
            message: 'All database entities cleared successfully',
            cleared: ['alerts', 'notifications', 'email_jobs']
        });

    } catch (error) {
        console.error('❌ Failed to clear database:', error);
        res.status(500).json({ 
            error: 'Failed to clear database',
            details: error.message 
        });
    }
});

// Start/stop processing endpoints
app.post('/api/processing/start', (req, res) => {
    if (!isProcessing) {
        processAlerts();
        res.json({ message: 'Alert processing started' });
    } else {
        res.json({ message: 'Alert processing already running' });
    }
});

app.post('/api/processing/stop', (req, res) => {
    isProcessing = false;
    res.json({ message: 'Alert processing stop requested' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down Notification Service...');
    isProcessing = false;
    await redis.disconnect();
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Shutting down Notification Service...');
    isProcessing = false;
    await redis.disconnect();
    await db.close();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`🚀 Notification Service running on port ${port}`);
    console.log(`📊 API endpoints available at http://localhost:${port}/api/`);
    
    // Start processing alerts automatically
    setTimeout(() => {
        processAlerts();
    }, 2000);
});
