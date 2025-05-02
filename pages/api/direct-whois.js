
// Direct WHOIS API endpoint using public WHOIS APIs
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
    
    // List of public WHOIS APIs to try
    const publicApis = [
      `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_demo&domainName=${cleanDomain}&outputFormat=JSON`,
      `https://api.whoapi.com/?domain=${cleanDomain}&r=whois&apikey=demo`,
      `https://who.cx/api/whois?domain=${cleanDomain}`,
      `https://whois.freeaiapi.xyz/?domain=${cleanDomain}`
    ];
    
    let whoisData = null;
    let error = null;
    
    // Try each API until we get a successful response
    for (const apiUrl of publicApis) {
      try {
        console.log(`Trying WHOIS API: ${apiUrl}`);
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
    // Process WhoisXMLAPI response
    if (apiUrl.includes('whoisxmlapi.com')) {
      if (data.WhoisRecord) {
        return {
          domain: domain,
          whoisServer: data.WhoisRecord.registryData?.registrarWHOISServer || "Public API",
          registrar: data.WhoisRecord.registrarName || "未知",
          registrationDate: data.WhoisRecord.createdDate || data.WhoisRecord.registryData?.createdDate || "未知",
          expiryDate: data.WhoisRecord.expiryDate || data.WhoisRecord.registryData?.expiryDate || "未知",
          nameServers: extractNameserversFromWhoisXml(data.WhoisRecord),
          registrant: data.WhoisRecord.registrant?.organization || "未知",
          status: Array.isArray(data.WhoisRecord.status) ? data.WhoisRecord.status.join(', ') : data.WhoisRecord.status || "未知",
          rawData: data.WhoisRecord.rawText || `No raw WHOIS data available for ${domain}`,
          message: "Retrieved from WhoisXML API"
        };
      }
    }
    // Process WhoAPI response
    else if (apiUrl.includes('whoapi.com')) {
      return {
        domain: domain,
        whoisServer: data.whois_server || "Public API",
        registrar: data.registrar || "未知",
        registrationDate: data.date_created || "未知",
        expiryDate: data.date_expires || "未知",
        nameServers: data.nameservers || [],
        registrant: data.owner || "未知",
        status: data.status || "未知",
        rawData: data.whois_raw || `No raw WHOIS data available for ${domain}`,
        message: "Retrieved from WhoAPI"
      };
    }
    // Process who.cx API response
    else if (apiUrl.includes('who.cx')) {
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
        message: "Retrieved from who.cx API"
      };
    }
    // Process custom or generic API response
    else {
      return {
        domain: domain,
        whoisServer: findValue(data, ["whois_server", "whoisServer"]) || "Public API",
        registrar: findValue(data, ["registrar", "registrar_name"]) || "未知",
        registrationDate: findValue(data, ["created", "creation_date", "registration", "created_date", "createdDate"]) || "未知",
        expiryDate: findValue(data, ["expires", "expiration", "expiry", "expiry_date", "expiryDate"]) || "未知",
        nameServers: extractNameserversGeneric(data) || [],
        registrant: findValue(data, ["registrant", "owner", "organization"]) || "未知",
        status: findValue(data, ["status", "domain_status"]) || "未知",
        rawData: data.raw_text || data.raw || JSON.stringify(data, null, 2),
        message: "Retrieved from public WHOIS API"
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

// Extract nameservers from WhoisXML API response
function extractNameserversFromWhoisXml(whoisRecord) {
  if (!whoisRecord) return [];
  
  const nameservers = [];
  
  if (whoisRecord.nameServers && Array.isArray(whoisRecord.nameServers.hostNames)) {
    return whoisRecord.nameServers.hostNames;
  }
  
  if (whoisRecord.registryData && whoisRecord.registryData.nameServers &&
      Array.isArray(whoisRecord.registryData.nameServers.hostNames)) {
    return whoisRecord.registryData.nameServers.hostNames;
  }
  
  return nameservers;
}

// Extract nameservers from generic API response
function extractNameserversGeneric(data) {
  if (!data) return [];
  
  // Check for common nameserver field names
  const nsFields = ['nameservers', 'name_servers', 'ns', 'name_server'];
  
  for (const field of nsFields) {
    for (const key in data) {
      if (key.toLowerCase().includes(field)) {
        if (Array.isArray(data[key])) {
          return data[key];
        } else if (typeof data[key] === 'string') {
          return [data[key]];
        } else if (typeof data[key] === 'object') {
          const ns = [];
          for (const k in data[key]) {
            if (data[key][k]) {
              ns.push(data[key][k]);
            }
          }
          if (ns.length > 0) return ns;
        }
      }
    }
  }
  
  return [];
}
