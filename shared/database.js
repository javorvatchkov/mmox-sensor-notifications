const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

class Database {
    constructor() {
        this.uri = process.env.MONGODB_URI;
        this.dbName = process.env.DB_NAME || 'alerts-notifications';
        this.client = null;
        this.db = null;
    }

    async connect() {
        if (!this.client) {
            this.client = new MongoClient(this.uri);
            await this.client.connect();
            this.db = this.client.db(this.dbName);
            console.log('✅ Connected to MongoDB');
        }
        return this.db;
    }

    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
        }
    }

    // Alert-related operations
    async insertAlert(alertData) {
        try {
            const db = await this.connect();
            const result = await db.collection('alerts').insertOne({
                ...alertData,
                _id: new ObjectId(),
                created_at: new Date(),
                timestamp: new Date(alertData.timestamp)
            });
            console.log(`✅ Alert inserted with ID: ${result.insertedId}`);
            return result.insertedId;
        } catch (error) {
            console.error('❌ Failed to insert alert:', error);
            throw error;
        }
    }

    async getAlerts(filters = {}) {
        try {
            const db = await this.connect();
            let query = {};

            // Build MongoDB query from filters
            if (filters.direction) {
                query.direction = filters.direction;
            }
            if (filters.threat_ip) {
                query.threat_ip = filters.threat_ip;
            }
            if (filters.country) {
                query.country = filters.country;
            }
            if (filters.from_date || filters.to_date) {
                query.timestamp = {};
                if (filters.from_date) {
                    query.timestamp.$gte = new Date(filters.from_date);
                }
                if (filters.to_date) {
                    query.timestamp.$lte = new Date(filters.to_date);
                }
            }

            const options = {
                sort: { timestamp: -1 },
                limit: filters.limit || 100
            };

            // Join with customers collection
            const pipeline = [
                { $match: query },
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'customer_id',
                        foreignField: '_id',
                        as: 'customer'
                    }
                },
                {
                    $addFields: {
                        customer_name: { $arrayElemAt: ['$customer.name', 0] },
                        customer_email: { $arrayElemAt: ['$customer.email', 0] }
                    }
                },
                { $sort: { timestamp: -1 } },
                { $limit: filters.limit || 100 }
            ];

            const alerts = await db.collection('alerts').aggregate(pipeline).toArray();
            return alerts;
        } catch (error) {
            console.error('❌ Failed to get alerts:', error);
            throw error;
        }
    }

    // Notification-related operations
    async upsertNotification(notificationData) {
        try {
            const db = await this.connect();
            
            const filter = {
                customer_id: new ObjectId(notificationData.customer_id),
                threat_ip: notificationData.threat_ip,
                email_sent: false
            };

            // Try to find existing notification first
            const existingNotification = await db.collection('notifications').findOne(filter);
            
            if (existingNotification) {
                // Update existing notification
                const updateResult = await db.collection('notifications').updateOne(
                    { _id: existingNotification._id },
                    {
                        $inc: { alert_count: notificationData.alert_count },
                        $set: { 
                            last_seen: new Date(notificationData.last_seen),
                            updated_at: new Date()
                        },
                        $addToSet: { 
                            countries: { $each: notificationData.countries || [] }
                        }
                    }
                );
                console.log(`✅ Notification updated with ID: ${existingNotification._id}`);
                return existingNotification._id;
            } else {
                // Create new notification
                const newNotification = {
                    customer_id: new ObjectId(notificationData.customer_id),
                    threat_ip: notificationData.threat_ip,
                    alert_count: notificationData.alert_count,
                    first_seen: new Date(notificationData.first_seen),
                    last_seen: new Date(notificationData.last_seen),
                    countries: notificationData.countries || [],
                    email_sent: false,
                    created_at: new Date(),
                    updated_at: new Date()
                };
                
                const insertResult = await db.collection('notifications').insertOne(newNotification);
                console.log(`✅ Notification created with ID: ${insertResult.insertedId}`);
                return insertResult.insertedId;
            }
        } catch (error) {
            console.error('❌ Failed to upsert notification:', error);
            throw error;
        }
    }

    async getNotifications(filters = {}) {
        try {
            const db = await this.connect();
            let query = {};

            if (filters.email_sent !== undefined) {
                query.email_sent = filters.email_sent;
            }
            if (filters.customer_id) {
                query.customer_id = new ObjectId(filters.customer_id);
            }

            // Join with customers collection
            const pipeline = [
                { $match: query },
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'customer_id',
                        foreignField: '_id',
                        as: 'customer'
                    }
                },
                {
                    $addFields: {
                        customer_name: { $arrayElemAt: ['$customer.name', 0] },
                        customer_email: { $arrayElemAt: ['$customer.email', 0] }
                    }
                },
                { $sort: { created_at: -1 } },
                { $limit: filters.limit || 100 }
            ];

            const notifications = await db.collection('notifications').aggregate(pipeline).toArray();
            return notifications;
        } catch (error) {
            console.error('❌ Failed to get notifications:', error);
            throw error;
        }
    }

    // Customer-related operations
    async getCustomers() {
        try {
            const db = await this.connect();
            const customers = await db.collection('customers').find({}).sort({ name: 1 }).toArray();
            return customers;
        } catch (error) {
            console.error('❌ Failed to get customers:', error);
            throw error;
        }
    }

    async getCustomerByEmail(email) {
        try {
            const db = await this.connect();
            const customer = await db.collection('customers').findOne({ email: email });
            return customer;
        } catch (error) {
            console.error('❌ Failed to get customer by email:', error);
            throw error;
        }
    }

    // Email job operations
    async insertEmailJob(emailJobData) {
        try {
            const db = await this.connect();
            const result = await db.collection('email_jobs').insertOne({
                ...emailJobData,
                _id: new ObjectId(),
                created_at: new Date(),
                scheduled_at: new Date(emailJobData.scheduled_at)
            });
            return result.insertedId;
        } catch (error) {
            console.error('❌ Failed to insert email job:', error);
            throw error;
        }
    }

    async updateEmailJobStatus(jobId, status, errorMessage = null) {
        try {
            const db = await this.connect();
            const update = {
                status: status,
                updated_at: new Date()
            };
            
            if (status === 'sent') {
                update.sent_at = new Date();
            }
            if (errorMessage) {
                update.error_message = errorMessage;
            }

            await db.collection('email_jobs').updateOne(
                { _id: new ObjectId(jobId) },
                { $set: update }
            );
        } catch (error) {
            console.error('❌ Failed to update email job status:', error);
            throw error;
        }
    }

    async markNotificationEmailSent(notificationId) {
        try {
            const db = await this.connect();
            await db.collection('notifications').updateOne(
                { _id: new ObjectId(notificationId) },
                { 
                    $set: { 
                        email_sent: true, 
                        email_sent_at: new Date(),
                        updated_at: new Date()
                    } 
                }
            );
        } catch (error) {
            console.error('❌ Failed to mark notification email sent:', error);
            throw error;
        }
    }

    // Statistics operations
    async getStats() {
        try {
            const db = await this.connect();
            
            const alertsCount = await db.collection('alerts').countDocuments();
            const notificationsCount = await db.collection('notifications').countDocuments();
            const customersCount = await db.collection('customers').countDocuments();
            
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const recentAlertsCount = await db.collection('alerts').countDocuments({
                created_at: { $gte: oneHourAgo }
            });
            
            const pendingNotificationsCount = await db.collection('notifications').countDocuments({
                email_sent: false
            });

            return {
                alerts: alertsCount,
                notifications: notificationsCount,
                customers: customersCount,
                recentAlerts: recentAlertsCount,
                pendingNotifications: pendingNotificationsCount
            };
        } catch (error) {
            console.error('❌ Failed to get stats:', error);
            throw error;
        }
    }

    // Generic query method for compatibility
    async query(operation, collection, data = {}) {
        const db = await this.connect();
        
        switch (operation) {
            case 'find':
                return await db.collection(collection).find(data.filter || {}).toArray();
            case 'findOne':
                return await db.collection(collection).findOne(data.filter || {});
            case 'insertOne':
                return await db.collection(collection).insertOne(data.document);
            case 'updateOne':
                return await db.collection(collection).updateOne(data.filter, data.update, data.options);
            case 'deleteOne':
                return await db.collection(collection).deleteOne(data.filter);
            case 'count':
                return await db.collection(collection).countDocuments(data.filter || {});
            default:
                throw new Error(`Unsupported operation: ${operation}`);
        }
    }
}

module.exports = Database;
