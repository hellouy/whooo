// WHOIS 服务器查询 API
import net from 'net';
import whois from 'whois';
import whoisServers from './whois-servers.json';

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

// 解析WHOIS数据 - 改进版本
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
    
    // 提取关键信息 - 使用更多匹配模式
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();
      
      // WHOIS 服务器
      if (lowerLine.includes('whois server:') || 
          lowerLine.includes('referral url:') || 
          lowerLine.includes('whois:') || 
          lowerLine.includes('registrar whois server:')) {
        result.whoisServer = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // 注册商 - 更广泛的匹配模式
      if (lowerLine.includes('registrar:') || 
          lowerLine.includes('sponsoring registrar:') ||
          lowerLine.includes('registrar name:') ||
          lowerLine.includes('registrar organization:')) {
        result.registrar = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // 创建日期 - 更广泛的匹配模式
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
      
      // 到期日期 - 更广泛的匹配模式
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
      
      // 域名状态
      if (lowerLine.includes('domain status:') || 
          lowerLine.includes('status:') ||
          lowerLine.match(/^state:/)) {
        const status = line.split(':').slice(1).join(':').trim();
        if (status && !result.status) {
          result.status = status;
        }
      }
      
      // 注册人
      if (lowerLine.includes('registrant:') || 
          lowerLine.includes('registrant organization:') || 
          lowerLine.includes('registrant name:') ||
          lowerLine.includes('registrant contact:') ||
          lowerLine.includes('org:') ||
          lowerLine.includes('organization:') ||
          lowerLine.match(/^owner:/)) {
        result.registrant = line.split(':').slice(1).join(':').trim() || null;
      }
      
      // 名称服务器
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

    // 二次尝试：如果找不到信息，使用更灵活的提取方法
    
    // 如果未找到注册商，尝试正则表达式匹配
    if (!result.registrar) {
      const registrarRegex = /(?:Registrar|注册商|Registration Service Provider)[\s\:]+([^\n]+)/i;
      for (const line of lines) {
        const match = line.match(registrarRegex);
        if (match && match[1]) {
          result.registrar = match[1].trim();
          break;
        }
      }
    }

    // 如果未找到创建日期，尝试正则表达式匹配
    if (!result.creationDate) {
      const creationRegex = /(?:Creation Date|Registration Date|Created|Creation|注册日期|Created On)[\s\:]+([^\n]+)/i;
      for (const line of lines) {
        const match = line.match(creationRegex);
        if (match && match[1]) {
          result.creationDate = match[1].trim();
          break;
        }
      }
    }

    // 如果未找到到期日期，尝试正则表达式匹配
    if (!result.expiryDate) {
      const expiryRegex = /(?:Expiry Date|Expiration Date|Registry Expiry Date|到期日期|有效期至)[\s\:]+([^\n]+)/i;
      for (const line of lines) {
        const match = line.match(expiryRegex);
        if (match && match[1]) {
          result.expiryDate = match[1].trim();
          break;
        }
      }
    }

    // 如果未找到状态，尝试正则表达式匹配
    if (!result.status) {
      const statusRegex = /(?:Domain Status|Status|状态|域名状态)[\s\:]+([^\n]+)/i;
      for (const line of lines) {
        const match = line.match(statusRegex);
        if (match && match[1]) {
          result.status = match[1].trim();
          break;
        }
      }
    }

    // 使用正则表达式查找日期，如果上面的方法都失败了
    if (!result.creationDate || !result.expiryDate) {
      // 日期格式可能是： YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MMM-YYYY 等
      const dateRegex = /\d{1,4}[\-\.\/]\d{1,2}[\-\.\/]\d{1,4}|\d{1,2}\-[A-Za-z]{3}\-\d{4}/g;
      const allDates = [];
      
      for (const line of lines) {
        const matches = line.match(dateRegex);
        if (matches) {
          allDates.push(...matches);
        }
      }
      
      // 如果找到日期，则按顺序分配（通常创建日期在前，到期日期在后）
      if (allDates.length >= 2) {
        if (!result.creationDate) result.creationDate = allDates[0];
        if (!result.expiryDate) result.expiryDate = allDates[1];
      }
    }
    
    // 检查是否需要使用备用服务器
    if (!result.registrar && !result.creationDate && !result.expiryDate) {
      // 重要信息全部缺失，可能需要使用备用服务器
      result.needsBackupServer = true;
    }
    
    console.log("解析结果:", result);
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

// 尝试备用WHOIS服务器
async function tryBackupServer(domain) {
  return new Promise((resolve, reject) => {
    // 几个备用服务器，按优先级尝试
    const backupServers = [
      'whois.iana.org',  // IANA的WHOIS服务
      'whois.verisign-grs.com',  // Verisign适用于多种TLD
      'whois.internic.net'  // InterNIC的WHOIS服务
    ];
    
    let backupIndex = 0;
    
    function tryNextServer() {
      if (backupIndex >= backupServers.length) {
        reject(new Error('所有备用服务器尝试均失败'));
        return;
      }
      
      const backupServer = backupServers[backupIndex];
      console.log(`尝试备用服务器 ${backupIndex+1}/${backupServers.length}: ${backupServer}`);
      
      const client = new net.Socket();
      let responseData = '';
      
      client.connect(43, backupServer, () => {
        client.write(domain + '\r\n');
      });
      
      client.on('data', (data) => {
        responseData += data.toString();
      });
      
      client.on('end', () => {
        const result = parseWhoisData(responseData, domain);
        
        // 如果获取到了有用信息或者是最后一个备用服务器
        if (result.registrar || result.creationDate || result.expiryDate || 
            backupIndex === backupServers.length - 1) {
          result.whoisServer = backupServer;
          resolve(result);
        } else {
          // 继续尝试下一个备用服务器
          backupIndex++;
          tryNextServer();
        }
      });
      
      client.on('error', () => {
        // 继续尝试下一个备用服务器
        backupIndex++;
        tryNextServer();
      });
      
      // 5秒超时
      setTimeout(() => {
        client.destroy();
        backupIndex++;
        tryNextServer();
      }, 5000);
    }
    
    tryNextServer();
  });
}

// 使用whois包进行查询
function queryWithWhoisPackage(domain) {
  return new Promise((resolve, reject) => {
    console.log(`Using whois package to query domain: ${domain}`);

    // 设置选项
    const options = {
      follow: 3,       // 允许跟随重定向
      timeout: 15000,  // 15秒超时
    };

    // 查询
    whois.lookup(domain, options, (err, data) => {
      if (err) {
        console.error(`whois package query error: ${err.message}`);
        reject(err);
        return;
      }

      if (!data || data.trim().length < 50) {
        reject(new Error("No valid data returned from whois package"));
        return;
      }

      console.log(`whois package returned ${data.length} bytes of data`);
      resolve(data);
    });
  });
}

export default async (req, res) => {
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
    console.log(`开始查询域名: ${cleanDomain}`);
    
    // 使用whois包查询 - 这是我们的首选方法
    try {
      const whoisData = await queryWithWhoisPackage(cleanDomain);
      
      // 解析WHOIS数据
      const parsedData = parseWhoisData(whoisData, cleanDomain);
      
      // 如果结果包含足够信息，直接返回
      if (parsedData.registrar || parsedData.creationDate || parsedData.nameServers.length > 0) {
        return res.status(200).json({
          ...parsedData,
          rawData: whoisData,
          message: '使用whois包查询成功'
        });
      }
      
      // 如果没有足够信息，继续尝试其他方法
      console.log("whois包返回了数据，但没有足够的信息，尝试其他方法");
    } catch (whoisErr) {
      console.error(`whois包查询失败: ${whoisErr.message}`);
      // 失败后继续尝试其他方法
    }
    
    // 确定使用哪个WHOIS服务器
    let whoisServer;
    if (server) {
      whoisServer = server;
      console.log(`使用指定的WHOIS服务器: ${whoisServer}`);
    } else {
      const tld = extractTLD(cleanDomain);
      if (!tld || !whoisServers[tld]) {
        return res.status(400).json({ 
          error: `未找到顶级域名 "${tld}" 的WHOIS服务器` 
        });
      }
      whoisServer = whoisServers[tld];
      console.log(`自动选择WHOIS服务器: ${whoisServer} (针对TLD: ${tld})`);
    }
    
    // 设置超时时间 (30秒)
    const TIMEOUT = 30000;
    let responseData = '';
    let responseReceived = false;
    
    // 创建TCP连接
    const client = new net.Socket();
    
    // 设置响应超时
    const timeout = setTimeout(() => {
      // 如果未找到注册商、创建日期或到期日期，尝试备用服务器
      if (!responseReceived && !parsedData.registrar && !parsedData.creationDate && !parsedData.expiryDate) {
        console.log("WHOIS响应超时，尝试备用服务器");
        
        // 尝试备用服务器
        tryBackupServer(cleanDomain)
          .then(backupResult => {
            res.status(200).json({
              ...backupResult,
              message: '使用备用服务器获取的信息'
            });
          })
          .catch(backupError => {
            res.status(408).json({ 
              error: '查询超时，所有WHOIS服务器均无响应',
              domain: cleanDomain
            });
          });
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
        console.log("WHOIS响应过短，尝试备用服务器");
        
        // 尝试备用服务器
        tryBackupServer(cleanDomain)
          .then(backupResult => {
            res.status(200).json({
              ...backupResult,
              message: '使用备用服务器获取的信息'
            });
          })
          .catch(backupError => {
            res.status(404).json({ 
              error: `WHOIS服务器 ${whoisServer} 返回数据不完整，备用服务器查询也失败`,
              domain: cleanDomain,
              rawData: responseData
            });
          });
        return;
      }
      
      // 解析WHOIS数据
      const parsedData = parseWhoisData(responseData, cleanDomain);
      
      // 如果发现需要使用备用服务器 
      if (parsedData.needsBackupServer && !server) {
        console.log("需要使用备用服务器获取更多信息");
        
        // 尝试备用服务器
        tryBackupServer(cleanDomain)
          .then(backupResult => {
            // 合并两个结果，备用服务器的数据优先
            const mergedResult = {
              ...parsedData,
              ...backupResult,
              whoisServer: backupResult.whoisServer || parsedData.whoisServer,
              rawData: `${parsedData.rawData}\n\n--- 备用服务器 (${backupResult.whoisServer}) 数据 ---\n\n${backupResult.rawData}`,
              message: '已合并多个WHOIS服务器的信息'
            };
            
            // 删除不需要的字段
            delete mergedResult.needsBackupServer;
            
            res.status(200).json(mergedResult);
          })
          .catch(() => {
            // 即使备用服务器失败，仍然返回原始结果
            delete parsedData.needsBackupServer;
            res.status(200).json(parsedData);
          });
        return;
      }
      
      // 如果我们收到了引用到另一个WHOIS服务器的响应
      if (parsedData.whoisServer && !server && parsedData.whoisServer !== whoisServer) {
        console.log(`发现特定的WHOIS服务器: ${parsedData.whoisServer}`);
        
        // 返回第一个服务器的响应，但告知前端可以使用更具体的服务器
        res.status(200).json({
          ...parsedData,
          suggestedServer: parsedData.whoisServer,
          message: '收到初步响应，可使用更具体的WHOIS服务器获取详细信息'
        });
      } else {
        // 删除不需要的字段
        delete parsedData.needsBackupServer;
        
        // 返回解析后的数据
        res.status(200).json(parsedData);
      }
    });
    
    // 处理错误
    client.on('error', (error) => {
      responseReceived = true;
      clearTimeout(timeout);
      console.error(`连接WHOIS服务器时出错: ${error.message}`);

      // 尝试备用服务器
      console.log("尝试使用备用WHOIS服务器");
      tryBackupServer(cleanDomain)
        .then(backupResult => {
          res.status(200).json({
            ...backupResult,
            message: '使用备用服务器获取的信息'
          });
        })
        .catch(backupError => {
          res.status(500).json({ 
            error: `连接WHOIS服务器时出错: ${error.message}`,
            domain: cleanDomain,
            server: whoisServer
          });
        });
    });
    
  } catch (error) {
    console.error('处理WHOIS请求时出错:', error);
    res.status(500).json({ error: `服务器内部错误: ${error.message}` });
  }
};
