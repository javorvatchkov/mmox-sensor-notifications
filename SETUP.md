# MMOX Sensor Notifications System - Setup Guide

## 🚀 Quick Start

### Prerequisites
1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB Atlas** - ✅ Already configured!
3. **Redis** (optional) - Will be auto-started or can be installed separately

### Super Simple Setup

#### 1. Complete Setup (One Command)
```bash
# This installs everything, sets up database, and adds sample data
npm run setup:complete
```

#### 2. Start Everything (One Command)
```bash
# This starts Redis + all services + frontend dashboard
npm run dev:all
```

#### 3. Open Dashboard
```
http://localhost:3000
```

**That's it! 🎉**

---

### Manual Setup (if needed)

#### 1. Install Dependencies
```bash
npm run install:all
```

#### 2. Setup Database
```bash
npm run db:setup
npm run db:seed
```

#### 3. Start Services

**Option A: Everything at once**
```bash
npm run dev:all
```

**Option B: Individual services**
```bash
npm run dev:sensor      # Port 3001
npm run dev:notification # Port 3002  
npm run dev:email-producer # Port 3003
npm run dev:email-listener # Port 3004
npm run dev:frontend    # Port 3000
```

## 🧪 Testing the System

### 1. Verify Services are Running
- Frontend Dashboard: http://localhost:3000
- Sensor Monitor: http://localhost:3001/health
- Notification Service: http://localhost:3002/health
- Email Producer: http://localhost:3003/health
- Email Listener: http://localhost:3004/health

### 2. Generate Test Alerts
```bash
# Method 1: Via API
curl -X POST http://localhost:3001/api/alerts/simulate

# Method 2: Via Frontend
# Go to Settings page and click "Simulate Alerts"
```

### 3. Monitor the Flow
1. **Alerts**: Check http://localhost:3000/alerts
2. **Notifications**: Check http://localhost:3000/notifications
3. **System Stats**: Check http://localhost:3000 (Dashboard)

## 📧 Email Configuration

### For Testing (Mock Mode)
Set in `services\email-listener\.env`:
```env
EMAIL_MOCK_MODE=true
```

### For Real Emails (Gmail SMTP)
1. Create Gmail App Password: https://support.google.com/accounts/answer/185833
2. Configure in `services\email-listener\.env`:
```env
EMAIL_MOCK_MODE=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
FROM_EMAIL=your_email@gmail.com
```

## 🔧 Troubleshooting

### Common Issues

**Database Connection Failed**
- Ensure PostgreSQL is running
- Check credentials in `.env` files
- Verify database exists: `npm run db:setup`

**Redis Connection Failed**
- Start Redis: `redis-server`
- Check Redis is running: `redis-cli ping`

**Services Not Communicating**
- Verify all services are running on correct ports
- Check firewall settings
- Ensure no port conflicts

**No Alerts Appearing**
- Check sensor monitor logs
- Verify Redis queues: http://localhost:3002/api/stats
- Try manual simulation: http://localhost:3001/api/alerts/simulate

**Emails Not Sending**
- Check email service logs
- Verify SMTP configuration
- Test with mock mode first
- Use test email feature in Settings

### Service Ports
- Frontend: 3000
- Sensor Monitor: 3001  
- Notification Service: 3002
- Email Producer: 3003
- Email Listener: 3004
- PostgreSQL: 5432
- Redis: 6379

## 📊 System Architecture

```
Sensor → Redis Queue → Notification Service → Database
                                ↓
Email Producer → Email Queue → Email Listener → SMTP
                                ↓
                        Customer Email
```

## 🎯 Key Features

- **Real-time Alert Processing**: Immediate ingestion and queuing
- **Smart Bundling**: Groups alerts by IP and customer
- **Reliable Email Delivery**: Queue-based with retry logic
- **Modern Dashboard**: React-based monitoring interface
- **Microservices Architecture**: Scalable and maintainable
- **Local Development**: No external dependencies required

## 📝 Next Steps

1. **Production Deployment**: Configure production databases and SMTP
2. **Monitoring**: Add logging and metrics collection
3. **Security**: Implement authentication and authorization
4. **Scaling**: Add load balancing and horizontal scaling
5. **Integration**: Connect to real sensor hardware

## 🆘 Support

For issues or questions:
1. Check service health endpoints
2. Review logs in terminal outputs
3. Verify configuration in `.env` files
4. Test individual components using the Settings page
