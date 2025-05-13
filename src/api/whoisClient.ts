
import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';
import { getApiBaseUrl } from '@/utils/domainUtils';

// Client-side WHOIS API client
export async function queryWhoisAPI(domain: string, server?: string, protocol: 'auto' | 'rdap' | 'whois' = 'auto'): Promise<WhoisData> {
  try {
    console.log(`Querying domain API for: ${domain}${server ? ` with server: ${server}` : ''} (protocol: ${protocol})`);
    
    // Try to use our backend API first
    let whoisData: WhoisData;
    
    try {
      // 使用getApiBaseUrl确保在Vercel和本地环境都能正确访问API
      const apiUrl = `${getApiBaseUrl()}/whois`;
      console.log(`使用API路径: ${apiUrl}`);
      
      // Send AJAX request to our API endpoint with protocol preference
      const response = await axios.post(apiUrl, { domain, server, protocol }, {
        timeout: 20000 // 20 second timeout
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
        message: response.data.message,
        protocol: response.data.protocol || 'whois'
      };
    } catch (error) {
      console.error('API request failed, using fallback data source:', error);
      
      // Try a public API as first fallback
      try {
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
          message: "Retrieved from public WHOIS API",
          protocol: 'whois'
        };
      } catch (pubError) {
        console.error('Public API failed, trying another service:', pubError);
        
        // Try a second fallback service
        try {
          const secondFallback = await axios.get(`https://who.cx/api/whois?domain=${domain}`, {
            timeout: 10000
          });
          
          console.log('Second fallback API response:', secondFallback.data);
          
          whoisData = {
            domain: domain,
            whoisServer: secondFallback.data.whois_server || "未知",
            registrar: secondFallback.data.registrar || "未知",
            registrationDate: secondFallback.data.created || "未知",
            expiryDate: secondFallback.data.expires || "未知",
            nameServers: secondFallback.data.nameservers || [],
            registrant: secondFallback.data.registrant || "未知",
            status: secondFallback.data.status || "未知",
            rawData: secondFallback.data.raw || `No raw WHOIS data available for ${domain}`,
            message: "Retrieved from alternative WHOIS API",
            protocol: 'whois'
          };
        } catch (secondError) {
          // If all APIs fail, create a minimal response
          console.error('All API fallbacks failed:', secondError);
          throw new Error('All WHOIS APIs failed');
        }
      }
    }
    
    // Try additional parsing if available data is minimal
    if (
      whoisData.registrar === "未知" &&
      whoisData.registrationDate === "未知" &&
      whoisData.expiryDate === "未知" &&
      whoisData.nameServers.length === 0
    ) {
      // If we have raw data, try to extract more information
      if (whoisData.rawData && typeof whoisData.rawData === 'string' && whoisData.rawData.length > 100) {
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
  } catch (error: any) {
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
      message: `查询失败: ${error.message}`,
      protocol: 'error'
    };
  }
}

// Add a function to fetch domain pricing if available 
export async function queryDomainPrice(domain: string): Promise<any> {
  try {
    // Log the price lookup attempt
    console.log(`Querying price for domain: ${domain}`);
    
    const response = await axios.get(`https://who.cx/api/price?domain=${domain}`, {
      timeout: 5000
    });
    
    console.log('Price Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Price lookup error:', error);
    return null;
  }
}
