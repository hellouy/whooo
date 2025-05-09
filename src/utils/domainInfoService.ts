
import { rdapQuery, processRDAPData } from './rdapService';
import { whoisQuery, parseWhoisData } from './whoisService';
import { formatDomain } from './domainUtils';

/**
 * 域名信息查询结果接口
 */
export interface DomainInfo {
  domain: string;
  protocol: 'rdap' | 'whois' | 'both' | 'none';
  registrar: string;
  registrationDate: string;
  expiryDate: string;
  nameServers: string[];
  registrant: string;
  status: string;
  rdapData: any | null;
  whoisData: string | null;
  error?: string;
}

/**
 * 综合查询域名信息，整合RDAP和WHOIS结果
 * @param domain 域名
 * @returns 域名综合信息
 */
export async function queryDomainInfo(domain: string): Promise<DomainInfo> {
  // 格式化域名（移除协议前缀等）
  const cleanDomain = formatDomain(domain);
  
  if (!cleanDomain) {
    return createErrorResponse(domain, '无效的域名格式');
  }
  
  console.log(`Starting comprehensive query for domain: ${cleanDomain}`);
  
  // 1. 尝试RDAP查询
  console.log('Attempting RDAP query...');
  const rdapData = await rdapQuery(cleanDomain);
  let rdapResult = null;
  
  if (rdapData) {
    rdapResult = processRDAPData(rdapData, cleanDomain);
    console.log('RDAP query successful');
  } else {
    console.log('RDAP query failed or returned no data');
  }
  
  // 2. 尝试WHOIS查询
  console.log('Attempting WHOIS query...');
  const whoisText = await whoisQuery(cleanDomain);
  let whoisResult = null;
  
  if (whoisText) {
    whoisResult = parseWhoisData(whoisText, cleanDomain);
    console.log('WHOIS query successful');
  } else {
    console.log('WHOIS query failed or returned no data');
  }
  
  // 3. 整合结果
  if (rdapResult && whoisResult) {
    // 同时获取到RDAP和WHOIS信息
    return {
      domain: cleanDomain,
      protocol: 'both',
      registrar: rdapResult.registrar || whoisResult.registrar || '未知',
      registrationDate: rdapResult.registrationDate || whoisResult.registrationDate || '未知',
      expiryDate: rdapResult.expiryDate || whoisResult.expiryDate || '未知',
      nameServers: rdapResult.nameServers.length > 0 ? rdapResult.nameServers : (whoisResult.nameServers || []),
      registrant: rdapResult.registrant || whoisResult.registrant || '未知',
      status: rdapResult.status || whoisResult.status || '未知',
      rdapData: rdapData,
      whoisData: whoisText,
    };
  } else if (rdapResult) {
    // 只获取到RDAP信息
    return {
      domain: cleanDomain,
      protocol: 'rdap',
      registrar: rdapResult.registrar || '未知',
      registrationDate: rdapResult.registrationDate || '未知',
      expiryDate: rdapResult.expiryDate || '未知',
      nameServers: rdapResult.nameServers || [],
      registrant: rdapResult.registrant || '未知',
      status: rdapResult.status || '未知',
      rdapData: rdapData,
      whoisData: null,
    };
  } else if (whoisResult) {
    // 只获取到WHOIS信息
    return {
      domain: cleanDomain,
      protocol: 'whois',
      registrar: whoisResult.registrar || '未知',
      registrationDate: whoisResult.registrationDate || '未知',
      expiryDate: whoisResult.expiryDate || '未知',
      nameServers: whoisResult.nameServers || [],
      registrant: whoisResult.registrant || '未知',
      status: whoisResult.status || '未知',
      rdapData: null,
      whoisData: whoisText,
    };
  }
  
  // 两种方式都未获取到信息
  return createErrorResponse(cleanDomain, 'RDAP和WHOIS查询均未返回有效数据');
}

/**
 * 创建错误响应对象
 * @param domain 域名
 * @param errorMessage 错误信息
 * @returns 错误响应
 */
function createErrorResponse(domain: string, errorMessage: string): DomainInfo {
  return {
    domain: domain,
    protocol: 'none',
    registrar: '未知',
    registrationDate: '未知',
    expiryDate: '未知',
    nameServers: [],
    registrant: '未知',
    status: '未知',
    rdapData: null,
    whoisData: null,
    error: errorMessage
  };
}
