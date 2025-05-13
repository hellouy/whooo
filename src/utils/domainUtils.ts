
/**
 * 格式化域名 - 移除协议前缀、路径等
 * @param domain 原始域名输入
 * @returns 格式化后的域名
 */
export function formatDomain(domain: string): string {
  if (!domain) return '';
  
  let cleanedDomain = domain.trim().toLowerCase();
  
  // 移除前后空格
  cleanedDomain = cleanedDomain.trim();
  
  // 移除协议前缀 (http://, https://, ftp://)
  cleanedDomain = cleanedDomain.replace(/^(https?:\/\/|ftp:\/\/)/i, '');
  
  // 移除www前缀
  cleanedDomain = cleanedDomain.replace(/^www\./i, '');
  
  // 移除URL路径、查询参数等
  cleanedDomain = cleanedDomain.split('/')[0];
  cleanedDomain = cleanedDomain.split('?')[0];
  cleanedDomain = cleanedDomain.split('#')[0];
  
  // 移除最后可能的点
  cleanedDomain = cleanedDomain.replace(/\.$/, '');
  
  return cleanedDomain;
}

/**
 * 提取域名的顶级域 (TLD)
 * @param domain 域名
 * @returns 顶级域或null
 */
export function extractTLD(domain: string): string | null {
  if (!domain) return null;
  
  // 格式化域名
  const cleanDomain = formatDomain(domain);
  if (!cleanDomain) return null;
  
  // 拆分域名
  const parts = cleanDomain.split('.');
  if (parts.length < 2) return null;
  
  // 获取最后一部分作为TLD
  return parts[parts.length - 1];
}

/**
 * 获取WHOIS服务器地址
 * @param domain 域名
 * @returns WHOIS服务器或null
 */
export function getWhoisServer(domain: string): string | null {
  // 这是一个简化版实现，实际应用中应从whoisServers.ts中获取
  const commonServers: Record<string, string> = {
    'com': 'whois.verisign-grs.com',
    'net': 'whois.verisign-grs.com',
    'org': 'whois.pir.org',
    'io': 'whois.nic.io',
    'ai': 'whois.nic.ai',
    'cn': 'whois.cnnic.cn',
    'jp': 'whois.jprs.jp'
  };
  
  const tld = extractTLD(domain);
  if (!tld) return null;
  
  return commonServers[tld] || null;
}

/**
 * 获取API基础URL
 * 根据当前环境返回适合的API URL
 */
export function getApiBaseUrl(): string {
  // 在生产环境检测当前URL
  const currentUrl = window.location.origin;
  
  // 返回相对路径，让浏览器自动处理域名
  return '';
}

/**
 * 验证域名格式是否有效
 * @param domain 域名
 * @returns 是否有效
 */
export function isValidDomain(domain: string): boolean {
  if (!domain) return false;
  
  const cleanDomain = formatDomain(domain);
  if (!cleanDomain) return false;
  
  // 简单域名验证正则
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(cleanDomain);
}

/**
 * 判断域名是否可注册
 * 根据WHOIS响应内容判断域名是否可注册
 * @param whoisData WHOIS原始数据
 * @returns boolean|null 可注册返回true，已注册返回false，无法确定返回null
 */
export function isDomainAvailable(whoisData: unknown): boolean | null {
  if (!whoisData || typeof whoisData !== 'string') return null;
  
  const availablePatterns = [
    /no match for/i,
    /not found/i,
    /no entries found/i,
    /domain not found/i,
    /no data found/i,
    /domain available/i,
    /available for registration/i,
    /not registered/i,
    /status:\s*available/i,
    /status:\s*free/i,
    /no information found/i,
    /domain is free/i,
    /domain not registered/i,
    /^no match/i,
    /^not found/i,
    /^no data/i,
    /domain is available/i,
    /查询不到该域名信息/i
  ];
  
  for (const pattern of availablePatterns) {
    if (pattern.test(whoisData)) {
      return true;
    }
  }
  
  // 如果没有匹配到任何可注册的模式，则假设可能已注册
  return false;
}

/**
 * 判断域名是否为保留域名
 * @param whoisData WHOIS原始数据
 * @returns 是否为保留域名
 */
export function isDomainReserved(whoisData: unknown): boolean {
  if (!whoisData || typeof whoisData !== 'string') return false;
  
  const reservedPatterns = [
    /reserved/i,
    /premium/i,
    /protected/i,
    /registry reserved/i,
    /reserved by registry/i,
    /registry hold/i,
    /reserved name/i
  ];
  
  for (const pattern of reservedPatterns) {
    if (pattern.test(whoisData)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 从错误对象中提取错误详情
 * @param error 错误对象或消息
 * @returns 格式化后的错误消息
 */
export function extractErrorDetails(error: unknown): string {
  if (!error) return '未知错误';
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch (e) {
      return '无法解析的错误对象';
    }
  }
  
  return String(error);
}
