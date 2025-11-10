// Mock Database class - MongoDB removed
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

class Database {
    constructor() {
        this.connected = false;
        console.log('✅ Mock Database initialized (MongoDB removed)');
    }

    async connect() {
        this.connected = true;
        console.log('✅ Mock Database connected');
        return this;
    }

    async close() {
        this.connected = false;
        console.log('✅ Mock Database disconnected');
    }

    // Mock collection method with full MongoDB-like API
    collection(name) {
        const mockCursor = {
            sort: () => mockCursor,
            limit: () => mockCursor,
            skip: () => mockCursor,
            toArray: async () => {
                console.log(`🔍 Mock find.toArray in ${name}`);
                return []; // Return empty array
            }
        };

        return {
            findOne: async (query) => {
                console.log(`🔍 Mock findOne in ${name}:`, query);
                return null; // Return null for all queries
            },
            find: (query = {}) => {
                console.log(`🔍 Mock find in ${name}:`, query);
                return mockCursor;
            },
            insertOne: async (doc) => {
                console.log(`📝 Mock insertOne in ${name}:`, doc);
                return { insertedId: 'mock-id-' + Date.now() };
            },
            updateOne: async (filter, update) => {
                console.log(`📝 Mock updateOne in ${name}:`, filter, update);
                return { modifiedCount: 1 };
            },
            deleteOne: async (filter) => {
                console.log(`🗑️ Mock deleteOne in ${name}:`, filter);
                return { deletedCount: 1 };
            },
            countDocuments: async (filter) => {
                console.log(`🔢 Mock countDocuments in ${name}:`, filter);
                return Math.floor(Math.random() * 100);
            },
            aggregate: (pipeline) => {
                console.log(`🔍 Mock aggregate in ${name}:`, pipeline);
                return {
                    toArray: async () => {
                        console.log(`🔍 Mock aggregate.toArray in ${name}`);
                        return [];
                    }
                };
            }
        };
    }

    // Mock Alert-related operations
    async insertAlert(alertData) {
        console.log('📝 Mock insertAlert:', alertData);
        return 'mock-alert-id-' + Date.now();
    }

    async getAlerts(filters = {}) {
        console.log('🔍 Mock getAlerts:', filters);
        return []; // Return empty array
    }

    // Mock methods for all database operations
    async upsertNotification(notificationData) {
        console.log('📝 Mock upsertNotification:', notificationData);
        return 'mock-notification-id-' + Date.now();
    }

    async getNotifications(filters = {}) {
        console.log('🔍 Mock getNotifications:', filters);
        return [];
    }

    async getCustomers() {
        console.log('🔍 Mock getCustomers');
        return [];
    }

    async getCustomerByEmail(email) {
        console.log('🔍 Mock getCustomerByEmail:', email);
        return null;
    }

    async insertEmailJob(emailJobData) {
        console.log('📝 Mock insertEmailJob:', emailJobData);
        return 'mock-email-job-id-' + Date.now();
    }

    async updateEmailJobStatus(jobId, status, errorMessage = null) {
        console.log('📝 Mock updateEmailJobStatus:', jobId, status, errorMessage);
    }

    async markNotificationEmailSent(notificationId) {
        console.log('📝 Mock markNotificationEmailSent:', notificationId);
    }

    async getStats() {
        console.log('📊 Mock getStats');
        return {
            alerts: Math.floor(Math.random() * 100),
            notifications: Math.floor(Math.random() * 50),
            customers: Math.floor(Math.random() * 20),
            recentAlerts: Math.floor(Math.random() * 10),
            pendingNotifications: Math.floor(Math.random() * 15)
        };
    }

    async query(operation, collection, data = {}) {
        console.log('🔍 Mock query:', operation, collection, data);
        return null;
    }
}

module.exports = Database;
