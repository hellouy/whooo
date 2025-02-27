
// WHOIS 服务器映射表
const WHOIS_SERVERS = {
  // 常见顶级域名
  'com': 'whois.verisign-grs.com',
  'net': 'whois.verisign-grs.com',
  'org': 'whois.pir.org',
  'info': 'whois.afilias.net',
  'biz': 'whois.biz',
  'io': 'whois.nic.io',
  'co': 'whois.nic.co',
  'ai': 'whois.nic.ai',
  'me': 'whois.nic.me',
  'app': 'whois.nic.google',
  'dev': 'whois.nic.google',
  
  // 国家顶级域名
  'cn': 'whois.cnnic.cn',
  'us': 'whois.nic.us',
  'uk': 'whois.nic.uk',
  'ru': 'whois.tcinet.ru',
  'jp': 'whois.jprs.jp',
  'de': 'whois.denic.de',
  'fr': 'whois.nic.fr',
  'au': 'whois.auda.org.au',
  'ca': 'whois.cira.ca',
  
  // 更多域名可以根据需要添加
};

// 默认 WHOIS 服务器，用于未知的顶级域名
const DEFAULT_WHOIS_SERVER = 'whois.iana.org';

// 从域名中提取顶级域名
function extractTLD(domain) {
  const parts = domain.split('.');
  return parts[parts.length - 1].toLowerCase();
}

// 获取域名对应的 WHOIS 服务器
function getWhoisServer(domain) {
  const tld = extractTLD(domain);
  return WHOIS_SERVERS[tld] || DEFAULT_WHOIS_SERVER;
}

// 解析 WHOIS 原始数据
function parseWhoisData(rawData) {
  const result = {
    rawData: rawData,
    registrar: extractValue(rawData, ['Registrar:', 'Sponsoring Registrar:']),
    creationDate: extractValue(rawData, ['Creation Date:', 'Created On:', 'Registration Date:']),
    expiryDate: extractValue(rawData, ['Registry Expiry Date:', 'Expiration Date:', 'Expiry Date:']),
    status: extractValue(rawData, ['Status:', 'Domain Status:']),
    nameServers: extractNameServers(rawData),
    whoisServer: extractValue(rawData, ['Registrar WHOIS Server:']),
    registrant: extractValue(rawData, ['Registrant:', 'Registrant Organization:', 'Registrant Name:'])
  };
  
  return result;
}

// 从 WHOIS 数据中提取特定字段的值
function extractValue(data, possibleKeys) {
  const lines = data.split('\n');
  for (const line of lines) {
    for (const key of possibleKeys) {
      if (line.includes(key)) {
        const value = line.split(key)[1].trim();
        return value;
      }
    }
  }
  return '未知';
}

// 提取名称服务器
function extractNameServers(data) {
  const lines = data.split('\n');
  const nameServers = [];
  
  for (const line of lines) {
    // 匹配常见的名称服务器表示方式
    if (line.includes('Name Server:') || line.includes('nameserver:') || 
        line.match(/ns[0-9]+\./i) || line.match(/dns[0-9]+\./i)) {
      
      const parts = line.split(':');
      if (parts.length > 1) {
        const server = parts[1].trim();
        if (server && server.includes('.') && !nameServers.includes(server)) {
          nameServers.push(server);
        }
      }
    }
  }
  
  return nameServers;
}

// 使用第三方 API 获取 WHOIS 信息
async function getWhoisInfo(domain) {
  try {
    // 确定 WHOIS 服务器
    const whoisServer = getWhoisServer(domain);
    
    // 使用 whoapi.com API 作为示例 (需要替换为您的 API 密钥)
    // 注意: 这是一个付费 API 服务，您需要注册获取 API 密钥
    // const apiKey = process.env.WHOAPI_KEY;
    // const response = await fetch(`https://api.whoapi.com/?domain=${domain}&r=whois&apikey=${apiKey}`);
    
    // 使用 whoisjsonapi.com API 作为示例 (需要替换为您的 API 密钥)
    const apiKey = process.env.WHOIS_API_KEY;
    const response = await fetch(`https://whoisjsonapi.com/v1/${domain}?apiKey=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 根据实际 API 响应格式调整这里的处理逻辑
    const whoisData = data.whois_record || {
      raw_text: data.rawText || "无法获取原始 WHOIS 数据",
      domain_name: domain,
      registrar: data.registrar || "未知",
      created_date: data.created_date || "未知",
      expiration_date: data.expiration_date || "未知",
      status: data.status || "未知",
      name_servers: data.name_servers || []
    };
    
    // 处理并返回结构化数据
    return {
      domain: domain,
      whoisServer: whoisServer,
      registrar: whoisData.registrar || "未知",
      creationDate: whoisData.created_date || "未知",
      expiryDate: whoisData.expiration_date || "未知",
      nameServers: whoisData.name_servers || [],
      status: whoisData.status || "未知",
      rawData: whoisData.raw_text || "无法获取原始 WHOIS 数据"
    };
  } catch (error) {
    console.error('WHOIS lookup error:', error);
    return { error: '无法获取域名信息，请稍后重试' };
  }
}

// Vercel API 路由处理函数
export default async function handler(req, res) {
  // 仅处理 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }
  
  // 获取请求中的域名
  const { domain } = req.body;
  
  if (!domain) {
    return res.status(400).json({ error: '请提供域名' });
  }
  
  try {
    // 获取 WHOIS 信息
    const whoisInfo = await getWhoisInfo(domain);
    
    // 返回结果
    res.status(200).json(whoisInfo);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}
