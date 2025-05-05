
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
      protocol: "whois"
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
