
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
