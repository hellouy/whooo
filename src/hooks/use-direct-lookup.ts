
import { WhoisData } from "./use-whois-lookup";
import { processWhoisResults } from "@/utils/whoiserProcessor";
// Import whois servers data
import whoisServersData from "../../public/api/whois-servers.json";
// Import whoiser - handle both ESM and CommonJS
import whoiserDefault from "whoiser";
// Ensure we have a working whoiser function regardless of export type
const whoiser = typeof whoiserDefault === 'function' ? whoiserDefault : 
               (whoiserDefault && whoiserDefault.default) ? whoiserDefault.default : 
               () => Promise.resolve({});

export const useDirectLookup = () => {
  // Function to extract TLD from domain
  const extractTLD = (domain: string): string | null => {
    // Remove protocol and www prefix
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
    
    // Split domain parts
    const parts = domain.split('.');
    
    // Handle compound TLDs
    if (parts.length >= 3) {
      const lastTwo = parts[parts.length - 2] + '.' + parts[parts.length - 1];
      // Check if it's a compound TLD (like .co.uk, .com.cn, etc.)
      if (whoisServersData[lastTwo]) {
        return lastTwo;
      }
    }
    
    // Return standard TLD
    return parts.length > 1 ? parts[parts.length - 1] : null;
  };

  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    try {
      console.log("正在尝试直接查询域名:", domain);
      
      // 获取TLD以查找特定的WHOIS服务器
      const tld = extractTLD(domain);
      console.log("域名TLD:", tld);
      
      // 根据TLD确定使用哪个WHOIS服务器
      let options: { follow: number; server?: string; timeout?: number } = { follow: 3, timeout: 20000 };
      
      if (tld && whoisServersData[tld]) {
        console.log(`使用.${tld}的特定WHOIS服务器:`, whoisServersData[tld]);
        options.server = whoisServersData[tld];
      } else {
        console.log("未找到特定TLD的WHOIS服务器，使用默认服务器");
      }
      
      // 尝试多种方式获取WHOIS数据
      let whoiserResult = null;
      
      // 尝试方法1：whoiser直接查询
      try {
        console.log("尝试方法1: 使用whoiser直接查询");
        whoiserResult = await whoiser(domain, options);
        console.log("Whoiser原始响应:", JSON.stringify(whoiserResult).substring(0, 500) + "...");
      } catch (err) {
        console.error("Whoiser直接查询失败:", err);
      }
      
      // 生成原始数据字符串
      let rawDataString = "";
      try {
        if (typeof whoiserResult === 'object') {
          // 尝试从whoiser结果中提取原始文本
          if (whoiserResult.text) {
            rawDataString = whoiserResult.text;
          } else {
            // 检查特定顶级域的whois服务器响应
            for (const key in whoiserResult) {
              if (whoiserResult[key] && whoiserResult[key].text) {
                rawDataString += whoiserResult[key].text + "\n\n";
              }
            }
            
            // 如果仍然没有rawData，将完整的JSON结果转换为格式化字符串
            if (!rawDataString || rawDataString.length < 50) {
              rawDataString = JSON.stringify(whoiserResult, null, 2);
            }
          }
        } else if (typeof whoiserResult === 'string') {
          rawDataString = whoiserResult;
        }
      } catch (err) {
        console.error("生成原始数据字符串时出错:", err);
        rawDataString = "无法解析原始WHOIS数据";
      }
      
      // 确保原始数据不为空
      if (!rawDataString || rawDataString.length < 50) {
        rawDataString = whoiserResult ? JSON.stringify(whoiserResult, null, 2) : "无有效的WHOIS数据";
      }
      
      // 处理whoiser结果
      const result = processWhoisResults(domain, whoiserResult);
      
      // 如果处理后的结果没有原始数据或者原始数据太短，则使用我们生成的字符串
      if (!result.rawData || result.rawData.length < 50) {
        result.rawData = rawDataString;
      }
      
      // 确保结果至少有一些基本的值
      if (result.registrar === "未知" && whoiserResult) {
        // 尝试从原始对象中直接查找常见的注册商属性
        if (whoiserResult.registrar) {
          result.registrar = whoiserResult.registrar;
        } else if (whoiserResult["Registrar"]) {
          result.registrar = whoiserResult["Registrar"];
        } else {
          // 尝试在嵌套对象中查找
          for (const key in whoiserResult) {
            const subObj = whoiserResult[key];
            if (subObj && typeof subObj === 'object') {
              if (subObj.registrar) {
                result.registrar = subObj.registrar;
                break;
              } else if (subObj["Registrar"]) {
                result.registrar = subObj["Registrar"];
                break;
              }
            }
          }
        }
      }
      
      console.log("处理后的whoiser结果:", {
        domain: result.domain,
        registrar: result.registrar,
        nameServers: result.nameServers,
        hasRawData: !!result.rawData,
        rawDataLength: result.rawData ? result.rawData.length : 0
      });
      
      return result;
    } catch (error) {
      console.error("直接whoiser查询错误:", error);
      
      // 尝试创建一个最小的rawData
      const minimalRawData = `Domain: ${domain}\nQuery Time: ${new Date().toISOString()}\nError: ${error.message || "未知错误"}\n`;
      
      // 返回带有错误信息的默认结果
      return {
        domain: domain,
        whoisServer: "直接查询失败",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: minimalRawData,
      };
    }
  };

  return { performDirectLookup };
};
