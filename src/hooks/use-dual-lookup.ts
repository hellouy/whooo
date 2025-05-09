import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { WhoisData } from "./use-whois-lookup";
import { queryRDAP } from "@/utils/rdapClient";
import { extractTLD, buildApiUrl, retryRequest, fetchFromMultipleAPIs } from "@/utils/apiUtils";
import { getWhoisServer } from "@/utils/domainUtils";
import axios from 'axios';

// 使用Whoiser库进行查询
async function directWhoisQuery(domain: string, server?: string): Promise<WhoisData> {
  try {
    console.log(`进行直接WHOIS查询: ${domain}${server ? ` (服务器: ${server})` : ''}`);
    
    // 准备查询选项
    const options: any = {
      follow: 2,
      timeout: 15000
    };
    
    // 如果提供了服务器，使用指定服务器
    if (server) {
      options.server = server;
    }
    
    console.log(`使用whoiser选项:`, options);
    
    try {
      // 动态导入whoiser库
      const whoiser = await import('whoiser');
      
      // 执行查询
      const result = await whoiser.lookup(domain, options);
      
      if (result) {
        console.log(`whoiser查询成功:`, result);
        
        // 解析结果
        const nameServers = Array.isArray(result.nameservers) ? result.nameservers : 
          (result.nameservers ? [result.nameservers] : []);
        
        // 创建返回对象
        const whoisData: WhoisData = {
          domain: domain,
          whoisServer: result.whois?.server || server || "直接查询",
          registrar: result.registrar?.name || result.registrar || "未知",
          registrationDate: result.created || result.creationDate || "未知",
          expiryDate: result.expires || result.expirationDate || "未知",
          nameServers: nameServers,
          registrant: result.registrant || "未知",
          status: result.status || "未知",
          rawData: result.text || `直接查询 ${domain} 没有返回原始数据`,
          message: `whoiser查询成功${server ? ` (服务器: ${server})` : ''}`,
          protocol: "whois"
        };
        
        return whoisData;
      }
    } catch (error) {
      console.error("Whoiser库加载或查询错误:", error);
      throw new Error(`Whoiser库错误: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    throw new Error("Whoiser未返回有效数据");
  } catch (error: any) {
    console.error("直接WHOIS查询错误:", error);
    
    // 创建错误响应
    const errorData: WhoisData = {
      domain: domain,
      whoisServer: server || "查询失败",
      registrar: "未知",
      registrationDate: "未知",
      expiryDate: "未知",
      nameServers: [],
      registrant: "未知",
      status: "查询失败",
      rawData: `本地查询 ${domain} 失败。${error.message || "未知错误"}`,
      message: `查询失败: ${error.message || "未知错误"}`,
      protocol: "error"
    };
    
    return errorData;
  }
}

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
        const tld = extractTLD(domain);
        server = tld === "com" || tld === "net" ? "whois.verisign-grs.com" : "whois.iana.org";
      }
    }
    
    // 使用服务器端API进行WHOIS查询
    const apiUrl = buildApiUrl('/api/direct-whois');
    console.log(`使用API URL: ${apiUrl}`);
    
    try {
      // 多次重试请求
      const response = await retryRequest(() => 
        axios.post(apiUrl, {
          domain,
          server,
          timeout: 10000,
          mode: 'whois'
        }, {
          timeout: 15000 // 客户端超时略长于服务器超时
        }),
        3, // 最多重试3次
        1000, // 初始延迟1000ms
        1.5,  // 退避因子
        8000, // 最大延迟8秒
        (attempt, error) => {
          console.log(`API请求重试 #${attempt}, 错误: ${error.message || "未知错误"}`);
        }
      );
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || "API响应格式错误");
      }
      
      return response.data.data;
    } catch (axiosError) {
      console.error("API请求失败:", axiosError);
      
      // 尝试从其他API获取数据
      const multiApiResult = await fetchFromMultipleAPIs(domain);
      if (multiApiResult) {
        console.log("成功从备选API获取数据");
        return multiApiResult.data;
      }
      
      // 尝试使用直接WHOIS查询作为后备方案
      console.log("所有API请求失败，尝试直接WHOIS查询");
      return await directWhoisQuery(domain, server);
    }
  } catch (error: any) {
    console.error("本地WHOIS查询错误:", error);
    throw new Error(`WHOIS查询失败: ${error.message}`);
  }
}

// 本地WHOIS服务器列表（fallback用，API不可用时）
const COMMON_WHOIS_SERVERS = [
  { tld: "com", server: "whois.verisign-grs.com" },
  { tld: "net", server: "whois.verisign-grs.com" },
  { tld: "org", server: "whois.pir.org" },
  { tld: "io", server: "whois.nic.io" },
  { tld: "co", server: "whois.nic.co" },
  { tld: "ai", server: "whois.nic.ai" },
  { tld: "app", server: "whois.nic.google" },
  { tld: "dev", server: "whois.nic.google" }
];

// 从本地列表获取WHOIS服务器
function getLocalWhoisServer(domain: string): string | null {
  const tld = extractTLD(domain);
  if (!tld) return null;
  
  const match = COMMON_WHOIS_SERVERS.find(entry => entry.tld === tld);
  return match ? match.server : null;
}

