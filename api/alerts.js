// Vercel serverless function for alerts management
import { getAlerts } from './_shared/state.js';

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
    
    console.log('📊 Fetching alerts with limit:', limit);
    let alerts = getAlerts();
    
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
