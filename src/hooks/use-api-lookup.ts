
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
      // First try the API endpoint
      const apiUrl = '/api/whois';
      const requestData = server ? { domain, server } : { domain };
      
      console.log("Sending WHOIS API request:", requestData);
      const whoisResponse = await axios.post(apiUrl, requestData);
      console.log("WHOIS API Response:", whoisResponse.data);

      if (whoisResponse.data.error) {
        // Try alternative public API endpoints if the local API fails
        console.log("Local API returned error, trying public APIs");
        return await tryPublicApiLookup(domain);
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
      
      // Try alternative public API endpoints if the primary API fails
      console.log("Primary API failed, trying public APIs");
      return await tryPublicApiLookup(domain);
    }
  };

  const tryPublicApiLookup = async (domain: string): Promise<ApiLookupResult> => {
    // Try several public whois APIs as fallbacks
    const publicApis = [
      `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_demo_key&domainName=${domain}&outputFormat=json`,
      `https://rdap.org/domain/${domain}`,
      `https://api.domainsdb.info/v1/domains/search?domain=${domain}`
    ];

    for (const apiUrl of publicApis) {
      try {
        console.log(`Trying public API: ${apiUrl}`);
        const response = await axios.get(apiUrl, { timeout: 5000 });
        console.log("Public API response:", response.data);
        
        if (response.data) {
          // Extract data from the public API response
          // Each API has a different format, so we need to handle them differently
          let extractedData: Partial<WhoisData> = { domain };
          
          if (apiUrl.includes('whoisxmlapi')) {
            const whoisRecord = response.data?.WhoisRecord;
            if (whoisRecord) {
              extractedData = {
                ...extractedData,
                registrar: whoisRecord.registrarName || "未知",
                registrationDate: whoisRecord.createdDate || "未知",
                expiryDate: whoisRecord.expiryDate || "未知",
                nameServers: whoisRecord.nameServers?.hostNames || [],
                status: whoisRecord.status || "未知",
                rawData: JSON.stringify(whoisRecord, null, 2)
              };
            }
          } else if (apiUrl.includes('rdap.org')) {
            extractedData = {
              ...extractedData,
              registrar: response.data?.entities?.[0]?.vcardArray?.[1]?.[1]?.[3] || "未知",
              registrationDate: response.data?.events?.find(e => e.eventAction === 'registration')?.eventDate || "未知",
              expiryDate: response.data?.events?.find(e => e.eventAction === 'expiration')?.eventDate || "未知",
              nameServers: response.data?.nameservers?.map(ns => ns.ldhName) || [],
              status: response.data?.status?.join(', ') || "未知",
              rawData: JSON.stringify(response.data, null, 2)
            };
          } else if (apiUrl.includes('domainsdb.info')) {
            const domainData = response.data?.domains?.[0];
            if (domainData) {
              extractedData = {
                ...extractedData,
                registrar: "未知", // This API doesn't provide registrar info
                registrationDate: domainData.create_date || "未知",
                expiryDate: domainData.expiry_date || "未知",
                nameServers: [],  // This API doesn't provide nameservers
                status: "未知",
                rawData: JSON.stringify(domainData, null, 2)
              };
            }
          }
          
          // Create the full result
          const whoisData: WhoisData = {
            domain,
            whoisServer: "公共API查询",
            registrar: extractedData.registrar || "未知",
            registrationDate: extractedData.registrationDate || "未知",
            expiryDate: extractedData.expiryDate || "未知",
            nameServers: extractedData.nameServers || [],
            registrant: extractedData.registrar || "未知",
            status: extractedData.status || "未知",
            rawData: extractedData.rawData || JSON.stringify(response.data, null, 2),
            message: "通过公共API获取"
          };
          
          return {
            message: "通过公共API获取的WHOIS信息 (WHOIS information obtained through public API)",
            data: whoisData
          };
        }
      } catch (err) {
        console.error(`Error with public API ${apiUrl}:`, err);
        // Continue to the next API
      }
    }
    
    // If all public APIs fail, return a properly formatted error
    return {
      error: "所有WHOIS查询方法均失败，请尝试使用外部WHOIS服务。 (All WHOIS query methods failed, please try using external WHOIS services.)",
      data: {
        domain: domain,
        whoisServer: "未知",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: `查询失败: 无法通过任何可用方法获取WHOIS信息`,
      }
    };
  };

  return { performApiLookup };
};
