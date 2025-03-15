
import axios from "axios";
import { WhoisData } from "./use-whois-lookup";
import { parseRawData } from "@/utils/whoisParser";

export interface ApiLookupResult {
  error?: string;
  suggestedServer?: string;
  message?: string;
  data: WhoisData;
}

export const useApiLookup = () => {
  const performApiLookup = async (domain: string, server?: string): Promise<ApiLookupResult> => {
    try {
      const apiUrl = '/api/whois';
      const requestData = server ? { domain, server } : { domain };
      
      console.log("Sending WHOIS API request:", requestData);
      const whoisResponse = await axios.post(apiUrl, requestData);
      console.log("WHOIS API Response:", whoisResponse.data);

      if (whoisResponse.data.error) {
        return {
          error: whoisResponse.data.error,
          data: {} as WhoisData
        };
      }

      // Try to get price info
      let priceData = null;
      try {
        const priceResponse = await axios.get(`https://who.cx/api/price?domain=${domain}`);
        console.log("Price Response:", priceResponse.data);
        priceData = priceResponse.data;
      } catch (priceError) {
        console.error("Price lookup error:", priceError);
        // Price lookup failure doesn't affect WHOIS lookup
      }
      
      // Parse raw data with our regex parser
      const rawData = whoisResponse.data.rawData || "";
      const parsedData = parseRawData(domain, rawData);
      console.log("Parsed WHOIS data:", parsedData);
      
      // Combine parsed data and API response
      const result: WhoisData = {
        domain: domain,
        whoisServer: whoisResponse.data.whoisServer || server || "未知",
        registrar: parsedData?.registrar || whoisResponse.data.registrar || "未知",
        registrationDate: parsedData?.creationDate || whoisResponse.data.creationDate || "未知",
        expiryDate: parsedData?.expiryDate || whoisResponse.data.expiryDate || "未知",
        nameServers: parsedData?.nameServers || whoisResponse.data.nameServers || [],
        registrant: whoisResponse.data.registrant || whoisResponse.data.registrar || "未知",
        status: parsedData?.status || whoisResponse.data.status || "未知",
        rawData: rawData,
        message: whoisResponse.data.message || "",
        price: priceData
      };
      
      return {
        suggestedServer: whoisResponse.data.suggestedServer,
        message: whoisResponse.data.message,
        data: result
      };
    } catch (error: any) {
      console.error("API lookup error:", error);
      
      // Provide more specific error message
      let errorMessage = "API查询失败";
      if (error.response?.status === 404) {
        errorMessage = "找不到WHOIS API服务 (404错误)。请确保API服务器已正确部署和启动。";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        error: errorMessage,
        data: {
          domain: domain,
          whoisServer: "未知",
          registrar: "未知",
          registrationDate: "未知",
          expiryDate: "未知",
          nameServers: [],
          registrant: "未知",
          status: "未知",
          rawData: `查询失败: ${errorMessage}`,
        }
      };
    }
  };

  return { performApiLookup };
};
