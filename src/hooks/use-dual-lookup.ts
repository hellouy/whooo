
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
    
    // First try RDAP
    try {
      console.log(`开始RDAP查询域名: ${domain}`);
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
      
      console.log(`RDAP查询失败: ${rdapResult.message}, 尝试传统WHOIS查询`);
      toast({
        title: "RDAP查询无结果",
        description: "正在切换到传统WHOIS系统查询...",
      });
      
      // If RDAP fails, switch to traditional WHOIS
      setProtocol("WHOIS");
      await performWhoisLookup(domain, server);
    } catch (error: any) {
      console.error("RDAP查询出错:", error);
      toast({
        title: "RDAP查询失败",
        description: "正在切换到传统WHOIS系统查询...",
      });
      
      // Fall back to WHOIS
      setProtocol("WHOIS");
      await performWhoisLookup(domain, server);
    } finally {
      setLoading(false);
    }
  };
  
  const performWhoisLookup = async (domain: string, server?: string) => {
    try {
      console.log(`开始WHOIS查询域名: ${domain}${server ? ` 使用服务器: ${server}` : ''}`);
      
      let directResult: WhoisData | null = null;
      let directQuerySuccessful = false;
      
      try {
        console.log("开始直接WHOIS查询");
        
        const directPromise = performDirectLookup(domain);
        const timeoutPromise = new Promise<WhoisData>((_, reject) => 
          setTimeout(() => reject(new Error("直接查询超时")), 25000)
        );
        
        directResult = await Promise.race([directPromise, timeoutPromise]);
        console.log("直接查询结果:", directResult);
        
        directQuerySuccessful = 
          directResult.registrar !== "未知" || 
          directResult.registrationDate !== "未知" || 
          directResult.expiryDate !== "未知" || 
          directResult.nameServers.length > 0 ||
          (directResult.rawData && directResult.rawData.length > 100);
        
        if (directQuerySuccessful) {
          setWhoisData(directResult);
          toast({
            title: "WHOIS查询成功",
            description: "已通过whoiser直接获取域名信息",
          });
          return;
        } else {
          console.log("Whoiser直接查询没有返回足够的有效数据，将尝试API查询");
        }
      } catch (directError) {
        console.error("Whoiser直接查询失败，尝试API查询:", directError);
      }
      
      console.log("开始API查询");
      
      try {
        const apiPromise = performApiLookup(domain, server);
        const apiTimeoutPromise = new Promise<ApiLookupResult>((_, reject) => 
          setTimeout(() => reject(new Error("API查询超时")), 20000)
        );
        
        const apiResult: ApiLookupResult = await Promise.race([apiPromise, apiTimeoutPromise]);
        
        if (apiResult.error) {
          setError(apiResult.error);
          toast({
            title: "API查询失败",
            description: apiResult.error,
            variant: "destructive",
          });
          
          if (directResult && directResult.rawData && directResult.rawData.length > 50) {
            console.log("API查询失败，但使用直接查询获得的部分数据");
            setWhoisData(directResult);
          }
        } else {
          if (apiResult.suggestedServer && !server) {
            setSpecificServer(apiResult.suggestedServer);
            toast({
              title: "初步查询成功",
              description: apiResult.message || "发现更具体的WHOIS服务器，点击'获取更多信息'获取详细数据",
            });
          } else {
            setSpecificServer(null);
            toast({
              title: "WHOIS查询成功",
              description: apiResult.message || "已获取域名信息",
            });
          }
          
          if (directResult && !directQuerySuccessful) {
            if (directResult.rawData && directResult.rawData.length > 50 && 
                (!apiResult.data.rawData || apiResult.data.rawData === "无原始WHOIS数据")) {
              apiResult.data.rawData = directResult.rawData;
            }
          }
          
          if (!apiResult.data.rawData || apiResult.data.rawData.length < 50) {
            if (directResult && directResult.rawData && directResult.rawData.length > 50) {
              apiResult.data.rawData = directResult.rawData;
            }
          }
          
          setWhoisData(apiResult.data);
        }
      } catch (apiError: any) {
        console.error("API查询出错:", apiError);
        
        if (directResult && directResult.rawData && directResult.rawData.length > 50) {
          console.log("API查询失败，使用直接查询结果");
          setWhoisData(directResult);
          toast({
            title: "查询部分成功",
            description: "API查询失败，但通过直接查询获取了部分信息",
          });
        } else {
          setError(`WHOIS查询失败: ${apiError.message || '未知错误'}`);
          toast({
            title: "WHOIS查询失败",
            description: apiError.message || "未知错误",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Whois查询错误:", error);
      
      let errorMessage = error.response?.data?.error || error.message || "无法连接到WHOIS服务器";
      
      if (error.response?.status === 404) {
        errorMessage = "WHOIS API未找到 (404错误)。请确保API服务已正确部署。";
      } else if (error.code === "ECONNREFUSED" || error.message?.includes('ECONNREFUSED')) {
        errorMessage = "连接WHOIS服务器被拒绝，服务器可能暂时不可用。";
      } else if (error.code === "ETIMEDOUT" || error.message?.includes('timeout')) {
        errorMessage = "连接WHOIS服务器超时，请检查网络连接或稍后重试。";
      }
      
      setError(errorMessage);
      toast({
        title: "查询失败",
        description: errorMessage,
        variant: "destructive",
      });
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
