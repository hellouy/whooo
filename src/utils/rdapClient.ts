
import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';

// Standard RDAP root servers with increased options
const RDAP_BOOTSTRAP_URLS = [
  'https://rdap.org/domain/',
  'https://www.rdap.net/domain/',
  'https://rdap.arin.net/registry/domain/',
  'https://rdap.db.ripe.net/domain/',
  'https://rdap.registro.br/domain/'
];

// Enhanced TLD-specific RDAP server mappings
const TLD_RDAP_SERVERS: Record<string, string> = {
  'com': 'https://rdap.verisign.com/com/v1/domain/',
  'net': 'https://rdap.verisign.com/net/v1/domain/',
  'org': 'https://rdap.pir.org/v1/domain/',
  'edu': 'https://rdap.educause.edu/domain/',
  'us': 'https://rdap.registry.neustar/v1/domain/',
  'io': 'https://rdap.nic.io/domain/',
  'ai': 'https://rdap.nic.ai/domain/',
  'dev': 'https://rdap.nic.google/domain/',
  'app': 'https://rdap.nic.google/domain/',
  'co': 'https://rdap.nic.co/domain/',
  'me': 'https://rdap.nic.me/domain/',
  'xyz': 'https://rdap.nic.xyz/domain/',
  'info': 'https://rdap.centralnic.com/info/domain/'
};

// Simple in-memory cache to avoid redundant queries
const rdapCache: Record<string, {data: any, timestamp: number}> = {};
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

/**
 * Optimized RDAP protocol query for domain information
 */
