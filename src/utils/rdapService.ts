
import axios from 'axios';
import { extractTLD } from '@/utils/apiUtils';

// RDAP服务器缓存 - 避免频繁请求IANA
interface RdapServerCache {
  [tld: string]: {
    server: string;
    timestamp: number;
  };
}

// 缓存有效期：1小时
const CACHE_EXPIRY = 60 * 60 * 1000;

// RDAP服务器缓存
const rdapServerCache: RdapServerCache = {};

/**
 * 从IANA获取特定TLD的RDAP服务器地址
 * @param tld 顶级域名
 * @returns RDAP服务器URL或null
 */
export async function getRdapServer(tld: string): Promise<string | null> {
  try {
    // 检查缓存
    const cachedServer = rdapServerCache[tld];
    if (cachedServer && (Date.now() - cachedServer.timestamp) < CACHE_EXPIRY) {
      console.log(`Using cached RDAP server for .${tld}: ${cachedServer.server}`);
      return cachedServer.server;
    }

    console.log(`Fetching RDAP server for .${tld} from IANA...`);
    
    // 从IANA查询RDAP服务器
    const response = await axios.get(`https://data.iana.org/rdap/dns.json`, {
      timeout: 5000
    });
    
    if (response.data && response.data.services) {
      // 在IANA数据中查找匹配的TLD
      for (const service of response.data.services) {
        if (service[0].includes(tld)) {
          const server = service[1][0];
          
          // 确保URL以http或https开头
          const serverUrl = server.startsWith('http') 
            ? server 
            : `https://${server}`;
          
          // 更新缓存
          rdapServerCache[tld] = {
            server: serverUrl,
            timestamp: Date.now()
          };
          
          console.log(`Found RDAP server for .${tld}: ${serverUrl}`);
          return serverUrl;
        }
      }
    }
    
    console.warn(`No RDAP server found for TLD .${tld}`);
    return null;
  } catch (error) {
    console.error(`Error fetching RDAP server for .${tld}:`, error);
    return null;
  }
}

/**
 * 通过RDAP协议查询域名信息
 * @param domain 域名
 * @returns 域名RDAP信息或null
 */
export async function rdapQuery(domain: string): Promise<any | null> {
  try {
    const tld = extractTLD(domain);
    if (!tld) {
      console.error(`Invalid domain: ${domain}`);
      return null;
    }
    
    // 获取RDAP服务器
    const rdapServer = await getRdapServer(tld);
    if (!rdapServer) {
      console.warn(`No RDAP server available for .${tld}`);
      return null;
    }
    
    console.log(`Querying RDAP for ${domain} using server: ${rdapServer}`);
    
    // 构建RDAP查询URL
    const rdapUrl = `${rdapServer}${rdapServer.endsWith('/') ? '' : '/'}domain/${domain}`;
    
    // 发送RDAP请求
    const response = await axios.get(rdapUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/rdap+json',
        'User-Agent': 'Domain-Lookup-Tool/1.0'
      }
    });
    
    if (response.data) {
      console.log(`Successfully retrieved RDAP data for ${domain}`);
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error(`RDAP query failed for ${domain}:`, error);
    return null;
  }
}

/**
 * 将RDAP数据转换为标准格式
 * @param rdapData RDAP原始数据
 * @param domain 域名
 * @returns 标准化的域名信息
 */
export function processRDAPData(rdapData: any, domain: string) {
  try {
    if (!rdapData) return null;
    
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
    
    // 提取注册商
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
    
    // 提取日期
    if (rdapData.events) {
      for (const event of rdapData.events) {
        if (event.eventAction === 'registration') {
          result.registrationDate = event.eventDate || "未知";
        } else if (event.eventAction === 'expiration') {
          result.expiryDate = event.eventDate || "未知";
        }
      }
    }
    
    // 提取名称服务器
    if (rdapData.nameservers) {
      for (const ns of rdapData.nameservers) {
        if (ns.ldhName) {
          result.nameServers.push(ns.ldhName);
        } else if (ns.handle) {
          result.nameServers.push(ns.handle);
        }
      }
    }
    
    // 提取注册人
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
    
    // 提取状态
    if (rdapData.status && rdapData.status.length > 0) {
      result.status = rdapData.status.join(', ');
    }
    
    return result;
  } catch (error) {
    console.error('Error processing RDAP data:', error);
    return null;
  }
}
