
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
    
    // 保存到本地存储以便跨会话持久化
    try {
      const storedStats = localStorage.getItem('domainQueryStats');
      let allStats = storedStats ? JSON.parse(storedStats) : {
        rdapSuccess: 0,
        rdapFailed: 0,
        whoisSuccess: 0,
        whoisFailed: 0
      };
      
      allStats[type] += 1;
      localStorage.setItem('domainQueryStats', JSON.stringify(allStats));
    } catch (e) {
      // 如果本地存储出错，忽略
      console.error('无法保存统计数据到本地存储', e);
    }
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
  
  // 加载保存的统计数据
  const loadSavedStats = () => {
    try {
      const storedStats = localStorage.getItem('domainQueryStats');
      if (storedStats) {
        const savedStats = JSON.parse(storedStats);
        setQueryStats(savedStats);
      }
    } catch (e) {
      console.error('无法加载保存的统计数据', e);
    }
  };
  
  // 重置统计数据
  const resetStats = () => {
    setQueryStats({
      rdapSuccess: 0,
      rdapFailed: 0,
      whoisSuccess: 0,
      whoisFailed: 0
    });
    
    try {
      localStorage.removeItem('domainQueryStats');
    } catch (e) {
      console.error('无法重置统计数据', e);
    }
  };

  return {
    queryStats,
    updateStats,
    getQueryStats,
    loadSavedStats,
    resetStats
  };
}