export async function queryRDAP(domain: string): Promise<{success: boolean, data?: WhoisData, message: string}> {
  console.log(`开始RDAP查询: ${domain}`);
  
  if (!domain) {
    return {success: false, message: '无效的域名'};
  }

  // Check cache first
  const cacheKey = domain.toLowerCase();
  const now = Date.now();
  if (rdapCache[cacheKey] && (now - rdapCache[cacheKey].timestamp) < CACHE_TTL) {
    console.log('RDAP: 返回缓存结果');
    return {
      success: true,
      data: parseRDAPResponse(rdapCache[cacheKey].data, domain),
      message: '成功从缓存获取域名RDAP信息'
    };
  }
  
  // Extract TLD for server selection
  const tldMatch = domain.match(/\.([^.]+)$/);
  const tld = tldMatch ? tldMatch[1].toLowerCase() : null;
  
  // Build the RDAP server URLs array
  const rdapUrls: string[] = [];
  
  // First try TLD-specific RDAP server
  if (tld && TLD_RDAP_SERVERS[tld]) {
    rdapUrls.push(`${TLD_RDAP_SERVERS[tld]}${domain}`);
  }
  
  // Then add general RDAP bootstrap servers
  RDAP_BOOTSTRAP_URLS.forEach(url => {
    rdapUrls.push(`${url}${domain}`);
  });
  
  // Add direct Verisign and ICANN RDAP servers as fallbacks
  rdapUrls.push(`https://rdap.verisign.com/com/v1/domain/${domain}`);
  rdapUrls.push(`https://rdap-bootstrap.icann.org/domain/${domain}`);
  
  // Try all potential RDAP servers with increased timeout
  for (const url of rdapUrls) {
    try {
      console.log(`尝试RDAP服务器: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 15000, // 15 second timeout (increased from 8s)
        headers: {
          'Accept': 'application/rdap+json',
          'User-Agent': 'Mozilla/5.0 Domain-Info-Tool/1.0'
        }
      });
      
      // Check for valid response
      if (response.data && response.status === 200) {
        console.log('RDAP响应成功:', response.status);
        
        // Cache the result
        rdapCache[cacheKey] = {
          data: response.data,
          timestamp: now
        };
        
        // Parse RDAP response
        const rdapData = parseRDAPResponse(response.data, domain);
        
        return {
          success: true,
          data: rdapData,
          message: '成功通过RDAP获取域名信息'
        };
      }
    } catch (error: any) {
      console.log(`RDAP服务器 ${url} 查询失败:`, error.message);
      
      // Check for 404, which typically means domain isn't registered
      if (error.response && error.response.status === 404) {
        console.log('RDAP返回404，表示域名可能未注册');
        
        // We don't want to continue trying other servers for 404s
        return {
          success: false,
          message: '域名未注册 (RDAP 404响应)'
        };
      }
      
      // Continue trying next server for other errors
    }
  }
  
  // All RDAP servers failed
  console.log('所有RDAP服务器查询失败');
  return {
    success: false,
    message: 'RDAP查询失败，将尝试使用WHOIS查询'
  };
}

/**
 * Enhanced RDAP response parser with better field extraction
 */
function parseRDAPResponse(rdapData: any, domain: string): WhoisData {
  try {
    // Extract registrar with more fallback options
    let registrar = "未知";
    if (rdapData.entities) {
      // First try to find a registrar entity
      for (const entity of rdapData.entities) {
        if (entity.roles && (entity.roles.includes("registrar") || entity.roles.includes("registrationAgent"))) {
          // Try different paths to get registrar name
          registrar = 
            entity.vcardArray?.[1]?.find((vcard: any[]) => vcard[0] === "fn")?.[3] || 
            entity.publicIds?.[0]?.identifier || 
            entity.handle || 
            entity.legalRepresentative ||
            entity.name ||
            "未知";
          break;
        }
      }
      
      // If no registrar found, try any entity with a name as fallback
      if (registrar === "未知") {
        for (const entity of rdapData.entities) {
          if (entity.vcardArray?.[1]?.find((vcard: any[]) => vcard[0] === "fn")) {
            registrar = entity.vcardArray[1].find((vcard: any[]) => vcard[0] === "fn")[3];
            break;
          }
          if (entity.name) {
            registrar = entity.name;
            break;
          }
          if (entity.handle) {
            registrar = entity.handle;
            break;
          }
        }
      }
    }
    
    // Extract registrant with more fallback options
    let registrant = "未知";
    if (rdapData.entities) {
      for (const entity of rdapData.entities) {
        if (entity.roles && (
          entity.roles.includes("registrant") || 
          entity.roles.includes("administrative") ||
          entity.roles.includes("technical")
        )) {
          registrant = 
            entity.vcardArray?.[1]?.find((vcard: any[]) => vcard[0] === "fn")?.[3] || 
            entity.handle || 
            entity.name ||
            "未知";
          break;
        }
      }
    }
    
    // Extract dates with more format handling
    let registrationDate = "未知";
    let expiryDate = "未知";
    let updatedDate = "未知";
    
    if (rdapData.events) {
      for (const event of rdapData.events) {
        if (event.eventAction === "registration" || event.eventAction === "created") {
          registrationDate = event.eventDate || "未知";
        } else if (event.eventAction === "expiration" || event.eventAction === "expires") {
          expiryDate = event.eventDate || "未知";
        } else if (event.eventAction === "last changed" || event.eventAction === "last update") {
          updatedDate = event.eventDate || "未知";
        }
      }
    }
    
    // Extract domain status with better formatting
    let status = "未知";
    if (rdapData.status && rdapData.status.length > 0) {
      status = rdapData.status.join(", ");
    } else if (rdapData.domainStatus && rdapData.domainStatus.length > 0) {
      status = rdapData.domainStatus.join(", ");
    }
    
    // Extract name servers with better validation
    const nameServers: string[] = [];
    if (rdapData.nameservers && rdapData.nameservers.length > 0) {
      for (const ns of rdapData.nameservers) {
        if (ns.ldhName && typeof ns.ldhName === 'string' && ns.ldhName.includes('.')) {
          nameServers.push(ns.ldhName.toLowerCase());
        }
      }
    }
    
    // Generate raw data text
    const rawData = JSON.stringify(rdapData, null, 2);
    
    return {
      domain,
      whoisServer: "RDAP服务器",
      registrar,
      registrationDate,
      expiryDate,
      nameServers,
      registrant,
      status,
      rawData,
      protocol: 'rdap'
    };
  } catch (error) {
    console.error("解析RDAP响应出错:", error);
    
    return {
      domain,
      whoisServer: "RDAP解析错误",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "未知",
      rawData: JSON.stringify(rdapData, null, 2),
      protocol: 'rdap'
    };
  }
}
