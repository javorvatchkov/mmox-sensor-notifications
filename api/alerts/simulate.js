// Vercel serverless function for simulating alerts
import { generateMockAlert, addAlerts, getStateInfo } from '../_shared/state.js';

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
    
    // Add the alerts to the shared state
    const totalAlerts = addAlerts(alerts);
    
    const result = {
      message: 'Simulation completed successfully',
      simulated: count,
      alerts: alerts,
      timestamp: new Date().toISOString(),
      totalAlertsNow: totalAlerts,
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
