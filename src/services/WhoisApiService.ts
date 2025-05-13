
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
  async lookup(preferredProtocol: "auto" | "rdap" | "whois" = "auto"): Promise<WhoisData> {
    console.log(`开始为${this.domain}执行多源查询，首选协议: ${preferredProtocol}`);
    
    try {
      // 根据首选协议调整查询顺序
      if (preferredProtocol === "rdap") {
        // 1. 首先尝试RDAP查询
        const rdapResult = await this.tryRdapLookup();
        if (rdapResult) return rdapResult;
        
        // 如果用户指定只使用RDAP，则不使用WHOIS
        console.log("用户选择仅使用RDAP，但RDAP查询失败");
        return this.createErrorResponse("RDAP查询失败，无法获取信息");
      } 
      else if (preferredProtocol === "whois") {
        // 1. 首先尝试本地API端点 (WHOIS)
        const localApiResult = await this.tryLocalApis();
        if (localApiResult) return localApiResult;
        
        // 2. 尝试远程公共WHOIS API
        const publicApiResult = await this.tryPublicApis();
        if (publicApiResult) return publicApiResult;
      }
      else {
        // 自动模式: 同时尝试RDAP和WHOIS
        
        // 1. 尝试RDAP查询
        const rdapResult = await this.tryRdapLookup();
        if (rdapResult) return rdapResult;
        
        // 2. 尝试本地API端点
        const localApiResult = await this.tryLocalApis();
        if (localApiResult) return localApiResult;
        
        // 3. 尝试远程公共WHOIS API
        const publicApiResult = await this.tryPublicApis();
        if (publicApiResult) return publicApiResult;
      }
      
      // 尝试静态JSON数据
      const staticResult = await this.tryStaticJsonData();
      if (staticResult) return staticResult;
      
      // 尝试模拟数据作为最后的后备
      console.log("所有查询方法均失败，返回模拟数据");
      this.querySources.push('mock');
      const mockResponse = getMockWhoisResponse(this.domain);
      return mockResponse.data;
    } catch (error) {
      console.error("WhoisApiService查询失败:", error);
      
      return this.createErrorResponse(
        `查询失败: ${error instanceof Error ? error.message : String(error)}`
      );
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
   * 尝试获取静态JSON数据
   */
  private async tryStaticJsonData(): Promise<WhoisData | null> {
    try {
      this.querySources.push('static-json');
      console.log("尝试从静态JSON数据获取域名信息");
      
      // 尝试从 /public/data/ 目录获取预定义数据
      const staticDataUrl = `/data/domains/${this.domain}.json`;
      
      const response = await axios.get(staticDataUrl, {
        timeout: 5000
      });
      
      if (response.data) {
        console.log("成功获取静态JSON数据");
        
        // 确保静态数据符合WhoisData接口
        const staticData = response.data;
        return {
          domain: this.domain,
          whoisServer: staticData.whoisServer || "静态JSON",
          registrar: staticData.registrar || "未知",
          registrationDate: staticData.registrationDate || "未知",
          expiryDate: staticData.expiryDate || "未知",
          nameServers: staticData.nameServers || [],
          registrant: staticData.registrant || "未知",
          status: staticData.status || "未知",
          rawData: staticData.rawData || "从静态JSON文件获取的数据",
          protocol: (staticData.protocol === "rdap" || staticData.protocol === "whois") 
            ? staticData.protocol 
            : "whois" as "rdap" | "whois" | "error",
          message: "从预定义静态数据获取"
        };
      }
    } catch (error) {
      console.error("静态JSON数据获取失败:", error);
    }
    
    return null;
  }
  
  /**
   * 创建错误响应对象
   */
  private createErrorResponse(errorMessage: string): WhoisData {
    return {
      domain: this.domain,
      whoisServer: "查询失败",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "查询失败",
      rawData: `所有查询方法均失败。\n查询域名: ${this.domain}\n错误: ${errorMessage}\n\n尝试的查询源: ${this.querySources.join(', ')}`,
      protocol: "error" as "rdap" | "whois" | "error",
      message: errorMessage
    };
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
export async function lookupDomain(domain: string, preferredProtocol: "auto" | "rdap" | "whois" = "auto"): Promise<WhoisData> {
  const service = new WhoisApiService(domain);
  return await service.lookup(preferredProtocol);
}
