
import axios from 'axios';
import { WhoisData } from '@/hooks/use-whois-lookup';
import { buildApiUrl, retryRequest, fetchFromMultipleAPIs } from '@/utils/apiUtils';
import { getWhoisServer } from '@/utils/domainUtils';
import { extractTLD } from '@/utils/apiUtils';

// 使用Whoiser库进行查询
export async function directWhoisQuery(domain: string, server?: string): Promise<WhoisData> {
  try {
    console.log(`进行直接WHOIS查询: ${domain}${server ? ` (服务器: ${server})` : ''}`);
    
    // 准备查询选项
    const options: any = {
      follow: 2,
      timeout: 15000
    };
    
    // 如果提供了服务器，使用指定服务器
    if (server) {
      options.server = server;
    }
    
    console.log(`使用whoiser选项:`, options);
    
    try {
      // 动态导入whoiser库
      const whoiser = await import('whoiser');
      
      // 执行查询
      const result = await whoiser.lookup(domain, options);
      
      if (result) {
        console.log(`whoiser查询成功:`, result);
        
        // 解析结果
        const nameServers = Array.isArray(result.nameservers) ? result.nameservers : 
          (result.nameservers ? [result.nameservers] : []);
        
        // 创建返回对象
        const whoisData: WhoisData = {
          domain: domain,
          whoisServer: result.whois?.server || server || "直接查询",
          registrar: result.registrar?.name || result.registrar || "未知",
          registrationDate: result.created || result.creationDate || "未知",
          expiryDate: result.expires || result.expirationDate || "未知",
          nameServers: nameServers,
          registrant: result.registrant || "未知",
          status: result.status || "未知",
          rawData: result.text || `直接查询 ${domain} 没有返回原始数据`,
          message: `whoiser查询成功${server ? ` (服务器: ${server})` : ''}`,
          protocol: "whois"
        };
        
        return whoisData;
      }
    } catch (error) {
      console.error("Whoiser库加载或查询错误:", error);
      throw new Error(`Whoiser库错误: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    throw new Error("Whoiser未返回有效数据");
  } catch (error: any) {
    console.error("直接WHOIS查询错误:", error);
    
    // 创建错误响应
    const errorData: WhoisData = {
      domain: domain,
      whoisServer: server || "查询失败",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "查询失败",
      rawData: `本地查询 ${domain} 失败。${error.message || "未知错误"}`,
      message: `查询失败: ${error.message || "未知错误"}`,
      protocol: "error"
    };
    
    return errorData;
  }
}

// 使用本地WHOIS服务器进行查询
export async function localWhoisQuery(domain: string, server?: string): Promise<WhoisData> {
  try {
    console.log(`进行本地WHOIS查询: ${domain}${server ? ` (服务器: ${server})` : ''}`);
    
    // 如果没有提供服务器，尝试查找适合的服务器
    if (!server) {
      server = getWhoisServer(domain);
      if (server) {
        console.log(`为域名 ${domain} 找到WHOIS服务器: ${server}`);
      } else {
        console.log(`未找到域名 ${domain} 的WHOIS服务器，将尝试泛用服务器`);
        const tld = extractTLD(domain);
        server = tld === "com" || tld === "net" ? "whois.verisign-grs.com" : "whois.iana.org";
      }
    }
    
    // 使用服务器端API进行WHOIS查询
    const apiUrl = buildApiUrl('/api/direct-whois');
    console.log(`使用API URL: ${apiUrl}`);
    
    try {
      // 多次重试请求
      const response = await retryRequest(() => 
        axios.post(apiUrl, {
          domain,
          server,
          timeout: 10000,
          mode: 'whois'
        }, {
          timeout: 15000 // 客户端超时略长于服务器超时
        }),
        3, // 最多重试3次
        1000, // 初始延迟1000ms
        1.5,  // 退避因子
        8000, // 最大延迟8秒
        (attempt, error) => {
          console.log(`API请求重试 #${attempt}, 错误: ${error.message || "未知错误"}`);
        }
      );
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || "API响应格式错误");
      }
      
      return response.data.data;
    } catch (axiosError) {
      console.error("API请求失败:", axiosError);
      
      // 尝试从其他API获取数据
      const multiApiResult = await fetchFromMultipleAPIs(domain);
      if (multiApiResult) {
        console.log("成功从备选API获取数据");
        return multiApiResult.data;
      }
      
      // 尝试使用直接WHOIS查询作为后备方案
      console.log("所有API请求失败，尝试直接WHOIS查询");
      return await directWhoisQuery(domain, server);
    }
  } catch (error: any) {
    console.error("本地WHOIS查询错误:", error);
    throw new Error(`WHOIS查询失败: ${error.message}`);
  }
}
