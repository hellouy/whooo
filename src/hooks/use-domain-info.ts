
import { useState, useCallback } from "react";
import { WhoisData } from "./use-whois-lookup";
import { toast } from "@/hooks/use-toast";
import { lookupDomain } from "@/services/WhoisApiService";

/**
 * 简化的域名信息查询Hook
 */
export function useDomainInfo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WhoisData | null>(null);
  const [lastDomain, setLastDomain] = useState<string | null>(null);
  
  // 查询域名信息
  const queryDomain = useCallback(async (domain: string) => {
    if (!domain || domain.trim() === '') {
      setError("请输入有效的域名");
      return;
    }
    
    setLoading(true);
    setError(null);
    setLastDomain(domain);
    
    try {
      toast({
        title: "查询中",
        description: `正在查询 ${domain} 的域名信息...`
      });
      
      const result = await lookupDomain(domain);
      
      if (result.protocol === 'error') {
        setError(`查询失败: ${result.message || '无法获取域名信息'}`);
        toast({
          title: "查询失败",
          description: result.message || "无法获取域名信息",
          variant: "destructive"
        });
      } else {
        setData(result);
        setError(null);
        toast({
          title: "查询成功",
          description: result.message || "成功获取域名信息"
        });
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`查询出错: ${errorMessage}`);
      toast({
        title: "查询错误",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 重试查询
  const retryQuery = useCallback(async () => {
    if (lastDomain) {
      await queryDomain(lastDomain);
    } else {
      toast({
        title: "无法重试",
        description: "没有最近的查询记录",
        variant: "destructive"
      });
    }
  }, [lastDomain, queryDomain]);
  
  return {
    loading,
    error,
    data,
    lastDomain,
    queryDomain,
    retryQuery
  };
}
