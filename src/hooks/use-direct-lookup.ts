
import { WhoisData } from "./use-whois-lookup";
import { processWhoisResults } from "@/utils/whoiserProcessor";
// Use require instead of import for whoiser
const whoiser = require("whoiser");
// Import the WHOIS servers JSON file
const whoisServers = require("../../api/whois-servers.json");

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
      if (whoisServers[lastTwo]) {
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
      let options: { follow: number; server?: string; timeout?: number } = { follow: 2, timeout: 15000 };
      
      if (tld && whoisServers[tld]) {
        console.log(`使用.${tld}的特定WHOIS服务器:`, whoisServers[tld]);
        options.server = whoisServers[tld];
      } else {
        console.log("未找到特定TLD的WHOIS服务器，使用默认服务器");
      }
      
      // 直接调用whoiser获取数据
      const whoiserResult = await whoiser(domain, options);
      
      // 保存原始响应以便调试
      console.log("Whoiser原始响应:", JSON.stringify(whoiserResult).substring(0, 500) + "...");
      
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
            if (!rawDataString) {
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
      if (!rawDataString || rawDataString.length < 10) {
        rawDataString = JSON.stringify(whoiserResult, null, 2);
      }
      
      // 处理whoiser结果
      const result = processWhoisResults(domain, whoiserResult);
      
      // 确保结果包含原始数据
      if (!result.rawData || result.rawData.length < 10) {
        result.rawData = rawDataString || "无法获取原始WHOIS数据";
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
        rawData: `直接查询错误: ${error.message || "未知错误"}`,
      };
    }
  };

  return { performDirectLookup };
};
