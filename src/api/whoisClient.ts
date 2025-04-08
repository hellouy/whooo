
import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';

// Client-side WHOIS API client
export async function queryWhoisAPI(domain: string, server?: string): Promise<WhoisData> {
  try {
    console.log(`Querying WHOIS API for domain: ${domain}${server ? ` with server: ${server}` : ''}`);
    
    // Try to use our backend API first
    let whoisData: WhoisData;
    
    try {
      // Send AJAX request to our serverless API
      const response = await axios.post('/api/whois', { domain, server }, {
        timeout: 25000 // 25 second timeout
      });
      
      console.log('WHOIS API response:', response.data);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      // Format the response to match WhoisData interface
      whoisData = {
        domain: response.data.domain || domain,
        whoisServer: response.data.whoisServer || server || "未知",
        registrar: response.data.registrar || "未知",
        registrationDate: response.data.registrationDate || response.data.creationDate || "未知",
        expiryDate: response.data.expiryDate || "未知",
        nameServers: response.data.nameServers || [],
        registrant: response.data.registrant || "未知",
        status: response.data.status || "未知",
        rawData: response.data.rawData || `No raw WHOIS data received for ${domain}`,
        message: response.data.message
      };
    } catch (error) {
      console.error('API request failed, using fallback data source:', error);
      
      // If our API fails, use a backup public API
      const publicApiResponse = await axios.get(`https://api.whoapi.com/?domain=${domain}&r=whois&apikey=demo`, {
        timeout: 15000
      });
      
      console.log('Public WHOIS API response:', publicApiResponse.data);
      
      whoisData = {
        domain: domain,
        whoisServer: publicApiResponse.data.whois_server || "未知",
        registrar: publicApiResponse.data.registrar || "未知",
        registrationDate: publicApiResponse.data.date_created || "未知",
        expiryDate: publicApiResponse.data.date_expires || "未知",
        nameServers: publicApiResponse.data.nameservers || [],
        registrant: publicApiResponse.data.owner || "未知",
        status: publicApiResponse.data.status || "未知",
        rawData: publicApiResponse.data.whois_raw || `No raw WHOIS data available for ${domain}`,
        message: "Retrieved from public WHOIS API"
      };
    }
    
    // Try additional parsing if available data is minimal
    if (
      whoisData.registrar === "未知" &&
      whoisData.registrationDate === "未知" &&
      whoisData.expiryDate === "未知" &&
      whoisData.nameServers.length === 0
    ) {
      // If we have raw data, try to extract more information
      if (whoisData.rawData && whoisData.rawData.length > 100) {
        console.log("Attempting to parse additional information from raw data");
        
        // Extract registrar information
        const registrarMatch = whoisData.rawData.match(/(?:registrar|sponsor(?:ing)?(?:\s+registrar)?)[^:]*:\s*([^\n]+)/i);
        if (registrarMatch) whoisData.registrar = registrarMatch[1].trim();
        
        // Extract creation date
        const createdMatch = whoisData.rawData.match(/(?:created(?:\s+on)?|creation\s+date|registered(?:\s+on)?)[^:]*:\s*([^\n]+)/i);
        if (createdMatch) whoisData.registrationDate = createdMatch[1].trim();
        
        // Extract expiry date
        const expiryMatch = whoisData.rawData.match(/(?:expir(?:y|ation|es)(?:\s+date)?|paid[\s-]*till|registry\s+expiry\s+date)[^:]*:\s*([^\n]+)/i);
        if (expiryMatch) whoisData.expiryDate = expiryMatch[1].trim();
        
        // Extract name servers
        const nameServerMatches = whoisData.rawData.match(/(?:name\s*server|ns|nserver)[^:]*:\s*([^\n]+)/gi);
        if (nameServerMatches) {
          whoisData.nameServers = nameServerMatches
            .map(match => {
              const serverPart = match.split(':')[1];
              return serverPart ? serverPart.trim().split(/\s+/)[0] : "";
            })
            .filter(Boolean);
        }
      }
    }
    
    return whoisData;
  } catch (error) {
    console.error('WHOIS API query failed:', error);
    
    // Return a minimal error response
    return {
      domain: domain,
      whoisServer: "API查询失败",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "未知",
      rawData: `Error querying WHOIS for ${domain}: ${error.message || 'Unknown error'}`,
      message: `查询失败: ${error.message}`
    };
  }
}

// Add a function to fetch domain pricing if available 
export async function queryDomainPrice(domain: string): Promise<any> {
  try {
    const response = await axios.get(`https://who.cx/api/price?domain=${domain}`, {
      timeout: 5000
    });
    
    return response.data;
  } catch (error) {
    console.error('Price lookup error:', error);
    return null;
  }
}
