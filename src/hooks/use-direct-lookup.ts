
import { useState } from "react";
import { WhoisData } from "./use-whois-lookup";
import { processWhoisResults } from "@/utils/whoiserProcessor";
import axios from 'axios';
import { getPopularDomainInfo } from "@/utils/popularDomainsService";

export const useDirectLookup = () => {
  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    console.log("开始直接WHOIS查询:", domain);
    
    try {
      // Try to use our direct WHOIS API
      const response = await axios.post('/api/direct-whois', { 
        domain,
        timeout: 15000
      }, {
        timeout: 20000
      });
      
      if (response.data && response.data.success) {
        console.log("直接WHOIS查询成功:", response.data);
        return response.data.data;
      }
      
      throw new Error("直接WHOIS查询未返回有效数据");
      
    } catch (error: any) {
      console.error("直接WHOIS查询出错:", error);
      
      // Try popular domain fallback
      const popularData = getPopularDomainInfo(domain);
      if (popularData) {
        console.log("直接查询失败，但找到预定义域名数据:", popularData);
        
        // Create a WhoisData object from popular domain data
        return {
          domain: domain,
          whoisServer: "预定义数据库",
          registrar: popularData.registrar,
          registrationDate: popularData.registrationDate || popularData.creationDate,
          expiryDate: popularData.expiryDate,
          nameServers: popularData.nameServers,
          registrant: "未知",
          status: popularData.status,
          rawData: `Fallback data for ${domain}. Popular domain information retrieved from predefined database.`,
          message: "使用预定义的域名数据"
        };
      }
      
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
        message: `直接查询失败: ${error.message || "未知错误"}`
      };
    }
  };

  return { performDirectLookup };
};
