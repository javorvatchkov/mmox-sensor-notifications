const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Import shared utilities
const { Database, RedisClient } = require('../../shared');

const app = express();
const port = process.env.PORT || 3004;

// Initialize services
const db = new Database();
const redis = new RedisClient();

// Service state
let isProcessing = false;
let emailsSent = 0;
let emailsFailed = 0;
let lastProcessTime = null;

// Email configuration
const EMAIL_MOCK_MODE = process.env.EMAIL_MOCK_MODE === 'true';
const EMAIL_RETRY_DELAY = parseInt(process.env.EMAIL_RETRY_DELAY_SECONDS) || 60;
const EMAIL_MAX_RETRIES = parseInt(process.env.EMAIL_MAX_RETRIES) || 3;

// Initialize SMTP transporter
let transporter = null;

if (!EMAIL_MOCK_MODE) {
    transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    // Verify SMTP connection
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ SMTP connection failed:', error);
            console.log('📧 Running in mock mode due to SMTP error');
        } else {
            console.log('✅ SMTP server connection verified');
        }
    });
} else {
    console.log('📧 Running in email mock mode - emails will be logged only');
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'email-listener',
        processing: isProcessing,
        emailsSent: emailsSent,
        emailsFailed: emailsFailed,
        lastProcessTime: lastProcessTime,
        mockMode: EMAIL_MOCK_MODE,
        smtpReady: transporter ? true : false,
        timestamp: new Date().toISOString()
    });
});

