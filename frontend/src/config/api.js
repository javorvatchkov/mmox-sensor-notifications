// API Configuration for different environments
const isDevelopment = import.meta.env.DEV
const isProduction = import.meta.env.PROD

// Base URLs for different environments
const API_CONFIG = {
  development: {
    SENSOR_SERVICE: 'http://localhost:3001',
    NOTIFICATION_SERVICE: 'http://localhost:3002', 
    EMAIL_PRODUCER: 'http://localhost:3003',
    EMAIL_LISTENER: 'http://localhost:3004',
    BASE_API: '/api' // Uses Vite proxy in development
  },
  production: {
    SENSOR_SERVICE: '/api', // Will be handled by serverless functions
    NOTIFICATION_SERVICE: '/api',
    EMAIL_PRODUCER: '/api', 
    EMAIL_LISTENER: '/api',
    BASE_API: '/api'
  }
}

// Get current environment config
const currentConfig = isDevelopment ? API_CONFIG.development : API_CONFIG.production

// Export API endpoints
export const API_ENDPOINTS = {
  // Alerts
  ALERTS: `${currentConfig.BASE_API}/alerts`,
  SIMULATE_ALERTS: `${currentConfig.SENSOR_SERVICE}/api/alerts/simulate`,
  
  // Notifications  
  NOTIFICATIONS: `${currentConfig.BASE_API}/notifications`,
  CHECK_ALERTS: `${currentConfig.BASE_API}/check-alerts`,
  
  // Emails
  EMAIL_JOBS: `${currentConfig.BASE_API}/email-jobs`,
  SEND_PENDING_EMAILS: `${currentConfig.BASE_API}/send-pending-emails`,
  TEST_EMAIL: `${currentConfig.EMAIL_LISTENER}/api/test-email`,
  
  // General
  STATS: `${currentConfig.BASE_API}/stats`,
  CLEAR_ALL: `${currentConfig.BASE_API}/clear-all`,
  CLEAR_EMAILS: `${currentConfig.BASE_API}/clear-emails`,
  
  // Health checks
  HEALTH: {
    SENSOR: `${currentConfig.SENSOR_SERVICE}/health`,
    NOTIFICATION: `${currentConfig.NOTIFICATION_SERVICE}/health`, 
    EMAIL_PRODUCER: `${currentConfig.EMAIL_PRODUCER}/health`,
    EMAIL_LISTENER: `${currentConfig.EMAIL_LISTENER}/health`
  }
}

export default API_ENDPOINTS
