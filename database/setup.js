const { MongoClient } = require('mongodb');
require('dotenv').config();

async function setupDatabase() {
    console.log('🚀 Setting up MMOX Sensor Notifications MongoDB Database...');

    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'alerts-notifications';

    if (!uri) {
        console.error('❌ MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas');

        const db = client.db(dbName);
        console.log(`✅ Using database: ${dbName}`);

        // Create collections with indexes
        console.log('📋 Creating collections and indexes...');

        // Customers collection
        const customersCollection = db.collection('customers');
        await customersCollection.createIndex({ email: 1 }, { unique: true });
        console.log('✅ Customers collection ready');

        // Alerts collection
        const alertsCollection = db.collection('alerts');
        await alertsCollection.createIndex({ timestamp: -1 });
        await alertsCollection.createIndex({ threat_ip: 1 });
        await alertsCollection.createIndex({ customer_id: 1 });
        await alertsCollection.createIndex({ created_at: -1 });
        await alertsCollection.createIndex({ direction: 1 });
        await alertsCollection.createIndex({ country: 1 });
        console.log('✅ Alerts collection ready');

        // Notifications collection
        const notificationsCollection = db.collection('notifications');
        await notificationsCollection.createIndex({ customer_id: 1, threat_ip: 1 });
        await notificationsCollection.createIndex({ email_sent: 1 });
        await notificationsCollection.createIndex({ created_at: -1 });
        console.log('✅ Notifications collection ready');

        // Email jobs collection
        const emailJobsCollection = db.collection('email_jobs');
        await emailJobsCollection.createIndex({ status: 1 });
        await emailJobsCollection.createIndex({ scheduled_at: 1 });
        await emailJobsCollection.createIndex({ notification_id: 1 });
        console.log('✅ Email jobs collection ready');

        console.log('🎉 MongoDB database setup completed!');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run setup if called directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };
