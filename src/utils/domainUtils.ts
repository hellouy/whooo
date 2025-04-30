
/**
 * 验证域名格式是否正确
 * @param domain 要验证的域名
 * @returns 是否是有效的域名格式
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * 清理域名格式（移除http://, https://, www.等前缀和路径）
 * @param domain 原始域名输入
 * @returns 清理后的域名
 */
export function cleanDomainName(domain: string): string {
  return domain.trim().toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/i, '')
    .replace(/\/.*$/, ''); // 移除域名后的路径
}

/**
 * 检查域名是否可能被保留
 * @param whoisData 原始WHOIS数据
 * @returns 布尔值表示域名是否被保留
 */
export function isDomainReserved(whoisData: string): boolean {
  return /(?:reserved|保留|禁止注册|cannot be registered|premium name)/i.test(whoisData);
}

/**
 * 检查域名是否未被注册
 * @param whoisData 原始WHOIS数据
 * @returns 布尔值表示域名是否未被注册
 */
export function isDomainAvailable(whoisData: string): boolean {
  return /(?:No match for|No entries found|Domain not found|NOT FOUND|AVAILABLE|No Data Found|Domain not registered)/i.test(whoisData);
}

/**
 * 尝试从错误信息中提取更多有用信息
 * @param errorMsg 错误信息
 * @returns 格式化后的错误信息
 */
export function extractErrorDetails(errorMsg: string): string {
  if (errorMsg.includes("Whoiser import failed")) {
    return "WHOIS查询失败，Node.js端whoiser库导入失败。这可能是环境配置问题。";
  }
  
  if (errorMsg.includes("timed out")) {
    return "WHOIS查询超时，服务器可能繁忙或限制了查询频率。请稍后再试。";
  }
  
  if (errorMsg.includes("ECONNREFUSED") || errorMsg.includes("Connection refused")) {
    return "连接WHOIS服务器被拒绝，服务器可能暂时不可用。";
  }
  
  return errorMsg;
}

/**
 * 获取当前运行环境是否是Vercel
 * @returns 是否是Vercel环境
 */
export function isVercelEnvironment(): boolean {
  return typeof process !== 'undefined' && process.env && 
    (process.env.VERCEL === '1' || process.env.NOW_DEPLOY === '1');
}

/**
 * 根据当前环境获取API基础URL
 * @returns API基础URL
 */
export function getApiBaseUrl(): string {
  // 如果在Vercel环境中，使用相对路径（让Vercel自动处理路由）
  if (isVercelEnvironment()) {
    return '/api';
  }
  
  // 本地开发环境
  if (typeof window !== 'undefined') {
    // 浏览器环境
    return window.location.origin + '/api';
  }
  
  // 默认：相对路径
  return '/api';
}
