
import axios from 'axios';
import whois from 'whois';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Only POST requests allowed' 
    });
  }
  
  // Extract request parameters with defaults
  const { domain, server, timeout = 15000, mode = 'auto' } = req.body;
  
  if (!domain) {
    return res.status(400).json({ 
      success: false, 
      error: 'Domain parameter is required' 
    });
  }
  
  try {
    console.log(`Direct WHOIS lookup for: ${domain}${server ? `, server: ${server}` : ''}, mode: ${mode}`);
    
    // Track processing attempts
    const attempts = [];
    let whoisData = null;
    
    // If a specific server is provided or we want direct WHOIS, use Node's whois package
    if (server || mode === 'whois' || mode === 'auto') {
      try {
        attempts.push('whois-native');
        const whoisText = await queryWithNodeWhois(domain, server, timeout);
        
        if (whoisText && whoisText.length > 100) {
          const parsedData = parseWhoisText(whoisText, domain);
          console.log("Node whois result:", parsedData.registrar || "No registrar found");
          
          whoisData = {
            domain: domain,
            whoisServer: server || parsedData.whoisServer || "未知",
            registrar: parsedData.registrar || "未知",
            registrationDate: parsedData.registrationDate || parsedData.creationDate || "未知",
            expiryDate: parsedData.expiryDate || "未知",
            nameServers: parsedData.nameServers || [],
            registrant: parsedData.registrant || "未知",
            status: parsedData.status || "未知",
            rawData: whoisText,
            message: "通过Node WHOIS模块获取",
            protocol: 'whois'
          };
          
          // If we have good data, return immediately
          if (whoisData.registrar !== "未知" || whoisData.nameServers.length > 0) {
            return res.status(200).json({
              success: true,
              source: 'node-whois',
              data: whoisData
            });
          }
        }
      } catch (whoisError) {
        console.error('Node WHOIS error:', whoisError.message);
        attempts.push(`whois-native-error: ${whoisError.message}`);
      }
    }
    
    // Create array of promise-based API calls to attempt in parallel
    const apiRequests = [
      // First WHOIS API Provider
      axios.get(`https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_demo&domainName=${domain}&outputFormat=JSON`, {
        timeout: timeout,
        headers: {
          'User-Agent': 'Domain-Lookup-Tool/1.0'
        }
      }).then(response => ({
        success: true,
        source: 'whoisxmlapi',
        data: convertWhoisXmlData(response.data, domain)
      })).catch(error => ({
        success: false,
        source: 'whoisxmlapi',
        error: error.message
      })),
      
      // Second WHOIS API Provider
      axios.get(`https://who.cx/api/whois?domain=${domain}`, {
        timeout: timeout,
        headers: {
          'User-Agent': 'Domain-Lookup-Tool/1.0'
        }
      }).then(response => ({
        success: true,
        source: 'who.cx',
        data: convertWhoCxData(response.data, domain)
      })).catch(error => ({
        success: false,
        source: 'who.cx',
        error: error.message
      })),
      
      // Third provider - RDAP format
      axios.get(`https://rdap.org/domain/${domain}`, {
        timeout: timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Domain-Lookup-Tool/1.0'
        }
      }).then(response => ({
        success: true,
        source: 'rdap.org',
        data: convertRdapOrgData(response.data, domain)
      })).catch(error => ({
        success: false,
        source: 'rdap.org',
        error: error.message
      }))
    ];
    
    // Process API results
    const results = await Promise.all(apiRequests);
    attempts.push(...results.map(r => `${r.source}: ${r.success ? 'success' : r.error}`));
    
    // Find first successful result
    const successResult = results.find(result => result.success);
    
    if (successResult) {
      return res.status(200).json({
        success: true,
        source: successResult.source,
        data: successResult.data
      });
    }
    
    // If we have whoisData from earlier native attempt but with minimal info, return it
    if (whoisData) {
      return res.status(200).json({
        success: true,
        source: 'node-whois-minimal',
        data: whoisData
      });
    }
    
    // All APIs failed, create minimal response with error details
    return res.status(200).json({
      success: false,
      error: 'All WHOIS APIs failed',
      attempts: attempts,
      data: {
        domain: domain,
        whoisServer: "API查询失败",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: `All WHOIS APIs failed for ${domain}: ${attempts.join(', ')}`,
        message: "所有API查询失败",
        protocol: "error"
      }
    });
    
  } catch (error) {
    console.error('Direct WHOIS error:', error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
      data: {
        domain: domain,
        whoisServer: "服务器错误",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: `Server error processing WHOIS request for ${domain}: ${error.message}`,
        message: `服务器错误: ${error.message}`,
        protocol: "error"
      }
    });
  }
}

