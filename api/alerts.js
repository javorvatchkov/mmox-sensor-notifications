// Vercel serverless function for alerts management

// Simple UUID generator (no external dependencies)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Mock alerts data (in production, use a database)
const generateMockAlerts = (limit = 50) => {
  const alerts = [];
  const threatIPs = [
    '192.168.1.100', '10.0.0.50', '172.16.0.25', 
    '203.0.113.45', '198.51.100.78', '192.0.2.123'
  ];
  
  const attackTypes = [
    'SQL Injection', 'XSS Attack', 'Brute Force', 
    'DDoS', 'Port Scan', 'Malware Detection'
  ];
  
  const severityLevels = ['low', 'medium', 'high', 'critical'];
  
  for (let i = 0; i < limit; i++) {
    alerts.push({
      id: generateUUID(),
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time in last 24h
      threat_ip: threatIPs[Math.floor(Math.random() * threatIPs.length)],
      target_ip: '192.168.1.10',
      attack_type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
      severity: severityLevels[Math.floor(Math.random() * severityLevels.length)],
      blocked: Math.random() > 0.3,
      details: {
        port: Math.floor(Math.random() * 65535),
        protocol: Math.random() > 0.5 ? 'TCP' : 'UDP',
        payload_size: Math.floor(Math.random() * 10000),
        user_agent: 'Mozilla/5.0 (compatible; AttackBot/1.0)'
      }
    });
  }
  
  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export default async function handler(req, res) {
  console.log('🔍 Alerts API called:', req.method, req.url);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { 
      limit = 50, 
      severity, 
      threat_ip, 
      attack_type, 
      blocked 
    } = req.query;
    
    console.log('📊 Generating alerts with limit:', limit);
    let alerts = generateMockAlerts(parseInt(limit));
    
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
    
    console.log('✅ Returning', alerts.length, 'alerts');
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Error fetching alerts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch alerts',
      details: error.message 
    });
  }
}
