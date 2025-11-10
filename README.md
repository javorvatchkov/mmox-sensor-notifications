# NISTO Sensor Notifications System

A cybersecurity alert management platform that processes sensor data, bundles alerts, and sends notifications.

## Architecture

The system follows a microservices architecture with message queues:

- **Sensor Monitor Service**: Publishes alert events from hardware sensors
- **Notification Service**: Consumes alerts and stores them in database
- **Email Producer**: Bundles alerts per client and schedules emails
- **Email Listener**: Sends notification emails via SMTP
- **Frontend Dashboard**: View alerts and notifications

## Prerequisites

Before running the system, ensure you have installed:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher)
3. **Redis** (v6 or higher)

### Installing Prerequisites

#### PostgreSQL
- **Windows**: Download from https://www.postgresql.org/download/windows/
- **macOS**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql postgresql-contrib`

#### Redis
- **Windows**: Download from https://redis.io/download or use WSL
- **macOS**: `brew install redis`
- **Linux**: `sudo apt-get install redis-server`

## Quick Start

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Setup database**:
   ```bash
   npm run db:setup
   npm run db:migrate
   ```

3. **Start all services**:
   ```bash
   npm run dev
   ```

4. **Access the dashboard**:
   Open http://localhost:3000

## Services

### Sensor Monitor Service (Port 3001)
- Receives sensor data via REST API
- Publishes alerts to Redis queue
- Simulates incoming sensor alerts

### Notification Service (Port 3002)
- Consumes alerts from Redis queue
- Stores alerts in PostgreSQL database
- Manages notification data

### Email Producer (Port 3003)
- Single instance worker
- Scans database for new alerts
- Groups alerts by client and IP
- Schedules email jobs

### Email Listener (Port 3004)
- Consumes email jobs from queue
- Sends notification emails via SMTP
- Handles email delivery failures

### Frontend Dashboard (Port 3000)
- View all alerts with filtering
- Monitor notifications status
- Real-time updates

## Configuration

Environment variables are configured in each service's `.env` file:

- Database connection settings
- Redis connection settings
- SMTP email configuration
- Service ports and settings

## Development

Each service can be run independently:

```bash
# Run individual services
npm run dev:sensor
npm run dev:notification
npm run dev:email-producer
npm run dev:email-listener
npm run dev:frontend
```

## Database Schema

- **alerts**: Individual sensor alerts
- **notifications**: Bundled alert notifications
- **customers**: Client contact information
- **email_jobs**: Email sending queue tracking

## Testing

The system includes alert simulation for testing:

```bash
# Send test alerts
curl -X POST http://localhost:3001/api/alerts/simulate
```
