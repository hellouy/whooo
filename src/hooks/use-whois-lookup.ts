
import { useState } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { parseRawData } from "@/utils/whoisParser";
import { processWhoisResults } from "@/utils/whoiserProcessor";
// Use require instead of import for whoiser
const whoiser = require("whoiser");
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
      console.log(`开始查询域名: ${domain}${server ? ` 使用服务器: ${server}` : ''}`);
      
      // 首先尝试直接查询
      let directResult: WhoisData | null = null;
      let directQuerySuccessful = false;
      
      try {
        directResult = await performDirectLookup(domain);
        console.log("直接查询结果:", directResult);
        
        // 检查是否获取到有效数据
        directQuerySuccessful = 
          directResult.registrar !== "未知" || 
          directResult.registrationDate !== "未知" || 
          directResult.expiryDate !== "未知" || 
          directResult.nameServers.length > 0 ||
          directResult.rawData.length > 10;  // 确保原始数据不为空
        
        if (directQuerySuccessful) {
          setWhoisData(directResult);
          toast({
            title: "查询成功",
            description: "已通过whoiser直接获取域名信息",
          });
          setLoading(false);
          return;
        } else {
          console.log("Whoiser直接查询没有返回有效数据，将尝试API查询");
        }
      } catch (directError) {
        console.error("Whoiser直接查询失败，尝试API查询:", directError);
      }
      
      // 如果直接查询失败或未返回有效数据，使用API查询
      console.log("开始API查询");
      const apiResult = await performApiLookup(domain, server);
      
      if (apiResult.error) {
        setError(apiResult.error);
        toast({
          title: "查询失败",
          description: apiResult.error,
          variant: "destructive",
        });
        
        // 如果两种方法都失败了，但直接查询至少返回了一些数据，使用它
        if (directResult && directResult.rawData) {
          console.log("API查询失败，但使用直接查询获得的部分数据");
          setWhoisData(directResult);
        }
      } else {
        // 如果有推荐的特定WHOIS服务器
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
        
        // 合并直接查询和API查询的结果，确保使用最完整的数据
        if (directResult && !directQuerySuccessful) {
          // 如果API查询成功但直接查询部分成功，合并原始数据
          if (directResult.rawData && directResult.rawData.length > 10 && (!apiResult.data.rawData || apiResult.data.rawData === "无原始WHOIS数据")) {
            apiResult.data.rawData = directResult.rawData;
          }
        }
        
        setWhoisData(apiResult.data);
      }
    } catch (error: any) {
      console.error("Whois查询错误:", error);
      
      let errorMessage = error.response?.data?.error || error.message || "无法连接到WHOIS服务器";
      
      // 提供更详细的错误信息
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
      
      // 如果没有指定服务器，1秒后尝试备用服务器
      if (!server) {
        toast({
          title: "正在尝试备用方法",
          description: "正在尝试通过备用方式获取域名信息...",
        });
        
        setTimeout(() => {
          // 尝试直接从verisign或IANA获取信息
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
