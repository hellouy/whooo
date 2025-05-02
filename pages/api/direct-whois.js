
// Direct WHOIS API endpoint without whoiser dependency
import axios from 'axios';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }
  
  const { domain, timeout = 10000 } = req.body;
  
  if (!domain) {
    return res.status(400).json({ error: 'No domain provided' });
  }
  
  // Clean domain
  const cleanDomain = domain.trim().toLowerCase();
  
  try {
    console.log(`Starting direct WHOIS API query for: ${cleanDomain}`);
    
    // Try public WHOIS API services
    const publicApis = [
      `https://who.cx/api/whois?domain=${cleanDomain}`,
      `https://api.who.is/whois/${cleanDomain}`
    ];
    
    let whoisData = null;
    let error = null;
    
    // Try each API until we get a successful response
    for (const apiUrl of publicApis) {
      try {
        const response = await axios.get(apiUrl, { timeout });
        console.log(`Response from ${apiUrl}:`, response.data);
        
        if (response.data) {
          whoisData = processPublicApiResponse(apiUrl, response.data, cleanDomain);
          if (whoisData && (whoisData.registrar !== "未知" || whoisData.nameServers.length > 0)) {
            break;
          }
        }
      } catch (err) {
        console.error(`Error from ${apiUrl}:`, err.message);
        error = err;
      }
    }
    
    if (whoisData) {
      return res.status(200).json({
        success: true,
        data: whoisData
      });
    }
    
    throw error || new Error('All public WHOIS API services failed');
    
  } catch (error) {
    console.error('Error handling direct WHOIS request:', error);
    
    // Return error response
    return res.status(200).json({
      success: false,
      error: error.message || 'Unknown error',
      data: {
        domain: cleanDomain,
        whoisServer: "API错误",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: `Error querying WHOIS for ${cleanDomain}: ${error.message || 'Unknown error'}`,
        message: `API查询失败: ${error.message || '未知错误'}`
      }
    });
  }
}

// Process response from different public APIs
function processPublicApiResponse(apiUrl, data, domain) {
  try {
    if (apiUrl.includes('who.cx')) {
      return {
        domain: domain,
        whoisServer: data.whois_server || "Public API",
        registrar: data.registrar || "未知",
        registrationDate: data.created || "未知",
        expiryDate: data.expires || "未知",
        nameServers: data.nameservers || [],
        registrant: data.registrant || "未知",
        status: data.status || "未知",
        rawData: data.raw || `No raw WHOIS data available for ${domain}`,
        message: "Retrieved from public WHOIS API"
      };
    } 
    else if (apiUrl.includes('who.is')) {
      return {
        domain: domain,
        whoisServer: "who.is",
        registrar: findValue(data, ["registrar", "registrar_name"]) || "未知",
        registrationDate: findValue(data, ["created", "creation_date", "registration"]) || "未知",
        expiryDate: findValue(data, ["expires", "expiration", "expiry"]) || "未知",
        nameServers: extractNameservers(data) || [],
        registrant: findValue(data, ["registrant", "owner"]) || "未知",
        status: findValue(data, ["status", "domain_status"]) || "未知",
        rawData: data.raw_text || JSON.stringify(data, null, 2),
        message: "Retrieved from who.is API"
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error processing API response:', error);
    return null;
  }
}

// Helper to find a value using multiple possible keys
function findValue(obj, possibleKeys) {
  if (!obj || typeof obj !== 'object') return null;
  
  for (const key of possibleKeys) {
    for (const objKey in obj) {
      if (objKey.toLowerCase().includes(key.toLowerCase()) && obj[objKey]) {
        return obj[objKey];
      }
    }
  }
  
  return null;
}

// Extract nameservers from different API response formats
function extractNameservers(data) {
  if (!data) return [];
  
  // Check for common nameserver field names
  const nsFields = ['nameservers', 'name_servers', 'ns', 'name_server'];
  
  for (const field of nsFields) {
    for (const key in data) {
      if (key.toLowerCase().includes(field) && Array.isArray(data[key])) {
        return data[key];
      } else if (key.toLowerCase().includes(field) && typeof data[key] === 'string') {
        return [data[key]];
      }
    }
  }
  
  // If we have nested objects with nameserver info
  if (data.nameserver) {
    const ns = [];
    for (const key in data.nameserver) {
      if (data.nameserver[key]) {
        ns.push(data.nameserver[key]);
      }
    }
    if (ns.length > 0) return ns;
  }
  
  return [];
}
