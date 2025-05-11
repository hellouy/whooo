import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';

/**
 * 从URL中提取顶级域名
 * @param domain 域名
 * @returns 顶级域名或null
 */
export function extractTLD(domain: string): string | null {
  // 去除协议和www前缀
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  
  // 去除路径或参数
  domain = domain.split('/')[0].split('?')[0].split('#')[0];
  
  // 分割域名部分
  const parts = domain.split('.');
  
  if (parts.length < 2) {
    return null;
  }
  
  // 检查是否为复合TLD (如 .co.uk, .com.au等)
  const compoundTlds = [
    'co.uk', 'org.uk', 'me.uk', 'ac.uk', 'gov.uk', 'net.uk',
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
    'co.nz', 'net.nz', 'org.nz',
    'com.cn', 'net.cn', 'org.cn', 'edu.cn', 'gov.cn',
    'co.jp', 'ne.jp'
  ];
  
  if (parts.length >= 3) {
    const lastTwo = parts[parts.length - 2] + '.' + parts[parts.length - 1];
    if (compoundTlds.includes(lastTwo)) {
      return lastTwo;
    }
  }
  
  // 返回普通TLD
  return parts[parts.length - 1];
}

/**
 * 构建API URL，考虑不同的部署环境
 * @param path API路径
 * @returns 完整的API URL
 */
export function buildApiUrl(path: string): string {
  // 去除可能的前导斜杠
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // 在开发环境中，使用相对路径
  if (window.location.hostname === 'localhost' || 
      window.location.hostname.includes('127.0.0.1') ||
      window.location.hostname.includes('.lovableproject.') ||
      window.location.hostname.includes('.lovable.app')) {
    return cleanPath;
  }
  
  // 在生产环境中，使用绝对路径
  const baseUrl = window.location.origin;
  return `${baseUrl}${cleanPath}`;
}

/**
 * 带重试机制的网络请求
 * @param requestFn 请求函数
 * @param maxRetries 最大重试次数
 * @param initialDelay 初始延迟(ms)
 * @param backoffFactor 退避因子
 * @param maxDelay 最大延迟(ms)
 * @param onRetry 重试回调
 * @returns 请求结果
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 500,
  backoffFactor: number = 2,
  maxDelay: number = 10000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let attempt = 1;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await requestFn();
    } catch (error: any) {
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // 计算下次重试的延迟时间
      delay = Math.min(delay * backoffFactor, maxDelay);
      
      // 使用传入的重试回调(如果有)
      if (onRetry) {
        onRetry(attempt, error);
      }
      
      // 等待重试
      await new Promise(resolve => setTimeout(resolve, delay));
      
      attempt++;
    }
  }
}

/**
 * 从多个公共API获取域名信息
 * @param domain 域名
 * @returns 结果或null
 */
export async function fetchFromMultipleAPIs(domain: string): Promise<{ success: boolean, data: WhoisData } | null> {
  try {
    const apis = [
      `https://api.whoapi.com/?domain=${domain}&r=whois&apikey=demo`,
      `https://whoisjson.com/api/v1/whois?domain=${domain}`,
      `https://www.whoisxmlapi.com/whoisserver/WhoisService?domainName=${domain}&apiKey=demo&outputFormat=JSON`,
      `https://api.domainsdb.info/v1/domains/search?domain=${domain}`
    ];
    
    for (const api of apis) {
      try {
        const response = await axios.get(api, { timeout: 5000 });
        
        if (response.data) {
          console.log(`成功从API获取数据: ${api}`);
          
          const whoisData: WhoisData = {
            domain: domain,
            whoisServer: "公共API",
            registrar: extractRegistrar(response.data) || "未知",
            registrationDate: extractDate(response.data, 'created') || "未知",
            expiryDate: extractDate(response.data, 'expires') || "未知",
            nameServers: extractNameServers(response.data) || [],
            registrant: extractRegistrant(response.data) || "未知",
            status: extractStatus(response.data) || "未知",
            rawData: JSON.stringify(response.data, null, 2),
            message: "通过公共API获取数据",
            protocol: "whois"
          };
          
          return { success: true, data: whoisData };
        }
      } catch (error) {
        console.error(`API请求失败 ${api}:`, error);
        // 继续尝试下一个API
      }
    }
    
    return null;
  } catch (error) {
    console.error("从多个API获取数据失败:", error);
    return null;
  }
}

// 从不同结构的API响应中提取注册商
function extractRegistrar(data: any): string | null {
  if (!data) return null;
  
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // 如果不是有效的JSON，尝试查找注册商信息
      const registrarMatch = data.match(/registrar:\s*([^\n]+)/i);
      return registrarMatch ? registrarMatch[1].trim() : null;
    }
  }
  
  // 尝试不同的路径
  return data.registrar?.name || 
         data.registrar || 
         data.WhoisRecord?.registrarName ||
         data.result?.registrar ||
         data.data?.registrar ||
         data.response?.registrar ||
         null;
}

