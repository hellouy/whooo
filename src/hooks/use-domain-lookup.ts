
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
      
      // Step 1: Check if it's a popular domain first for fastest response
      const popularData = getPopularDomainInfo(domain);
      if (popularData && popularData.registrar) {
        console.log("找到预定义域名数据:", popularData);
        
        const presetData: WhoisData = {
          domain: domain,
          whoisServer: "预定义数据库",
          registrar: popularData.registrar,
          registrationDate: popularData.registrationDate || popularData.creationDate || "未知",
          expiryDate: popularData.expiryDate || "未知",
          nameServers: popularData.nameServers || [],
          registrant: "未知",
          status: popularData.status || "未知",
          rawData: `Domain information retrieved from predefined database.`,
          message: "使用预定义的域名数据",
          protocol: "whois" // Changed from "cached" to "whois" to match the allowed types
        };
        
        setDomainData(presetData);
        setProtocol("WHOIS");
        
        toast({
          title: "快速查询",
          description: "已从预定义数据库获取域名信息",
        });
        
        // Continue with normal lookup in the background for most up-to-date info
      }
      
      // Step 2: Attempt RDAP lookup (modern protocol)
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
      
      // Step 3: Fall back to WHOIS protocol
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
      
      // Step 4: Try our direct WHOIS API if regular WHOIS data is incomplete
      if (whoisData.registrar === "未知" && 
          whoisData.registrationDate === "未知" && 
          whoisData.expiryDate === "未知" &&
          whoisData.nameServers.length === 0) {
        
        console.log("尝试使用直接WHOIS API查询...");
        
        try {
          const response = await fetch('/api/direct-whois', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain, timeout: 15000 })
          });
          
          const directData = await response.json();
          
          if (directData.success && directData.data) {
            setDomainData(directData.data);
            toast({
              title: "直接查询成功",
              description: "已通过直接WHOIS查询获取域名信息",
            });
          }
        } catch (directError) {
          console.error("直接WHOIS API查询错误:", directError);
        }
      }
      
      // Step 5: If data is still minimal, enhance with popular domain data if available
      if (!popularData && domainData?.registrar === "未知" && 
          domainData?.registrationDate === "未知" && 
          domainData?.nameServers.length === 0) {
        
        console.log("API查询结果不完整，检查是否为已知流行域名");
        
        const popularData = getPopularDomainInfo(domain);
        if (popularData) {
          console.log("找到流行域名数据:", popularData);
          
          // Merge the popular domain data with our current data
          const enhancedData = {
            ...domainData!,
            registrar: popularData.registrar || domainData!.registrar,
            registrationDate: popularData.registrationDate || popularData.creationDate || domainData!.registrationDate,
            expiryDate: popularData.expiryDate || domainData!.expiryDate,
            nameServers: popularData.nameServers && popularData.nameServers.length > 0 ? 
              popularData.nameServers : domainData!.nameServers,
            status: popularData.status || domainData!.status,
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
          nameServers: popularData.nameServers || [],
          registrant: "未知",
          status: popularData.status || "未知",
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
