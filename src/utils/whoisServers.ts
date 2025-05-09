
import { extractTLD } from '@/utils/apiUtils';

// 本地WHOIS服务器列表（fallback用，API不可用时）
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
  { tld: "top", server: "whois.nic.top" }
];

// 从本地列表获取WHOIS服务器
export function getLocalWhoisServer(domain: string): string | null {
  const tld = extractTLD(domain);
  if (!tld) return null;
  
  const match = COMMON_WHOIS_SERVERS.find(entry => entry.tld === tld);
  return match ? match.server : null;
}

// 加载WHOIS服务器列表
export async function loadWhoisServers(): Promise<Record<string, string>> {
  try {
    // 尝试直接从public/data目录获取
    const response = await fetch('/data/whois-servers.json');
    
    if (response.ok) {
      const data = await response.json();
      console.log("已加载WHOIS服务器列表", Object.keys(data).length);
      return data;
    } else {
      console.log("无法从/data加载WHOIS服务器列表，尝试从/api目录加载");
      
      // 尝试从API目录获取
      const apiResponse = await fetch('/api/whois-servers.json');
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log("已从API目录加载WHOIS服务器列表", Object.keys(apiData).length);
        return apiData;
      }
      
      console.warn("无法从服务器加载WHOIS服务器列表，使用内置列表");
      
      // 如果远程加载失败，使用内置列表
      const fallbackServers: Record<string, string> = {};
      COMMON_WHOIS_SERVERS.forEach(entry => {
        fallbackServers[entry.tld] = entry.server;
      });
      
      return fallbackServers;
    }
  } catch (error) {
    console.error("加载WHOIS服务器列表失败", error);
    
    // 使用内置列表作为后备
    const fallbackServers: Record<string, string> = {};
    COMMON_WHOIS_SERVERS.forEach(entry => {
      fallbackServers[entry.tld] = entry.server;
    });
    
    return fallbackServers;
  }
}

// 获取更多WHOIS服务器信息
export function getTldWhoisServers(): Record<string, string> {
  // 扩展的WHOIS服务器列表
  return {
    "com": "whois.verisign-grs.com",
    "net": "whois.verisign-grs.com",
    "org": "whois.pir.org",
    "io": "whois.nic.io",
    "co": "whois.nic.co",
    "ai": "whois.nic.ai",
    "app": "whois.nic.google",
    "dev": "whois.nic.google",
    "cn": "whois.cnnic.cn",
    "jp": "whois.jprs.jp",
    "uk": "whois.nic.uk",
    "ru": "whois.tcinet.ru",
    "de": "whois.denic.de",
    "fr": "whois.nic.fr",
    "nl": "whois.domain-registry.nl",
    "eu": "whois.eu",
    "it": "whois.nic.it",
    "tv": "tvwhois.verisign-grs.com",
    "cc": "ccwhois.verisign-grs.com",
    "biz": "whois.verisign-grs.com",
    "info": "whois.afilias.net",
    "me": "whois.nic.me",
    "top": "whois.nic.top",
    "xyz": "whois.nic.xyz",
    "co.uk": "whois.nic.uk",
    "org.uk": "whois.nic.uk"
  };
}
