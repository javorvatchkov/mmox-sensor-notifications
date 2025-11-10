// Ultra-fast notifications function

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate mock notifications
function generateMockNotifications(count = 20) {
  const notifications = [];
  const threatIPs = ['192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.45'];
  const attackTypes = ['SQL Injection', 'XSS Attack', 'Brute Force', 'DDoS', 'Port Scan'];
  const severityLevels = ['low', 'medium', 'high', 'critical'];
  const statuses = ['pending', 'sent', 'failed', 'delivered'];
  
  for (let i = 0; i < count; i++) {
    notifications.push({
      id: generateUUID(),
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      type: 'security_alert',
      severity: severityLevels[Math.floor(Math.random() * severityLevels.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      title: `${attackTypes[Math.floor(Math.random() * attackTypes.length)]} Detected`,
      message: `Suspicious activity detected from ${threatIPs[Math.floor(Math.random() * threatIPs.length)]}`,
      threat_ip: threatIPs[Math.floor(Math.random() * threatIPs.length)],
      attack_type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
      alert_count: Math.floor(Math.random() * 10) + 1,
      email_sent: Math.random() > 0.3,
      details: {
        affected_systems: Math.floor(Math.random() * 5) + 1,
        blocked_attempts: Math.floor(Math.random() * 50) + 10,
        duration: `${Math.floor(Math.random() * 60) + 1}m`
      }
    });
  }
  return notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = function handler(req, res) {
  // Fast CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const { limit = 50, status, severity, cleared } = req.query;
  
  // Check if cleared parameter is passed
  if (cleared === 'true') {
    return res.status(200).json({
      notifications: [],
      total: 0,
      timestamp: new Date().toISOString(),
      message: 'No notifications - data was cleared'
    });
  }
  
  // Generate mock notifications
  let notifications = generateMockNotifications(50);
  
  // Apply filters
  if (status) {
    notifications = notifications.filter(notif => notif.status === status);
  }
  
  if (severity) {
    notifications = notifications.filter(notif => notif.severity === severity);
  }
  
  // Apply limit
  const limitNum = parseInt(limit);
  if (limitNum > 0) {
    notifications = notifications.slice(0, limitNum);
  }
  
  res.status(200).json({
    notifications,
    total: notifications.length,
    filters: { status, severity },
    timestamp: new Date().toISOString()
  });
}