export function useDualLookup() {
  const [whoisData, setWhoisData] = useState<WhoisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specificServer, setSpecificServer] = useState<string | null>(null);
  const [lastDomain, setLastDomain] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<"RDAP" | "WHOIS" | null>(null);
  const [serversAttempted, setServersAttempted] = useState<string[]>([]);
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
  
  // 加载常用WHOIS服务器列表
  const [whoisServers, setWhoisServers] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // 尝试从本地JSON文件加载WHOIS服务器列表
    const loadWhoisServers = async () => {
      try {
        const response = await fetch('/data/whois-servers.json');
        if (response.ok) {
          const data = await response.json();
          setWhoisServers(data);
          console.log("已加载WHOIS服务器列表", Object.keys(data).length);
        }
      } catch (error) {
        console.error("加载WHOIS服务器列表失败", error);
      }
    };
    
    loadWhoisServers();
  }, []);

  // 改进的双协议查询函数
  const handleDualLookup = async (domain: string, server?: string) => {
    setLoading(true);
    setError(null);
    setWhoisData(null);
    setLastDomain(domain);
    setServersAttempted([]);
    
    // 如果提供了特定的WHOIS服务器，直接使用WHOIS协议
    if (server) {
      setSpecificServer(server);
      try {
        setProtocol("WHOIS");
        console.log(`使用特定服务器进行WHOIS查询: ${server}`);
        
        // 添加到尝试服务器列表
        setServersAttempted(prev => [...prev, server]);
        
        // 尝试使用WHOIS协议查询
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
      // 首先尝试RDAP查询（更现代的协议）
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
        console.log("RDAP查询未返回有效数据，切换到WHOIS查询");
        setQueryStats(prev => ({...prev, rdapFailed: prev.rdapFailed + 1}));
        toast({
          title: "RDAP查询未成功",
          description: "正在切换到WHOIS系统查询...",
        });
      }
      
      // RDAP查询失败，切换到WHOIS查询
      setProtocol("WHOIS");
      console.log("开始WHOIS查询...");
      
      // 获取WHOIS服务器
      const whoisServer = getWhoisServer(domain) || getLocalWhoisServer(domain);
      
      if (whoisServer) {
        setSpecificServer(whoisServer);
        setServersAttempted(prev => [...prev, whoisServer]);
        
        console.log(`使用WHOIS服务器: ${whoisServer}`);
        
        try {
          // 使用本地WHOIS查询
          const whoisResult = await localWhoisQuery(domain, whoisServer);
          
          if (whoisResult && whoisResult.protocol !== "error") {
            console.log("WHOIS查询完成:", whoisResult.registrar || "未找到注册商");
            setWhoisData(whoisResult);
            setQueryStats(prev => ({...prev, whoisSuccess: prev.whoisSuccess + 1}));
            toast({
              title: "WHOIS查询成功",
              description: `已通过WHOIS服务器 ${whoisServer} 获取域名信息`,
            });
            setLoading(false);
            return;
          }
        } catch (whoisError) {
          console.error("首选WHOIS服务器查询失败，尝试备用服务器", whoisError);
        }
      }
      
      // 尝试使用备用WHOIS服务器
      console.log("尝试使用备用WHOIS服务器");
      const tld = extractTLD(domain);
      
      // 准备要尝试的服务器列表
      const serversToTry = [
        "whois.verisign-grs.com", // 通用备用服务器
        "whois.iana.org",         // IANA服务器
      ];
      
      // 添加特定于TLD的服务器（如果有）
      if (tld && whoisServers[tld] && !serversToTry.includes(whoisServers[tld])) {
        serversToTry.unshift(whoisServers[tld]); // 将TLD特定服务器放在前面
      }
      
      // 依次尝试不同的WHOIS服务器
      for (const server of serversToTry) {
        if (serversAttempted.includes(server)) continue; // 跳过已尝试的服务器
        
        setServersAttempted(prev => [...prev, server]);
        setSpecificServer(server);
        
        console.log(`尝试备用WHOIS服务器: ${server}`);
        
        try {
          const result = await localWhoisQuery(domain, server);
          
          if (result && result.protocol !== "error") {
            console.log(`使用备用服务器 ${server} 查询成功`);
            setWhoisData(result);
            setQueryStats(prev => ({...prev, whoisSuccess: prev.whoisSuccess + 1}));
            toast({
              title: "WHOIS查询成功",
              description: `使用备用服务器 ${server} 获取了域名信息`,
            });
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error(`备用服务器 ${server} 查询失败`, error);
        }
      }
      
      // 如果所有WHOIS查询都失败
      console.error("所有WHOIS服务器查询都失败");
      setError("所有WHOIS服务器查询均失败，请稍后重试");
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
        rawData: `无法获取域名 ${domain} 的WHOIS数据。已尝试所有可用服务器。`,
        protocol: 'error',
        message: "所有WHOIS查询失败"
      });
      
      toast({
        title: "查询失败",
        description: "所有可用WHOIS服务器查询均失败",
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
    serversAttempted,
    handleDualLookup,
    retryLookup,
    queryStats: getQueryStats()
  };
}
