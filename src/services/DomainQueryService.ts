
/**
 * DomainQueryService - 简化版域名查询服务
 * 提供RDAP和WHOIS域名信息查询，带有多重失败保护机制
 */

import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';
import { formatDomain, extractTLD } from '@/utils/domainUtils';
import { getWhoisServer } from '@/utils/whoisServers';

// 重试配置
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

/**
 * 域名查询服务 - 简单、可靠的域名信息查询
 */
export class DomainQueryService {
  // 查询超时设置
  private readonly timeout = 10000;
  
  /**
   * 查询域名信息
   * @param domain 域名
   * @param protocol 优先使用的协议
   * @returns 域名信息
   */
  async queryDomain(domain: string, protocol: 'auto' | 'rdap' | 'whois' = 'auto'): Promise<WhoisData> {
    console.log(`开始查询域名: ${domain}，首选协议: ${protocol}`);
    
    // 格式化域名
    const cleanDomain = formatDomain(domain);
    if (!cleanDomain) {
      return this.createErrorResponse(domain, '无效的域名格式');
    }
    
    try {
      // 根据协议优先级查询
      if (protocol === 'rdap') {
        // 尝试RDAP查询
        const rdapData = await this.queryRDAP(cleanDomain);
        if (rdapData) {
          console.log('RDAP查询成功');
          return rdapData;
        }
        
        console.log('RDAP查询失败，返回错误响应');
        return this.createErrorResponse(cleanDomain, 'RDAP查询失败，未返回有效数据');
      } 
      else if (protocol === 'whois') {
        // 尝试WHOIS查询
        const whoisData = await this.queryWHOIS(cleanDomain);
        if (whoisData) {
          console.log('WHOIS查询成功');
          return whoisData;
        }
        
        console.log('WHOIS查询失败，返回错误响应');
        return this.createErrorResponse(cleanDomain, 'WHOIS查询失败，未返回有效数据');
      }
      else {
        // 自动模式 - 首先尝试RDAP，然后尝试WHOIS
        console.log('自动模式查询 - 先RDAP后WHOIS');
        
        // 1. 尝试RDAP查询
        try {
          const rdapData = await this.queryRDAP(cleanDomain);
          if (rdapData) {
            console.log('RDAP查询成功');
            return rdapData;
          }
        } catch (rdapError) {
          console.log('RDAP查询出错:', rdapError);
        }
        
        // 2. 尝试WHOIS查询
        try {
          const whoisData = await this.queryWHOIS(cleanDomain);
          if (whoisData) {
            console.log('WHOIS查询成功');
            return whoisData;
          }
        } catch (whoisError) {
          console.log('WHOIS查询出错:', whoisError);
        }
        
        // 两种方式都失败
        return this.createErrorResponse(cleanDomain, 'RDAP和WHOIS查询均未返回有效数据');
      }
    } catch (error) {
      console.error(`查询域名 ${cleanDomain} 出错:`, error);
      return this.createErrorResponse(cleanDomain, `查询出错: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 使用RDAP协议查询域名
   * @param domain 域名
   * @returns 域名信息
   */
  private async queryRDAP(domain: string): Promise<WhoisData | null> {
    console.log(`开始RDAP查询: ${domain}`);
    
    // 常用RDAP服务器URL
    const rdapServers = [
      `https://rdap.verisign.com/com/v1/domain/${domain}`,
      `https://rdap.registry.net.za/rdap/domain/${domain}`,
      `https://rdap.org/domain/${domain}`,
      `https://rdap-bootstrap.iana.org/domain/${domain}`
    ];
    
    // 尝试不同的RDAP服务器
    for (const serverUrl of rdapServers) {
      try {
        console.log(`尝试RDAP服务器: ${serverUrl}`);
        
        const response = await this.retryRequest(async () => {
          return await axios.get(serverUrl, {
            timeout: this.timeout,
            headers: {
              'Accept': 'application/rdap+json',
              'User-Agent': 'Domain-Lookup-Tool/2.0'
            }
          });
        });
        
        if (response.data) {
          console.log(`RDAP查询成功 (服务器: ${serverUrl})`);
          
          // 处理RDAP数据
          const result = this.processRDAPData(response.data, domain);
          if (result) {
            return {
              domain: domain,
              whoisServer: "RDAP服务器",
              registrar: result.registrar || "未知",
              registrationDate: result.registrationDate || "未知",
              expiryDate: result.expiryDate || "未知",
              nameServers: result.nameServers || [],
              registrant: result.registrant || "未知",
              status: result.status || "未知",
              rawData: JSON.stringify(response.data, null, 2),
              protocol: 'rdap'
            };
          }
        }
      } catch (error) {
        console.log(`RDAP服务器 ${serverUrl} 查询失败:`, error);
        // 继续尝试下一个服务器
      }
    }
    
    // 所有RDAP服务器都失败
    console.log('所有RDAP服务器查询失败');
    return null;
  }
  
  /**
   * 处理RDAP数据
   */
  private processRDAPData(rdapData: any, domain: string) {
    try {
      if (!rdapData) return null;
      
      const result: any = {
        domain: domain,
        registrar: null,
        registrationDate: null,
        expiryDate: null,
        nameServers: [],
        registrant: null,
        status: null,
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
      console.error('处理RDAP数据出错:', error);
      return null;
    }
  }
  
  /**
   * 使用WHOIS协议查询域名
   * @param domain 域名
   * @returns 域名信息
   */
  private async queryWHOIS(domain: string): Promise<WhoisData | null> {
    console.log(`开始WHOIS查询: ${domain}`);
    
    try {
      // 查找适合的WHOIS服务器
      const whoisServer = getWhoisServer(domain) || 'whois.verisign-grs.com';
      console.log(`使用WHOIS服务器: ${whoisServer}`);
      
      // 尝试本地API端点
      const apiEndpoints = ['/api/whois', '/api/direct-whois'];
      
      for (const endpoint of apiEndpoints) {
        try {
          console.log(`尝试API端点: ${endpoint}`);
          
          const response = await this.retryRequest(async () => {
            return await axios.post(endpoint, {
              domain,
              server: whoisServer,
              timeout: 10000
            }, {
              timeout: 15000
            });
          });
          
          if (response.data) {
            console.log(`API端点 ${endpoint} 查询成功`);
            
            // 检查API返回的数据是否有效
            const data = response.data.data || response.data;
            if (data) {
              // 构建标准WhoisData响应
              return {
                domain: domain,
                whoisServer: data.whoisServer || whoisServer,
                registrar: data.registrar || "未知",
                registrationDate: data.registrationDate || data.creationDate || "未知",
                expiryDate: data.expiryDate || "未知",
                nameServers: data.nameServers || [],
                registrant: data.registrant || "未知",
                status: data.status || "未知",
                rawData: data.rawData || JSON.stringify(data),
                protocol: 'whois'
              };
            }
          }
        } catch (error) {
          console.log(`API端点 ${endpoint} 查询失败:`, error);
          // 继续尝试下一个API
        }
      }
      
      // 尝试公共WHOIS API
      const publicApis = [
        `https://api.whoapi.com/?domain=${domain}&r=whois&apikey=demo`,
        `https://who.cx/api/whois?domain=${domain}`
      ];
      
      for (const apiUrl of publicApis) {
        try {
          console.log(`尝试公共API: ${apiUrl}`);
          
          const response = await this.retryRequest(async () => {
            return await axios.get(apiUrl, { timeout: 8000 });
          });
          
          if (response.data) {
            console.log(`公共API ${apiUrl} 查询成功`);
            
            const data = response.data;
            return {
              domain: domain,
              whoisServer: data.whois_server || data.whoisServer || whoisServer,
              registrar: data.registrar || "未知",
              registrationDate: data.created || data.date_created || data.registrationDate || "未知",
              expiryDate: data.expires || data.date_expires || data.expiryDate || "未知",
              nameServers: data.nameservers || data.nameServers || [],
              registrant: data.owner || data.registrant || "未知",
              status: data.status || "未知",
              rawData: data.whois_raw || data.raw || data.rawData || JSON.stringify(data),
              protocol: 'whois'
            };
          }
        } catch (error) {
          console.log(`公共API ${apiUrl} 查询失败:`, error);
          // 继续尝试下一个API
        }
      }
      
      // 所有API都失败
      console.log('所有WHOIS查询方法均失败');
      return null;
    } catch (error) {
      console.error('WHOIS查询过程出错:', error);
      return null;
    }
  }
  
  /**
   * 创建错误响应对象
   * @param domain 域名
   * @param errorMessage 错误信息
   * @returns 错误响应
   */
  private createErrorResponse(domain: string, errorMessage: string): WhoisData {
    return {
      domain: domain,
      whoisServer: "查询失败",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "未知",
      rawData: `查询域名 ${domain} 失败: ${errorMessage}`,
      protocol: "error",
      message: errorMessage
    };
  }
  
  /**
   * 带重试的请求函数
   * @param fn 请求函数
   * @returns 响应结果
   */
  private async retryRequest<T>(fn: () => Promise<T>): Promise<T> {
    let lastError;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // 尝试执行请求
        return await fn();
      } catch (error) {
        console.log(`请求失败，重试 ${attempt}/${MAX_RETRIES}`);
        lastError = error;
        
        // 最后一次尝试失败，直接抛出错误
        if (attempt === MAX_RETRIES) {
          throw error;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
      }
    }
    
    // 不应该到达这里，但如果发生了，抛出最后一个错误
    throw lastError;
  }
}

// 导出单例实例以便在应用中共享
export const domainQueryService = new DomainQueryService();

// 简单的域名查询方法
export async function lookupDomain(domain: string, protocol: 'auto' | 'rdap' | 'whois' = 'auto'): Promise<WhoisData> {
  return await domainQueryService.queryDomain(domain, protocol);
}
