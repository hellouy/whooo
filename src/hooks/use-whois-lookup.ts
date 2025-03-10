
import { useState } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { parseRawData } from "@/utils/whoisParser";
import { processWhoisResults } from "@/utils/whoiserProcessor";
import * as whoiser from "whoiser";
import { useDirectLookup } from "./use-direct-lookup";
import { useApiLookup } from "./use-api-lookup";

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
  const { performDirectLookup } = useDirectLookup();
  const { performApiLookup } = useApiLookup();

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
        const directResult = await performDirectLookup(domain);
        
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
      const apiResult = await performApiLookup(domain, server);
      
      if (apiResult.error) {
        setError(apiResult.error);
        toast({
          title: "查询失败",
          description: apiResult.error,
          variant: "destructive",
        });
      } else {
        // If there's a suggested specific WHOIS server
        if (apiResult.suggestedServer && !server) {
          setSpecificServer(apiResult.suggestedServer);
          toast({
            title: "初步查询成功",
            description: apiResult.message || "发现更具体的WHOIS服务器，点击'获取更多信息'获取详细数据",
          });
        } else {
          setSpecificServer(null);
          toast({
            title: "查询成功",
            description: apiResult.message || "已获取域名信息",
          });
        }
        
        setWhoisData(apiResult.data);
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
      
      // Try backup server after 1 second if not already using specific server
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
