
import { WhoisData } from "./use-whois-lookup";
import { parseRawData } from "@/utils/whoisParser";
import { queryWhoisAPI, queryDomainPrice } from "@/api/whoisClient";
import { getPopularDomainInfo } from "@/utils/popularDomainsService";
import { extractErrorDetails, isDomainAvailable, isDomainReserved } from "@/utils/domainUtils";

export interface ApiLookupResult {
  error?: string;
  suggestedServer?: string;
  message?: string;
  data: WhoisData;
}

export const useApiLookup = () => {
  const performApiLookup = async (domain: string, server?: string): Promise<ApiLookupResult> => {
    try {
      // 查询我们的API
      console.log("开始API lookup查询:", domain);
      const whoisData = await queryWhoisAPI(domain, server);
      
      // 尝试获取价格信息
      let priceData = null;
      try {
        priceData = await queryDomainPrice(domain);
        console.log("价格数据:", priceData);
      } catch (priceError) {
        console.error("价格查询错误:", priceError);
      }
      
      // 如果可用，添加价格数据
      if (priceData) {
        whoisData.price = priceData;
      }
      
      // 如果WHOIS数据不足或明显无效，检查是否是流行域名
      if ((whoisData.registrar === "未知" && whoisData.registrationDate === "未知") || 
          whoisData.rawData?.includes("Fallback response") ||
          whoisData.rawData?.includes("query failed")) {
          
        console.log("API查询结果不完整，检查是否为已知流行域名");
        
        // 检查是否是我们知道的流行域名
        const popularDomainInfo = getPopularDomainInfo(domain);
        
        if (popularDomainInfo) {
          console.log("找到流行域名预定义信息:", domain);
          
          // 使用预定义数据增强结果
          whoisData.registrar = popularDomainInfo.registrar;
          whoisData.registrationDate = popularDomainInfo.registrationDate;
          whoisData.expiryDate = popularDomainInfo.expiryDate;
          whoisData.nameServers = popularDomainInfo.nameServers;
          whoisData.status = popularDomainInfo.status;
          
          // 添加说明注释
          if (!whoisData.rawData || whoisData.rawData.includes("Fallback")) {
            whoisData.rawData = `## NOTICE: Using predefined data for ${domain} ##\n\n` + 
                               `This is cached data due to rate limiting on WHOIS servers.\n\n` +
                               `Domain: ${domain}\n` +
                               `Registrar: ${popularDomainInfo.registrar}\n` +
                               `Registration Date: ${popularDomainInfo.registrationDate}\n` +
                               `Expiry Date: ${popularDomainInfo.expiryDate}\n` +
                               `Status: ${popularDomainInfo.status}\n` +
                               `Name Servers: ${popularDomainInfo.nameServers.join(', ')}\n\n` +
                               (whoisData.rawData || "");
          }
          
          whoisData.message = "使用预定义数据（由于WHOIS查询限制）";
        }
      }
      
      // 解析原始数据（如果我们有）
      const parsedData = whoisData.rawData ? parseRawData(domain, whoisData.rawData) : null;
      
      // 将解析的数据与API数据合并
      if (parsedData && !parsedData.error) {
        console.log("成功解析附加数据:", parsedData);
        
        // 使用解析的数据填补缺失部分
        if (whoisData.registrar === "未知" && parsedData.registrar) {
          whoisData.registrar = parsedData.registrar;
        }
        
        if (whoisData.registrationDate === "未知" && parsedData.creationDate) {
          whoisData.registrationDate = parsedData.creationDate;
        }
        
        if (whoisData.expiryDate === "未知" && parsedData.expiryDate) {
          whoisData.expiryDate = parsedData.expiryDate;
        }
        
        if (whoisData.nameServers.length === 0 && parsedData.nameServers && parsedData.nameServers.length > 0) {
          whoisData.nameServers = parsedData.nameServers;
        }
        
        if (whoisData.status === "未知" && parsedData.status) {
          whoisData.status = parsedData.status;
        }
      }
      
      // 检查域名是否未注册或被保留
      if (whoisData.rawData) {
        if (isDomainAvailable(whoisData.rawData)) {
          return {
            message: "域名未注册",
            data: {
              ...whoisData,
              status: "未注册",
              message: "此域名当前可供注册"
            }
          };
        }
        
        if (isDomainReserved(whoisData.rawData)) {
          return {
            message: "域名已被保留",
            data: {
              ...whoisData,
              status: "已保留",
              message: "此域名已被保留，不可注册"
            }
          };
        }
      }
      
      return {
        message: whoisData.message || "查询成功",
        data: whoisData
      };
      
    } catch (error: any) {
      console.error("API查询错误:", error);
      
      // 尝试获取详细错误信息
      const errorDetails = extractErrorDetails(error.message || "Unknown error");
      
      // 检查是否是流行域名
      const popularDomainInfo = getPopularDomainInfo(domain);
      
      if (popularDomainInfo) {
        console.log("API查询失败，但找到流行域名预定义信息:", domain);
        
        // 创建一个基于预定义数据的结果
        const data: WhoisData = {
          domain: domain,
          whoisServer: "预定义数据",
          registrar: popularDomainInfo.registrar,
          registrationDate: popularDomainInfo.registrationDate,
          expiryDate: popularDomainInfo.expiryDate,
          nameServers: popularDomainInfo.nameServers,
          registrant: "未知",
          status: popularDomainInfo.status,
          rawData: `## NOTICE: Using predefined data for ${domain} ##\n\n` + 
                  `Original error: ${errorDetails}\n\n` +
                  `This is cached data due to rate limiting on WHOIS servers.\n\n` +
                  `Domain: ${domain}\n` +
                  `Registrar: ${popularDomainInfo.registrar}\n` +
                  `Registration Date: ${popularDomainInfo.registrationDate}\n` +
                  `Expiry Date: ${popularDomainInfo.expiryDate}\n` +
                  `Status: ${popularDomainInfo.status}\n` +
                  `Name Servers: ${popularDomainInfo.nameServers.join(', ')}`,
          message: "使用预定义数据（WHOIS查询失败）"
        };
        
        return {
          message: "使用预定义数据",
          data
        };
      }
      
      // 如果没有预定义数据，返回错误
      return {
        error: errorDetails,
        data: {
          domain: domain,
          whoisServer: "API错误",
          registrar: "未知",
          registrationDate: "未知",
          expiryDate: "未知",
          nameServers: [],
          registrant: "未知",
          status: "未知",
          rawData: `API lookup error for ${domain}: ${errorDetails}`,
          message: `查询错误: ${errorDetails}`
        }
      };
    }
  };

  return { performApiLookup };
};