// 从不同结构的API响应中提取日期
function extractDate(data: any, type: 'created' | 'expires'): string | null {
  if (!data) return null;
  
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // 如果不是有效的JSON，尝试查找日期信息
      const dateRegex = type === 'created' 
        ? /(?:created|registration date|creation date):\s*([^\n]+)/i
        : /(?:expiry|expiration|expires):\s*([^\n]+)/i;
      const dateMatch = data.match(dateRegex);
      return dateMatch ? dateMatch[1].trim() : null;
    }
  }
  
  // 尝试不同的路径
  if (type === 'created') {
    return data.created ||
           data.creationDate || 
           data.WhoisRecord?.createdDate ||
           data.registrationDate ||
           data.result?.created ||
           data.data?.created ||
           data.response?.created ||
           null;
  } else {
    return data.expires || 
           data.expirationDate ||
           data.WhoisRecord?.expiresDate ||
           data.expiryDate ||
           data.result?.expires ||
           data.data?.expires ||
           data.response?.expires ||
           null;
  }
}

// 从不同结构的API响应中提取名称服务器
function extractNameServers(data: any): string[] | null {
  if (!data) return null;
  
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // 如果不是有效的JSON，尝试查找名称服务器信息
      const nsMatches = data.match(/name server.*?:\s*([^\n]+)/gi);
      return nsMatches 
        ? nsMatches.map((m: string) => m.split(':')[1].trim())
            .filter((ns: string) => ns && ns.includes('.'))
        : null;
    }
  }
  
  // 尝试不同的路径和格式
  const ns = data.nameservers || 
            data.nameServers ||
            data.WhoisRecord?.nameServers ||
            data.ns ||
            data.result?.nameservers ||
            data.data?.nameservers ||
            data.response?.nameservers;
  
  if (Array.isArray(ns)) {
    return ns.map(server => 
      typeof server === 'string' ? server : (server.hostname || server.name || server.host || '')
    ).filter(Boolean);
  }
  
  return null;
}

// 从不同结构的API响应中提取注册人
function extractRegistrant(data: any): string | null {
  if (!data) return null;
  
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // 如果不是有效的JSON，尝试查找注册人信息
      const registrantMatch = data.match(/registrant(?:\s+organization)?:\s*([^\n]+)/i);
      return registrantMatch ? registrantMatch[1].trim() : null;
    }
  }
  
  // 尝试不同的路径
  return data.registrant || 
         data.WhoisRecord?.registrant?.name ||
         data.owner ||
         data.admin?.name ||
         data.result?.registrant ||
         data.data?.registrant ||
         data.response?.registrant ||
         null;
}

// 从不同结构的API响应中提取域名状态
function extractStatus(data: any): string | null {
  if (!data) return null;
  
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // 如果不是有效的JSON，尝试查找状态信息
      const statusMatch = data.match(/status:\s*([^\n]+)/i);
      return statusMatch ? statusMatch[1].trim() : null;
    }
  }
  
  // 尝试不同的路径和格式
  const status = data.status || 
                data.WhoisRecord?.status ||
                data.domainStatus ||
                data.result?.status ||
                data.data?.status ||
                data.response?.status;
  
  if (Array.isArray(status)) {
    return status.join(', ');
  }
  
  return status || null;
}

/**
 * 获取域名的模拟WHOIS响应数据
 * @param domain 域名
 * @returns 模拟WHOIS响应
 */
export function getMockWhoisResponse(domain: string): { success: boolean, data: WhoisData } {
  console.log(`生成域名 ${domain} 的模拟WHOIS数据`);
  
  // 获取当前日期作为注册日期
  const currentDate = new Date();
  
  // 设置到期日期为一年后
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
  // 格式化日期为ISO字符串
  const registrationDateStr = currentDate.toISOString().split('T')[0];
  const expiryDateStr = expiryDate.toISOString().split('T')[0];
  
  // 生成随机的名称服务器
  const nameServers = [
    `ns1.example.com`,
    `ns2.example.com`,
  ];
  
  // 从域名提取TLD
  const tld = extractTLD(domain) || "com";
  
  return {
    success: true,
    data: {
      domain: domain,
      whoisServer: "模拟WHOIS服务",
      registrar: "示例注册商服务 (模拟数据)",
      registrationDate: registrationDateStr,
      expiryDate: expiryDateStr,
      nameServers: nameServers,
      registrant: "Domain Owner (模拟数据)",
      status: "clientTransferProhibited",
      rawData: `
模拟WHOIS数据 (无法通过常规渠道获取)
域名: ${domain}
注册商: 示例注册商服务 (模拟数据)
WHOIS服务器: whois.example.com
注册日期: ${registrationDateStr}
到期日期: ${expiryDateStr}
状态: clientTransferProhibited
名称服务器: ${nameServers.join(", ")}
最后更新: ${new Date().toISOString()}

注册人:
  姓名: Domain Owner
  组织: Example Organization
  国家: US

技术联系人:
  姓名: Technical Contact
  电子邮件: tech@example.com
  
提示: 这是模拟数据，并非实际WHOIS查询结果
`,
      message: "无法通过常规渠道获取WHOIS数据，这是模拟数据",
      protocol: "whois"
    }
  };
}
