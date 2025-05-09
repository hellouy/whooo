
import { useState } from 'react';

export interface QueryStats {
  rdapSuccess: number;
  rdapFailed: number;
  whoisSuccess: number;
  whoisFailed: number;
}

export interface LookupStats {
  total: number;
  successRate: number;
  rdapSuccessRate?: number;
  whoisSuccessRate?: number;
}

export function useQueryStats() {
  const [queryStats, setQueryStats] = useState<QueryStats>({
    rdapSuccess: 0,
    rdapFailed: 0,
    whoisSuccess: 0,
    whoisFailed: 0
  });

  const updateStats = (type: keyof QueryStats) => {
    setQueryStats(prev => ({...prev, [type]: prev[type] + 1}));
  };

  // 获取统计信息
  const getQueryStats = (): LookupStats => {
    const total = queryStats.rdapSuccess + queryStats.rdapFailed + 
                 queryStats.whoisSuccess + queryStats.whoisFailed;
                 
    if (total === 0) return { total: 0, successRate: 0 };
    
    const successful = queryStats.rdapSuccess + queryStats.whoisSuccess;
    const successRate = Math.round((successful / total) * 100);
    
    return {
      total,
      successRate,
      rdapSuccessRate: queryStats.rdapSuccess + queryStats.rdapFailed === 0 ? 0 :
        Math.round((queryStats.rdapSuccess / (queryStats.rdapSuccess + queryStats.rdapFailed)) * 100),
      whoisSuccessRate: queryStats.whoisSuccess + queryStats.whoisFailed === 0 ? 0 :
        Math.round((queryStats.whoisSuccess / (queryStats.whoisSuccess + queryStats.whoisFailed)) * 100)
    };
  };

  return {
    queryStats,
    updateStats,
    getQueryStats
  };
}
