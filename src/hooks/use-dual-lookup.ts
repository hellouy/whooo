
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { WhoisData } from "./use-whois-lookup";
import { queryRDAP } from "@/utils/rdapClient";
import { useWhoisLookup } from "./use-whois-lookup";
import axios from 'axios';
import { getApiBaseUrl } from '@/utils/domainUtils';

// 使用服务端API进行WHOIS查询，替代客户端whoiser
async function directWhoisQuery(domain: string): Promise<WhoisData> {
  try {
    console.log(`进行服务端WHOIS查询: ${domain}`);
    
    const apiUrl = `${getApiBaseUrl()}/direct-whois`;
    console.log(`使用API URL: ${apiUrl}`);
    
    const response = await axios.post(apiUrl, {
      domain,
      timeout: 15000,
      mode: 'whois'
    }, {
      timeout: 20000 // Client timeout slightly longer than server timeout
    });
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || "API响应格式错误");
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error("服务端WHOIS查询错误:", error);
    throw new Error(`WHOIS查询失败: ${error.message}`);
  }
}

export function useDualLookup() {
  const [whoisData, setWhoisData] = useState<WhoisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specificServer, setSpecificServer] = useState<string | null>(null);
  const [lastDomain, setLastDomain] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<"RDAP" | "WHOIS" | null>(null);
  const { toast } = useToast();
  const { handleWhoisLookup } = useWhoisLookup();
  
  // 查询统计数据
  const [queryStats, setQueryStats] = useState<{
    rdapSuccess: number;
    rdapFailed: number;
    whoisSuccess: number;
    whoisFailed: number;
  }>({
    rdapSuccess: 0,
    rdapFailed: 0,
    whoisSuccess: 0,
    whoisFailed: 0
  });

  // 改进的双协议查询函数
  const handleDualLookup = async (domain: string, server?: string) => {
    setLoading(true);
    setError(null);
    setWhoisData(null);
    setLastDomain(domain);
    
    // 如果提供了特定的WHOIS服务器，直接使用WHOIS协议
    if (server) {
      try {
        setProtocol("WHOIS");
        console.log(`使用特定服务器进行WHOIS查询: ${server}`);
        const whoisResult = await handleWhoisLookup(domain, server);
        
        if (whoisResult !== undefined && whoisResult !== null) {
          setWhoisData(whoisResult);
          setQueryStats(prev => ({...prev, whoisSuccess: prev.whoisSuccess + 1}));
          toast({
            title: "WHOIS查询成功",
            description: `使用服务器 ${server} 查询成功`,
          });
        } else {
          throw new Error("未获取到WHOIS数据");
        }
      } catch (e: any) {
        setError(`使用服务器 ${server} 查询失败: ${e.message}`);
        setQueryStats(prev => ({...prev, whoisFailed: prev.whoisFailed + 1}));
        toast({
          title: "WHOIS查询失败",
          description: `使用服务器 ${server} 查询失败: ${e.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      // 首先尝试RDAP查询
      console.log("开始RDAP查询...");
      setProtocol("RDAP");
      
      const rdapResponse = await queryRDAP(domain);
      
      // 如果RDAP查询成功且返回了有效数据
      if (rdapResponse.success && rdapResponse.data) {
        console.log("RDAP查询成功:", rdapResponse.data.registrar || "无注册商信息");
        setWhoisData(rdapResponse.data);
        setQueryStats(prev => ({...prev, rdapSuccess: prev.rdapSuccess + 1}));
        toast({
          title: "RDAP查询成功",
          description: "已通过RDAP协议获取域名信息",
        });
        setLoading(false);
        return;
      } else {
        console.log("RDAP查询未返回有效数据，将尝试WHOIS查询");
        setQueryStats(prev => ({...prev, rdapFailed: prev.rdapFailed + 1}));
        toast({
          title: "RDAP查询未成功",
          description: "正在使用WHOIS系统查询...",
        });
      }
      
      // 使用WHOIS查询作为后备方案
      setProtocol("WHOIS");
      console.log("开始WHOIS查询...");
      
      try {
        // 先使用服务端API直接查询
        const directResult = await directWhoisQuery(domain);
        
        if (directResult && 
           (directResult.registrar !== "未知" || 
            directResult.registrationDate !== "未知" || 
            (directResult.nameServers && directResult.nameServers.length > 0))) {
          console.log("服务端WHOIS查询成功:", directResult);
          setWhoisData(directResult);
          setQueryStats(prev => ({...prev, whoisSuccess: prev.whoisSuccess + 1}));
          toast({
            title: "WHOIS查询成功",
            description: "已通过服务端WHOIS查询获取域名信息",
          });
          setLoading(false);
          return;
        }
      } catch (directError) {
        console.error("服务端WHOIS查询失败:", directError);
      }
      
      // 如果服务端API未返回有效数据，尝试客户端API
      console.log("尝试使用本地WHOIS系统...");
      const whoisResult = await handleWhoisLookup(domain);
      
      // 检查是否有足够的WHOIS数据
      if (whoisResult !== undefined && whoisResult !== null && 
          (whoisResult.registrar !== "未知" || 
           whoisResult.registrationDate !== "未知" || 
           (whoisResult.nameServers && whoisResult.nameServers.length > 0))) {
        console.log("本地WHOIS查询成功:", whoisResult);
        setWhoisData(whoisResult);
        setQueryStats(prev => ({...prev, whoisSuccess: prev.whoisSuccess + 1}));
        toast({
          title: "WHOIS查询成功",
          description: "已通过WHOIS协议获取域名信息",
        });
        setLoading(false);
        return;
      }
      
      // 所有查询方法均失败
      setError("所有查询方法均失败，无法获取完整的域名信息");
      setQueryStats(prev => ({...prev, whoisFailed: prev.whoisFailed + 1}));
      
      // 尝试设置有限的错误信息
      setWhoisData({
        domain: domain,
        whoisServer: "查询失败",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: `无法获取域名 ${domain} 的WHOIS或RDAP数据。所有查询方法均失败。`,
        protocol: 'error',
        message: "所有查询方法均失败"
      });
      
      toast({
        title: "查询失败",
        description: "无法通过任何方法获取域名信息",
        variant: "destructive",
      });
      
    } catch (error: any) {
      console.error("域名查询失败:", error);
      setError(error.message || "未知错误");
      setQueryStats(prev => ({...prev, whoisFailed: prev.whoisFailed + 1}));
      
      // 尝试设置有限的错误信息
      setWhoisData({
        domain: domain,
        whoisServer: "错误",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "错误",
        rawData: `查询错误: ${error.message || "未知错误"}`,
        protocol: 'error'
      });
      
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

  // 获取统计信息
  const getQueryStats = () => {
    const total = queryStats.rdapSuccess + queryStats.rdapFailed + 
                 queryStats.whoisSuccess + queryStats.whoisFailed;
                 
    if (total === 0) return { total: 0, successRate: 0 };
    
    const successful = queryStats.rdapSuccess + queryStats.whoisSuccess;
    const successRate = Math.round((successful / total) * 100);
    
    return {
      total,
      successRate,
      rdapSuccessRate: queryStats.rdapSuccess + queryStats.rdapFailed === 0 ? 0 :
        Math.round((queryStats.rdapSuccess / (queryStats.rdapSuccess + queryStats.rdapFailed)) * 100),
      whoisSuccessRate: queryStats.whoisSuccess + queryStats.whoisFailed === 0 ? 0 :
        Math.round((queryStats.whoisSuccess / (queryStats.whoisSuccess + queryStats.whoisFailed)) * 100)
    };
  };

  return {
    whoisData,
    loading,
    error,
    specificServer,
    lastDomain,
    protocol,
    handleDualLookup,
    retryLookup,
    queryStats: getQueryStats()
  };
}
