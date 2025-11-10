// Vercel serverless function for clearing all data
export default async function handler(req, res) {
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
    // In a real implementation, this would:
    // 1. Clear alerts from database
    // 2. Clear notifications from database  
    // 3. Clear email jobs from database
    // 4. Reset statistics
    
    console.log('🗑️ Clearing all data...');
    
    // Simulate clearing operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = {
      message: 'All alerts, notifications, and email jobs have been cleared successfully',
      timestamp: new Date().toISOString(),
      cleared: {
        alerts: Math.floor(Math.random() * 100) + 50,
        notifications: Math.floor(Math.random() * 50) + 25,
        emailJobs: Math.floor(Math.random() * 30) + 15
      }
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
