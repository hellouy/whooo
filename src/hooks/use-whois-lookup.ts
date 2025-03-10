
import { useState } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { parseRawData } from "@/utils/whoisParser";
import whoiser from "whoiser";
import { processWhoisResults } from "@/utils/whoiserProcessor";

export interface WhoisData {
  domain: string;
  whoisServer: string;
  registrar: string;
  registrationDate: string;
  expiryDate: string;
  nameServers: string[];
  registrant: string;
  status: string;
  rawData: string;
  message?: string;
  price?: {
    currency: string;
    currency_symbol: string;
    new: string;
    renew: string;
  };
}

export const useWhoisLookup = () => {
  const [whoisData, setWhoisData] = useState<WhoisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specificServer, setSpecificServer] = useState<string | null>(null);
  const [lastDomain, setLastDomain] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDirectLookup = async (domain: string) => {
    try {
      console.log("Attempting direct whoiser lookup for:", domain);
      
      // Use whoiser to directly query
      const whoiserResult = await whoiser(domain);
      console.log("Whoiser raw result:", whoiserResult);
      
      // Process the whoiser results with our utility function
      const result = processWhoisResults(domain, whoiserResult);
      console.log("Processed whoiser result:", result);
      
      return result;
    } catch (error) {
      console.error("Direct whoiser lookup error:", error);
      throw error;
    }
  };

  const handleWhoisLookup = async (domain: string, server?: string) => {
    setLoading(true);
    setError(null);
    setLastDomain(domain);
    
    if (!server) {
      setWhoisData(null);
      setSpecificServer(null);
    }
    
    try {
      // First try direct lookup with whoiser
      try {
        const directResult = await handleDirectLookup(domain);
        
        // Check if we got valid data
        const hasValidData = 
          directResult.registrar !== "未知" || 
          directResult.registrationDate !== "未知" || 
          directResult.expiryDate !== "未知" || 
          directResult.nameServers.length > 0;
        
        if (hasValidData) {
          setWhoisData(directResult);
          toast({
            title: "查询成功",
            description: "已通过whoiser直接获取域名信息",
          });
          setLoading(false);
          return;
        } else {
          console.log("Whoiser lookup didn't return valid data, trying API lookup");
        }
      } catch (directError) {
        console.error("Whoiser direct lookup failed, trying API lookup:", directError);
      }
      
      // If direct lookup failed or returned no valid data, fall back to API lookup
      const apiUrl = '/api/whois';
      const requestData = server ? { domain, server } : { domain };
      
      console.log("Sending WHOIS request:", requestData);
      const whoisResponse = await axios.post(apiUrl, requestData);
      console.log("WHOIS Response:", whoisResponse.data);

      if (whoisResponse.data.error) {
        setError(whoisResponse.data.error);
        toast({
          title: "查询失败",
          description: whoisResponse.data.error,
          variant: "destructive",
        });
      } else {
        // If there's a suggested specific WHOIS server
        if (whoisResponse.data.suggestedServer && !server) {
          setSpecificServer(whoisResponse.data.suggestedServer);
          toast({
            title: "初步查询成功",
            description: whoisResponse.data.message || "发现更具体的WHOIS服务器，点击'获取更多信息'获取详细数据",
          });
        } else {
          setSpecificServer(null);
          toast({
            title: "查询成功",
            description: whoisResponse.data.message || "已获取域名信息",
          });
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
        const result = {
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
        
        setWhoisData(result);
      }
    } catch (error: any) {
      console.error("Whois lookup error:", error);
      
      let errorMessage = error.response?.data?.error || error.message || "无法连接到WHOIS服务器";
      
      // Provide more detailed error messages
      if (error.response?.status === 404) {
        errorMessage = "WHOIS API未找到 (404错误)。请确保API服务已正确部署。";
      } else if (error.code === "ECONNREFUSED") {
        errorMessage = "连接WHOIS服务器被拒绝，服务器可能暂时不可用。";
      } else if (error.code === "ETIMEDOUT") {
        errorMessage = "连接WHOIS服务器超时，请检查网络连接或稍后重试。";
      }
      
      setError(errorMessage);
      toast({
        title: "查询失败",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Try backup server after 5 seconds if not already using specific server
      if (!server) {
        toast({
          title: "正在尝试备用方法",
          description: "正在尝试通过备用方式获取域名信息...",
        });
        
        setTimeout(() => {
          // Try to get info directly from verisign or IANA
          handleWhoisLookup(domain, "whois.verisign-grs.com");
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const retryLookup = async () => {
    if (lastDomain) {
      await handleWhoisLookup(lastDomain);
    }
  };

  return {
    whoisData,
    loading,
    error,
    specificServer,
    lastDomain,
    handleWhoisLookup,
    retryLookup
  };
};
