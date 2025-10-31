const { MongoClient } = require('mongodb');
require('dotenv').config();

async function seedDatabase() {
    console.log('🌱 Seeding MMOX MongoDB database with sample data...');

    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'alerts-notifications';

    if (!uri) {
        console.error('❌ MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db(dbName);

        // Insert sample customers
        console.log('👥 Creating sample customers...');
        const customers = [
            {
                name: 'John Smith',
                email: 'john.smith@example.com',
                company: 'TechCorp Inc',
                phone: '+1-555-0101',
                notification_enabled: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                name: 'Sarah Johnson',
                email: 'sarah.johnson@example.com',
                company: 'SecureNet Ltd',
                phone: '+1-555-0102',
                notification_enabled: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                name: 'Mike Wilson',
                email: 'mike.wilson@example.com',
                company: 'CyberGuard Systems',
                phone: '+1-555-0103',
                notification_enabled: true,
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        const customersCollection = db.collection('customers');
        
        for (const customer of customers) {
            try {
                await customersCollection.insertOne(customer);
                console.log(`✅ Created customer: ${customer.name}`);
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`⚠️ Customer ${customer.email} already exists, skipping`);
                } else {
                    throw error;
                }
            }
        }

        console.log('✅ Sample customers created');

        // Get customer count for reference
        const customerCount = await customersCollection.countDocuments();
        console.log(`✅ Found ${customerCount} customers in database`);

        console.log('🎉 Database seeding completed!');

    } catch (error) {
        console.error('❌ Database seeding failed:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run seeding if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };
