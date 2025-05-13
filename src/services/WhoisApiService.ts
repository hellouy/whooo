
import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';
import { buildApiUrl, retryRequest, formatDomain, extractTLD, getMockWhoisResponse } from '@/utils/apiUtils';
import { getWhoisServer } from '@/utils/whoisServers';

// API查询配置
interface ApiEndpoint {
  url: string;
  method: 'get' | 'post';
  data?: any;
  headers?: Record<string, string>;
  process: (response: any) => WhoisData;
}

/**
 * WhoisAPI服务 - 提供多种方式获取域名数据
 */
export class WhoisApiService {
  private domain: string;
  private tld: string | null;
  private querySources: string[] = [];
  
  constructor(domainInput: string) {
    this.domain = formatDomain(domainInput);
    this.tld = extractTLD(this.domain);
  }
  
  /**
   * 执行多源查询 - 使用多个API和方法查询域名信息
   */
  async lookup(): Promise<WhoisData> {
    console.log(`开始为${this.domain}执行多源查询`);
    
    try {
      // 1. 先尝试本地API端点
      const localApiResult = await this.tryLocalApis();
      if (localApiResult) return localApiResult;
      
      // 2. 尝试公共RDAP查询
      const rdapResult = await this.tryRdapLookup();
      if (rdapResult) return rdapResult;
      
      // 3. 尝试远程公共WHOIS API
      const publicApiResult = await this.tryPublicApis();
      if (publicApiResult) return publicApiResult;
      
      // 4. 尝试模拟数据作为最后的后备
      console.log("所有查询方法均失败，返回模拟数据");
      this.querySources.push('mock');
      const mockResponse = getMockWhoisResponse(this.domain);
      return mockResponse.data;
    } catch (error) {
      console.error("WhoisApiService查询失败:", error);
      
      // 返回错误数据
      return {
        domain: this.domain,
        whoisServer: "查询失败",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "查询失败",
        rawData: `所有查询方法均失败。错误: ${error instanceof Error ? error.message : String(error)}`,
        protocol: "error" as "rdap" | "whois" | "error",
        message: `查询失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * 尝试本地API端点
   */
  private async tryLocalApis(): Promise<WhoisData | null> {
    const apiPaths = [
      '/api/whois',
      '/api/direct-whois',
      '/whois',
      '/direct-whois'
    ];
    
    for (const path of apiPaths) {
      try {
        console.log(`尝试本地API: ${path}`);
        const apiUrl = buildApiUrl(path);
        this.querySources.push(`local-api:${path}`);
        
        const response = await retryRequest(() => 
          axios.post(apiUrl, {
            domain: this.domain,
            server: getWhoisServer(this.domain),
            timeout: 10000,
            mode: 'auto'
          }, {
            timeout: 12000
          }),
          2, // 重试次数
          500, // 初始延迟
          2,   // 退避因子
          3000 // 最大延迟
        );
        
        if (response.data && response.data.success && response.data.data) {
          console.log(`本地API ${path} 查询成功`);
          const apiData = response.data.data;
          
          // 确保protocol字段使用正确的联合类型
          const protocol = (apiData.protocol === 'rdap' || apiData.protocol === 'whois') 
            ? apiData.protocol as "rdap" | "whois" 
            : "whois" as "rdap" | "whois" | "error";
          
          return {
            domain: this.domain,
            whoisServer: apiData.whoisServer || "本地API",
            registrar: apiData.registrar || "未知",
            registrationDate: apiData.registrationDate || apiData.creationDate || "未知",
            expiryDate: apiData.expiryDate || "未知",
            nameServers: apiData.nameServers || [],
            registrant: apiData.registrant || "未知",
            status: apiData.status || "未知",
            rawData: apiData.rawData || `从本地API (${path}) 获取的数据`,
            protocol,
            message: `通过本地API (${path}) 成功获取数据`
          };
        }
      } catch (error) {
        console.error(`本地API ${path} 查询失败:`, error);
      }
    }
    
    return null;
  }
  
  /**
   * 尝试RDAP查询
   */
  private async tryRdapLookup(): Promise<WhoisData | null> {
    try {
      this.querySources.push('rdap');
      console.log("尝试RDAP查询");
      
      const endpoints: ApiEndpoint[] = [
        {
          url: `https://rdap.org/domain/${this.domain}`,
          method: 'get',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Domain-Lookup-Tool/2.0'
          },
          process: (data: any) => {
            return {
              domain: this.domain,
              whoisServer: "RDAP.org",
              registrar: data.entities?.[0]?.name || "未知",
              registrationDate: data.events?.find((e:any) => e.eventAction === "registration")?.eventDate || "未知",
              expiryDate: data.events?.find((e:any) => e.eventAction === "expiration")?.eventDate || "未知",
              nameServers: (data.nameservers || []).map((ns: any) => ns.ldhName),
              registrant: "未知",
              status: Array.isArray(data.status) ? data.status.join(', ') : data.status || "未知",
              rawData: JSON.stringify(data, null, 2),
              protocol: "rdap" as "rdap" | "whois" | "error",
              message: "通过RDAP协议获取的数据"
            };
          }
        },
        {
          url: `https://www.arin.net/resources/registry/whois/rdap/?query=${this.domain}`,
          method: 'get',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Domain-Lookup-Tool/2.0'
          },
          process: (data: any) => {
            return {
              domain: this.domain,
              whoisServer: "ARIN RDAP",
              registrar: data.entities?.[0]?.name || "未知",
              registrationDate: data.events?.find((e:any) => e.eventAction === "registration")?.eventDate || "未知",
              expiryDate: data.events?.find((e:any) => e.eventAction === "expiration")?.eventDate || "未知",
              nameServers: (data.nameservers || []).map((ns: any) => ns.ldhName),
              registrant: "未知",
              status: Array.isArray(data.status) ? data.status.join(', ') : data.status || "未知",
              rawData: JSON.stringify(data, null, 2),
              protocol: "rdap" as "rdap" | "whois" | "error",
              message: "通过ARIN RDAP获取的数据"
            };
          }
        }
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await retryRequest(() => {
            if (endpoint.method === 'post') {
              return axios.post(endpoint.url, endpoint.data || {}, {
                timeout: 10000,
                headers: endpoint.headers
              });
            } else {
              return axios.get(endpoint.url, {
                timeout: 10000,
                headers: endpoint.headers
              });
            }
          }, 2);
          
          if (response.data) {
            console.log(`RDAP查询成功: ${endpoint.url}`);
            return endpoint.process(response.data);
          }
        } catch (error) {
          console.error(`RDAP查询失败 ${endpoint.url}:`, error);
        }
      }
    } catch (error) {
      console.error("RDAP查询过程中出错:", error);
    }
    
    return null;
  }
  
  /**
   * 尝试公共WHOIS API
   */
  private async tryPublicApis(): Promise<WhoisData | null> {
    this.querySources.push('public-apis');
    console.log("尝试公共WHOIS API");
    
    const endpoints: ApiEndpoint[] = [
      {
        url: `https://api.who.cx/whois/${this.domain}`,
        method: 'get',
        process: (data: any) => {
          return {
            domain: this.domain,
            whoisServer: data.whois_server || "未知",
            registrar: data.registrar || "未知",
            registrationDate: data.created || "未知",
            expiryDate: data.expires || "未知",
            nameServers: data.nameservers || [],
            registrant: data.registrant || "未知",
            status: data.status || "未知",
            rawData: data.raw || `No raw data available for ${this.domain}`,
            protocol: "whois" as "rdap" | "whois" | "error",
            message: "通过who.cx API获取的数据"
          };
        }
      },
      {
        url: `https://api.whoapi.com/?domain=${this.domain}&r=whois&apikey=demo`,
        method: 'get',
        process: (data: any) => {
          return {
            domain: this.domain,
            whoisServer: data.whois_server || "未知",
            registrar: data.registrar || "未知",
            registrationDate: data.date_created || "未知",
            expiryDate: data.date_expires || "未知", 
            nameServers: data.nameservers || [],
            registrant: data.owner || "未知",
            status: data.status || "未知",
            rawData: data.whois_raw || `No raw data available for ${this.domain}`,
            protocol: "whois" as "rdap" | "whois" | "error",
            message: "通过whoapi.com获取的数据"
          };
        }
      },
      {
        url: `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_demo&domainName=${this.domain}&outputFormat=JSON`,
        method: 'get',
        process: (data: any) => {
          const whoisData = data.WhoisRecord || {};
          return {
            domain: this.domain,
            whoisServer: whoisData.registrarWHOISServer || "未知",
            registrar: whoisData.registrarName || "未知",
            registrationDate: whoisData.createdDate || "未知",
            expiryDate: whoisData.expiryDate || "未知",
            nameServers: (whoisData.nameServers?.hostNames || []),
            registrant: (whoisData.registrant?.organization || whoisData.registrant?.name) || "未知",
            status: whoisData.status || "未知",
            rawData: whoisData.rawText || `No raw data available for ${this.domain}`,
            protocol: "whois" as "rdap" | "whois" | "error",
            message: "通过whoisxmlapi.com获取的数据"
          };
        }
      }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await retryRequest(() => {
          if (endpoint.method === 'post') {
            return axios.post(endpoint.url, endpoint.data || {}, {
              timeout: 10000,
              headers: endpoint.headers
            });
          } else {
            return axios.get(endpoint.url, {
              timeout: 10000,
              headers: endpoint.headers
            });
          }
        }, 2);
        
        if (response.data) {
          console.log(`公共API查询成功: ${endpoint.url}`);
          return endpoint.process(response.data);
        }
      } catch (error) {
        console.error(`公共API查询失败 ${endpoint.url}:`, error);
      }
    }
    
    return null;
  }
  
  /**
   * 获取已尝试的查询源
   */
  getQuerySources(): string[] {
    return this.querySources;
  }
}

/**
 * 创建统一的域名查询函数
 */
export async function lookupDomain(domain: string): Promise<WhoisData> {
  const service = new WhoisApiService(domain);
  return await service.lookup();
}
