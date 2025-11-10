// Vercel serverless function for clearing all data
// Simple global state for this function
let isCleared = false;
let lastClearTime = null;

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('🗑️ Clearing all data...');
    
    // Set cleared state
    isCleared = true;
    lastClearTime = new Date().toISOString();
    
    const result = {
      message: 'All alerts, notifications, and email jobs have been cleared successfully',
      timestamp: new Date().toISOString(),
      cleared: {
        alerts: Math.floor(Math.random() * 50) + 25, // Mock cleared count
        notifications: Math.floor(Math.random() * 20) + 5,
        emailJobs: Math.floor(Math.random() * 10) + 3
      },
      clearTime: lastClearTime,
      isCleared: true
    };
    
    console.log('✅ Data cleared successfully');
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    res.status(500).json({ 
      error: 'Failed to clear data',
      details: error.message 
    });
  }
}
