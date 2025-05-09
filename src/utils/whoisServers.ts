
import { extractTLD } from '@/utils/apiUtils';

// WHOIS服务器列表（本地备用）
export const COMMON_WHOIS_SERVERS = [
  { tld: "com", server: "whois.verisign-grs.com" },
  { tld: "net", server: "whois.verisign-grs.com" },
  { tld: "org", server: "whois.pir.org" },
  { tld: "io", server: "whois.nic.io" },
  { tld: "co", server: "whois.nic.co" },
  { tld: "ai", server: "whois.nic.ai" },
  { tld: "app", server: "whois.nic.google" },
  { tld: "dev", server: "whois.nic.google" },
  { tld: "cn", server: "whois.cnnic.cn" },
  { tld: "me", server: "whois.nic.me" },
  { tld: "xyz", server: "whois.nic.xyz" },
  { tld: "info", server: "whois.afilias.net" },
  { tld: "top", server: "whois.nic.top" },
  { tld: "uk", server: "whois.nic.uk" },
  { tld: "co.uk", server: "whois.nic.uk" },
  { tld: "jp", server: "whois.jprs.jp" },
  { tld: "ru", server: "whois.tcinet.ru" },
  { tld: "ca", server: "whois.cira.ca" },
  { tld: "de", server: "whois.denic.de" },
  { tld: "fr", server: "whois.nic.fr" },
  { tld: "au", server: "whois.auda.org.au" },
  { tld: "in", server: "whois.registry.in" },
  { tld: "eu", server: "whois.eu" }
];

// WHOIS服务器缓存
let whoisServerCache: Record<string, string> | null = null;

/**
 * 获取指定TLD的WHOIS服务器
 * @param domain 域名
 * @returns WHOIS服务器地址或null
 */
export function getWhoisServer(domain: string): string | null {
  const tld = extractTLD(domain);
  if (!tld) return null;
  
  // 优先使用远程加载的服务器列表
  if (whoisServerCache && whoisServerCache[tld]) {
    return whoisServerCache[tld];
  }
  
  // 回退到本地列表
  const match = COMMON_WHOIS_SERVERS.find(entry => entry.tld === tld);
  return match ? match.server : null;
}

/**
 * 加载WHOIS服务器列表
 * @returns WHOIS服务器映射表
 */
export async function loadWhoisServers(): Promise<Record<string, string>> {
  try {
    // 尝试从public/data目录获取
    const response = await fetch('/data/whois-servers.json');
    
    if (response.ok) {
      const data = await response.json();
      console.log("已加载WHOIS服务器列表", Object.keys(data).length);
      whoisServerCache = data;
      return data;
    } else {
      console.log("无法从/data加载WHOIS服务器列表，尝试从/api目录加载");
      
      // 尝试从API目录获取
      const apiResponse = await fetch('/api/whois-servers.json');
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log("已从API目录加载WHOIS服务器列表", Object.keys(apiData).length);
        whoisServerCache = apiData;
        return apiData;
      }
      
      console.warn("无法从服务器加载WHOIS服务器列表，使用内置列表");
    }
  } catch (error) {
    console.error("加载WHOIS服务器列表失败", error);
  }
  
  // 使用内置列表作为后备
  const fallbackServers: Record<string, string> = {};
  COMMON_WHOIS_SERVERS.forEach(entry => {
    fallbackServers[entry.tld] = entry.server;
  });
  
  whoisServerCache = fallbackServers;
  return fallbackServers;
}
