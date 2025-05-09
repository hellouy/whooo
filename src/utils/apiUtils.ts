/**
 * 获取API基础URL，确保在开发和生产环境中都能正确处理API请求
 * @returns API基础URL
 */
export function getApiUrl(): string {
  // 使用当前窗口的origin作为基础URL
  const baseUrl = window.location.origin;
  
  // 在开发环境中，可能需要使用特定端口或URL
  if (process.env.NODE_ENV === 'development') {
    // 如果有特殊的开发环境API URL，可以在这里返回
    // return 'http://localhost:3000';
  }
  
  return baseUrl;
}

/**
 * 构建完整API URL
 * @param endpoint API端点路径，例如 '/api/whois'
 * @returns 完整的API URL
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiUrl();
  
  // 确保endpoint以/开头
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${baseUrl}${normalizedEndpoint}`;
}

/**
 * 增强版重试发送API请求函数，支持更多配置
 * @param requestFn 发送请求的函数
 * @param options 重试选项
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
  backoffFactor = 1.5,
  maxDelayMs = 10000,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 尝试执行请求
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // 如果已经到达最大重试次数，抛出错误
      if (attempt >= retries) break;
      
      // 计算下一次重试的延迟时间（指数退避）
      const nextDelay = Math.min(delayMs * Math.pow(backoffFactor, attempt), maxDelayMs);
      
      console.log(`请求失败，${nextDelay}ms后重试，剩余重试次数: ${retries-attempt-1}`);
      
      // 调用重试回调（如果提供）
      if (onRetry) onRetry(attempt + 1, error);
      
      // 等待指定时间后重试
      await new Promise(resolve => setTimeout(resolve, nextDelay));
    }
  }
  
  // 所有重试都失败，抛出最后捕获的错误
  throw lastError;
}

/**
 * 提供模拟的WHOIS响应数据，在API不可用时使用
 * @param domain 要查询的域名
 * @returns 模拟的WHOIS数据
 */
export function getMockWhoisResponse(domain: string) {
  // 构造通用模拟数据结构
  const mockData = {
    success: true,
    source: "mock-api",
    data: {
      domain: domain,
      whoisServer: "whois.mock-server.com",
      registrar: "模拟注册商 (开发测试用)",
      registrationDate: "2010-01-01",
      expiryDate: "2030-01-01",
      nameServers: ["ns1.mockserver.com", "ns2.mockserver.com"],
      registrant: "Mock Registrant",
      status: "clientTransferProhibited",
      rawData: `Domain Name: ${domain.toUpperCase()}\nRegistry Domain ID: D123456-MOCK\nRegistrar WHOIS Server: whois.mock-server.com\nRegistrar URL: http://www.mockregistrar.com\nUpdated Date: 2023-01-15T12:00:00Z\nCreation Date: 2010-01-01T00:00:00Z\nRegistry Expiry Date: 2030-01-01T00:00:00Z\nRegistrar: Mock Registrar Inc.\nRegistrant Name: Mock Registrant\nAdmin Email: admin@${domain}\nTech Email: tech@${domain}\nName Server: ns1.mockserver.com\nName Server: ns2.mockserver.com\nDNSSEC: unsigned\n>>> Last update of WHOIS database: 2023-05-01T00:00:00Z <<<`,
      message: "模拟API数据 (本地开发环境使用)",
      protocol: "whois" as "whois" | "rdap" | "error"
    }
  };

  // 为一些特定域名提供更真实的数据
  const specialDomains: {[key: string]: any} = {
    "google.com": {
      registrar: "MarkMonitor, Inc.",
      registrationDate: "1997-09-15",
      expiryDate: "2028-09-14",
      nameServers: ["ns1.google.com", "ns2.google.com", "ns3.google.com", "ns4.google.com"],
      status: "clientDeleteProhibited clientTransferProhibited clientUpdateProhibited",
      registrant: "Google LLC"
    },
    "microsoft.com": {
      registrar: "MarkMonitor, Inc.",
      registrationDate: "1991-05-02",
      expiryDate: "2023-05-03",
      nameServers: ["ns1.msft.net", "ns2.msft.net", "ns3.msft.net", "ns4.msft.net"],
      status: "clientDeleteProhibited clientTransferProhibited clientUpdateProhibited",
      registrant: "Microsoft Corporation"
    },
    "baidu.com": {
      registrar: "MarkMonitor, Inc.",
      registrationDate: "1999-10-11",
      expiryDate: "2026-10-11",
      nameServers: ["ns1.baidu.com", "ns2.baidu.com", "ns3.baidu.com", "ns4.baidu.com"],
      status: "clientDeleteProhibited clientTransferProhibited clientUpdateProhibited serverDeleteProhibited serverTransferProhibited serverUpdateProhibited", 
      registrant: "北京百度网讯科技有限公司"
    },
    "alibaba.com": {
      registrar: "Alibaba Cloud Computing Ltd. d/b/a HiChina",
      registrationDate: "1999-05-15",
      expiryDate: "2025-05-15",
      nameServers: ["ns1.alibabadns.com", "ns2.alibabadns.com"],
      status: "clientDeleteProhibited clientTransferProhibited clientUpdateProhibited",
      registrant: "Alibaba Group"
    }
  };

  // 检查是否是特定域名，如果是，则使用特定数据
  const domainKey = Object.keys(specialDomains).find(key => domain.includes(key));
  if (domainKey) {
    Object.assign(mockData.data, specialDomains[domainKey]);
  }

  return mockData;
}

