
/**
 * WHOIS数据接口定义
 */
export interface WhoisData {
  domain: string;
  whoisServer: string;
  registrar: string;
  registrationDate: string;
  expiryDate: string;
  nameServers: string[];
  registrant: string;
  status: string | unknown;
  protocol: 'rdap' | 'whois' | 'error' | 'static';
  rawData: string | unknown;
  message?: string;
}
