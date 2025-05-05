
/**
 * 获取API基础URL，适应不同环境
 */
export function getApiBaseUrl(): string {
  // 检查当前环境
  if (import.meta.env.PROD) {
    // 生产环境 - 使用相对路径
    return '/api';
  } else {
    // 开发环境 - 使用完整URL
    return '/api';
  }
}

/**
 * 格式化域名（移除协议、www前缀等）
 */
export function formatDomain(input: string): string {
  if (!input) return '';
  
  let domain = input.trim().toLowerCase();
  
  // 移除协议
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  
  // 移除路径和查询参数
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  
  return domain;
}

/**
 * 获取顶级域名
 */
export function getTLD(domain: string): string | null {
  if (!domain) return null;
  
  const parts = domain.split('.');
  if (parts.length < 2) return null;
  
  // 处理复合TLD如.co.uk, .com.cn
  const potentialCompoundTlds = [
    '.co.uk', '.co.jp', '.co.nz', '.co.za', '.co.kr', 
    '.com.au', '.com.br', '.com.cn', '.com.hk', '.com.tr',
    '.com.sg', '.com.tw', '.com.mx', '.org.uk', '.net.cn'
  ];
  
  for (const compoundTld of potentialCompoundTlds) {
    if (domain.endsWith(compoundTld)) {
      return compoundTld.substring(1); // 移除开头的点
    }
  }
  
  return parts[parts.length - 1];
}

/**
 * 检查是否是有效的域名格式
 */
export function isValidDomain(domain: string): boolean {
  if (!domain) return false;
  
  // 移除协议和www
  const formattedDomain = formatDomain(domain);
  
  // 简单域名验证规则
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(formattedDomain);
}

/**
 * 从错误信息中提取关键详细信息
 */
export function extractErrorDetails(errorMessage: string): string {
  if (!errorMessage) return "未知错误";
  
  // 移除常见的错误前缀
  let cleanedMessage = errorMessage
    .replace(/^Error: /i, '')
    .replace(/^AxiosError: /i, '');
  
  // 检查常见错误模式
  if (cleanedMessage.includes('timeout')) {
    return "查询超时，服务器响应时间过长";
  }
  
  if (cleanedMessage.includes('network') || cleanedMessage.includes('ECONNREFUSED')) {
    return "网络连接错误，无法连接到WHOIS服务器";
  }
  
  if (cleanedMessage.includes('404')) {
    return "找不到请求的资源 (404错误)";
  }
  
  if (cleanedMessage.includes('500')) {
    return "服务器内部错误 (500错误)";
  }
  
  if (cleanedMessage.includes('429')) {
    return "请求过于频繁，已被服务器限制 (429错误)";
  }
  
  if (cleanedMessage.length > 100) {
    return cleanedMessage.substring(0, 100) + "...";
  }
  
  return cleanedMessage;
}

/**
 * 检查WHOIS信息是否表明域名可注册
 */
export function isDomainAvailable(rawData: string): boolean {
  if (!rawData) return false;
  
  // 常见表示域名可用的文本
  const availablePatterns = [
    /no match for/i,
    /not found/i,
    /no data found/i,
    /domain not found/i,
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
  
  return availablePatterns.some(pattern => pattern.test(rawData));
}

/**
 * 检查域名是否被保留
 */
export function isDomainReserved(rawData: string): boolean {
  if (!rawData) return false;
  
  // 常见表示域名被保留的文本
  const reservedPatterns = [
    /reserved/i,
    /premium domain/i,
    /domain reserved/i,
    /reserved domain/i,
    /保留域名/i,
    /禁止注册/i,
    /cannot be registered/i,
    /not available for registration/i,
    /restricted domain/i,
    /registry reserved/i,
    /domain blocked/i
  ];
  
  return reservedPatterns.some(pattern => pattern.test(rawData));
}
