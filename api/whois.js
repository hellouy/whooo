// WHOIS & RDAP API serverless function
import whois from 'whois';
import fs from 'fs';
import path from 'path';
import https from 'https';
import net from 'net';

// Load whois servers data - using proper import for serverless functions
let whoisServers = {};
try {
  const whoisServersPath = path.join(process.cwd(), 'public/data/whois-servers.json');
  if (fs.existsSync(whoisServersPath)) {
    whoisServers = JSON.parse(fs.readFileSync(whoisServersPath, 'utf8'));
  } else {
    console.warn('Could not find whois-servers.json at path:', whoisServersPath);
    // Try alternative path
    const altPath = path.join(process.cwd(), 'public/api/whois-servers.json');
    if (fs.existsSync(altPath)) {
      whoisServers = JSON.parse(fs.readFileSync(altPath, 'utf8'));
    }
  }
} catch (e) {
  console.error('Failed to load whois-servers.json:', e);
  // Fallback to a minimal set of common TLDs
  whoisServers = {
    "com": "whois.verisign-grs.com",
    "net": "whois.verisign-grs.com",
    "org": "whois.pir.org",
    "io": "whois.nic.io",
    "co": "whois.nic.co",
    "ai": "whois.nic.ai"
  };
}

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
    // ... keep existing code (second attempt extraction methods)

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

// Use a direct TCP whois query as a fallback
function directWhoisQuery(domain, server) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let data = '';
    
    socket.connect(43, server, () => {
      socket.write(domain + '\r\n');
    });
    
    socket.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    socket.on('close', () => {
      if (data.length > 50) {
        resolve(data);
      } else {
        reject(new Error('Insufficient data from direct whois query'));
      }
    });
    
    socket.on('error', (err) => {
      reject(err);
    });
    
    // Set a timeout
    socket.setTimeout(10000, () => {
      socket.destroy();
      reject(new Error('Socket timeout during direct whois query'));
    });
  });
}

