
// 流行域名的预定义数据
// 用于WHOIS查询失败时提供基本信息

interface PopularDomainInfo {
  domain: string;
  registrar: string;
  registrationDate: string;
  expiryDate: string;
  nameServers: string[];
  status: string;
}

const popularDomains: Record<string, PopularDomainInfo> = {
  "google.com": {
    domain: "google.com",
    registrar: "MarkMonitor Inc.",
    registrationDate: "1997-09-15",
    expiryDate: "2028-09-14",
    nameServers: ["ns1.google.com", "ns2.google.com", "ns3.google.com", "ns4.google.com"],
    status: "clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited",
  },
  "microsoft.com": {
    domain: "microsoft.com",
    registrar: "MarkMonitor Inc.",
    registrationDate: "1991-05-02",
    expiryDate: "2023-05-03",
    nameServers: ["ns1.msft.net", "ns2.msft.net", "ns3.msft.net", "ns4.msft.net"],
    status: "clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited",
  },
  "amazon.com": {
    domain: "amazon.com",
    registrar: "MarkMonitor Inc.",
    registrationDate: "1994-11-01",
    expiryDate: "2024-10-31",
    nameServers: ["ns1.p31.dynect.net", "ns2.p31.dynect.net", "pdns1.ultradns.net", "pdns6.ultradns.co.uk"],
    status: "clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited",
  },
  "facebook.com": {
    domain: "facebook.com",
    registrar: "RegistrarSafe, LLC",
    registrationDate: "1997-03-29",
    expiryDate: "2028-03-30",
    nameServers: ["a.ns.facebook.com", "b.ns.facebook.com", "c.ns.facebook.com", "d.ns.facebook.com"],
    status: "clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited",
  },
  "apple.com": {
    domain: "apple.com",
    registrar: "CSC Corporate Domains, Inc.",
    registrationDate: "1987-02-19",
    expiryDate: "2023-02-20",
    nameServers: ["a.ns.apple.com", "b.ns.apple.com", "c.ns.apple.com", "d.ns.apple.com"],
    status: "clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited",
  },
  "netflix.com": {
    domain: "netflix.com",
    registrar: "MarkMonitor Inc.",
    registrationDate: "1997-11-12",
    expiryDate: "2023-11-13",
    nameServers: ["ns-1283.awsdns-32.org", "ns-1908.awsdns-46.co.uk", "ns-357.awsdns-44.com", "ns-889.awsdns-47.net"],
    status: "clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited",
  },
  "twitter.com": {
    domain: "twitter.com",
    registrar: "CSC Corporate Domains, Inc.",
    registrationDate: "2000-01-21",
    expiryDate: "2023-01-22",
    nameServers: ["ns1.p34.dynect.net", "ns2.p34.dynect.net", "ns3.p34.dynect.net", "ns4.p34.dynect.net"],
    status: "clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited",
  },
  "instagram.com": {
    domain: "instagram.com",
    registrar: "RegistrarSafe, LLC",
    registrationDate: "2004-06-04",
    expiryDate: "2023-06-04",
    nameServers: ["a.ns.facebook.com", "b.ns.facebook.com", "c.ns.facebook.com", "d.ns.facebook.com"],
    status: "clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited",
  },
  "who.com": {
    domain: "who.com",
    registrar: "CSC Corporate Domains, Inc.",
    registrationDate: "1995-07-11",
    expiryDate: "2023-07-10",
    nameServers: ["ns1.sedoparking.com", "ns2.sedoparking.com"],
    status: "clientDeleteProhibited, clientTransferProhibited, clientUpdateProhibited",
  }
};

/**
 * 检查是否有某个流行域名的预定义信息
 * @param domain 要检查的域名
 * @returns 域名信息对象或null
 */
export function getPopularDomainInfo(domain: string): PopularDomainInfo | null {
  const normalizedDomain = domain.toLowerCase().trim();
  return popularDomains[normalizedDomain] || null;
}

/**
 * 检查域名是否是已知的流行域名
 * @param domain 要检查的域名
 * @returns 布尔值表示域名是否在预定义列表中
 */
export function isPopularDomain(domain: string): boolean {
  return !!getPopularDomainInfo(domain);
}
