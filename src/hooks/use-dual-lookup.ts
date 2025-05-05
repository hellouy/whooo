
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { WhoisData } from "./use-whois-lookup";
import { queryRDAP } from "@/utils/rdapClient";
import { getApiBaseUrl, getWhoisServer } from "@/utils/domainUtils";
import axios from 'axios';

// 使用本地WHOIS服务器进行查询
async function localWhoisQuery(domain: string, server?: string): Promise<WhoisData> {
  try {
    console.log(`进行本地WHOIS查询: ${domain}${server ? ` (服务器: ${server})` : ''}`);
    
    // 如果没有提供服务器，尝试查找适合的服务器
    if (!server) {
      server = getWhoisServer(domain);
      if (server) {
        console.log(`为域名 ${domain} 找到WHOIS服务器: ${server}`);
      } else {
        console.log(`未找到域名 ${domain} 的WHOIS服务器，将尝试泛用服务器`);
        server = "whois.verisign-grs.com"; // 尝试通用服务器
      }
    }
    
    // 使用服务器端API进行WHOIS查询 - 修正API路径
    const apiUrl = `${window.location.origin}/api/direct-whois`;
    console.log(`使用API URL: ${apiUrl}`);
    
    try {
      const response = await axios.post(apiUrl, {
        domain,
        server,
        timeout: 15000,
        mode: 'whois'
      }, {
        timeout: 20000 // 客户端超时略长于服务器超时
      });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || "API响应格式错误");
      }
      
      return response.data.data;
    } catch (axiosError) {
      console.error("API请求失败:", axiosError);
      
      // 尝试回退到本地服务器数据
      if (server && domain) {
        const fallbackData: WhoisData = {
          domain: domain,
          whoisServer: server,
          registrar: "查询失败 - 无法连接到WHOIS服务器",
          registrationDate: "未知",
          expiryDate: "未知",
          nameServers: [],
          registrant: "未知",
          status: "查询失败",
          rawData: `本地查询 ${domain} 失败。无法连接到WHOIS服务器 ${server}。请检查网络连接或服务器可用性。`,
          message: `查询失败: 无法连接到服务器 ${server}`,
          protocol: 'error'
        };
        return fallbackData;
      }
      
      throw new Error(`WHOIS查询失败: ${axiosError.message}`);
    }
  } catch (error: any) {
    console.error("本地WHOIS查询错误:", error);
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
      setSpecificServer(server);
      try {
        setProtocol("WHOIS");
        console.log(`使用特定服务器进行WHOIS查询: ${server}`);
        const whoisResult = await localWhoisQuery(domain, server);
        
        setWhoisData(whoisResult);
        setQueryStats(prev => ({...prev, whoisSuccess: prev.whoisSuccess + 1}));
        toast({
          title: "WHOIS查询成功",
          description: `使用服务器 ${server} 查询成功`,
        });
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
      
      // 使用本地WHOIS服务器查询作为后备方案
      setProtocol("WHOIS");
      console.log("开始本地WHOIS查询...");
      
      try {
        // 查找适当的WHOIS服务器
        const whoisServer = getWhoisServer(domain);
        if (whoisServer) {
          setSpecificServer(whoisServer);
        }
        
        // 使用本地WHOIS查询
        const whoisResult = await localWhoisQuery(domain, whoisServer || undefined);
        
        console.log("本地WHOIS查询完成:", whoisResult);
        setWhoisData(whoisResult);
        setQueryStats(prev => ({...prev, whoisSuccess: prev.whoisSuccess + 1}));
        toast({
          title: "WHOIS查询成功",
          description: "已通过WHOIS协议获取域名信息",
        });
      } catch (whoisError: any) {
        console.error("本地WHOIS查询失败:", whoisError);
        setError(whoisError.message || "WHOIS查询失败");
        setQueryStats(prev => ({...prev, whoisFailed: prev.whoisFailed + 1}));
        
        // 提供有限的错误信息
        setWhoisData({
          domain: domain,
          whoisServer: "查询失败",
          registrar: "未知",
          registrationDate: "未知",
          expiryDate: "未知",
          nameServers: [],
          registrant: "未知",
          status: "未知",
          rawData: `无法获取域名 ${domain} 的WHOIS数据。错误: ${whoisError.message}`,
          protocol: 'error',
          message: "WHOIS查询失败"
        });
        
        toast({
          title: "WHOIS查询失败",
          description: whoisError.message || "未知错误",
          variant: "destructive",
        });
      }
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
