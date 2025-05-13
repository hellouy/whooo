
import { useState } from 'react';

// 域名数据接口
export interface WhoisData {
  domain: string;
  whoisServer: string;
  registrar: string;
  registrationDate: string;
  expiryDate: string;
  nameServers: string[];
  registrant: string;
  status: string | unknown;
  rawData: string | unknown;
  protocol: 'rdap' | 'whois' | 'error';
  message?: string;
}

// WHOIS查询返回类型接口
interface UseWhoisLookupReturn {
  data: WhoisData | null;
  loading: boolean;
  error: string | null;
  lookup: (domain: string) => Promise<void>;
}

/**
 * WHOIS查询Hook
 * @deprecated 请使用新的 useDomainInfo 替代
 */
export function useWhoisLookup(): UseWhoisLookupReturn {
  const [data, setData] = useState<WhoisData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * 查询域名
   * 注意: 此hook已弃用，请使用useDomainInfo替代
   */
  const lookup = async (domain: string) => {
    console.warn("useWhoisLookup已弃用，请使用useDomainInfo替代");
    setLoading(true);
    setError(null);
    
    try {
      // 假设的查询逻辑
      setData({
        domain: domain,
        whoisServer: "弃用的hook",
        registrar: "请使用useDomainInfo",
        registrationDate: "未知",
        expiryDate: "未知",
        nameServers: [],
        registrant: "未知",
        status: "此钩子已弃用",
        rawData: "useWhoisLookup已弃用，请使用useDomainInfo替代",
        protocol: "error"
      });
    } catch (err: any) {
      setError(err.message || "查询过程中出错");
    } finally {
      setLoading(false);
    }
  };
  
  return { data, loading, error, lookup };
}
