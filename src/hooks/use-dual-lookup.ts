
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { WhoisData } from "./use-whois-lookup";
import { queryRDAP } from "@/utils/rdapClient";
import { useWhoisLookup } from "./use-whois-lookup";
import whoiser from "whoiser";

// 直接WHOIS查询函数
async function directWhoisQuery(domain: string): Promise<string> {
  try {
    console.log(`进行直接WHOIS查询: ${domain}`);
    const result = await whoiser(domain, {
      follow: 3,  // 允许跟随WHOIS服务器重定向
      timeout: 10000  // 10秒超时
    });
    
    // 从whoiser结果中提取原始文本
    let rawText = "";
    if (result && typeof result === 'object') {
      // 如果有text属性，直接使用
      if (result.text) {
        rawText = result.text;
      } else {
        // 否则尝试从各服务器响应中提取text
        for (const key in result) {
          if (result[key] && typeof result[key] === 'object' && result[key].text) {
            rawText += `--- ${key} ---\n${result[key].text}\n\n`;
          }
        }
      }
    }
    
    return rawText || JSON.stringify(result, null, 2);
  } catch (error: any) {
    console.error("直接WHOIS查询错误:", error);
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

  // 双协议查询函数 - 先RDAP，再WHOIS
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
        setWhoisData(whoisResult || null);
      } catch (e: any) {
        setError(`使用服务器 ${server} 查询失败: ${e.message}`);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      // 1. 首先尝试RDAP查询
      console.log("开始RDAP查询...");
      setProtocol("RDAP");
      
      const rdapResponse = await queryRDAP(domain);
      
      // 如果RDAP查询成功且返回了有效数据
      if (rdapResponse.success && rdapResponse.data) {
        console.log("RDAP查询成功:", rdapResponse.data);
        setWhoisData(rdapResponse.data);
        toast({
          title: "RDAP查询成功",
          description: "已通过RDAP协议获取域名信息",
        });
        setLoading(false);
        return;
      } else {
        console.log("RDAP查询未返回有效数据，将尝试WHOIS查询");
        toast({
          title: "RDAP查询未成功",
          description: "正在使用本地WHOIS系统查询...",
        });
      }
      
      // 2. RDAP失败，尝试WHOIS查询
      setProtocol("WHOIS");
      console.log("开始WHOIS查询...");
      
      // 使用现有的WHOIS查询
      const whoisResult = await handleWhoisLookup(domain);
      
      // 检查WHOIS查询是否成功
      if (whoisResult && (whoisResult.registrar !== "未知" || whoisResult.nameServers.length > 0)) {
        console.log("WHOIS查询成功:", whoisResult);
        setWhoisData(whoisResult);
        toast({
          title: "WHOIS查询成功",
          description: "已通过WHOIS协议获取域名信息",
        });
        setLoading(false);
        return;
      }
      
      // 3. 如果现有WHOIS查询没有返回有效数据，尝试直接WHOIS查询
      console.log("尝试直接WHOIS查询...");
      try {
        const rawWhoisData = await directWhoisQuery(domain);
        
        // 如果获取到了WHOIS数据
        if (rawWhoisData && rawWhoisData.length > 100) {
          console.log("直接WHOIS查询成功，获取到原始数据");
          
          // 检查域名是否未注册
          const notRegisteredPatterns = [
            /no match/i,
            /not found/i,
            /no entries found/i,
            /domain not found/i,
            /not registered/i,
            /no information available/i
          ];
          
          const isNotRegistered = notRegisteredPatterns.some(pattern => 
            pattern.test(rawWhoisData)
          );
          
          // 如果域名看起来已注册
          if (!isNotRegistered) {
            // 尝试从原始数据中提取一些基本信息
            let registrar = "未知";
            let registrationDate = "未知";
            let expiryDate = "未知";
            let status = "已注册"; // 默认为已注册状态
            
            // 简单提取域名服务器
            const nameServerMatches = rawWhoisData.match(/(?:name\s*server|ns|nserver)[^:]*:\s*([^\n]+)/gi);
            const nameServers = nameServerMatches 
              ? nameServerMatches.map(match => {
                  const parts = match.split(':');
                  return parts.length > 1 ? parts[1].trim().split(/\s+/)[0] : "";
                }).filter(Boolean)
              : [];
            
            // 尝试提取注册商
            const registrarMatch = rawWhoisData.match(/(?:registrar|sponsor(?:ing)?(?:\s+registrar)?)[^:]*:\s*([^\n]+)/i);
            if (registrarMatch) registrar = registrarMatch[1].trim();
            
            // 提取创建日期
            const createdMatch = rawWhoisData.match(/(?:created(?:\s+on)?|creation\s+date|registered(?:\s+on)?)[^:]*:\s*([^\n]+)/i);
            if (createdMatch) registrationDate = createdMatch[1].trim();
            
            // 提取到期日期
            const expiryMatch = rawWhoisData.match(/(?:expir(?:y|ation|es)(?:\s+date)?|paid[\s-]*till)[^:]*:\s*([^\n]+)/i);
            if (expiryMatch) expiryDate = expiryMatch[1].trim();
            
            // 将直接查询的WHOIS数据与前面的结果合并
            const directWhoisResult: WhoisData = {
              domain: domain,
              whoisServer: "直接查询",
              registrar: registrar,
              registrationDate: registrationDate,
              expiryDate: expiryDate,
              nameServers: nameServers,
              registrant: "未知",
              status: status,
              rawData: rawWhoisData,
              protocol: 'whois'
            };
            
            console.log("处理后的直接WHOIS查询结果:", directWhoisResult);
            setWhoisData(directWhoisResult);
            toast({
              title: "WHOIS查询成功",
              description: "通过直接WHOIS查询获取到域名信息",
            });
          } else {
            // 域名未注册
            setWhoisData({
              domain: domain,
              whoisServer: "直接查询",
              registrar: "未知",
              registrationDate: "未知",
              expiryDate: "未知",
              nameServers: [],
              registrant: "未知",
              status: "未注册",
              rawData: rawWhoisData,
              protocol: 'whois'
            });
          }
        } else {
          // 没有获取到有效的直接WHOIS数据
          throw new Error("无法获取有效的WHOIS数据");
        }
      } catch (directWhoisError: any) {
        console.error("直接WHOIS查询失败:", directWhoisError);
        
        // 所有查询方法都失败，尝试使用公共WHOIS API
        setError("所有WHOIS查询方法均失败，无法获取完整的域名信息");
        
        // 尝试设置有限的域名数据
        setWhoisData({
          domain: domain,
          whoisServer: "查询失败",
          registrar: "未知",
          registrationDate: "未知",
          expiryDate: "未知",
          nameServers: [],
          registrant: "未知",
          status: "查询失败",
          rawData: `无法获取域名 ${domain} 的WHOIS或RDAP数据。所有查询方法均失败。`,
          protocol: 'whois'
        });
      }
    } catch (error: any) {
      console.error("域名查询失败:", error);
      setError(error.message || "未知错误");
      
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
        protocol: 'whois'
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
}
