
import axios from 'axios';

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
  
  const { domain, timeout = 10000 } = req.body;
  
  if (!domain) {
    return res.status(400).json({ 
      success: false, 
      error: 'Domain parameter is required' 
    });
  }
  
  try {
    console.log(`Direct WHOIS lookup for: ${domain}`);
    
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
      
      // Third WHOIS API Provider - use RWhois format for different approach
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
    
    // Race condition - get first successful response or wait for all failures
    const results = await Promise.all(apiRequests);
    
    // Find first successful result
    const successResult = results.find(result => result.success);
    
    if (successResult) {
      return res.status(200).json({
        success: true,
        source: successResult.source,
        data: successResult.data
      });
    }
    
    // All APIs failed, create minimal response with error details
    return res.status(200).json({
      success: false,
      error: 'All WHOIS APIs failed',
      errors: results.map(r => `${r.source}: ${r.error}`).join(', '),
      data: {
        domain: domain,
        whoisServer: "API查询失败",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: `All WHOIS APIs failed for ${domain}: ${results.map(r => `${r.source}: ${r.error}`).join(', ')}`,
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
