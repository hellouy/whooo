import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseRawData } from "@/utils/whoisParser";
import { processWhoisResults } from "@/utils/whoiserProcessor";
// Import whoiser using CommonJS compatible import
import * as whoiser from "whoiser";
import { useDirectLookup } from "./use-direct-lookup";
import { useApiLookup, ApiLookupResult } from "./use-api-lookup";

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
  protocol?: 'rdap' | 'whois' | 'error';
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

  const handleWhoisLookup = async (domain: string, server?: string): Promise<WhoisData | null> => {
    setLoading(true);
    setError(null);
    setLastDomain(domain);
    
    if (!server) {
      setWhoisData(null);
      setSpecificServer(null);
    }
    
    try {
      console.log(`开始查询域名: ${domain}${server ? ` 使用服务器: ${server}` : ''}`);
      
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
            title: "查询成功",
            description: "已通过whoiser直接获取域名信息",
          });
          setLoading(false);
          return directResult;
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
        
        const apiResult = await Promise.race([apiPromise, apiTimeoutPromise]);
        
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
          } else {
            await performFallbackLookup(domain);
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
              title: "查询成功",
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
            } else {
              const fallbackRawData = [
                `域名 (Domain): ${domain}`,
                `查询时间 (Query Time): ${new Date().toISOString()}`,
                `注册商 (Registrar): ${apiResult.data.registrar || '未知'}`,
                `创建日期 (Creation Date): ${apiResult.data.registrationDate || '未知'}`,
                `过期日期 (Expiry Date): ${apiResult.data.expiryDate || '未知'}`,
                `状态 (Status): ${apiResult.data.status || '未知'}`,
                `名称服务器 (Name Servers): ${apiResult.data.nameServers.join(', ') || '未知'}`
              ].join('\n');
              
              apiResult.data.rawData = fallbackRawData;
            }
          }
          
          setWhoisData(apiResult.data);
        }
      } catch (apiError) {
        console.error("API查询出错:", apiError);
        
        if (directResult && directResult.rawData && directResult.rawData.length > 50) {
          console.log("API查询失败，使用直接查询结果");
          setWhoisData(directResult);
          toast({
            title: "查询部分成功",
            description: "API查询失败，但通过直接查询获取了部分信息",
          });
        } else {
          await performFallbackLookup(domain);
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
      
      await performFallbackLookup(domain);
    } finally {
      setLoading(false);
    }
    
    return whoisData;
  };

  const performFallbackLookup = async (domain: string): Promise<boolean> => {
    try {
      console.log("尝试内置whoiser作为最后的后备方案...");
      toast({
        title: "尝试备用方法",
        description: "正在尝试通过备用方式获取域名信息...",
      });
      
      const attempts = [
        { follow: 3, timeout: 15000 },
        { follow: 2, timeout: 10000, server: 'whois.verisign-grs.com' },
        { follow: 2, timeout: 10000, server: 'whois.iana.org' }
      ];
      
      for (const options of attempts) {
        try {
          console.log(`尝试使用whoiser配置:`, options);
          // Use the imported module correctly
          const fallbackResult = await whoiser.lookup(domain, options);
          
          if (fallbackResult) {
            console.log("后备whoiser响应:", fallbackResult);
            
            const processedFallback = processWhoisResults(domain, fallbackResult);
            
            if (processedFallback.rawData && processedFallback.rawData.length > 50) {
              setWhoisData(processedFallback);
              toast({
                title: "部分查询成功",
                description: "使用后备方法获取了域名信息",
              });
              return true;
            }
          }
        } catch (err) {
          console.error(`后备尝试 ${options.server || '默认'} 失败:`, err);
        }
      }
      
      const minimalData: WhoisData = {
        domain: domain,
        whoisServer: "未知",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: [
          `域名 (Domain): ${domain}`,
          `查询时间 (Query Time): ${new Date().toISOString()}`,
          `注意: 所有WHOIS查询方法均失败`,
          `可能原因:`,
          `- 域名不存在`,
          `- WHOIS服务器暂时不可用`,
          `- 网络连接问题`,
          `- WHOIS服务器限制查询`
        ].join('\n'),
        message: "所有查询方法均失败"
      };
      
      setWhoisData(minimalData);
      toast({
        title: "查询结果有限",
        description: "无法获取完整的域名信息，请稍后重试",
        variant: "destructive",
      });
      
      return false;
    } catch (error) {
      console.error("后备查询也失败:", error);
      return false;
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
