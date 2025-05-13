
import axios from 'axios';
import { formatDomain } from '@/utils/domainUtils';
import { WhoisData } from '@/hooks/use-whois-lookup';

/**
 * 域名查询服务
 * 提供RDAP和WHOIS查询能力，支持多重API回退策略
 */
export async function lookupDomain(domain: string, protocol: 'auto' | 'rdap' | 'whois' = 'auto'): Promise<WhoisData> {
  try {
    console.log(`[DomainQueryService] 开始查询域名: ${domain}, 协议: ${protocol}`);
    // 格式化域名（移除协议前缀等）
    const cleanDomain = formatDomain(domain);
    
    if (!cleanDomain) {
      return createErrorResponse('无效的域名格式');
    }
    
    // 1. 尝试使用本地API
    try {
      const apiUrl = `/api/whois`; 
      console.log(`[DomainQueryService] 使用本地API查询: ${apiUrl}`);
      
      const response = await axios.post(apiUrl, {
        domain: cleanDomain,
        protocol: protocol
      }, {
        timeout: 15000
      });
      
      if (response.data && !response.data.error) {
        console.log(`[DomainQueryService] 本地API查询成功`);
        return formatApiResponse(response.data, cleanDomain);
      }
      
      console.log(`[DomainQueryService] 本地API返回错误:`, response.data.error);
    } catch (localError) {
      console.error(`[DomainQueryService] 本地API错误:`, localError);
    }
    
    // 2. 尝试公共API（作为备选方案）
    const publicApis = [
      {
        url: `https://api.whoapi.com/?domain=${cleanDomain}&r=whois&apikey=demo`,
        processor: (data: any): WhoisData => {
          return {
            domain: cleanDomain,
            whoisServer: data.whois_server || "未知",
            registrar: data.registrar || "未知",
            registrationDate: data.date_created || "未知",
            expiryDate: data.date_expires || "未知",
            nameServers: data.nameservers || [],
            registrant: data.owner || "未知",
            status: data.status || "未知",
            rawData: data.whois_raw || `没有原始WHOIS数据`,
            protocol: 'whois',
            message: "从公共WHOIS API获取数据"
          };
        }
      },
      {
        url: `https://who.cx/api/whois/${cleanDomain}`,
        processor: (data: any): WhoisData => {
          return {
            domain: cleanDomain,
            whoisServer: data.whois_server || "未知",
            registrar: data.registrar || "未知",
            registrationDate: data.created || "未知",
            expiryDate: data.expires || "未知",
            nameServers: data.nameservers || [],
            registrant: data.registrant || "未知",
            status: data.status || "未知",
            rawData: data.raw || `没有原始WHOIS数据`,
            protocol: 'whois',
            message: "从who.cx API获取数据"
          };
        }
      }
    ];
    
    console.log(`[DomainQueryService] 尝试公共WHOIS API`);
    
    for (const api of publicApis) {
      try {
        const response = await axios.get(api.url, { 
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Domain-Info-Tool/1.0'
          }
        });
        
        if (response.data) {
          console.log(`[DomainQueryService] 公共API查询成功: ${api.url}`);
          return api.processor(response.data);
        }
      } catch (apiError) {
        console.error(`[DomainQueryService] 公共API查询失败 ${api.url}:`, apiError);
      }
    }
    
    // 3. 使用静态JSON数据作为最后的回退方案（针对一些知名域名）
    try {
      console.log(`[DomainQueryService] 尝试从静态数据获取信息`);
      const staticData = await getStaticDomainInfo(cleanDomain);
      
      if (staticData) {
        console.log(`[DomainQueryService] 找到静态数据`);
        return {
          ...staticData,
          message: "从静态数据获取信息（所有API查询失败）"
        };
      }
    } catch (staticError) {
      console.error(`[DomainQueryService] 静态数据加载失败:`, staticError);
    }
    
    // 4. 所有方法都失败，返回错误
    return createErrorResponse('所有查询方法都失败');
    
  } catch (error) {
    console.error(`[DomainQueryService] 域名查询服务错误:`, error);
    return createErrorResponse(error instanceof Error ? error.message : '未知错误');
  }
}

/**
 * 创建错误响应
 */
function createErrorResponse(errorMessage: string): WhoisData {
  return {
    domain: "",
    whoisServer: "查询失败",
    registrar: "未知",
    registrationDate: "未知",
    expiryDate: "未知",
    nameServers: [],
    registrant: "未知",
    status: "查询失败",
    protocol: "error",
    rawData: errorMessage,
    message: `错误: ${errorMessage}`
  };
}

/**
 * 格式化API响应，确保符合WhoisData接口
 */
function formatApiResponse(data: any, domain: string): WhoisData {
  return {
    domain: domain,
    whoisServer: data.whoisServer || "未知",
    registrar: data.registrar || "未知",
    registrationDate: data.registrationDate || data.creationDate || "未知",
    expiryDate: data.expiryDate || data.expires || "未知",
    nameServers: data.nameServers || [],
    registrant: data.registrant || "未知", 
    status: data.status || "未知",
    rawData: data.rawData || JSON.stringify(data),
    protocol: data.protocol || 'whois',
    message: data.message || "API查询成功"
  };
}

/**
 * 获取静态域名信息（适用于知名域名）
 * 作为API查询失败的最后回退选项
 */
async function getStaticDomainInfo(domain: string): Promise<WhoisData | null> {
  // 知名域名的静态数据
  const knownDomains: Record<string, WhoisData> = {
    'google.com': {
      domain: 'google.com',
      whoisServer: 'whois.markmonitor.com',
      registrar: 'MarkMonitor Inc.',
      registrationDate: '1997-09-15',
      expiryDate: '2028-09-14',
      nameServers: ['ns1.google.com', 'ns2.google.com', 'ns3.google.com', 'ns4.google.com'],
      registrant: 'Google LLC',
      status: 'clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited',
      protocol: 'static',
      rawData: 'Static data for google.com',
      message: '静态数据'
    },
    'baidu.com': {
      domain: 'baidu.com',
      whoisServer: 'whois.markmonitor.com',
      registrar: 'MarkMonitor Inc.',
      registrationDate: '1999-10-11',
      expiryDate: '2026-10-11',
      nameServers: ['ns1.baidu.com', 'ns2.baidu.com', 'ns3.baidu.com', 'ns4.baidu.com'],
      registrant: 'Beijing Baidu Netcom Science Technology Co., Ltd.',
      status: 'clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited',
      protocol: 'static',
      rawData: 'Static data for baidu.com',
      message: '静态数据'
    },
    'microsoft.com': {
      domain: 'microsoft.com',
      whoisServer: 'whois.markmonitor.com',
      registrar: 'MarkMonitor Inc.',
      registrationDate: '1991-05-02',
      expiryDate: '2023-05-03',
      nameServers: ['ns1.msft.net', 'ns2.msft.net', 'ns3.msft.net', 'ns4.msft.net'],
      registrant: 'Microsoft Corporation',
      status: 'clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited',
      protocol: 'static',
      rawData: 'Static data for microsoft.com',
      message: '静态数据'
    }
  };
  
  return knownDomains[domain] || null;
}
