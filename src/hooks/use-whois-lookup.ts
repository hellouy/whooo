
import { useState } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleWhoisLookup = async (domain: string, server?: string) => {
    setLoading(true);
    setError(null);
    
    if (!server) {
      setWhoisData(null);
      setSpecificServer(null);
    }
    
    try {
      // 使用本地 API 路由来获取 WHOIS 信息
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
            description: "发现更具体的WHOIS服务器，点击'获取更多信息'获取详细数据",
          });
        } else {
          setSpecificServer(null);
          toast({
            title: "查询成功",
            description: "已获取域名信息",
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
        
        // 组合信息
        const result = {
          domain: domain,
          whoisServer: whoisResponse.data.whoisServer || server || "未知",
          registrar: whoisResponse.data.registrar || "未知",
          registrationDate: whoisResponse.data.creationDate || "未知",
          expiryDate: whoisResponse.data.expiryDate || "未知",
          nameServers: whoisResponse.data.nameServers || [],
          registrant: whoisResponse.data.registrant || "未知",
          status: whoisResponse.data.status || "未知",
          rawData: whoisResponse.data.rawData || "",
          price: priceData
        };
        
        setWhoisData(result);
      }
    } catch (error: any) {
      console.error("Whois lookup error:", error);
      const errorMessage = error.response?.data?.error || error.message || "无法连接到WHOIS服务器";
      setError(errorMessage);
      toast({
        title: "查询失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    whoisData,
    loading,
    error,
    specificServer,
    handleWhoisLookup
  };
};
