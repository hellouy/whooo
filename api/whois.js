
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
      const lowerLine = line.toLowerCase().trim();
      
      // WHOIS 服务器 - 扩展匹配模式
      if (lowerLine.includes('whois server:') || 
          lowerLine.includes('referral url:') || 
          lowerLine.includes('whois:') || 
          lowerLine.includes('registrar whois server:')) {
        result.whoisServer = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // 注册商 - 扩展匹配模式
      if (lowerLine.includes('registrar:') || 
          lowerLine.includes('sponsoring registrar:') ||
          lowerLine.includes('registrar name:')) {
        result.registrar = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // 创建日期 - 扩展匹配模式
      if (lowerLine.includes('creation date:') || 
          lowerLine.includes('registered on:') || 
          lowerLine.includes('registration date:') ||
          lowerLine.includes('created on:') ||
          lowerLine.includes('domain create date:') ||
          lowerLine.includes('domain registration date:') ||
          lowerLine.includes('created:') ||
          lowerLine.match(/^created:/)) {
        result.creationDate = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // 到期日期 - 扩展匹配模式
      if (lowerLine.includes('expiry date:') || 
          lowerLine.includes('expiration date:') || 
          lowerLine.includes('registry expiry date:') ||
          lowerLine.includes('registrar registration expiration date:') ||
          lowerLine.includes('domain expiration date:') ||
          lowerLine.includes('expires on:') ||
          lowerLine.includes('expires:') ||
          lowerLine.match(/^renewal date:/)) {
        result.expiryDate = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // 域名状态 - 扩展匹配模式
      if (lowerLine.includes('domain status:') || 
          lowerLine.includes('status:') ||
          lowerLine.match(/^state:/)) {
        const status = line.split(':').slice(1).join(':').trim();
        if (status && !result.status) {
          result.status = status;
        }
      }
      
      // 注册人 - 扩展匹配模式
      if (lowerLine.includes('registrant:') || 
          lowerLine.includes('registrant organization:') || 
          lowerLine.includes('registrant name:') ||
          lowerLine.includes('registrant contact:') ||
          lowerLine.includes('org:') ||
          lowerLine.includes('organization:') ||
          lowerLine.match(/^owner:/)) {
        result.registrant = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // 名称服务器 - 扩展匹配模式
      if (lowerLine.includes('name server:') || 
          lowerLine.includes('nserver:') || 
          lowerLine.includes('nameserver:') ||
          lowerLine.includes('nameservers:') ||
          lowerLine.includes('dns:') ||
          lowerLine.match(/^ns\d+:/) ||
          lowerLine.match(/^dns\d+:/)) {
        const ns = line.split(':').slice(1).join(':').trim();
        if (ns && ns.includes('.') && !result.nameServers.includes(ns)) {
          // 过滤掉不像域名的值
          result.nameServers.push(ns);
        }
      }
    }

    // 二次尝试：如果找不到注册商，尝试寻找类似 "Registrar:" 的行
    if (!result.registrar) {
      for (const line of lines) {
        if (line.includes('Registrar:') || line.includes('registrar:')) {
          const nextLineIndex = lines.indexOf(line) + 1;
          if (nextLineIndex < lines.length) {
            result.registrar = lines[nextLineIndex].trim();
          }
        }
      }
    }

    // 如果还是未找到信息，尝试正则表达式匹配更复杂的格式
    if (!result.creationDate) {
      const creationRegex = /(?:Creation|Created|Registration|Registered).*?(\d{1,4}[.-/]\d{1,2}[.-/]\d{1,4})/i;
      for (const line of lines) {
        const match = line.match(creationRegex);
        if (match && match[1]) {
          result.creationDate = match[1].trim();
          break;
        }
      }
    }

    if (!result.expiryDate) {
      const expiryRegex = /(?:Expiry|Expiration|Expires).*?(\d{1,4}[.-/]\d{1,2}[.-/]\d{1,4})/i;
      for (const line of lines) {
        const match = line.match(expiryRegex);
        if (match && match[1]) {
          result.expiryDate = match[1].trim();
          break;
        }
      }
    }
    
    // 检查是否有有效数据
    const hasValidData = result.registrar || result.creationDate || result.expiryDate || result.nameServers.length > 0;
    
    if (!hasValidData && data.length > 100) {
      // 如果没有找到标准字段但有原始数据，可能是非标准格式
      console.log('未找到标准WHOIS字段，尝试非标准格式解析');
      
      // 查找日期格式 (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY等)
      const dateRegex = /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g;
      const dates = data.match(dateRegex) || [];
      
      if (dates.length >= 2) {
        // 假设第一个日期是创建日期，第二个是到期日期（这是一个猜测）
        result.creationDate = dates[0];
        result.expiryDate = dates[1];
      }
      
      // 查找可能的域名服务器 (ns1.example.com, ns2.example.com等)
      const nsRegex = /\b(?:ns|dns)\d*\.[\w-]+\.[a-z]{2,}\b/gi;
      const nameservers = data.match(nsRegex) || [];
      if (nameservers.length > 0) {
        result.nameServers = [...new Set(nameservers)]; // 去重
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
      
      // 如果响应为空或过短，可能是服务器问题
      if (!responseData || responseData.length < 10) {
        return res.status(404).json({ 
          error: `WHOIS服务器 ${whoisServer} 返回空数据或无效数据`,
          domain: cleanDomain,
          server: whoisServer,
          rawData: responseData
        });
      }
      
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

      // 尝试连接备用服务器whois.iana.org
      if (whoisServer !== 'whois.iana.org' && !server) {
        console.log('尝试连接备用服务器: whois.iana.org');
        
        const backupClient = new net.Socket();
        let backupResponseData = '';
        
        backupClient.connect(43, 'whois.iana.org', () => {
          backupClient.write(cleanDomain + '\r\n');
        });
        
        backupClient.on('data', (data) => {
          backupResponseData += data.toString();
        });
        
        backupClient.on('end', () => {
          const parsedBackupData = parseWhoisData(backupResponseData, cleanDomain);
          
          // 查看是否有建议的WHOIS服务器
          if (parsedBackupData.whoisServer) {
            res.status(200).json({
              domain: cleanDomain,
              suggestedServer: parsedBackupData.whoisServer,
              whoisServer: 'whois.iana.org',
              rawData: backupResponseData,
              message: '从IANA获取到了备用WHOIS服务器信息'
            });
          } else {
            res.status(200).json({
              ...parsedBackupData,
              message: '使用IANA备用服务器查询的结果'
            });
          }
        });
        
        backupClient.on('error', () => {
          res.status(500).json({ 
            error: `无法连接到主WHOIS服务器 ${whoisServer} 和备用服务器 whois.iana.org`,
            domain: cleanDomain
          });
        });
      } else {
        res.status(500).json({ 
          error: `连接WHOIS服务器时出错: ${error.message}`,
          domain: cleanDomain,
          server: whoisServer
        });
      }
    });
    
  } catch (error) {
    console.error('处理WHOIS请求时出错:', error);
    res.status(500).json({ error: `服务器内部错误: ${error.message}` });
  }
};
