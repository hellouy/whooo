
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
