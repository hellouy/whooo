
import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';

// RDAP lookup function
export async function queryRDAP(domain: string): Promise<{
  data: WhoisData | null;
  success: boolean;
  message: string;
}> {
  try {
    console.log(`Starting RDAP lookup for domain: ${domain}`);
    
    // Determine the TLD to find the appropriate RDAP server
    const parts = domain.split('.');
    const tld = parts.length > 1 ? parts[parts.length - 1] : null;
    
    if (!tld) {
      return {
        data: null,
        success: false,
        message: '无效的域名格式'
      };
    }

    // First get the correct RDAP server from IANA's bootstrap service
    const bootstrapResponse = await axios.get(
      `https://data.iana.org/rdap/dns.json`,
      { timeout: 10000 }
    );
    
    let rdapBaseUrl: string | null = null;
    
    if (bootstrapResponse.data && bootstrapResponse.data.services) {
      // Look for the TLD in IANA's registry
      for (const service of bootstrapResponse.data.services) {
        if (service[0].includes(tld)) {
          rdapBaseUrl = service[1][0];
          break;
        }
      }
    }

    if (!rdapBaseUrl) {
      console.log(`No RDAP server found for TLD .${tld}`);
      return {
        data: null,
        success: false,
        message: `找不到.${tld}域名的RDAP服务器`
      };
    }

    // Make sure the URL ends with a slash
    if (!rdapBaseUrl.endsWith('/')) {
      rdapBaseUrl += '/';
    }

    // Query the RDAP server
    const rdapResponse = await axios.get(
      `${rdapBaseUrl}domain/${domain}`,
      { 
        timeout: 15000,
        headers: {
          'Accept': 'application/rdap+json',
          'User-Agent': 'WHOIS-Tool/1.0'
        } 
      }
    );

    console.log(`RDAP response status: ${rdapResponse.status}`);
    
    if (rdapResponse.data) {
      // Parse RDAP data to our WhoisData format
      const whoisData: WhoisData = {
        domain: domain,
        whoisServer: "RDAP查询",
        registrar: extractRegistrarFromRDAP(rdapResponse.data),
        registrationDate: extractDateFromRDAP(rdapResponse.data, 'registration'),
        expiryDate: extractDateFromRDAP(rdapResponse.data, 'expiration'),
        nameServers: extractNameServersFromRDAP(rdapResponse.data),
        registrant: extractRegistrantFromRDAP(rdapResponse.data),
        status: extractStatusFromRDAP(rdapResponse.data),
        rawData: JSON.stringify(rdapResponse.data, null, 2),
        message: "通过RDAP协议获取的数据"
      };

      return {
        data: whoisData,
        success: true,
        message: 'RDAP查询成功'
      };
    } else {
      return {
        data: null,
        success: false,
        message: 'RDAP服务器没有返回有效数据'
      };
    }
    
  } catch (error: any) {
    console.error('RDAP lookup error:', error);
    let errorMessage = error.message || "RDAP查询失败";
    
    // More specific error handling
    if (error.response) {
      if (error.response.status === 404) {
        errorMessage = "域名在RDAP中未找到";
      } else {
        errorMessage = `RDAP服务器错误: ${error.response.status}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = "RDAP查询超时";
    }
    
    return {
      data: null,
      success: false,
      message: errorMessage
    };
  }
}

// Helper functions to extract data from RDAP response

function extractRegistrarFromRDAP(rdapData: any): string {
  try {
    // Look for registrar information in various places
    if (rdapData.entities) {
      for (const entity of rdapData.entities) {
        if (entity.roles && (entity.roles.includes('registrar') || entity.roles.includes('sponsor'))) {
          if (entity.vcardArray && entity.vcardArray[1]) {
            for (const vcard of entity.vcardArray[1]) {
              if (vcard[0] === 'fn') {
                return vcard[3] || entity.handle || "未知";
              }
            }
          }
          return entity.handle || entity.publicIds?.[0]?.identifier || "未知";
        }
      }
    }
    return rdapData.handle || "未知";
  } catch (e) {
    return "未知";
  }
}

function extractDateFromRDAP(rdapData: any, type: 'registration' | 'expiration'): string {
  try {
    if (type === 'registration' && rdapData.events) {
      for (const event of rdapData.events) {
        if (event.eventAction === 'registration') {
          return event.eventDate || "未知";
        }
      }
    } else if (type === 'expiration' && rdapData.events) {
      for (const event of rdapData.events) {
        if (event.eventAction === 'expiration') {
          return event.eventDate || "未知";
        }
      }
    }
    return "未知";
  } catch (e) {
    return "未知";
  }
}

function extractNameServersFromRDAP(rdapData: any): string[] {
  try {
    const nameservers: string[] = [];
    if (rdapData.nameservers) {
      for (const ns of rdapData.nameservers) {
        if (ns.ldhName) {
          nameservers.push(ns.ldhName);
        } else if (ns.handle) {
          nameservers.push(ns.handle);
        }
      }
    }
    return nameservers;
  } catch (e) {
    return [];
  }
}

function extractRegistrantFromRDAP(rdapData: any): string {
  try {
    if (rdapData.entities) {
      for (const entity of rdapData.entities) {
        if (entity.roles && (entity.roles.includes('registrant'))) {
          if (entity.vcardArray && entity.vcardArray[1]) {
            for (const vcard of entity.vcardArray[1]) {
              if (vcard[0] === 'fn') {
                return vcard[3] || entity.handle || "未知";
              }
            }
          }
          return entity.handle || "未知";
        }
      }
    }
    return "未知";
  } catch (e) {
    return "未知";
  }
}

function extractStatusFromRDAP(rdapData: any): string {
  try {
    if (rdapData.status && rdapData.status.length > 0) {
      return rdapData.status.join(', ');
    }
    return "未知";
  } catch (e) {
    return "未知";
  }
}
