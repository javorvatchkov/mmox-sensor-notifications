const redis = require('redis');
require('dotenv').config();

class RedisClient {
    constructor() {
        this.useMemoryFallback = false;
        this.memoryQueues = {
            'alerts:queue': [],
            'email:queue': []
        };
        this.memoryStore = {};

        try {
            this.client = redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.log('⚠️ Redis server not available, using in-memory fallback');
                        this.useMemoryFallback = true;
                        return undefined; // Stop retrying
                    }
                    if (options.total_retry_time > 1000 * 10) { // Reduced retry time
                        console.log('⚠️ Redis connection timeout, using in-memory fallback');
                        this.useMemoryFallback = true;
                        return undefined;
                    }
                    if (options.attempt > 3) { // Reduced attempts
                        console.log('⚠️ Redis connection failed, using in-memory fallback');
                        this.useMemoryFallback = true;
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 1000);
                }
            });

            this.client.on('error', (err) => {
                if (err.code === 'ECONNREFUSED') {
                    console.log('⚠️ Redis not available, using in-memory queues for development');
                    this.useMemoryFallback = true;
                } else {
                    console.error('Redis Client Error:', err.message);
                }
            });

            this.client.on('connect', () => {
                console.log('✅ Connected to Redis');
                this.useMemoryFallback = false;
            });

            this.client.on('ready', () => {
                console.log('✅ Redis client ready');
                this.useMemoryFallback = false;
            });

            this.client.on('end', () => {
                console.log('❌ Redis connection ended, using in-memory fallback');
                this.useMemoryFallback = true;
            });

        } catch (error) {
            console.log('⚠️ Redis initialization failed, using in-memory fallback');
            this.useMemoryFallback = true;
        }
    }

    async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
        }
    }

    async disconnect() {
        if (this.client.isOpen) {
            await this.client.disconnect();
        }
    }

    // Queue operations
    async publishAlert(alert) {
        try {
            await this.connect();
            const alertJson = JSON.stringify(alert);
            await this.client.lPush('alerts:queue', alertJson);
            console.log('📤 Alert published to queue');
        } catch (error) {
            console.error('❌ Failed to publish alert:', error);
            throw error;
        }
    }

    async consumeAlert() {
        try {
            await this.connect();
            const alertJson = await this.client.brPop('alerts:queue', 0);
            if (alertJson) {
                return JSON.parse(alertJson.element);
            }
            return null;
        } catch (error) {
            console.error('❌ Failed to consume alert:', error);
            throw error;
        }
    }

    async publishEmailJob(emailJob) {
        try {
            await this.connect();
            const jobJson = JSON.stringify(emailJob);
            await this.client.lPush('email:queue', jobJson);
            console.log('📧 Email job published to queue');
        } catch (error) {
            console.error('❌ Failed to publish email job:', error);
            throw error;
        }
    }

    async consumeEmailJob() {
        try {
            await this.connect();
            const jobJson = await this.client.brPop('email:queue', 0);
            if (jobJson) {
                return JSON.parse(jobJson.element);
            }
            return null;
        } catch (error) {
            console.error('❌ Failed to consume email job:', error);
            throw error;
        }
    }

    // General Redis operations
    async set(key, value, expireSeconds = null) {
        await this.connect();
        if (expireSeconds) {
            await this.client.setEx(key, expireSeconds, JSON.stringify(value));
        } else {
            await this.client.set(key, JSON.stringify(value));
        }
    }

    async get(key) {
        await this.connect();
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }

    async del(key) {
        await this.connect();
        await this.client.del(key);
    }

    async exists(key) {
        await this.connect();
        return await this.client.exists(key);
    }

    // Queue monitoring
    async getQueueLength(queueName) {
        await this.connect();
        return await this.client.lLen(queueName);
    }

    async getQueueStats() {
        await this.connect();
        const alertQueueLength = await this.client.lLen('alerts:queue');
        const emailQueueLength = await this.client.lLen('email:queue');
        
        return {
            alertQueue: alertQueueLength,
            emailQueue: emailQueueLength
        };
    }
}

module.exports = RedisClient;
