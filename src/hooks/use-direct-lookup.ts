
import { useState } from "react";
import { WhoisData } from "./use-whois-lookup";
import { processWhoisResults } from "@/utils/whoiserProcessor";

// Dynamic import for whoiser to handle client-side import issues
let whoiserImportPromise: Promise<any> | null = null;
let whoiserModule: any = null;

const getWhoiser = async () => {
  if (whoiserModule) return whoiserModule;
  
  if (!whoiserImportPromise) {
    whoiserImportPromise = import('whoiser')
      .then(module => {
        whoiserModule = module.default;
        return module.default;
      })
      .catch(err => {
        console.error('Error importing whoiser:', err);
        return null;
      });
  }
  
  return whoiserImportPromise;
};

export const useDirectLookup = () => {
  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    console.log("开始直接WHOIS查询:", domain);
    
    try {
      const whoiser = await getWhoiser();
      
      if (!whoiser) {
        throw new Error("Whoiser import failed");
      }
      
      // Three retries with different configurations
      const configs = [
        { follow: 3, timeout: 15000 },
        { follow: 2, timeout: 10000 },
        { follow: 1, timeout: 8000, server: 'whois.verisign-grs.com' }
      ];
      
      let lastError;
      let result;
      
      for (const config of configs) {
        try {
          console.log(`尝试whoiser配置:`, config);
          result = await whoiser(domain, config);
          
          if (result) {
            console.log("whoiser响应成功:", Object.keys(result));
            break;
          }
        } catch (err) {
          console.error(`whoiser配置 ${JSON.stringify(config)} 失败:`, err);
          lastError = err;
        }
      }
      
      if (!result) {
        throw lastError || new Error("所有whoiser查询配置均失败");
      }
      
      // 处理whoiser结果
      const processedResult = processWhoisResults(domain, result);
      console.log("处理后的whoiser结果:", processedResult);
      return processedResult;
      
    } catch (error: any) {
      console.error("Whoiser查询出错:", error);
      
      // 创建一个最小化的结果对象
      return {
        domain: domain,
        whoisServer: "Whoiser查询失败",
        registrar: "未知",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "未知",
        rawData: `Fallback response for ${domain}. ${error.message || "Whoiser query failed."}`,
        message: `Whoiser查询失败: ${error.message || "未知错误"}`
      };
    }
  };

  return { performDirectLookup };
};
