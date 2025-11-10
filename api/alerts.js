// Vercel serverless function for alerts management
// Simple global state
let alertsCleared = false;
let generatedAlerts = [];

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate mock alerts
function generateMockAlerts(count = 50) {
  const alerts = [];
  const threatIPs = ['192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.45'];
  const attackTypes = ['SQL Injection', 'XSS Attack', 'Brute Force', 'DDoS', 'Port Scan'];
  const severityLevels = ['low', 'medium', 'high', 'critical'];
  const customerIds = ['cust-001', 'cust-002', 'cust-003', 'cust-004', 'cust-005'];
  
  for (let i = 0; i < count; i++) {
    alerts.push({
      id: generateUUID(),
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      threat_ip: threatIPs[Math.floor(Math.random() * threatIPs.length)],
      target_ip: '192.168.1.10',
      attack_type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
      severity: severityLevels[Math.floor(Math.random() * severityLevels.length)],
      blocked: Math.random() > 0.3,
      customer_id: customerIds[Math.floor(Math.random() * customerIds.length)],
      details: {
        port: Math.floor(Math.random() * 65535),
        protocol: Math.random() > 0.5 ? 'TCP' : 'UDP',
        payload_size: Math.floor(Math.random() * 10000),
        user_agent: 'Mozilla/5.0 (compatible; AttackBot/1.0)'
      }
    });
  }
  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = function handler(req, res) {
  // Fast CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  // Fast execution - no try-catch overhead
    const { 
      limit = 50, 
      severity, 
      threat_ip, 
      attack_type, 
      blocked,
      cleared 
    } = req.query;
    
    // Check if cleared parameter is passed (from frontend after clear operation)
    if (cleared === 'true') {
      alertsCleared = true;
      generatedAlerts = [];
      return res.status(200).json({
        alerts: [],
        total: 0,
        filters: { severity, threat_ip, attack_type, blocked },
        timestamp: new Date().toISOString(),
        message: 'No alerts - data was cleared'
      });
    }
    
    // Initialize with mock data if not cleared and no generated alerts
    let alerts = generatedAlerts.length > 0 ? generatedAlerts : generateMockAlerts(50);
    
    // Apply filters
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    if (threat_ip) {
      alerts = alerts.filter(alert => alert.threat_ip === threat_ip);
    }
    
    if (attack_type) {
      alerts = alerts.filter(alert => alert.attack_type === attack_type);
    }
    
    if (blocked !== undefined) {
      const isBlocked = blocked === 'true';
      alerts = alerts.filter(alert => alert.blocked === isBlocked);
    }
    
    // Apply limit after filtering
    const limitNum = parseInt(limit);
    if (limitNum > 0) {
      alerts = alerts.slice(0, limitNum);
    }
    
    const result = {
      alerts,
      total: alerts.length,
      filters: {
        severity,
        threat_ip,
        attack_type,
        blocked
      },
      timestamp: new Date().toISOString()
    };
    
  res.status(200).json(result);
}
