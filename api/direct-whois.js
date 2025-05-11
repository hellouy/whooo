
// Re-export the handler for Vercel API
module.exports = async (req, res) => {
  try {
    // Always set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false,
        error: 'Only POST requests allowed' 
      });
    }
    
    // Parse body for JSON and URL encoded forms
    const body = req.body || {};
    const { domain, server, timeout = 10000, mode = 'whois' } = body;
    
    if (!domain) {
      return res.status(400).json({ 
        success: false,
        error: 'No domain provided' 
      });
    }
    
    // Clean domain
    const cleanDomain = domain.trim().toLowerCase();
    console.log(`Processing WHOIS request for domain: ${cleanDomain}`);
    
    // Create a minimal response if we can't reach the WHOIS server
    const minimalData = {
      success: true,
      data: {
        domain: cleanDomain,
        whoisServer: server || "未知",
        registrar: "未使用whois包，无法查询",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: `API endpoint activated without whois package. Domain: ${cleanDomain}\nTime: ${new Date().toISOString()}`,
        protocol: 'whois'
      }
    };
    
    // Return the minimal response
    console.log(`Returning minimal data response for ${cleanDomain}`);
    res.status(200).json(minimalData);
    
  } catch (error) {
    console.error('Error handling WHOIS request:', error);
    res.status(500).json({ 
      success: false,
      error: `Server Error: ${error.message}` 
    });
  }
};

// Also export as ES module
export default module.exports;
