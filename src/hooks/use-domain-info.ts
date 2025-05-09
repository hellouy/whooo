
import { useState, useCallback } from 'react';
import { queryDomainInfo, DomainInfo } from '@/utils/domainInfoService';
import { useQueryStats } from '@/utils/lookupStats';

// 查询状态接口
export interface DomainInfoState {
  loading: boolean;
  error: string | null;
  data: DomainInfo | null;
  lastDomain: string | null;
}

/**
 * 域名信息查询Hook
 */
export function useDomainInfo() {
  // 查询状态
  const [state, setState] = useState<DomainInfoState>({
    loading: false,
    error: null,
    data: null,
    lastDomain: null
  });
  
  // 统计数据
  const { updateStats } = useQueryStats();
  
  // 查询函数
  const queryDomain = useCallback(async (domain: string) => {
    // 重置状态
    setState({
      loading: true,
      error: null,
      data: null,
      lastDomain: domain
    });
    
    try {
      const info = await queryDomainInfo(domain);
      
      // 更新统计数据
      if (info.error) {
        // 查询失败
        if (info.protocol === 'rdap' || info.protocol === 'both') {
          updateStats('rdapFailed');
        }
        if (info.protocol === 'whois' || info.protocol === 'both') {
          updateStats('whoisFailed');
        }
        
        setState({
          loading: false,
          error: info.error,
          data: null,
          lastDomain: domain
        });
      } else {
        // 查询成功
        if (info.rdapData) {
          updateStats('rdapSuccess');
        } else {
          updateStats('rdapFailed');
        }
        
        if (info.whoisData) {
          updateStats('whoisSuccess');
        } else {
          updateStats('whoisFailed');
        }
        
        setState({
          loading: false,
          error: null,
          data: info,
          lastDomain: domain
        });
      }
    } catch (error) {
      // 更新统计
      updateStats('rdapFailed');
      updateStats('whoisFailed');
      
      // 设置错误状态
      setState({
        loading: false,
        error: error.message || '查询过程中发生未知错误',
        data: null,
        lastDomain: domain
      });
    }
  }, [updateStats]);
  
  // 重试函数
  const retryQuery = useCallback(() => {
    if (state.lastDomain) {
      queryDomain(state.lastDomain);
    }
  }, [state.lastDomain, queryDomain]);
  
  return {
    ...state,
    queryDomain,
    retryQuery
  };
}
