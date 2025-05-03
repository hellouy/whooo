
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { WhoisData } from "@/hooks/use-whois-lookup";
import { queryRDAP } from "@/utils/rdapClient";
import { useDirectLookup } from "./use-direct-lookup";
import { useApiLookup } from "./use-api-lookup";

// Define an interface for the API lookup result
interface ApiLookupResult {
  data: WhoisData;
  error?: string;
  suggestedServer?: string;
  message?: string;
}

export const useDualLookup = () => {
  const [whoisData, setWhoisData] = useState<WhoisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specificServer, setSpecificServer] = useState<string | null>(null);
  const [lastDomain, setLastDomain] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<"RDAP" | "WHOIS" | null>(null);
  const { toast } = useToast();
  const { performDirectLookup } = useDirectLookup();
  const { performApiLookup } = useApiLookup();

  const handleDualLookup = async (domain: string, server?: string) => {
    setLoading(true);
    setError(null);
    setLastDomain(domain);
    setWhoisData(null);
    
    if (!server) {
      setSpecificServer(null);
    }
    
    try {
      // First try RDAP - this is our primary method
      console.log(`优先使用RDAP协议查询域名: ${domain}`);
      setProtocol("RDAP");
      
      const rdapResult = await queryRDAP(domain);
      
      if (rdapResult.success && rdapResult.data) {
        setWhoisData(rdapResult.data);
        toast({
          title: "RDAP查询成功",
          description: rdapResult.message || "已通过RDAP协议获取域名信息",
        });
        setLoading(false);
        return;
      }
      
      console.log(`RDAP查询结果: ${rdapResult.message}, 尝试本地WHOIS查询`);
      toast({
        title: "RDAP查询未成功",
        description: "正在使用本地WHOIS系统查询...",
      });
      
      // If RDAP fails, try local WHOIS as backup
      setProtocol("WHOIS");
      
      // If a specific server is provided, use it directly
      if (server) {
        console.log(`使用指定WHOIS服务器 ${server} 查询`);
        const apiResult = await performApiLookup(domain, server);
        
        if (!apiResult.error) {
          setWhoisData(apiResult.data);
          toast({
            title: "WHOIS查询成功",
            description: `已通过 ${server} 获取域名信息`,
          });
        } else {
          setError(`WHOIS服务器 ${server} 查询失败: ${apiResult.error}`);
          toast({
            title: "WHOIS查询失败",
            description: apiResult.error,
            variant: "destructive",
          });
        }
        
        setLoading(false);
        return;
      }
      
      // Try local WHOIS lookup
      console.log("使用本地WHOIS查询");
      const apiResult = await performApiLookup(domain);
      
      if (!apiResult.error) {
        if (apiResult.suggestedServer) {
          setSpecificServer(apiResult.suggestedServer);
          toast({
            title: "基本信息获取成功",
            description: "发现更详细的WHOIS服务器，可点击'获取更多信息'查询",
          });
        }
        
        setWhoisData(apiResult.data);
        toast({
          title: "WHOIS查询成功", 
          description: apiResult.message || "已通过本地WHOIS获取域名信息",
        });
      } else {
        // As a last resort, try direct lookup
        console.log("本地WHOIS查询失败，尝试直接查询");
        try {
          const directData = await performDirectLookup(domain);
          setWhoisData(directData);
          toast({
            title: "使用备用查询成功",
            description: "已通过直接查询获取域名信息",
          });
        } catch (directError) {
          console.error("所有查询方法都失败:", directError);
          setError("所有查询方法均失败，无法获取域名信息");
          toast({
            title: "查询失败",
            description: "所有查询方法均失败，无法获取域名信息",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("域名查询失败:", error);
      setError(error.message || "未知错误");
      toast({
        title: "查询失败",
        description: error.message || "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const retryLookup = async () => {
    if (lastDomain) {
      await handleDualLookup(lastDomain);
    }
  };

  return {
    whoisData,
    loading,
    error,
    specificServer,
    lastDomain,
    protocol,
    handleDualLookup,
    retryLookup
  };
};
