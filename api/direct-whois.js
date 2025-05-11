
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
    
    // Try to import whois package if available
    let whois;
    try {
      whois = require('whois');
      console.log("Whois package successfully loaded");
    } catch (error) {
      console.log("Whois package not available:", error.message);
      whois = null;
    }

    // If whois package is available, try to use it
    if (whois) {
      try {
        const options = {
          follow: 3,
          timeout: timeout || 10000,
        };
        
        if (server) {
          options.server = server;
        }
        
        // Wrap whois.lookup in a promise
        const whoisResult = await new Promise((resolve, reject) => {
          whois.lookup(cleanDomain, options, (err, data) => {
            if (err) {
              console.error("Whois lookup error:", err);
              reject(err);
            } else if (!data || data.length < 50) {
              reject(new Error("Insufficient whois data returned"));
            } else {
              resolve(data);
            }
          });
        });
        
        if (whoisResult) {
          // Parse the whois text to extract useful information
          const parsedData = parseWhoisText(whoisResult, cleanDomain);
          
          return res.status(200).json({
            success: true,
            source: 'whois-package',
            data: {
              domain: cleanDomain,
              whoisServer: server || parsedData.whoisServer || "未知",
              registrar: parsedData.registrar || "未知",
              registrationDate: parsedData.registrationDate || "未知",
              expiryDate: parsedData.expiryDate || "未知",
              nameServers: parsedData.nameServers || [],
              registrant: parsedData.registrant || "未知",
              status: parsedData.status || "未知",
              rawData: whoisResult,
              protocol: 'whois'
            }
          });
        }
      } catch (whoisError) {
        console.error("Error using whois package:", whoisError.message);
        // Continue to fallback implementation
      }
    }
    
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

// Parse basic WHOIS text response
function parseWhoisText(text, domain) {
  try {
    const result = {
      domain: domain,
      whoisServer: null,
      registrar: null,
      registrationDate: null,
      expiryDate: null,
      nameServers: [],
      registrant: null,
      status: null
    };
    
    // Split response into lines
    const lines = text.split('\n');
    
    // Extract key information using regex patterns
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();
      
      // WHOIS server
      if (lowerLine.match(/whois server|referral url|registrar whois/i)) {
        const serverMatch = line.split(':').slice(1).join(':').trim();
        if (serverMatch) result.whoisServer = serverMatch;
      }
      
      // Registrar
      if (lowerLine.match(/registrar:|sponsoring registrar|registrar name|registrar organization/i)) {
        const registrarMatch = line.split(':').slice(1).join(':').trim();
        if (registrarMatch) result.registrar = registrarMatch;
      }
      
      // Creation date
      if (lowerLine.match(/creation date|registered on|registration date|created on|created:|domain create date/i)) {
        const creationMatch = line.split(':').slice(1).join(':').trim();
        if (creationMatch) result.registrationDate = creationMatch;
      }
      
      // Expiry date
      if (lowerLine.match(/expiry date|expiration date|registry expiry|expires on|renewal date/i)) {
        const expiryMatch = line.split(':').slice(1).join(':').trim();
        if (expiryMatch) result.expiryDate = expiryMatch;
      }
      
      // Status
      if (lowerLine.match(/domain status|status:|state:/i)) {
        const statusMatch = line.split(':').slice(1).join(':').trim();
        if (statusMatch) result.status = statusMatch;
      }
      
      // Name servers
      if (lowerLine.match(/name server|nserver|nameserver|dns|ns\d+:|dns\d+:/i)) {
        const nsMatch = line.split(':').slice(1).join(':').trim();
        if (nsMatch && nsMatch.includes('.') && !result.nameServers.includes(nsMatch)) {
          result.nameServers.push(nsMatch);
        }
      }
      
      // Registrant
      if (lowerLine.match(/registrant:|registrant organization:|registrant name:|org:|organization:/i)) {
        result.registrant = line.split(':').slice(1).join(':').trim();
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing WHOIS text:', error);
    return { domain };
  }
}

// Also export as ES module
export default module.exports;