// Query using Node whois package - returns a promise
function queryWithNodeWhois(domain, server, timeout = 15000) {
  return new Promise((resolve, reject) => {
    console.log(`Using Node whois to query domain: ${domain}${server ? ` with server: ${server}` : ''}`);

    // Set options
    const options = {
      follow: 3,       // Allow redirects
      timeout: timeout, 
    };
    
    // Add specific server if provided
    if (server) {
      options.server = server;
    }

    // Query
    whois.lookup(domain, options, (err, data) => {
      if (err) {
        console.error(`Node whois query error: ${err.message}`);
        reject(err);
        return;
      }

      if (!data || data.trim().length < 50) {
        reject(new Error("No valid data returned from whois"));
        return;
      }

      console.log(`Node whois returned ${data.length} bytes of data`);
      resolve(data);
    });
  });
}

// Parse basic WHOIS text response
function parseWhoisText(text, domain) {
  try {
    const result = {
      domain: domain,
      whoisServer: null,
      registrar: null,
      registrationDate: null,
      creationDate: null,
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
        if (creationMatch) {
          result.creationDate = creationMatch;
          result.registrationDate = creationMatch;
        }
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
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing WHOIS text:', error);
    return { domain };
  }
}

// Convert WhoisXML API response format to our standardized format
function convertWhoisXmlData(data, domain) {
  try {
    // Extract data from the response
    const whoisRecord = data.WhoisRecord || {};
    const registryData = whoisRecord.registryData || {};
    
    // Get nameservers
    let nameServers = [];
    if (registryData.nameServers && registryData.nameServers.hostNames) {
      nameServers = registryData.nameServers.hostNames;
    }
    
    // Extract dates
    const creationDate = registryData.createdDate || whoisRecord.createdDate || "未知";
    const expiryDate = registryData.expiresDate || whoisRecord.expiresDate || "未知";
    
    // Extract registrar
    const registrar = registryData.registrarName || whoisRecord.registrarName || "未知";
    
    // Extract status
    let status = "未知";
    if (registryData.status || whoisRecord.status) {
      status = (registryData.status || whoisRecord.status).join(", ");
    }
    
    return {
      domain: domain,
      whoisServer: registryData.whoisServer || "未知",
      registrar: registrar,
      registrationDate: creationDate,
      expiryDate: expiryDate,
      nameServers: nameServers,
      registrant: registryData.registrant || "未知",
      status: status,
      rawData: JSON.stringify(data, null, 2),
      message: "通过WhoisXML API获取",
      protocol: "whois"
    };
  } catch (error) {
    console.error('Error converting WhoisXML data:', error);
    return {
      domain: domain,
      whoisServer: "未知",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "未知",
      rawData: JSON.stringify(data, null, 2),
      message: "WhoisXML数据解析错误",
      protocol: "whois"
    };
  }
}

// Convert who.cx API response format to our standardized format
function convertWhoCxData(data, domain) {
  try {
    return {
      domain: domain,
      whoisServer: data.whois_server || "未知",
      registrar: data.registrar || "未知",
      registrationDate: data.created || "未知",
      expiryDate: data.expires || "未知",
      nameServers: data.nameservers || [],
      registrant: data.registrant || "未知",
      status: data.status || "未知",
      rawData: data.raw || `No raw data available for ${domain}`,
      message: "通过Who.cx API获取",
      protocol: "whois"
    };
  } catch (error) {
    console.error('Error converting who.cx data:', error);
    return {
      domain: domain,
      whoisServer: "未知",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "未知",
      rawData: JSON.stringify(data, null, 2),
      message: "Who.cx数据解析错误",
      protocol: "whois"
    };
  }
}

// Convert RDAP.org API response format to our standardized format
function convertRdapOrgData(data, domain) {
  try {
    // Extract nameservers
    const nameServers = [];
    if (data.nameservers) {
      for (const ns of data.nameservers) {
        if (ns.ldhName) {
          nameServers.push(ns.ldhName);
        }
      }
    }
    
    // Extract dates
    let registrationDate = "未知";
    let expiryDate = "未知";
    
    if (data.events) {
      for (const event of data.events) {
        if (event.eventAction === "registration") {
          registrationDate = event.eventDate;
        } else if (event.eventAction === "expiration") {
          expiryDate = event.eventDate;
        }
      }
    }
    
    // Extract registrar
    let registrar = "未知";
    if (data.entities) {
      for (const entity of data.entities) {
        if (entity.roles && entity.roles.includes("registrar")) {
          registrar = entity.vcardArray?.[1]?.find(vcard => vcard[0] === "fn")?.[3] || entity.handle || "未知";
          break;
        }
      }
    }
    
    // Extract status
    const status = data.status ? data.status.join(", ") : "未知";
    
    return {
      domain: domain,
      whoisServer: "RDAP.org",
      registrar: registrar,
      registrationDate: registrationDate,
      expiryDate: expiryDate,
      nameServers: nameServers,
      registrant: "未知", // RDAP often doesn't expose this directly
      status: status,
      rawData: JSON.stringify(data, null, 2),
      message: "通过RDAP.org获取",
      protocol: "rdap"
    };
  } catch (error) {
    console.error('Error converting RDAP.org data:', error);
    return {
      domain: domain,
      whoisServer: "未知",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "未知",
      rawData: JSON.stringify(data, null, 2),
      message: "RDAP.org数据解析错误",
      protocol: "rdap"
    };
  }
}
