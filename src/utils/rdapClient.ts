
import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';

// 标准RDAP根服务器
const RDAP_BOOTSTRAP_URLS = [
  'https://rdap.org/domain/',
  'https://www.rdap.net/domain/',
  'https://rdap.arin.net/registry/domain/'
];

// 固定TLD的RDAP服务器映射
const TLD_RDAP_SERVERS: Record<string, string> = {
  'com': 'https://rdap.verisign.com/com/v1/domain/',
  'net': 'https://rdap.verisign.com/net/v1/domain/',
  'org': 'https://rdap.pir.org/v1/domain/',
  'edu': 'https://rdap.educause.edu/domain/',
  'us': 'https://rdap.registry.neustar/v1/domain/',
  'io': 'https://rdap.nic.io/domain/',
  'ai': 'https://rdap.nic.ai/domain/'
};

/**
 * 通过RDAP协议查询域名信息
 */
export async function queryRDAP(domain: string): Promise<{success: boolean, data?: WhoisData, message: string}> {
  console.log(`开始RDAP查询: ${domain}`);
  
  if (!domain) {
    return {success: false, message: '无效的域名'};
  }
  
  // 提取TLD
  const tldMatch = domain.match(/\.([^.]+)$/);
  const tld = tldMatch ? tldMatch[1].toLowerCase() : null;
  
  // 确定要使用的RDAP服务器
  const rdapUrls: string[] = [];
  
  // 首先尝试特定TLD的RDAP服务器
  if (tld && TLD_RDAP_SERVERS[tld]) {
    rdapUrls.push(`${TLD_RDAP_SERVERS[tld]}${domain}`);
  }
  
  // 然后添加通用RDAP服务器
  RDAP_BOOTSTRAP_URLS.forEach(url => {
    rdapUrls.push(`${url}${domain}`);
  });
  
  // 添加直接RDAP服务器URL
  rdapUrls.push(`https://rdap.verisign.com/com/v1/domain/${domain}`);
  
  // 遍历所有可能的RDAP服务器
  for (const url of rdapUrls) {
    try {
      console.log(`尝试RDAP服务器: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 8000, // 8秒超时
        headers: {
          'Accept': 'application/rdap+json',
          'User-Agent': 'Mozilla/5.0 Domain-Info-Tool/1.0'
        }
      });
      
      // 检查是否有有效响应
      if (response.data && response.status === 200) {
        console.log('RDAP响应成功:', response.data);
        
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
      
      // 检查是否收到了404，这通常表示域名未注册
      if (error.response && error.response.status === 404) {
        console.log('RDAP返回404，表示域名可能未注册');
      } 
      
      // 继续尝试下一个服务器
    }
  }
  
  // 所有RDAP服务器都失败
  console.log('所有RDAP服务器查询失败');
  return {
    success: false,
    message: 'RDAP查询失败，将尝试使用WHOIS查询'
  };
}

/**
 * 解析RDAP响应为WhoisData格式
 */
function parseRDAPResponse(rdapData: any, domain: string): WhoisData {
  try {
    // 提取注册商
    let registrar = "未知";
    if (rdapData.entities) {
      for (const entity of rdapData.entities) {
        if (entity.roles && entity.roles.includes("registrar")) {
          registrar = entity.vcardArray?.[1]?.find((vcard: any[]) => vcard[0] === "fn")?.[3] || 
                     entity.publicIds?.[0]?.identifier || 
                     entity.handle || 
                     "未知";
          break;
        }
      }
    }
    
    // 提取注册人
    let registrant = "未知";
    if (rdapData.entities) {
      for (const entity of rdapData.entities) {
        if (entity.roles && (entity.roles.includes("registrant") || entity.roles.includes("administrative"))) {
          registrant = entity.vcardArray?.[1]?.find((vcard: any[]) => vcard[0] === "fn")?.[3] || 
                      entity.handle || 
                      "未知";
          break;
        }
      }
    }
    
    // 提取日期
    let registrationDate = "未知";
    let expiryDate = "未知";
    
    if (rdapData.events) {
      for (const event of rdapData.events) {
        if (event.eventAction === "registration") {
          registrationDate = event.eventDate || "未知";
        } else if (event.eventAction === "expiration") {
          expiryDate = event.eventDate || "未知";
        }
      }
    }
    
    // 提取域名状态
    let status = "未知";
    if (rdapData.status && rdapData.status.length > 0) {
      status = rdapData.status.join(", ");
    }
    
    // 提取名称服务器
    const nameServers: string[] = [];
    if (rdapData.nameservers && rdapData.nameservers.length > 0) {
      for (const ns of rdapData.nameservers) {
        if (ns.ldhName) {
          nameServers.push(ns.ldhName);
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
