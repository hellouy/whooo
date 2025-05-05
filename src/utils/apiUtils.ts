
/**
 * 获取API基础URL，确保在开发和生产环境中都能正确处理API请求
 * @returns API基础URL
 */
export function getApiUrl(): string {
  // 使用当前窗口的origin作为基础URL
  const baseUrl = window.location.origin;
  
  // 在开发环境中，可能需要使用特定端口或URL
  if (process.env.NODE_ENV === 'development') {
    // 如果有特殊的开发环境API URL，可以在这里返回
    // return 'http://localhost:3000';
  }
  
  return baseUrl;
}

/**
 * 构建完整API URL
 * @param endpoint API端点路径，例如 '/api/whois'
 * @returns 完整的API URL
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiUrl();
  
  // 确保endpoint以/开头
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${baseUrl}${normalizedEndpoint}`;
}
