const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

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

    async query(text, params) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async getClient() {
        return await this.pool.connect();
    }

    async close() {
        await this.pool.end();
    }

    // Alert-related queries
    async insertAlert(alertData) {
        const query = `
            INSERT INTO alerts (
                timestamp, hostname, direction, type, threat_ip, target_ip, country,
                source_port, source_ip, destination_port, destination_ip, protocol,
                url, hash_name, tcp_state, customer_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id
        `;
        
        const values = [
            alertData.timestamp,
            alertData.hostname,
            alertData.direction,
            alertData.type,
            alertData.threat_ip,
            alertData.target_ip,
            alertData.country,
            alertData.source_port,
            alertData.source_ip,
            alertData.destination_port,
            alertData.destination_ip,
            alertData.protocol,
            alertData.url,
            alertData.hash_name,
            alertData.tcp_state,
            alertData.customer_id
        ];

        const result = await this.query(query, values);
        return result.rows[0].id;
    }

    async getAlerts(filters = {}) {
        let query = `
            SELECT a.*, c.name as customer_name, c.email as customer_email
            FROM alerts a
            LEFT JOIN customers c ON a.customer_id = c.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.direction) {
            paramCount++;
            query += ` AND a.direction = $${paramCount}`;
            values.push(filters.direction);
        }

        if (filters.threat_ip) {
            paramCount++;
            query += ` AND a.threat_ip = $${paramCount}`;
            values.push(filters.threat_ip);
        }

        if (filters.country) {
            paramCount++;
            query += ` AND a.country = $${paramCount}`;
            values.push(filters.country);
        }

        if (filters.from_date) {
            paramCount++;
            query += ` AND a.timestamp >= $${paramCount}`;
            values.push(filters.from_date);
        }

        if (filters.to_date) {
            paramCount++;
            query += ` AND a.timestamp <= $${paramCount}`;
            values.push(filters.to_date);
        }

        query += ` ORDER BY a.timestamp DESC`;

        if (filters.limit) {
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
        }

        const result = await this.query(query, values);
        return result.rows;
    }

    // Notification-related queries
    async upsertNotification(notificationData) {
        const query = `
            INSERT INTO notifications (customer_id, threat_ip, alert_count, first_seen, last_seen, countries)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (customer_id, threat_ip) 
            DO UPDATE SET 
                alert_count = notifications.alert_count + $3,
                last_seen = $5,
                countries = array(SELECT DISTINCT unnest(notifications.countries || $6)),
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        `;

        const values = [
            notificationData.customer_id,
            notificationData.threat_ip,
            notificationData.alert_count,
            notificationData.first_seen,
            notificationData.last_seen,
            notificationData.countries
        ];

        const result = await this.query(query, values);
        return result.rows[0].id;
    }

    async getNotifications(filters = {}) {
        let query = `
            SELECT n.*, c.name as customer_name, c.email as customer_email
            FROM notifications n
            LEFT JOIN customers c ON n.customer_id = c.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.email_sent !== undefined) {
            paramCount++;
            query += ` AND n.email_sent = $${paramCount}`;
            values.push(filters.email_sent);
        }

        if (filters.customer_id) {
            paramCount++;
            query += ` AND n.customer_id = $${paramCount}`;
            values.push(filters.customer_id);
        }

        query += ` ORDER BY n.created_at DESC`;

        if (filters.limit) {
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
        }

        const result = await this.query(query, values);
        return result.rows;
    }

    // Customer-related queries
    async getCustomers() {
        const result = await this.query('SELECT * FROM customers ORDER BY name');
        return result.rows;
    }

    async getCustomerByEmail(email) {
        const result = await this.query('SELECT * FROM customers WHERE email = $1', [email]);
        return result.rows[0];
    }
}

module.exports = Database;
