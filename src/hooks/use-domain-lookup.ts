
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { WhoisData } from "@/hooks/use-whois-lookup";
import { queryRDAP } from "@/utils/rdapClient";
import { queryWhoisAPI } from "@/api/whoisClient";
import { getPopularDomainInfo } from "@/utils/popularDomainsService";

export function useDomainLookup() {
  const [domainData, setDomainData] = useState<WhoisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<"RDAP" | "WHOIS" | null>(null);
  const [server, setServer] = useState<string | null>(null);
  const [lastDomain, setLastDomain] = useState<string | null>(null);
  const { toast } = useToast();

  const performLookup = async (domain: string, specificServer?: string) => {
    if (!domain) return;
    
    setLoading(true);
    setError(null);
    setDomainData(null);
    setLastDomain(domain);
    
    try {
      console.log(`开始查询域名: ${domain}${specificServer ? ` 使用服务器: ${specificServer}` : ''}`);
      
      // Step 1: Attempt RDAP lookup first (modern protocol)
      try {
        setProtocol("RDAP");
        console.log("尝试使用RDAP协议查询...");
        
        const rdapResult = await queryRDAP(domain);
        
        if (rdapResult.success && rdapResult.data) {
          setDomainData(rdapResult.data);
          toast({
            title: "RDAP查询成功",
            description: "已通过RDAP协议获取域名信息",
          });
          setLoading(false);
          return;
        }
        
        console.log(`RDAP查询结果: ${rdapResult.message}`);
        toast({
          title: "RDAP查询无结果",
          description: "正在切换到传统WHOIS系统查询...",
        });
      } catch (rdapError: any) {
        console.error("RDAP查询错误:", rdapError);
        toast({
          title: "RDAP查询失败",
          description: "正在切换到传统WHOIS系统查询...",
        });
      }
      
      // Step 2: Fall back to WHOIS protocol
      setProtocol("WHOIS");
      console.log("尝试使用传统WHOIS协议查询...");
      
      const whoisData = await queryWhoisAPI(domain, specificServer, 'whois');
      
      if (whoisData) {
        // If we have a specific WHOIS server suggestion, save it
        if (whoisData.whoisServer && 
            whoisData.whoisServer !== "未知" && 
            whoisData.whoisServer !== "API查询失败" &&
            !specificServer) {
          setServer(whoisData.whoisServer);
        }
        
        setDomainData(whoisData);
        toast({
          title: "WHOIS查询成功",
          description: whoisData.message || "已通过WHOIS协议获取域名信息",
        });
      } else {
        throw new Error("WHOIS查询未返回数据");
      }
      
      // Step 3: If data is still minimal, try to enhance with popular domain data
      if (whoisData.registrar === "未知" && 
          whoisData.registrationDate === "未知" && 
          whoisData.nameServers.length === 0) {
        
        console.log("API查询结果不完整，检查是否为已知流行域名");
        
        const popularData = getPopularDomainInfo(domain);
        if (popularData) {
          console.log("找到流行域名数据:", popularData);
          
          // Merge the popular domain data with our current data
          const enhancedData = {
            ...whoisData,
            ...popularData,
            rawData: whoisData.rawData,  // Keep the original raw data
            message: "部分数据来自预定义数据库"
          };
          
          console.log("成功解析附加数据:", enhancedData);
          setDomainData(enhancedData);
          
          toast({
            title: "数据已增强",
            description: "部分数据来自预定义数据库",
          });
        }
      }
    } catch (error: any) {
      console.error("域名查询失败:", error);
      
      setError(error.message || "查询失败");
      toast({
        title: "查询失败",
        description: error.message || "未知错误",
        variant: "destructive",
      });
      
      // Try to get at least some data for popular domains
      const popularData = getPopularDomainInfo(domain);
      if (popularData) {
        const fallbackData: WhoisData = {
          domain: domain,
          whoisServer: "API查询失败",
          registrar: popularData.registrar || "未知",
          registrationDate: popularData.registrationDate || popularData.creationDate || "未知",
          expiryDate: popularData.expiryDate || "未知",
          nameServers: [],
          registrant: "未知",
          status: "未知",
          rawData: `Error querying for ${domain}: ${error.message}\n\n部分数据来自预定义数据库`,
          message: "查询失败，使用预定义数据",
          protocol: "error"
        };
        
        setDomainData(fallbackData);
        toast({
          title: "使用部分预定义数据",
          description: "API查询失败，但找到了部分预定义数据",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const retryLookup = async () => {
    if (lastDomain) {
      await performLookup(lastDomain);
    }
  };
  
  const lookupWithServer = async () => {
    if (lastDomain && server) {
      await performLookup(lastDomain, server);
    }
  };

  return {
    domainData,
    loading,
    error,
    protocol,
    server,
    lastDomain,
    performLookup,
    retryLookup,
    lookupWithServer
  };
}
