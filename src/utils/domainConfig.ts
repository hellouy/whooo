
// TLD definitions for local use when API is not available
export interface TldInfo {
  whoisServer: string;
  hasRdap: boolean;
}

// Domain TLD configuration - determines which protocol to use
export const tldConfig: Record<string, TldInfo> = {
  // gTLDs with RDAP support
  "com": { whoisServer: "whois.verisign-grs.com", hasRdap: true },
  "net": { whoisServer: "whois.verisign-grs.com", hasRdap: true },
  "org": { whoisServer: "whois.pir.org", hasRdap: true },
  "xyz": { whoisServer: "whois.nic.xyz", hasRdap: true },
  "info": { whoisServer: "whois.afilias.net", hasRdap: true },
  "io": { whoisServer: "whois.nic.io", hasRdap: true },
  "app": { whoisServer: "whois.nic.google", hasRdap: true },
  "dev": { whoisServer: "whois.nic.google", hasRdap: true },
  
  // ccTLDs with limited or no RDAP support
  "cn": { whoisServer: "whois.cnnic.cn", hasRdap: false },
  "uk": { whoisServer: "whois.nic.uk", hasRdap: false },
  "ru": { whoisServer: "whois.tcinet.ru", hasRdap: false },
  "jp": { whoisServer: "whois.jprs.jp", hasRdap: false },
  "de": { whoisServer: "whois.denic.de", hasRdap: false },
  "fr": { whoisServer: "whois.nic.fr", hasRdap: false },
  
  // Compound TLDs
  "co.uk": { whoisServer: "whois.nic.uk", hasRdap: false },
  "com.cn": { whoisServer: "whois.cnnic.cn", hasRdap: false },
  "net.cn": { whoisServer: "whois.cnnic.cn", hasRdap: false },
  "org.cn": { whoisServer: "whois.cnnic.cn", hasRdap: false },
};

// Function to get TLD info with fallbacks
export function getTldInfo(domain: string): TldInfo | null {
  // Remove protocol and www prefix
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  
  // Split domain parts
  const parts = domain.split('.');
  
  if (parts.length < 2) return null;
  
  // Try compound TLD first (e.g., co.uk)
  if (parts.length >= 3) {
    const compoundTld = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (tldConfig[compoundTld]) {
      return tldConfig[compoundTld];
    }
  }
  
  // Try simple TLD
  const tld = parts[parts.length - 1];
  return tldConfig[tld] || null;
}
