
import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';

// 增强型RDAP服务器列表
const RDAP_BOOTSTRAP_URLS = [
  'https://rdap.org/domain/',
  'https://www.rdap.net/domain/',
  'https://rdap.arin.net/registry/domain/',
  'https://rdap.db.ripe.net/domain/',
  'https://rdap.registro.br/domain/',
  'https://rdap-bootstrap.icann.org/domain/'
];

// TLD特定的RDAP服务器映射
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

// 简单的内存缓存，避免重复查询
const rdapCache: Record<string, {data: any, timestamp: number}> = {};
const CACHE_TTL = 1000 * 60 * 30; // 30分钟缓存

/**
 * 优化的RDAP协议查询域名信息
 */
export async function queryRDAP(domain: string): Promise<{success: boolean, data?: WhoisData, message: string}> {
  console.log(`开始RDAP查询: ${domain}`);
  
  if (!domain) {
    return {success: false, message: '无效的域名'};
  }

  // 首先检查缓存
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
  
  // 提取TLD用于服务器选择
  const tldMatch = domain.match(/\.([^.]+)$/);
  const tld = tldMatch ? tldMatch[1].toLowerCase() : null;
  
  // 构建RDAP服务器URL数组
  const rdapUrls: string[] = [];
  
  // 首先尝试TLD特定的RDAP服务器
  if (tld && TLD_RDAP_SERVERS[tld]) {
    rdapUrls.push(`${TLD_RDAP_SERVERS[tld]}${domain}`);
  }
  
  // 然后添加通用RDAP引导服务器
  RDAP_BOOTSTRAP_URLS.forEach(url => {
    rdapUrls.push(`${url}${domain}`);
  });
  
  // 添加Verisign和ICANN RDAP服务器作为备选
  rdapUrls.push(`https://rdap.verisign.com/com/v1/domain/${domain}`);
  rdapUrls.push(`https://rdap-bootstrap.icann.org/domain/${domain}`);
  
  // 尝试所有潜在的RDAP服务器，增加超时时间
  for (const url of rdapUrls) {
    try {
      console.log(`尝试RDAP服务器: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 20000, // 20秒超时（增加了时间）
        headers: {
          'Accept': 'application/rdap+json',
          'User-Agent': 'Mozilla/5.0 Domain-Info-Tool/1.0'
        }
      });
      
      // 检查有效响应
      if (response.data && response.status === 200) {
        console.log('RDAP响应成功:', response.status);
        
        // 缓存结果
        rdapCache[cacheKey] = {
          data: response.data,
          timestamp: now
        };
        
        // 解析RDAP响应
        const rdapData = parseRDAPResponse(response.data, domain);
        
        return {
          success: true,
          data: rdapData,
          message: '成功通过RDAP获取域名信息'
        };
      }
    } catch (error: any) {
      console.log(`RDAP服务器 ${url} 查询失败:`, error.message);
      
      // 检查404，通常表示域名未注册
      if (error.response && error.response.status === 404) {
        console.log('RDAP返回404，表示域名可能未注册');
        
        // 对于404，我们不想继续尝试其他服务器
        return {
          success: false,
          message: '域名未注册 (RDAP 404响应)'
        };
      }
      
      // 对于其他错误，继续尝试下一个服务器
    }
  }
  
  // 所有RDAP服务器失败
  console.log('所有RDAP服务器查询失败');
  return {
    success: false,
    message: 'RDAP查询失败，将尝试使用WHOIS查询'
  };
}

/**
 * 增强型RDAP响应解析器，更好地提取字段
 */
function parseRDAPResponse(rdapData: any, domain: string): WhoisData {
  try {
    // 提取注册商，有更多的备选选项
    let registrar = "未知";
    if (rdapData.entities) {
      // 首先尝试找到一个registrar实体
      for (const entity of rdapData.entities) {
        if (entity.roles && (entity.roles.includes("registrar") || entity.roles.includes("registrationAgent"))) {
          // 尝试不同的路径来获取注册商名称
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
      
      // 如果没有找到注册商，尝试任何有名称的实体作为备选
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
    
    // 提取注册人，有更多的备选选项
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
    
    // 提取日期，更多的格式处理
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
    
    // 提取域名状态，更好的格式化
    let status = "未知";
    if (rdapData.status && rdapData.status.length > 0) {
      status = rdapData.status.join(", ");
    } else if (rdapData.domainStatus && rdapData.domainStatus.length > 0) {
      status = rdapData.domainStatus.join(", ");
    }
    
    // 提取名称服务器，更好的验证
    const nameServers: string[] = [];
    if (rdapData.nameservers && rdapData.nameservers.length > 0) {
      for (const ns of rdapData.nameservers) {
        if (ns.ldhName && typeof ns.ldhName === 'string' && ns.ldhName.includes('.')) {
          nameServers.push(ns.ldhName.toLowerCase());
        }
      }
    }
    
    // 生成原始数据文本
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
