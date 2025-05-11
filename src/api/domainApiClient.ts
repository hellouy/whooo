
import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';

/**
 * 域名API客户端 - 提供统一的API访问接口
 */
export async function queryDomain(domain: string, protocol: 'auto' | 'rdap' | 'whois' = 'auto'): Promise<WhoisData> {
  try {
    console.log(`开始查询域名: ${domain} (协议: ${protocol})`);
    
    // 尝试不同的API端点
    const possibleEndpoints = [
      '/api/whois', 
      '/api/direct-whois', 
      '/whois',
      '/direct-whois'
    ];
    
    let lastError = null;
    
    // 依次尝试不同的API端点
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`尝试API端点: ${endpoint}`);
        
        const response = await axios.post(endpoint, 
          { 
            domain, 
            protocol,
            timeout: 10000
          },
          { timeout: 15000 }
        );
        
        // 检查响应
        if (response.data) {
          if (response.data.error) {
            console.warn(`API端点 ${endpoint} 返回错误:`, response.data.error);
            lastError = new Error(response.data.error);
            continue;
          }
          
          console.log(`API端点 ${endpoint} 成功`);
          
          // 确保数据格式符合WhoisData接口
          return {
            domain: domain,
            whoisServer: response.data.whoisServer || "API",
            registrar: response.data.registrar || "未知",
            registrationDate: response.data.registrationDate || response.data.creationDate || "未知",
            expiryDate: response.data.expiryDate || response.data.expirationDate || "未知",
            nameServers: response.data.nameServers || [],
            registrant: response.data.registrant || "未知",
            status: response.data.status || "未知",
            rawData: response.data.rawData || JSON.stringify(response.data),
            protocol: response.data.protocol || 'whois',
            message: response.data.message || "API查询成功"
          };
        }
      } catch (error) {
        console.error(`API端点 ${endpoint} 失败:`, error);
        lastError = error;
      }
    }
    
    // 所有API端点都失败，尝试使用公共WHOIS API
    try {
      console.log("尝试使用公共WHOIS API");
      
      const publicApis = [
        `https://api.whoapi.com/?domain=${domain}&r=whois&apikey=demo`,
        `https://who.cx/api/whois?domain=${domain}`
      ];
      
      for (const api of publicApis) {
        try {
          const publicResponse = await axios.get(api, { timeout: 8000 });
          
          if (publicResponse.data) {
            console.log(`公共API ${api} 成功`);
            
            // 从公共API提取相关信息
            return {
              domain: domain,
              whoisServer: publicResponse.data.whois_server || "公共API",
              registrar: publicResponse.data.registrar || "未知",
              registrationDate: publicResponse.data.created || publicResponse.data.date_created || "未知",
              expiryDate: publicResponse.data.expires || publicResponse.data.date_expires || "未知",
              nameServers: publicResponse.data.nameservers || [],
              registrant: publicResponse.data.owner || publicResponse.data.registrant || "未知",
              status: publicResponse.data.status || "未知",
              rawData: publicResponse.data.whois_raw || JSON.stringify(publicResponse.data),
              protocol: 'whois',
              message: "从公共WHOIS API获取数据"
            };
          }
        } catch (publicError) {
          console.error(`公共API ${api} 失败:`, publicError);
        }
      }
    } catch (publicApisError) {
      console.error("所有公共API尝试失败:", publicApisError);
    }
    
    // 创建错误响应
    throw lastError || new Error("无法查询域名信息");
    
  } catch (error: any) {
    console.error("域名查询失败:", error);
    
    // 返回错误响应
    return {
      domain: domain,
      whoisServer: "查询失败",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "查询失败",
      rawData: `查询域名 ${domain} 失败: ${error.message || "未知错误"}`,
      message: `查询失败: ${error.message || "未知错误"}`,
      protocol: "error"
    };
  }
}

/**
 * 查询域名价格信息
 */
export async function queryDomainPrice(domain: string): Promise<any | null> {
  try {
    console.log(`查询域名价格: ${domain}`);
    
    const endpoints = [
      `/api/price?domain=${domain}`,
      `https://who.cx/api/price?domain=${domain}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { timeout: 5000 });
        if (response.data) {
          return response.data;
        }
      } catch (error) {
        console.error(`价格API ${endpoint} 失败:`, error);
      }
    }
    
    return null;
  } catch (error) {
    console.error("查询价格失败:", error);
    return null;
  }
}
