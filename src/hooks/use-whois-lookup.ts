
import { useState } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { parseRawData } from "@/utils/whoisParser";
import whoiser from "whoiser";

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

  const handleDirectLookup = async (domain: string) => {
    try {
      console.log("Attempting direct whoiser lookup for:", domain);
      
      // Use whoiser to directly query
      const whoiserResult = await whoiser(domain);
      console.log("Whoiser raw result:", whoiserResult);
      
      // Consolidate whoiser results
      let result: WhoisData = {
        domain: domain,
        whoisServer: "直接查询",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: JSON.stringify(whoiserResult, null, 2)
      };
      
      // Process domain information
      if (whoiserResult.domain) {
        const domainInfo = whoiserResult.domain;
        
        // Registrar information
        result.registrar = domainInfo.registrar || 
                          (whoiserResult['Domain Name'] && whoiserResult['Registrar']) || 
                          result.registrar;
        
        // Creation date
        result.registrationDate = domainInfo.createdDate || 
                                 domainInfo['Creation Date'] || 
                                 (whoiserResult['Domain Name'] && whoiserResult['Creation Date']) || 
                                 result.registrationDate;
        
        // Expiry date
        result.expiryDate = domainInfo.expiryDate || 
                           domainInfo['Registry Expiry Date'] || 
                           (whoiserResult['Domain Name'] && whoiserResult['Registry Expiry Date']) || 
                           result.expiryDate;
        
        // Status
        result.status = domainInfo.status || 
                       domainInfo['Domain Status'] || 
                       (whoiserResult['Domain Name'] && whoiserResult['Domain Status']) || 
                       result.status;
        
        // Name servers
        if (domainInfo.nameServers && Array.isArray(domainInfo.nameServers)) {
          result.nameServers = domainInfo.nameServers;
        } else if (whoiserResult['Domain Name'] && whoiserResult['Name Server'] && Array.isArray(whoiserResult['Name Server'])) {
          result.nameServers = whoiserResult['Name Server'];
        }
      }
      
      // Try to extract information from other top-level objects
      Object.keys(whoiserResult).forEach(key => {
        const section = whoiserResult[key];
        if (typeof section === 'object' && section !== null) {
          // Try to extract registrar information from each section
          if (section.registrar && result.registrar === "未知") {
            result.registrar = section.registrar;
          }
          
          // Try to extract creation date from each section
          if ((section.createdDate || section['Creation Date']) && result.registrationDate === "未知") {
            result.registrationDate = section.createdDate || section['Creation Date'];
          }
          
          // Try to extract expiry date from each section
          if ((section.expiryDate || section['Registry Expiry Date']) && result.expiryDate === "未知") {
            result.expiryDate = section.expiryDate || section['Registry Expiry Date'];
          }
          
          // Try to extract status from each section
          if ((section.status || section['Domain Status']) && result.status === "未知") {
            result.status = section.status || section['Domain Status'];
          }
          
          // Try to extract name servers from each section
          if (section.nameServers && Array.isArray(section.nameServers) && result.nameServers.length === 0) {
            result.nameServers = section.nameServers;
          }
        }
      });
      
      console.log("Processed whoiser result:", result);
      return result;
    } catch (error) {
      console.error("Direct whoiser lookup error:", error);
      throw error;
    }
  };

  const handleWhoisLookup = async (domain: string, server?: string) => {
    setLoading(true);
    setError(null);
    setLastDomain(domain);
    
    if (!server) {
      setWhoisData(null);
      setSpecificServer(null);
    }
    
    try {
      // 首先尝试使用whoiser直接查询
      try {
        const directResult = await handleDirectLookup(domain);
        
        // 检查是否获取到有效数据
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
          console.log("whoiser查询未返回有效数据，尝试传统API查询");
        }
      } catch (directError) {
        console.error("whoiser直接查询失败，尝试传统API查询:", directError);
      }
      
      // 如果直接查询失败或没有返回有效数据，则回退到传统API查询
      const apiUrl = '/api/whois';
      const requestData = server ? { domain, server } : { domain };
      
      console.log("Sending WHOIS request:", requestData);
      const whoisResponse = await axios.post(apiUrl, requestData);
      console.log("WHOIS Response:", whoisResponse.data);

      if (whoisResponse.data.error) {
        setError(whoisResponse.data.error);
        toast({
          title: "查询失败",
          description: whoisResponse.data.error,
          variant: "destructive",
        });
      } else {
        // 如果有建议的特定WHOIS服务器
        if (whoisResponse.data.suggestedServer && !server) {
          setSpecificServer(whoisResponse.data.suggestedServer);
          toast({
            title: "初步查询成功",
            description: whoisResponse.data.message || "发现更具体的WHOIS服务器，点击'获取更多信息'获取详细数据",
          });
        } else {
          setSpecificServer(null);
          toast({
            title: "查询成功",
            description: whoisResponse.data.message || "已获取域名信息",
          });
        }
        
        // 处理价格信息
        let priceData = null;
        try {
          const priceResponse = await axios.get(`https://who.cx/api/price?domain=${domain}`);
          console.log("Price Response:", priceResponse.data);
          priceData = priceResponse.data;
        } catch (priceError) {
          console.error("Price lookup error:", priceError);
          // 价格获取失败不影响 WHOIS 查询
        }
        
        // 使用我们的正则表达式解析器解析原始数据
        const rawData = whoisResponse.data.rawData || "";
        const parsedData = parseRawData(domain, rawData);
        console.log("Parsed WHOIS data:", parsedData);
        
        // 整合解析的数据和原始响应
        const result = {
          domain: domain,
          whoisServer: whoisResponse.data.whoisServer || server || "未知",
          registrar: parsedData?.registrar || whoisResponse.data.registrar || "未知",
          registrationDate: parsedData?.creationDate || whoisResponse.data.creationDate || "未知",
          expiryDate: parsedData?.expiryDate || whoisResponse.data.expiryDate || "未知",
          nameServers: parsedData?.nameServers || whoisResponse.data.nameServers || [],
          registrant: whoisResponse.data.registrant || whoisResponse.data.registrar || "未知",
          status: parsedData?.status || whoisResponse.data.status || "未知",
          rawData: rawData,
          message: whoisResponse.data.message || "",
          price: priceData
        };
        
        setWhoisData(result);
      }
    } catch (error: any) {
      console.error("Whois lookup error:", error);
      
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
      
      // 5秒后自动尝试使用备用服务器
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
