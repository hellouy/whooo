
import { useState } from 'react';
import { WhoisData } from './use-whois-lookup';
import { lookupDomain } from '@/services/DomainQueryService';
import { useToast } from './use-toast';

interface UseDomainInfoReturn {
  data: WhoisData | null;
  loading: boolean;
  error: string | null;
  lastDomain: string | null;
  lastProtocol: 'auto' | 'rdap' | 'whois';
  queryDomain: (domain: string, protocol?: 'auto' | 'rdap' | 'whois') => Promise<void>;
  retryQuery: () => Promise<void>;
}

/**
 * 域名信息查询Hook
 * 提供域名查询功能和状态管理
 */
export function useDomainInfo(): UseDomainInfoReturn {
  const [data, setData] = useState<WhoisData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDomain, setLastDomain] = useState<string | null>(null);
  const [lastProtocol, setLastProtocol] = useState<'auto' | 'rdap' | 'whois'>('auto');
  const { toast } = useToast();

  /**
   * 查询域名
   * @param domain 域名
   * @param protocol 查询协议
   */
  const queryDomain = async (domain: string, protocol: 'auto' | 'rdap' | 'whois' = 'auto') => {
    if (!domain) {
      setError('请输入有效的域名');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLastDomain(domain);
      setLastProtocol(protocol);
      
      console.log(`查询域名: ${domain}, 协议: ${protocol}`);
      
      // 使用域名查询服务
      const result = await lookupDomain(domain, protocol);
      
      if (result.protocol === 'error') {
        throw new Error(result.message || '查询失败，未返回有效数据');
      }
      
      setData(result);
      console.log('查询结果:', result);
      
      // 根据结果提示用户
      const protocolName = result.protocol === 'rdap' ? 'RDAP协议' : 'WHOIS协议';
      toast({
        title: "查询成功",
        description: `已使用${protocolName}成功获取 ${domain} 的信息`,
      });
      
    } catch (err) {
      console.error('域名查询错误:', err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : '查询域名时发生未知错误';
      
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "查询失败",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重试上次查询
   */
  const retryQuery = async () => {
    if (lastDomain) {
      await queryDomain(lastDomain, lastProtocol);
    } else {
      setError('没有可重试的域名查询');
    }
  };

  return {
    data,
    loading,
    error,
    lastDomain,
    lastProtocol,
    queryDomain,
    retryQuery
  };
}
