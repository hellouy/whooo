
import { WhoisData } from "./use-whois-lookup";
import { parseRawData } from "@/utils/whoisParser";
import { queryWhoisAPI, queryDomainPrice } from "@/api/whoisClient";

export interface ApiLookupResult {
  error?: string;
  suggestedServer?: string;
  message?: string;
  data: WhoisData;
}

export const useApiLookup = () => {
  const performApiLookup = async (domain: string, server?: string): Promise<ApiLookupResult> => {
    try {
      // Query our API
      console.log("Starting API lookup for domain:", domain);
      const whoisData = await queryWhoisAPI(domain, server);
      
      // Try to get price info
      let priceData = null;
      try {
        priceData = await queryDomainPrice(domain);
        console.log("Price data:", priceData);
      } catch (priceError) {
        console.error("Price lookup error:", priceError);
      }
      
      // Add price data if available
      if (priceData) {
        whoisData.price = priceData;
      }
      
      // Parse raw data if we have it
      const parsedData = whoisData.rawData ? parseRawData(domain, whoisData.rawData) : null;
      
      // Merge parsed data with API data
      if (parsedData) {
        console.log("Successfully parsed additional data:", parsedData);
        
        // Use parsed data to fill in missing pieces
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
      
      // Check if we have a suggested specific WHOIS server
      let suggestedServer = null;
      if (whoisData.rawData) {
        const serverMatch = whoisData.rawData.match(/(?:whois\s+server|registrar\s+whois\s+server)[^:]*:\s*([^\s\n]+)/i);
        if (serverMatch && serverMatch[1] && !server) {
          suggestedServer = serverMatch[1].trim();
          console.log("Found suggested WHOIS server:", suggestedServer);
        }
      }
      
      return {
        suggestedServer,
        message: whoisData.message,
        data: whoisData
      };
    } catch (error: any) {
      console.error("API lookup error:", error);
      
      // Create a minimal error response
      const errorData: WhoisData = {
        domain,
        whoisServer: "API查询失败",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: `Error: ${error.message || 'Unknown error'}\nTime: ${new Date().toISOString()}`,
      };
      
      return {
        error: `查询失败: ${error.message || '未知错误'}`,
        data: errorData
      };
    }
  };

  return { performApiLookup };
};