// Get service statistics
app.get('/api/stats', async (req, res) => {
    try {
        const queueStats = await redis.getQueueStats();
        
        // Get email job statistics
        const emailJobsResult = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM email_jobs 
            GROUP BY status
        `);

        const emailJobStats = {};
        emailJobsResult.rows.forEach(row => {
            emailJobStats[row.status] = parseInt(row.count);
        });

        // Get recent email activity
        const recentEmailsResult = await db.query(`
            SELECT COUNT(*) as count 
            FROM email_jobs 
            WHERE sent_at > NOW() - INTERVAL '1 hour'
        `);

        res.json({
            service: 'email-listener',
            processing: isProcessing,
            emailsSent: emailsSent,
            emailsFailed: emailsFailed,
            lastProcessTime: lastProcessTime,
            mockMode: EMAIL_MOCK_MODE,
            smtpReady: transporter ? true : false,
            queues: queueStats,
            emailJobs: emailJobStats,
            recentEmails: parseInt(recentEmailsResult.rows[0].count),
            config: {
                retryDelay: EMAIL_RETRY_DELAY,
                maxRetries: EMAIL_MAX_RETRIES,
                smtpHost: process.env.SMTP_HOST,
                fromEmail: process.env.FROM_EMAIL
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

// Get recent email jobs
app.get('/api/emails', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const status = req.query.status;

        let query = `
            SELECT ej.*, n.threat_ip, n.alert_count, c.name as customer_name
            FROM email_jobs ej
            LEFT JOIN notifications n ON ej.notification_id = n.id
            LEFT JOIN customers c ON n.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND ej.status = $${params.length}`;
        }

        query += ` ORDER BY ej.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        
        res.json({
            emails: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('❌ Failed to get emails:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve emails',
            details: error.message 
        });
    }
});

// Process email jobs from Redis queue
async function processEmailJobs() {
    if (isProcessing) {
        return;
    }

    isProcessing = true;
    console.log('📧 Starting email job processing...');

    try {
        while (true) {
            try {
                // Consume email job from queue (blocking call)
                const emailJob = await redis.consumeEmailJob();
                
                if (!emailJob) {
                    console.log('📭 No email jobs in queue, waiting...');
                    continue;
                }

                console.log(`📤 Processing email job: ${emailJob.recipient_email}`);
                lastProcessTime = new Date().toISOString();

                // Send the email
                const success = await sendEmail(emailJob);

                if (success) {
                    // Update email job status to sent
                    await db.query(`
                        UPDATE email_jobs 
                        SET status = 'sent', sent_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                    `, [emailJob.id]);

                    // Mark notification as email sent
                    await db.query(`
                        UPDATE notifications 
                        SET email_sent = true, email_sent_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                    `, [emailJob.notification_id]);

                    emailsSent++;
                    console.log(`✅ Email sent successfully to ${emailJob.recipient_email}`);

                } else {
                    // Handle failed email
                    await handleFailedEmail(emailJob);
                }

            } catch (error) {
                console.error('❌ Error processing email job:', error);
                
                // Wait a bit before retrying to avoid rapid error loops
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

    } catch (error) {
        console.error('❌ Email processing loop error:', error);
    } finally {
        isProcessing = false;
        console.log('⏹️ Email processing stopped');
    }
}

// Send email via SMTP or mock
async function sendEmail(emailJob) {
    try {
        if (EMAIL_MOCK_MODE || !transporter) {
            // Mock mode - just log the email
            console.log('📧 MOCK EMAIL SENT:');
            console.log(`   To: ${emailJob.recipient_email}`);
            console.log(`   Subject: ${emailJob.subject}`);
            console.log(`   Body Length: ${emailJob.body.length} characters`);
            console.log('   ---');
            
            // Simulate some delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
        }

        // Real email sending
        const mailOptions = {
            from: {
                name: process.env.FROM_NAME || 'MMOX Security System',
                address: process.env.FROM_EMAIL
            },
            to: emailJob.recipient_email,
            subject: emailJob.subject,
            text: emailJob.body,
            html: emailJob.body.replace(/\n/g, '<br>') // Simple HTML conversion
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent: ${info.messageId}`);
        return true;

    } catch (error) {
        console.error('❌ Failed to send email:', error);
        return false;
    }
}

// Handle failed email with retry logic
async function handleFailedEmail(emailJob) {
    try {
        const newAttempts = emailJob.attempts + 1;
        
        if (newAttempts >= EMAIL_MAX_RETRIES) {
            // Max retries reached, mark as failed
            await db.query(`
                UPDATE email_jobs 
                SET status = 'failed', attempts = $1, error_message = $2
                WHERE id = $3
            `, [newAttempts, 'Max retry attempts reached', emailJob.id]);

            emailsFailed++;
            console.log(`❌ Email failed permanently: ${emailJob.recipient_email} (${newAttempts} attempts)`);

        } else {
            // Schedule retry
            const retryTime = new Date(Date.now() + (EMAIL_RETRY_DELAY * 1000));
            
            await db.query(`
                UPDATE email_jobs 
                SET status = 'retry', attempts = $1, scheduled_at = $2
                WHERE id = $3
            `, [newAttempts, retryTime, emailJob.id]);

            // Re-queue the email job for retry
            const retryJob = { ...emailJob, attempts: newAttempts };
            await redis.publishEmailJob(retryJob);

            console.log(`🔄 Email queued for retry: ${emailJob.recipient_email} (attempt ${newAttempts}/${EMAIL_MAX_RETRIES})`);
        }

    } catch (error) {
        console.error('❌ Failed to handle email failure:', error);
    }
}

// Manual trigger endpoint
app.post('/api/process', async (req, res) => {
    try {
        if (!isProcessing) {
            processEmailJobs();
            res.json({ message: 'Email processing started' });
        } else {
            res.json({ message: 'Email processing already running' });
        }
    } catch (error) {
        console.error('❌ Manual processing error:', error);
        res.status(500).json({ 
            error: 'Processing failed',
            details: error.message 
        });
    }
});

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
    try {
        const { to, subject, body } = req.body;
        
        if (!to) {
            return res.status(400).json({ error: 'Recipient email required' });
        }

        const testEmailJob = {
            id: 'test-' + Date.now(),
            recipient_email: to,
            subject: subject || 'MMOX Test Email',
            body: body || 'This is a test email from MMOX Email Listener Service.',
            attempts: 0
        };

        const success = await sendEmail(testEmailJob);
        
        res.json({
            success: success,
            message: success ? 'Test email sent successfully' : 'Test email failed',
            mockMode: EMAIL_MOCK_MODE
        });

    } catch (error) {
        console.error('❌ Test email error:', error);
        res.status(500).json({ 
            error: 'Test email failed',
            details: error.message 
        });
    }
});

// Start/stop processing endpoints
app.post('/api/processing/start', (req, res) => {
    if (!isProcessing) {
        processEmailJobs();
        res.json({ message: 'Email processing started' });
    } else {
        res.json({ message: 'Email processing already running' });
    }
});

app.post('/api/processing/stop', (req, res) => {
    isProcessing = false;
    res.json({ message: 'Email processing stop requested' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down Email Listener Service...');
    isProcessing = false;
    if (transporter) {
        transporter.close();
    }
    await redis.disconnect();
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Shutting down Email Listener Service...');
    isProcessing = false;
    if (transporter) {
        transporter.close();
    }
    await redis.disconnect();
    await db.close();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`🚀 Email Listener Service running on port ${port}`);
    console.log(`📧 Email mode: ${EMAIL_MOCK_MODE ? 'MOCK' : 'SMTP'}`);
    console.log(`📨 API endpoints available at http://localhost:${port}/api/`);
    
    // Start processing emails automatically
    setTimeout(() => {
        processEmailJobs();
    }, 2000);
});
