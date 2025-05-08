
import { useState } from "react";
import { WhoisData } from "./use-whois-lookup";
import axios from 'axios';
import { getPopularDomainInfo } from "@/utils/popularDomainsService";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl, getMockWhoisResponse } from "@/utils/apiUtils";

export const useDirectLookup = () => {
  const { toast } = useToast();
  
  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    console.log("开始直接WHOIS查询:", domain);
    
    try {
      // 通知用户查询开始
      toast({
        title: "直接查询中",
        description: `正在使用多个API服务查询域名 ${domain}...`,
      });
      
      // 构建正确的API URL
      const apiUrl = buildApiUrl('/api/direct-whois');
      console.log(`使用API路径: ${apiUrl}`);
      
      try {
        // 尝试调用API
        const response = await axios.post(apiUrl, { 
          domain,
          timeout: 15000
        }, {
          timeout: 20000
        });
        
        // 如果API成功返回数据
        if (response.data && response.data.success && response.data.data) {
          console.log("直接WHOIS查询成功:", response.data);
          
          toast({
            title: "查询成功",
            description: `成功从 ${response.data.source} 获取域名信息`,
          });
          
          return response.data.data;
        }
        
        // API返回错误
        if (response.data && response.data.error) {
          console.log("直接WHOIS查询返回错误:", response.data.error);
          
          toast({
            title: "API查询错误",
            description: response.data.error,
            variant: "destructive",
          });
          
          // 如果有数据，还是尝试使用
          if (response.data.data) {
            return response.data.data;
          }
        }
        
        // 如果API没返回有效数据，尝试使用直接WHOIS查询
        throw new Error("直接WHOIS查询未返回有效数据，尝试使用其他方法");
      } catch (apiError: any) {
        // API调用失败，尝试使用whoiser库直接查询
        console.warn("API调用失败，尝试使用whoiser库:", apiError.message);
        
        // 尝试使用whoiser库查询
        try {
          // 导入whoiser库（在这里使用动态导入避免顶级await）
          const whoiser = await import('whoiser');
          console.log("使用whoiser库直接查询域名:", domain);
          
          const result = await whoiser.lookup(domain, {
            follow: 3,
            timeout: 15000
          });
          
          console.log("whoiser返回结果:", result);
          
          if (result) {
            // 解析whoiser结果
            const whoisData: WhoisData = {
              domain: domain,
              whoisServer: result.whois?.server || "直接查询",
              registrar: result.registrar?.name || result.registrar || "未知",
              registrationDate: result.created || result.creationDate || "未知",
              expiryDate: result.expires || result.expirationDate || "未知",
              nameServers: Array.isArray(result.nameservers) ? result.nameservers : 
                (result.nameservers ? [result.nameservers] : []),
              registrant: result.registrant || "未知",
              status: result.status || "未知",
              rawData: result.text || `直接查询 ${domain} 没有返回原始数据`,
              message: "使用whoiser库查询成功",
              protocol: "whois" as "whois" | "rdap" | "error"
            };
            
            toast({
              title: "直接查询成功",
              description: "使用whoiser库获取了域名信息",
            });
            
            return whoisData;
          }
        } catch (whoiserError: any) {
          console.error("whoiser查询失败:", whoiserError);
        }
        
        // 如果whoiser也失败了，尝试使用模拟数据
        console.warn("所有直接查询方法均失败，使用模拟数据:", apiError.message);
        
        // 获取模拟响应
        const mockResponse = getMockWhoisResponse(domain);
        console.log("使用模拟数据:", mockResponse);
        
        toast({
          title: "使用模拟数据",
          description: "所有查询方法都失败，使用模拟数据进行演示",
        });
        
        return mockResponse.data;
      }
    } catch (error: any) {
      console.error("直接WHOIS查询出错:", error);
      
      toast({
        title: "查询失败",
        description: error.message || "未知错误",
        variant: "destructive",
      });
      
      // 尝试使用预定义域名数据作为后备
      const popularData = getPopularDomainInfo(domain);
      if (popularData) {
        console.log("直接查询失败，但找到预定义域名数据:", popularData);
        
        toast({
          title: "使用预定义数据",
          description: "API查询失败，但找到了预定义数据",
        });
        
        // 从热门域名数据创建WhoisData对象
        return {
          domain: domain,
          whoisServer: "预定义数据库",
          registrar: popularData.registrar || "未知",
          registrationDate: popularData.registrationDate || popularData.created || "未知",
          expiryDate: popularData.expiryDate || popularData.expires || "未知",
          nameServers: popularData.nameServers || popularData.nameservers || [],
          registrant: "未知",
          status: popularData.status || "未知",
          rawData: `Fallback data for ${domain}. Popular domain information retrieved from predefined database.`,
          message: "使用预定义的域名数据",
          protocol: "whois" as "whois" | "rdap" | "error"
        };
      }
      
      toast({
        title: "无可用数据",
        description: "无法获取域名信息，请稍后重试",
        variant: "destructive",
      });
      
      // 创建最小响应
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
        protocol: "error" as "whois" | "rdap" | "error"
      };
    }
  };

  return { performDirectLookup };
};
