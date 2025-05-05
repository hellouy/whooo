
import { useState } from "react";
import { WhoisData } from "./use-whois-lookup";
import axios from 'axios';
import { getPopularDomainInfo } from "@/utils/popularDomainsService";
import { useToast } from "@/hooks/use-toast";

export const useDirectLookup = () => {
  const { toast } = useToast();
  
  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    console.log("开始直接WHOIS查询:", domain);
    
    try {
      // Try to use our direct WHOIS API
      toast({
        title: "直接查询中",
        description: `正在使用多个API服务查询域名 ${domain}...`,
      });
      
      const response = await axios.post('/api/direct-whois', { 
        domain,
        timeout: 15000
      }, {
        timeout: 20000
      });
      
      if (response.data && response.data.success && response.data.data) {
        console.log("直接WHOIS查询成功:", response.data);
        
        toast({
          title: "查询成功",
          description: `成功从 ${response.data.source} 获取域名信息`,
        });
        
        return response.data.data;
      }
      
      // API returned some kind of error
      if (response.data && response.data.error) {
        console.log("直接WHOIS查询返回错误:", response.data.error);
        
        toast({
          title: "API查询错误",
          description: response.data.error,
          variant: "destructive",
        });
        
        // We still try to use the data if available
        if (response.data.data) {
          return response.data.data;
        }
      }
      
      throw new Error("直接WHOIS查询未返回有效数据");
      
    } catch (error: any) {
      console.error("直接WHOIS查询出错:", error);
      
      toast({
        title: "查询失败",
        description: error.message || "未知错误",
        variant: "destructive",
      });
      
      // Try popular domain fallback
      const popularData = getPopularDomainInfo(domain);
      if (popularData) {
        console.log("直接查询失败，但找到预定义域名数据:", popularData);
        
        toast({
          title: "使用预定义数据",
          description: "API查询失败，但找到了预定义数据",
        });
        
        // Create a WhoisData object from popular domain data
        return {
          domain: domain,
          whoisServer: "预定义数据库",
          registrar: popularData.registrar || "未知",
          registrationDate: popularData.registrationDate || popularData.created || popularData.creationDate || "未知",
          expiryDate: popularData.expiryDate || popularData.expires || "未知",
          nameServers: popularData.nameServers || popularData.nameservers || [],
          registrant: "未知",
          status: popularData.status || "未知",
          rawData: `Fallback data for ${domain}. Popular domain information retrieved from predefined database.`,
          message: "使用预定义的域名数据",
          protocol: "whois"
        };
      }
      
      toast({
        title: "无可用数据",
        description: "无法获取域名信息，请稍后重试",
        variant: "destructive",
      });
      
      // Create a minimal response
      return {
        domain: domain,
        whoisServer: "直接查询失败",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: `Fallback response for ${domain}. ${error.message || "Direct WHOIS query failed."}`,
        message: `直接查询失败: ${error.message || "未知错误"}`,
        protocol: "error"
      };
    }
  };

  return { performDirectLookup };
};
