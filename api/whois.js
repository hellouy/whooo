
// WHOIS 服务器查询 API
const net = require('net');
const whoisServers = require('./whois-servers.json');

// 提取顶级域名函数
function extractTLD(domain) {
  // 移除可能的协议部分 (http://, https://)
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  
  // 分割域名部分
  const parts = domain.split('.');
  
  // 处理特殊的复合顶级域名
  if (parts.length >= 3) {
    const lastTwo = parts[parts.length - 2] + '.' + parts[parts.length - 1];
    // 检查是否是复合TLD (如 .co.uk, .com.cn 等)
    if (whoisServers[lastTwo]) {
      return lastTwo;
    }
  }
  
  // 返回标准顶级域名
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

// 解析WHOIS数据
function parseWhoisData(data, domain) {
  try {
    const result = {
      domain: domain,
      whoisServer: null,
      registrar: null,
      creationDate: null,
      expiryDate: null,
      nameServers: [],
      registrant: null,
      status: null,
      rawData: data
    };
    
    // 将响应拆分为行
    const lines = data.split('\n');
    
    // 提取关键信息
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // WHOIS 服务器
      if (lowerLine.includes('whois server:') || lowerLine.includes('referral url:')) {
        result.whoisServer = line.split(':')[1]?.trim() || null;
      }
      
      // 注册商
      if (lowerLine.includes('registrar:')) {
        result.registrar = line.split(':')[1]?.trim() || null;
      }
      
      // 创建日期
      if (lowerLine.includes('creation date:') || 
          lowerLine.includes('registered on:') || 
          lowerLine.includes('registration date:') ||
          lowerLine.includes('created:')) {
        result.creationDate = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // 到期日期
      if (lowerLine.includes('expiry date:') || 
          lowerLine.includes('expiration date:') || 
          lowerLine.includes('registry expiry date:') ||
          lowerLine.includes('expires:')) {
        result.expiryDate = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // 域名状态
      if (lowerLine.includes('domain status:') || lowerLine.includes('status:')) {
        result.status = line.split(':')[1]?.trim() || null;
      }
      
      // 注册人
      if (lowerLine.includes('registrant:') || 
          lowerLine.includes('registrant organization:') || 
          lowerLine.includes('registrant name:') ||
          lowerLine.includes('org:')) {
        result.registrant = line.split(':')[1]?.trim() || null;
      }
      
      // 名称服务器
      if (lowerLine.includes('name server:') || 
          lowerLine.includes('nserver:') || 
          lowerLine.includes('nameserver:')) {
        const ns = line.split(':')[1]?.trim();
        if (ns && !result.nameServers.includes(ns)) {
          result.nameServers.push(ns);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('解析WHOIS数据时出错:', error);
    return {
      domain: domain,
      error: '解析WHOIS数据时出错',
      rawData: data
    };
  }
}

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许POST请求' });
  }
  
  try {
    const { domain, server } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: '未提供域名' });
    }
    
    // 清理域名
    const cleanDomain = domain.trim().toLowerCase();
    
    // 确定使用哪个WHOIS服务器
    let whoisServer;
    if (server) {
      whoisServer = server;
    } else {
      const tld = extractTLD(cleanDomain);
      if (!tld || !whoisServers[tld]) {
        return res.status(400).json({ 
          error: `未找到顶级域名 "${tld}" 的WHOIS服务器` 
        });
      }
      whoisServer = whoisServers[tld];
    }
    
    // 设置超时时间 (30秒)
    const TIMEOUT = 30000;
    let responseData = '';
    let responseReceived = false;
    
    console.log(`查询域名: ${cleanDomain}, WHOIS服务器: ${whoisServer}`);
    
    // 创建TCP连接
    const client = new net.Socket();
    
    // 设置响应超时
    const timeout = setTimeout(() => {
      if (!responseReceived) {
        client.destroy();
        console.error(`查询超时: ${whoisServer}`);
        res.status(408).json({ error: '查询超时，WHOIS服务器无响应' });
      }
    }, TIMEOUT);
    
    // 处理连接事件
    client.connect(43, whoisServer, () => {
      console.log(`已连接到WHOIS服务器: ${whoisServer}`);
      client.write(cleanDomain + '\r\n');
    });
    
    // 处理数据接收
    client.on('data', (data) => {
      responseData += data.toString();
    });
    
    // 处理连接结束
    client.on('end', () => {
      responseReceived = true;
      clearTimeout(timeout);
      
      console.log(`接收到来自 ${whoisServer} 的响应`);
      
      // 解析WHOIS数据并返回结果
      const parsedData = parseWhoisData(responseData, cleanDomain);
      
      // 如果我们收到了引用到另一个WHOIS服务器的响应，且没有指定强制服务器
      if (parsedData.whoisServer && !server && responseData.length < 500) {
        // 返回第一个服务器的响应，但告知前端可以使用更具体的服务器
        res.status(200).json({
          ...parsedData,
          suggestedServer: parsedData.whoisServer,
          message: '收到初步响应，可使用更具体的WHOIS服务器获取详细信息'
        });
      } else {
        res.status(200).json(parsedData);
      }
    });
    
    // 处理错误
    client.on('error', (error) => {
      responseReceived = true;
      clearTimeout(timeout);
      console.error(`连接WHOIS服务器时出错: ${error.message}`);
      res.status(500).json({ 
        error: `连接WHOIS服务器时出错: ${error.message}`,
        domain: cleanDomain,
        server: whoisServer
      });
    });
    
  } catch (error) {
    console.error('处理WHOIS请求时出错:', error);
    res.status(500).json({ error: `服务器内部错误: ${error.message}` });
  }
};