/**
 * 检测域名的TLD(顶级域名)
 * @param domain 域名
 * @returns 提取的顶级域名
 */
export function extractTLD(domain: string): string | null {
  // 移除协议和www前缀
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  
  // 分割域名部分
  const parts = domain.split('.');
  
  if (parts.length < 2) return null;
  
  // 尝试复合TLD (如co.uk)
  if (parts.length >= 3) {
    const potentialCompoundTld = parts.slice(-2).join('.');
    // 这里可以添��常见复合TLD判断逻辑
    const commonCompoundTlds = ['co.uk', 'com.cn', 'org.uk', 'net.au'];
    if (commonCompoundTlds.includes(potentialCompoundTld)) {
      return potentialCompoundTld;
    }
  }
  
  // 返回简单TLD
  return parts[parts.length - 1];
}

/**
 * 尝试通过浏览器进行WHOIS查询
 * 注意：这在现代浏览器中通常会因为CORS限制而失败
 * 仅作为最后的回退使用
 */
export async function directBrowserWhoisQuery(domain: string, server: string): Promise<string | null> {
  try {
    console.log(`尝试浏览器直接WHOIS查询: ${domain} @ ${server}`);
    
    // 创建WebSocket连接(如果支持)
    if ('WebSocket' in window) {
      return new Promise((resolve, reject) => {
        // 这里只是一个示例实现，实际上浏览器限制了直接TCP连接
        // 这个函数在大多数情况下会失败，仅作为参考
        const timeout = setTimeout(() => {
          reject(new Error('WHOIS WebSocket连接超时'));
        }, 5000);
        
        try {
          // 注意：这行代码在实际浏览器环境中会失败，因为浏览器不允许直接TCP连接
          // 这里只是为了代码完整性而保留
          const ws = new WebSocket(`wss://${server}:43`);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            ws.send(`${domain}\r\n`);
          };
          
          let data = '';
          ws.onmessage = (event) => {
            data += event.data;
          };
          
          ws.onclose = () => {
            clearTimeout(timeout);
            if (data) {
              resolve(data);
            } else {
              reject(new Error('未收到WHOIS响应'));
            }
          };
          
          ws.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    }
    
    // 如果不支持WebSocket，返回null
    return null;
  } catch (error) {
    console.error('浏览器直接WHOIS查询失败:', error);
    return null;
  }
}

/**
 * 尝试从多个API服务获取WHOIS数据
 */
export async function fetchFromMultipleAPIs(domain: string, timeout = 15000) {
  const apis = [
    { url: `${getApiUrl()}/api/whois`, method: 'POST' },
    { url: `${getApiUrl()}/api/direct-whois`, method: 'POST' },
    { url: `https://www.whoisxmlapi.com/whoisserver/WhoisService`, params: { apiKey: 'at_demo', domainName: domain, outputFormat: 'JSON' }, method: 'GET' },
    { url: `https://who.cx/api/whois`, params: { domain }, method: 'GET' }
  ];
  
  const results = await Promise.allSettled(
    apis.map(api => {
      if (api.method === 'GET') {
        // 构建带参数的URL
        const url = new URL(api.url);
        if (api.params) {
          Object.keys(api.params).forEach(key => {
            url.searchParams.append(key, api.params[key]);
          });
        }
        
        return fetch(url.toString(), { 
          signal: AbortSignal.timeout(timeout),
          headers: { 'User-Agent': 'Domain-Info-Tool/1.0' }
        }).then(res => res.json());
      } else {
        // POST请求
        return fetch(api.url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Domain-Info-Tool/1.0'
          },
          body: JSON.stringify({ domain, timeout }),
          signal: AbortSignal.timeout(timeout)
        }).then(res => res.json());
      }
    })
  );
  
  // 找到第一个成功的结果
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value && !result.value.error) {
      return result.value;
    }
  }
  
  // 所有API都失败
  console.error('所有WHOIS API均失败');
  return null;
}
