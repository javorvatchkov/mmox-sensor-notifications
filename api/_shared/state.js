// Simple in-memory state management for serverless functions
// Note: In production, this should be replaced with a proper database

// Global state object
let globalState = {
  alerts: [],
  isCleared: false,
  lastClearTime: null,
  generatedAlerts: []
};

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate mock alert data
function generateMockAlert() {
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
    id: generateUUID(),
    timestamp: new Date().toISOString(),
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
  };
}

// Initialize alerts if not already done or if cleared
function initializeAlerts() {
  if (globalState.alerts.length === 0 && !globalState.isCleared) {
    console.log('🔄 Initializing default alerts...');
    for (let i = 0; i < 50; i++) {
      const alert = generateMockAlert();
      // Make timestamps spread over last 24 hours
      alert.timestamp = new Date(Date.now() - Math.random() * 86400000).toISOString();
      globalState.alerts.push(alert);
    }
    // Sort by timestamp (newest first)
    globalState.alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

// Get all alerts
function getAlerts() {
  if (globalState.isCleared) {
    console.log('📭 Returning empty alerts (cleared state)');
    return [];
  }
  
  initializeAlerts();
  return [...globalState.alerts];
}

// Add new alerts (from simulation)
function addAlerts(newAlerts) {
  if (!Array.isArray(newAlerts)) {
    newAlerts = [newAlerts];
  }
  
  console.log('➕ Adding', newAlerts.length, 'new alerts');
  globalState.alerts.unshift(...newAlerts); // Add to beginning (newest first)
  globalState.isCleared = false; // Reset cleared state when new alerts are added
  
  return globalState.alerts.length;
}

// Clear all alerts
function clearAllAlerts() {
  const clearedCount = globalState.alerts.length;
  globalState.alerts = [];
  globalState.isCleared = true;
  globalState.lastClearTime = new Date().toISOString();
  
  console.log('🗑️ Cleared', clearedCount, 'alerts');
  
  return {
    clearedCount,
    clearTime: globalState.lastClearTime
  };
}

// Get state info
function getStateInfo() {
  return {
    alertCount: globalState.alerts.length,
    isCleared: globalState.isCleared,
    lastClearTime: globalState.lastClearTime
  };
}

// CommonJS exports
module.exports = {
  generateUUID,
  generateMockAlert,
  getAlerts,
  addAlerts,
  clearAllAlerts,
  getStateInfo
};
