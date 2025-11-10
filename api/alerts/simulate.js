// Vercel serverless function for simulating alerts
const { v4: uuidv4 } = require('uuid');

// Mock data for simulation (in production, you'd want to use a database)
const generateMockAlert = () => {
  const threatIPs = [
    '192.168.1.100', '10.0.0.50', '172.16.0.25', 
    '203.0.113.45', '198.51.100.78', '192.0.2.123'
  ];
  
  const attackTypes = [
    'SQL Injection', 'XSS Attack', 'Brute Force', 
    'DDoS', 'Port Scan', 'Malware Detection'
  ];
  
  const severityLevels = ['low', 'medium', 'high', 'critical'];
  
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    threat_ip: threatIPs[Math.floor(Math.random() * threatIPs.length)],
    target_ip: '192.168.1.10',
    attack_type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
    severity: severityLevels[Math.floor(Math.random() * severityLevels.length)],
    blocked: Math.random() > 0.3, // 70% chance of being blocked
    details: {
      port: Math.floor(Math.random() * 65535),
      protocol: Math.random() > 0.5 ? 'TCP' : 'UDP',
      payload_size: Math.floor(Math.random() * 10000),
      user_agent: 'Mozilla/5.0 (compatible; AttackBot/1.0)'
    }
  };
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { count = 5 } = req.body;
    
    console.log(`🎭 Simulating ${count} sensor alerts...`);
    
    // Generate mock alerts
    const alerts = [];
    for (let i = 0; i < count; i++) {
      alerts.push(generateMockAlert());
    }
    
    // In a real implementation, you would:
    // 1. Store these in a database
    // 2. Trigger notification workflows
    // 3. Update statistics
    
    // For now, we'll just return the simulated data
    const result = {
      message: 'Simulation completed successfully',
      simulated: count,
      alerts: alerts,
      timestamp: new Date().toISOString(),
      summary: {
        total_alerts: count,
        high_severity: alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length,
        blocked_attacks: alerts.filter(a => a.blocked).length,
        unique_threat_ips: [...new Set(alerts.map(a => a.threat_ip))].length
      }
    };
    
    console.log(`✅ Generated ${count} mock alerts`);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Error simulating alerts:', error);
    res.status(500).json({ 
      error: 'Failed to simulate alerts',
      details: error.message 
    });
  }
}
