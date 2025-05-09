
import { extractTLD } from '@/utils/apiUtils';
import axios from 'axios';
import { getWhoisServer } from './whoisServers';

/**
 * 通过WHOIS协议查询域名信息
 * @param domain 域名
 * @param server 可选的WHOIS服务器
 * @returns 域名WHOIS信息或null
 */
export async function whoisQuery(domain: string, server?: string): Promise<string | null> {
  try {
    // 如果没有指定服务器，使用TLD对应的默认服务器
    const whoisServer = server || getWhoisServer(domain);
    
    if (!whoisServer) {
      console.warn(`No WHOIS server found for domain: ${domain}`);
      return null;
    }
    
    console.log(`Querying WHOIS for ${domain} using server: ${whoisServer}`);
    
    // 使用API服务器代理WHOIS查询
    const response = await axios.post('/api/direct-whois', {
      domain,
      server: whoisServer,
      timeout: 15000,
      mode: 'whois'
    }, {
      timeout: 20000
    });
    
    if (response.data && response.data.success) {
      console.log(`WHOIS query successful for ${domain}`);
      return response.data.data.rawData;
    } else {
      console.error('WHOIS query failed:', response.data.error || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error(`WHOIS query failed for ${domain}:`, error);
    return null;
  }
}

/**
 * 解析WHOIS文本数据
 * @param whoisText WHOIS原始文本
 * @param domain 域名
 * @returns 解析后的WHOIS数据
 */
export function parseWhoisData(whoisText: string, domain: string) {
  try {
    const result = {
      domain: domain,
      whoisServer: null,
      registrar: null,
      registrationDate: null,
      expiryDate: null,
      nameServers: [],
      registrant: null,
      status: null,
      rawData: whoisText
    };
    
    if (!whoisText) return result;
    
    // 分割响应为行
    const lines = whoisText.split('\n');
    
    // 提取关键信息
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();
      
      // WHOIS服务器
      if (lowerLine.match(/whois server|referral url|registrar whois/i)) {
        const serverMatch = line.split(':').slice(1).join(':').trim();
        if (serverMatch) result.whoisServer = serverMatch;
      }
      
      // 注册商
      if (lowerLine.match(/registrar:|sponsoring registrar|registrar name|registrar organization/i)) {
        const registrarMatch = line.split(':').slice(1).join(':').trim();
        if (registrarMatch) result.registrar = registrarMatch;
      }
      
      // 创建日期
      if (lowerLine.match(/creation date|registered on|registration date|created on|created:|domain create date/i)) {
        const creationMatch = line.split(':').slice(1).join(':').trim();
        if (creationMatch) result.registrationDate = creationMatch;
      }
      
      // 到期日期
      if (lowerLine.match(/expiry date|expiration date|registry expiry|expires on|renewal date/i)) {
        const expiryMatch = line.split(':').slice(1).join(':').trim();
        if (expiryMatch) result.expiryDate = expiryMatch;
      }
      
      // 状态
      if (lowerLine.match(/domain status|status:|state:/i)) {
        const statusMatch = line.split(':').slice(1).join(':').trim();
        if (statusMatch) result.status = statusMatch;
      }
      
      // 名称服务器
      if (lowerLine.match(/name server|nserver|nameserver|dns|ns\d+:|dns\d+:/i)) {
        const nsMatch = line.split(':').slice(1).join(':').trim();
        if (nsMatch && nsMatch.includes('.') && !result.nameServers.includes(nsMatch)) {
          result.nameServers.push(nsMatch);
        }
      }
      
      // 注册人
      if (lowerLine.match(/registrant:|registrant organization:|registrant name:|registrant contact:|org:|organization:/i)) {
        const registrantMatch = line.split(':').slice(1).join(':').trim();
        if (registrantMatch) result.registrant = registrantMatch;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing WHOIS data:', error);
    return {
      domain: domain,
      whoisServer: null,
      registrar: null,
      registrationDate: null,
      expiryDate: null,
      nameServers: [],
      registrant: null,
      status: null,
      rawData: whoisText,
      error: error.message
    };
  }
}