// New RDAP lookup function
async function queryRDAP(domain) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Starting RDAP lookup for domain: ${domain}`);
      
      // Get the TLD to find the RDAP server
      const tld = extractTLD(domain);
      
      if (!tld) {
        reject(new Error('Invalid domain format for RDAP lookup'));
        return;
      }
      
      // First, query IANA's bootstrap service
      https.get('https://data.iana.org/rdap/dns.json', (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const bootstrapData = JSON.parse(data);
            
            if (!bootstrapData || !bootstrapData.services || !Array.isArray(bootstrapData.services)) {
              reject(new Error('Invalid RDAP bootstrap data'));
              return;
            }
            
            // Find the appropriate RDAP server for this TLD
            let rdapServer = null;
            
            for (const service of bootstrapData.services) {
              if (service[0].includes(tld)) {
                rdapServer = service[1][0];
                break;
              }
            }
            
            if (!rdapServer) {
              reject(new Error(`No RDAP server found for TLD .${tld}`));
              return;
            }
            
            // Make the RDAP query
            const rdapUrl = `${rdapServer}${rdapServer.endsWith('/') ? '' : '/'}domain/${domain}`;
            
            https.get(rdapUrl, {
              headers: {
                'Accept': 'application/rdap+json',
                'User-Agent': 'Domain-Lookup-Tool/1.0'
              }
            }, (rdapRes) => {
              let rdapData = '';
              
              rdapRes.on('data', (chunk) => {
                rdapData += chunk;
              });
              
              rdapRes.on('end', () => {
                try {
                  if (rdapRes.statusCode >= 400) {
                    reject(new Error(`RDAP server returned status code ${rdapRes.statusCode}`));
                    return;
                  }
                  
                  const rdapResult = JSON.parse(rdapData);
                  resolve(rdapResult);
                } catch (error) {
                  reject(new Error(`Error parsing RDAP response: ${error.message}`));
                }
              });
            }).on('error', (err) => {
              reject(new Error(`RDAP server request failed: ${err.message}`));
            });
          } catch (error) {
            reject(new Error(`Error processing RDAP bootstrap data: ${error.message}`));
          }
        });
      }).on('error', (err) => {
        reject(new Error(`RDAP bootstrap service request failed: ${err.message}`));
      });
    } catch (error) {
      reject(new Error(`RDAP lookup error: ${error.message}`));
    }
  });
}

// Process RDAP data into our standard format
function processRDAPData(rdapData, domain) {
  try {
    const result = {
      domain: domain,
      whoisServer: "RDAP查询",
      registrar: null,
      registrationDate: null,
      expiryDate: null,
      nameServers: [],
      registrant: null,
      status: null,
      rawData: JSON.stringify(rdapData, null, 2)
    };
    
    // Extract registrar
    if (rdapData.entities) {
      for (const entity of rdapData.entities) {
        if (entity.roles && (entity.roles.includes('registrar') || entity.roles.includes('sponsor'))) {
          if (entity.vcardArray && entity.vcardArray[1]) {
            for (const vcard of entity.vcardArray[1]) {
              if (vcard[0] === 'fn') {
                result.registrar = vcard[3] || entity.handle || "未知";
                break;
              }
            }
          }
          if (!result.registrar) {
            result.registrar = entity.handle || entity.publicIds?.[0]?.identifier || "未知";
          }
          break;
        }
      }
    }
    
    // Extract dates
    if (rdapData.events) {
      for (const event of rdapData.events) {
        if (event.eventAction === 'registration') {
          result.registrationDate = event.eventDate || "未知";
        } else if (event.eventAction === 'expiration') {
          result.expiryDate = event.eventDate || "未知";
        }
      }
    }
    
    // Extract nameservers
    if (rdapData.nameservers) {
      for (const ns of rdapData.nameservers) {
        if (ns.ldhName) {
          result.nameServers.push(ns.ldhName);
        } else if (ns.handle) {
          result.nameServers.push(ns.handle);
        }
      }
    }
    
    // Extract registrant
    if (rdapData.entities) {
      for (const entity of rdapData.entities) {
        if (entity.roles && entity.roles.includes('registrant')) {
          if (entity.vcardArray && entity.vcardArray[1]) {
            for (const vcard of entity.vcardArray[1]) {
              if (vcard[0] === 'fn') {
                result.registrant = vcard[3] || entity.handle || "未知";
                break;
              }
            }
          }
          if (!result.registrant) {
            result.registrant = entity.handle || "未知";
          }
          break;
        }
      }
    }
    
    // Extract status
    if (rdapData.status && rdapData.status.length > 0) {
      result.status = rdapData.status.join(', ');
    }
    
    return result;
  } catch (error) {
    console.error('Error processing RDAP data:', error);
    return {
      domain: domain,
      whoisServer: "RDAP错误",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "未知",
      rawData: JSON.stringify(rdapData, null, 2),
      error: `RDAP数据处理错误: ${error.message}`
    };
  }
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
    const { domain, server, protocol = 'auto' } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'No domain provided' });
    }
    
    // Clean domain
    const cleanDomain = domain.trim().toLowerCase();
    console.log(`Starting domain query: ${cleanDomain} with protocol: ${protocol}`);

    // Try RDAP first if protocol is auto or rdap
    if (protocol === 'auto' || protocol === 'rdap') {
      try {
        const rdapData = await queryRDAP(cleanDomain);
        if (rdapData) {
          const processedData = processRDAPData(rdapData, cleanDomain);
          return res.status(200).json({
            ...processedData,
            protocol: 'rdap',
            message: 'Successfully retrieved data via RDAP'
          });
        }
      } catch (rdapError) {
        console.error(`RDAP lookup failed: ${rdapError.message}`);
        if (protocol === 'rdap') {
          // If user specifically requested RDAP and it failed, return the error
          return res.status(200).json({ 
            domain: cleanDomain,
            error: `RDAP lookup failed: ${rdapError.message}`,
            protocol: 'rdap'
          });
        }
        // Otherwise, continue to WHOIS
        console.log('RDAP failed, falling back to WHOIS');
      }
    }
    
    // If we reach here, we need to use traditional WHOIS
    console.log('Using traditional WHOIS lookup');
    
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
          protocol: 'whois',
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
        console.warn(`No WHOIS server found for TLD "${tld}". Using whois.iana.org as fallback`);
        whoisServer = "whois.iana.org";
      } else {
        whoisServer = whoisServers[tld];
        console.log(`Automatically selected WHOIS server: ${whoisServer} (for TLD: ${tld})`);
      }
    }
    
    // Try a direct TCP query as fallback
    try {
      console.log(`Attempting direct TCP whois query to ${whoisServer}`);
      const directData = await directWhoisQuery(cleanDomain, whoisServer);
      const parsedDirectData = parseWhoisData(directData, cleanDomain);
      
      return res.status(200).json({
        ...parsedDirectData,
        protocol: 'whois',
        rawData: directData,
        message: `Direct query to ${whoisServer} successful`
      });
    } catch (directErr) {
      console.error(`Direct whois query failed: ${directErr.message}`);
    }
    
    // Create a minimal response if all methods fail
    const minimalData = {
      domain: cleanDomain,
      protocol: 'whois',
      whoisServer: whoisServer,
      registrar: "Unknown - API query failed",
      registrationDate: "Unknown",
      expiryDate: "Unknown",
      nameServers: [],
      registrant: "Unknown",
      status: "Unknown",
      rawData: `Domain: ${cleanDomain}\nQuery Time: ${new Date().toISOString()}\nError: Unable to reach WHOIS server with multiple methods`,
    };
    
    // Return the response data (even if it's minimal)
    res.status(200).json(minimalData);
    
  } catch (error) {
    console.error('Error handling domain query request:', error);
    res.status(500).json({ error: `Server Error: ${error.message}` });
  }
}
