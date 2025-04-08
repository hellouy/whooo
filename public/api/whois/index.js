
// WHOIS API serverless function
import whois from 'whois';
import whoisServers from '../whois-servers.json';

// Extract top-level domain function
function extractTLD(domain) {
  // Remove protocol and www prefix
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  
  // Split domain parts
  const parts = domain.split('.');
  
  // Handle compound TLDs
  if (parts.length >= 3) {
    const lastTwo = parts[parts.length - 2] + '.' + parts[parts.length - 1];
    // Check if it's a compound TLD (like .co.uk, .com.cn, etc.)
    if (whoisServers[lastTwo]) {
      return lastTwo;
    }
  }
  
  // Return standard TLD
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

// Parse WHOIS data - improved version
function parseWhoisData(data, domain) {
  try {
    const result = {
      domain: domain,
      whoisServer: null,
      registrar: null,
      registrationDate: null,
      expiryDate: null,
      nameServers: [],
      registrant: null,
      status: null,
      rawData: data
    };
    
    // Split response into lines
    const lines = data.split('\n');
    
    // Extract key information - using more matching patterns
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();
      
      // WHOIS server
      if (lowerLine.includes('whois server:') || 
          lowerLine.includes('referral url:') || 
          lowerLine.includes('whois:') || 
          lowerLine.includes('registrar whois server:')) {
        result.whoisServer = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // Registrar - broader matching patterns
      if (lowerLine.includes('registrar:') || 
          lowerLine.includes('sponsoring registrar:') ||
          lowerLine.includes('registrar name:') ||
          lowerLine.includes('registrar organization:')) {
        result.registrar = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // Creation date - broader matching patterns
      if (lowerLine.includes('creation date:') || 
          lowerLine.includes('registered on:') || 
          lowerLine.includes('registration date:') ||
          lowerLine.includes('created on:') ||
          lowerLine.includes('domain create date:') ||
          lowerLine.includes('domain registration date:') ||
          lowerLine.includes('created:') ||
          lowerLine.match(/^created:/)) {
        result.registrationDate = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // Expiry date - broader matching patterns
      if (lowerLine.includes('expiry date:') || 
          lowerLine.includes('expiration date:') || 
          lowerLine.includes('registry expiry date:') ||
          lowerLine.includes('registrar registration expiration date:') ||
          lowerLine.includes('domain expiration date:') ||
          lowerLine.includes('expires on:') ||
          lowerLine.includes('expires:') ||
          lowerLine.match(/^renewal date:/)) {
        result.expiryDate = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // Domain status
      if (lowerLine.includes('domain status:') || 
          lowerLine.includes('status:') ||
          lowerLine.match(/^state:/)) {
        const status = line.split(':').slice(1).join(':').trim();
        if (status && !result.status) {
          result.status = status;
        }
      }
      
      // Registrant
      if (lowerLine.includes('registrant:') || 
          lowerLine.includes('registrant organization:') || 
          lowerLine.includes('registrant name:') ||
          lowerLine.includes('registrant contact:') ||
          lowerLine.includes('org:') ||
          lowerLine.includes('organization:') ||
          lowerLine.match(/^owner:/)) {
        result.registrant = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // Name servers
      if (lowerLine.includes('name server:') || 
          lowerLine.includes('nserver:') || 
          lowerLine.includes('nameserver:') ||
          lowerLine.includes('nameservers:') ||
          lowerLine.includes('dns:') ||
          lowerLine.match(/^ns\d+:/) ||
          lowerLine.match(/^dns\d+:/)) {
        const ns = line.split(':').slice(1).join(':').trim();
        if (ns && ns.includes('.') && !result.nameServers.includes(ns)) {
          // Filter out values that don't look like domain names
          result.nameServers.push(ns);
        }
      }
    }

    // Second attempt: If no information found, use more flexible extraction methods
    
    // If registrar not found, try regex matching
    if (!result.registrar) {
      const registrarRegex = /(?:Registrar|注册商|Registration Service Provider)[\s\:]+([^\n]+)/i;
      for (const line of lines) {
        const match = line.match(registrarRegex);
        if (match && match[1]) {
          result.registrar = match[1].trim();
          break;
        }
      }
    }

    // If creation date not found, try regex matching
    if (!result.registrationDate) {
      const creationRegex = /(?:Creation Date|Registration Date|Created|Creation|注册日期|Created On)[\s\:]+([^\n]+)/i;
      for (const line of lines) {
        const match = line.match(creationRegex);
        if (match && match[1]) {
          result.registrationDate = match[1].trim();
          break;
        }
      }
    }

    // If expiry date not found, try regex matching
    if (!result.expiryDate) {
      const expiryRegex = /(?:Expiry Date|Expiration Date|Registry Expiry Date|到期日期|有效期至)[\s\:]+([^\n]+)/i;
      for (const line of lines) {
        const match = line.match(expiryRegex);
        if (match && match[1]) {
          result.expiryDate = match[1].trim();
          break;
        }
      }
    }

    // If status not found, try regex matching
    if (!result.status) {
      const statusRegex = /(?:Domain Status|Status|状态|域名状态)[\s\:]+([^\n]+)/i;
      for (const line of lines) {
        const match = line.match(statusRegex);
        if (match && match[1]) {
          result.status = match[1].trim();
          break;
        }
      }
    }

    // Use regex to find dates if the above methods all failed
    if (!result.registrationDate || !result.expiryDate) {
      // Date formats can be: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MMM-YYYY etc.
      const dateRegex = /\d{1,4}[\-\.\/]\d{1,2}[\-\.\/]\d{1,4}|\d{1,2}\-[A-Za-z]{3}\-\d{4}/g;
      const allDates = [];
      
      for (const line of lines) {
        const matches = line.match(dateRegex);
        if (matches) {
          allDates.push(...matches);
        }
      }
      
      // If dates are found, assign them in order (usually creation date is first, expiry date after)
      if (allDates.length >= 2) {
        if (!result.registrationDate) result.registrationDate = allDates[0];
        if (!result.expiryDate) result.expiryDate = allDates[1];
      }
    }
    
    // Check if we need to use a backup server
    if (!result.registrar && !result.registrationDate && !result.expiryDate) {
      // Important information all missing, may need to use backup server
      result.needsBackupServer = true;
    }
    
    console.log("Parsing result:", result);
    return result;
  } catch (error) {
    console.error('Error parsing WHOIS data:', error);
    return {
      domain: domain,
      error: 'Error parsing WHOIS data',
      rawData: data
    };
  }
}

// Query using whois package
function queryWithWhoisPackage(domain) {
  return new Promise((resolve, reject) => {
    console.log(`Using whois package to query domain: ${domain}`);

    // Set options
    const options = {
      follow: 3,       // Allow redirects
      timeout: 15000,  // 15 seconds timeout
    };

    // Query
    whois.lookup(domain, options, (err, data) => {
      if (err) {
        console.error(`whois package query error: ${err.message}`);
        reject(err);
        return;
      }

      if (!data || data.trim().length < 50) {
        reject(new Error("No valid data returned from whois package"));
        return;
      }

      console.log(`whois package returned ${data.length} bytes of data`);
      resolve(data);
    });
  });
}

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
  
  try {
    const { domain, server } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'No domain provided' });
    }
    
    // Clean domain
    const cleanDomain = domain.trim().toLowerCase();
    console.log(`Starting domain query: ${cleanDomain}`);
    
    // Query using whois package - this is our preferred method
    try {
      const whoisData = await queryWithWhoisPackage(cleanDomain);
      
      // Parse WHOIS data
      const parsedData = parseWhoisData(whoisData, cleanDomain);
      
      // If the result contains enough information, return directly
      if (parsedData.registrar || parsedData.registrationDate || parsedData.nameServers.length > 0) {
        return res.status(200).json({
          ...parsedData,
          rawData: whoisData,
          message: 'Successful query using whois package'
        });
      }
      
      // If not enough information, try other methods
      console.log("whois package returned data, but not enough information, trying other methods");
    } catch (whoisErr) {
      console.error(`whois package query failed: ${whoisErr.message}`);
      // Continue to try other methods after failure
    }
    
    // Determine which WHOIS server to use
    let whoisServer;
    if (server) {
      whoisServer = server;
      console.log(`Using specified WHOIS server: ${whoisServer}`);
    } else {
      const tld = extractTLD(cleanDomain);
      if (!tld || !whoisServers[tld]) {
        return res.status(400).json({ 
          error: `No WHOIS server found for TLD "${tld}"` 
        });
      }
      whoisServer = whoisServers[tld];
      console.log(`Automatically selected WHOIS server: ${whoisServer} (for TLD: ${tld})`);
    }
    
    // Create a minimal response if we can't reach the WHOIS server
    const minimalData = {
      domain: cleanDomain,
      whoisServer: whoisServer,
      registrar: "Unknown - API query failed",
      registrationDate: "Unknown",
      expiryDate: "Unknown",
      nameServers: [],
      registrant: "Unknown",
      status: "Unknown",
      rawData: `Domain: ${cleanDomain}\nQuery Time: ${new Date().toISOString()}\nError: Unable to reach WHOIS server`,
    };
    
    // Return the response data (even if it's minimal)
    res.status(200).json(minimalData);
    
  } catch (error) {
    console.error('Error handling WHOIS request:', error);
    res.status(500).json({ error: `Server Error: ${error.message}` });
  }
}
