
/**
 * 获取流行域名的预先存储的信息
 * 作为API查询失败时的回退选项
 * @param domain 域名
 * @returns 域名信息对象或null
 */
export async function getPopularDomainInfo(domain: string): Promise<any | null> {
  // 简化的实现，仅包含少量流行域名的信息
  const popularDomains: Record<string, any> = {
    'google.com': {
      registrar: 'MarkMonitor Inc.',
      created: '1997-09-15',
      expires: '2028-09-14',
      nameServers: ['ns1.google.com', 'ns2.google.com', 'ns3.google.com', 'ns4.google.com']
    },
    'baidu.com': {
      registrar: 'MarkMonitor Inc.',
      created: '1999-10-11',
      expires: '2026-10-11',
      nameServers: ['ns1.baidu.com', 'ns2.baidu.com', 'ns3.baidu.com', 'ns4.baidu.com']
    },
    'amazon.com': {
      registrar: 'MarkMonitor Inc.',
      created: '1994-11-01',
      expires: '2024-10-31',
      nameServers: ['ns1.p31.dynect.net', 'ns2.p31.dynect.net', 'pdns1.ultradns.net', 'pdns6.ultradns.co.uk']
    },
    'facebook.com': {
      registrar: 'RegistrarSafe, LLC',
      created: '1997-03-29',
      expires: '2030-03-30',
      nameServers: ['a.ns.facebook.com', 'b.ns.facebook.com', 'c.ns.facebook.com', 'd.ns.facebook.com']
    },
    'microsoft.com': {
      registrar: 'MarkMonitor Inc.',
      created: '1991-05-02',
      expires: '2023-05-03',
      nameServers: ['ns1.msft.net', 'ns2.msft.net', 'ns3.msft.net', 'ns4.msft.net']
    },
    'apple.com': {
      registrar: 'MarkMonitor Inc.',
      created: '1987-02-19',
      expires: '2023-02-20',
      nameServers: ['a.ns.apple.com', 'b.ns.apple.com', 'c.ns.apple.com', 'd.ns.apple.com']
    }
  };
  
  // 检查域名是否在预定义列表中
  return Promise.resolve(popularDomains[domain] || null);
}
