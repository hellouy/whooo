
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
  { tld: "dev", server: "whois.nic.google" }
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
    const response = await fetch('/data/whois-servers.json');
    if (response.ok) {
      const data = await response.json();
      console.log("已加载WHOIS服务器列表", Object.keys(data).length);
      return data;
    }
    return {};
  } catch (error) {
    console.error("加载WHOIS服务器列表失败", error);
    return {};
  }
}
