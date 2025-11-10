// Vercel serverless function for dashboard statistics
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Mock statistics data (in production, fetch from database)
    const stats = {
      totalAlerts: Math.floor(Math.random() * 1000) + 500,
      activeThreats: Math.floor(Math.random() * 50) + 10,
      blockedAttacks: Math.floor(Math.random() * 800) + 400,
      emailsSent: Math.floor(Math.random() * 200) + 100,
      systemStatus: 'operational',
      lastUpdate: new Date().toISOString(),
      
      // Recent activity
      recentAlerts: [
        {
          id: '1',
          timestamp: new Date(Date.now() - 300000).toISOString(), // 5 min ago
          threat_ip: '192.168.1.100',
          attack_type: 'SQL Injection',
          severity: 'high',
          blocked: true
        },
        {
          id: '2', 
          timestamp: new Date(Date.now() - 600000).toISOString(), // 10 min ago
          threat_ip: '10.0.0.50',
          attack_type: 'Brute Force',
          severity: 'medium',
          blocked: true
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 900000).toISOString(), // 15 min ago
          threat_ip: '172.16.0.25', 
          attack_type: 'Port Scan',
          severity: 'low',
          blocked: false
        }
      ],
      
      // Service health
      services: {
        sensorMonitor: { status: 'healthy', lastCheck: new Date().toISOString() },
        notificationService: { status: 'healthy', lastCheck: new Date().toISOString() },
        emailProducer: { status: 'healthy', lastCheck: new Date().toISOString() },
        emailListener: { status: 'healthy', lastCheck: new Date().toISOString() }
      }
    };
    
    res.status(200).json(stats);
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
}
