
import { WhoisData } from "@/hooks/use-whois-lookup";

export function processWhoisResults(domain: string, whoiserResult: any): WhoisData {
  // 初始化结果对象，设置默认值
  let result: WhoisData = {
    domain: domain,
    whoisServer: "直接查询",
    registrar: "未知",
    registrationDate: "未知",
    expiryDate: "未知",
    nameServers: [],
    registrant: "未知",
    status: "未知",
    rawData: extractRawData(whoiserResult),
    protocol: "whois" // 添加缺失的protocol字段
  };

  try {
    // 首先，尝试从顶级域对象获取域信息
    if (whoiserResult.domain) {
      processTopLevelDomain(result, whoiserResult.domain);
    }

    // 检查常见的顶级字段格式
    processTopLevelFields(result, whoiserResult);

    // 遍历所有部分查找数据
    processSections(result, whoiserResult);

    // 处理国际域名的特殊格式
    processInternationalFormats(result, whoiserResult);

    // 尝试从text字段直接提取信息（如果其他方法都失败）
    if (hasMinimalData(result) && whoiserResult.text) {
      processTextData(result, whoiserResult.text);
    }

    // 检查通用服务器部分
    if (hasMinimalData(result) && whoiserResult['whois.iana.org']) {
      processTextData(result, whoiserResult['whois.iana.org'].text);
    }
    
    // 如果仍然没有足够的数据，尝试原始解析
    if (hasMinimalData(result) && result.rawData) {
      tryParseFromRawData(result);
    }
  } catch (error) {
    console.error("处理WHOIS结果时出错:", error);
    // 确保我们至少有原始数据
    if (!result.rawData) {
      result.rawData = JSON.stringify(whoiserResult, null, 2);
    }
  }

  return result;
}

// 从原始响应中提取文本数据
function extractRawData(whoiserResult: any): string {
  try {
    if (!whoiserResult) return "无原始WHOIS数据";
    
    let rawText = "";
    
    // 直接从顶级text字段获取
    if (whoiserResult.text) {
      rawText = whoiserResult.text;
    } else {
      // 从各个服务器响应中收集text字段
      for (const key in whoiserResult) {
        if (whoiserResult[key] && typeof whoiserResult[key] === 'object') {
          if (whoiserResult[key].text) {
            rawText += `--- ${key} 响应 ---\n${whoiserResult[key].text}\n\n`;
          }
        }
      }
      
      // 如果没有找到任何text字段，返回格式化的JSON
      if (!rawText) {
        rawText = JSON.stringify(whoiserResult, null, 2);
      }
    }
    
    return rawText;
  } catch (err) {
    console.error("提取原始数据时出错:", err);
    return JSON.stringify(whoiserResult, null, 2);
  }
}

// 处理顶级域对象
function processTopLevelDomain(result: WhoisData, domainInfo: any): void {
  // 提取注册商信息
  if (domainInfo.registrar) {
    result.registrar = domainInfo.registrar;
  }
  
  // 提取创建日期
  if (domainInfo.createdDate) {
    result.registrationDate = domainInfo.createdDate;
  } else if (domainInfo['Creation Date']) {
    result.registrationDate = domainInfo['Creation Date'];
  }
  
  // 提取到期日期
  if (domainInfo.expiryDate) {
    result.expiryDate = domainInfo.expiryDate;
  } else if (domainInfo['Registry Expiry Date']) {
    result.expiryDate = domainInfo['Registry Expiry Date'];
  }
  
  // 提取状态
  if (domainInfo.status) {
    result.status = Array.isArray(domainInfo.status) ? domainInfo.status.join(', ') : domainInfo.status;
  } else if (domainInfo['Domain Status']) {
    result.status = Array.isArray(domainInfo['Domain Status']) ? domainInfo['Domain Status'].join(', ') : domainInfo['Domain Status'];
  }
  
  // 提取名称服务器
  if (domainInfo.nameServers && Array.isArray(domainInfo.nameServers)) {
    result.nameServers = domainInfo.nameServers;
  }
}

// 处理顶级字段
function processTopLevelFields(result: WhoisData, whoiserResult: any): void {
  const topLevelFields = [
    'Domain Name',
    'Registrar',
    'Creation Date',
    'Registry Expiry Date',
    'Updated Date',
    'Domain Status',
    'Name Server',
    'Registrant',
    'Registrant Organization'
  ];

  topLevelFields.forEach(field => {
    if (whoiserResult[field]) {
      switch(field) {
        case 'Domain Name':
          // 已经从输入获取域名
          break;
        case 'Registrar':
          if (result.registrar === "未知" && whoiserResult[field]) {
            result.registrar = whoiserResult[field];
          }
          break;
        case 'Creation Date':
          if (result.registrationDate === "未知" && whoiserResult[field]) {
            result.registrationDate = whoiserResult[field];
          }
          break;
        case 'Registry Expiry Date':
          if (result.expiryDate === "未知" && whoiserResult[field]) {
            result.expiryDate = whoiserResult[field];
          }
          break;
        case 'Domain Status':
          if (result.status === "未知" && whoiserResult[field]) {
            result.status = Array.isArray(whoiserResult[field]) 
              ? whoiserResult[field].join(', ') 
              : whoiserResult[field];
          }
          break;
        case 'Name Server':
          if (result.nameServers.length === 0 && whoiserResult[field]) {
            result.nameServers = Array.isArray(whoiserResult[field]) 
              ? whoiserResult[field] 
              : [whoiserResult[field]];
          }
          break;
        case 'Registrant':
        case 'Registrant Organization':
          if (result.registrant === "未知" && whoiserResult[field]) {
            result.registrant = whoiserResult[field];
          }
          break;
      }
    }
  });
}

// 处理嵌套部分
function processSections(result: WhoisData, whoiserResult: any): void {
  Object.keys(whoiserResult).forEach(key => {
    const section = whoiserResult[key];
    if (typeof section === 'object' && section !== null) {
      // 尝试从每个部分提取注册商信息
      if (section.registrar && result.registrar === "未知") {
        result.registrar = section.registrar;
      }
      
      // 尝试从每个部分提取创建日期
      if (result.registrationDate === "未知") {
        if (section.createdDate) {
          result.registrationDate = section.createdDate;
        } else if (section['Creation Date']) {
          result.registrationDate = section['Creation Date'];
        }
      }
      
      // 尝试从每个部分提取到期日期
      if (result.expiryDate === "未知") {
        if (section.expiryDate) {
          result.expiryDate = section.expiryDate;
        } else if (section['Registry Expiry Date']) {
          result.expiryDate = section['Registry Expiry Date'];
        }
      }
      
      // 尝试从每个部分提取状态
      if (result.status === "未知") {
        if (section.status) {
          result.status = Array.isArray(section.status) ? section.status.join(', ') : section.status;
        } else if (section['Domain Status']) {
          result.status = Array.isArray(section['Domain Status']) ? section['Domain Status'].join(', ') : section['Domain Status'];
        }
      }
      
      // 尝试从每个部分提取名称服务器
      if (result.nameServers.length === 0 && section.nameServers && Array.isArray(section.nameServers)) {
        result.nameServers = section.nameServers;
      }
      
      // 尝试从每个部分提取注册人
      if (result.registrant === "未知") {
        if (section.registrant) {
          result.registrant = section.registrant;
        } else if (section['Registrant']) {
          result.registrant = section['Registrant'];
        } else if (section['Registrant Organization']) {
          result.registrant = section['Registrant Organization'];
        }
      }
    }
  });
}

// 处理国际域名格式
function processInternationalFormats(result: WhoisData, whoiserResult: any): void {
  // 不同WHOIS响应中使用的常见键
  const creationDateKeys = [
    'created', 'Created On', 'registered', 'Registration Date', 'created date',
    'Created', 'Creation', 'Registration Time', 'Domain Create Date'
  ];
  
  const expiryDateKeys = [
    'expires', 'expire', 'paid-till', 'expiration', 'expiry date', 'Expiration Date',
    'Registry Expiry', 'Valid Until', 'Domain Expiration Date'
  ];
  
  const registrarKeys = [
    'registrar', 'Sponsoring Registrar', 'Registrar Organization', 'Registrar Name',
    'Sponsoring-registrar', 'Registrar Company'
  ];
  
  const statusKeys = [
    'status', 'state', 'Domain Status', 'Status', 'Domain Status.Value'
  ];
  
  const nameServerKeys = [
    'nserver', 'Name Server', 'name servers', 'Nameservers', 'nameservers',
    'Name-servers', 'DNS', 'name server'
  ];
  
  // 搜索创建日期
  if (result.registrationDate === "未知") {
    for (const key of creationDateKeys) {
      const value = findDeepValue(whoiserResult, key);
      if (value) {
        result.registrationDate = value;
        break;
      }
    }
  }
  
  // 搜索到期日期
  if (result.expiryDate === "未知") {
    for (const key of expiryDateKeys) {
      const value = findDeepValue(whoiserResult, key);
      if (value) {
        result.expiryDate = value;
        break;
      }
    }
  }
  
  // 搜索注册商
  if (result.registrar === "未知") {
    for (const key of registrarKeys) {
      const value = findDeepValue(whoiserResult, key);
      if (value) {
        result.registrar = value;
        break;
      }
    }
  }
  
  // 搜索状态
  if (result.status === "未知") {
    for (const key of statusKeys) {
      const value = findDeepValue(whoiserResult, key);
      if (value) {
        result.status = Array.isArray(value) ? value.join(', ') : value;
        break;
      }
    }
  }
  
  // 搜索名称服务器
  if (result.nameServers.length === 0) {
    for (const key of nameServerKeys) {
      const value = findDeepValue(whoiserResult, key);
      if (value) {
        result.nameServers = Array.isArray(value) ? value : [value];
        break;
      }
    }
  }
}

// 辅助函数，在WHOIS结果对象中深度查找值
function findDeepValue(obj: any, key: string): any {
  if (!obj || typeof obj !== 'object') return null;
  
  const normalizedKey = key.toLowerCase();
  
  // 检查键是否直接存在于对象中
  for (const objKey in obj) {
    if (objKey.toLowerCase() === normalizedKey && obj[objKey] !== null && obj[objKey] !== undefined) {
      return obj[objKey];
    }
  }
  
  // 如果未找到，递归搜索嵌套对象
  for (const objKey in obj) {
    if (typeof obj[objKey] === 'object') {
      const value = findDeepValue(obj[objKey], key);
      if (value !== null && value !== undefined) {
        return value;
      }
    }
  }
  
  return null;
}

// 检查结果是否有基本数据
function hasMinimalData(result: WhoisData): boolean {
  return (
    result.registrar === "未知" &&
    result.registrationDate === "未知" &&
    result.expiryDate === "未知" &&
    result.nameServers.length === 0
  );
}

// 尝试从text字段提取信息
function processTextData(result: WhoisData, text: string): void {
  if (!text) return;
  
  // 使用基本正则表达式尝试提取常见信息
  // 注册商
  const registrarMatch = text.match(/(?:registrar|sponsor(?:ing)?(?:\s+registrar)?)[^:]*:\s*([^\n]+)/i);
  if (registrarMatch && result.registrar === "未知") {
    result.registrar = registrarMatch[1].trim();
  }
  
  // 创建日期
  const createdMatch = text.match(/(?:created(?:\s+on)?|creation\s+date|registered(?:\s+on)?)[^:]*:\s*([^\n]+)/i);
  if (createdMatch && result.registrationDate === "未知") {
    result.registrationDate = createdMatch[1].trim();
  }
  
  // 到期日期
  const expiryMatch = text.match(/(?:expir(?:y|ation|es)(?:\s+date)?|paid[\s-]*till|registry\s+expiry\s+date)[^:]*:\s*([^\n]+)/i);
  if (expiryMatch && result.expiryDate === "未知") {
    result.expiryDate = expiryMatch[1].trim();
  }
  
  // 状态
  const statusMatch = text.match(/(?:status|state)[^:]*:\s*([^\n]+)/i);
  if (statusMatch && result.status === "未知") {
    result.status = statusMatch[1].trim();
  }
  
  // 名称服务器
  const nameServerMatches = text.match(/(?:name\s*server|ns|nserver)[^:]*:\s*([^\n]+)/gi);
  if (nameServerMatches && result.nameServers.length === 0) {
    result.nameServers = nameServerMatches.map(match => {
      const serverPart = match.split(':')[1];
      if (serverPart) {
        return serverPart.trim().split(/\s+/)[0];
      }
      return "";
    }).filter(Boolean);
  }
}

// 从原始数据中尝试解析信息
function tryParseFromRawData(result: WhoisData): void {
  if (!result.rawData) return;
  
  // 确保rawData是字符串类型
  const text = typeof result.rawData === 'string' ? result.rawData : String(result.rawData);
  
  // 使用一组更广泛的正则表达式尝试提取信息
  // 注册商
  const registrarPatterns = [
    /registrar(?:\s+name)?[^:]*:\s*([^\n]+)/i,
    /organization:\s*([^\n]+)/i,
    /Registrar:\s*([^\n]+)/i,
    /Sponsor:\s*([^\n]+)/i
  ];
  
  for (const pattern of registrarPatterns) {
    const match = text.match(pattern);
    if (match && result.registrar === "未知") {
      result.registrar = match[1].trim();
      break;
    }
  }
  
  // 创建日期
  const creationPatterns = [
    /(?:created|creation\s+date|registered)(?:\s+on)?[^:]*:\s*([^\n]+)/i,
    /Registration Date:\s*([^\n]+)/i,
    /Created on[^:]*:\s*([^\n]+)/i,
    /Created Date[^:]*:\s*([^\n]+)/i
  ];
  
  for (const pattern of creationPatterns) {
    const match = text.match(pattern);
    if (match && result.registrationDate === "未知") {
      result.registrationDate = match[1].trim();
      break;
    }
  }
  
  // 到期日期
  const expiryPatterns = [
    /(?:expir(?:y|ation|es)(?:\s+date)?)[^:]*:\s*([^\n]+)/i,
    /paid[\s-]*till[^:]*:\s*([^\n]+)/i,
    /Registry Expiry Date[^:]*:\s*([^\n]+)/i,
    /Expiration Date[^:]*:\s*([^\n]+)/i
  ];
  
  for (const pattern of expiryPatterns) {
    const match = text.match(pattern);
    if (match && result.expiryDate === "未知") {
      result.expiryDate = match[1].trim();
      break;
    }
  }
  
  // 状态
  const statusPatterns = [
    /(?:status|state)[^:]*:\s*([^\n]+)/i,
    /Domain Status[^:]*:\s*([^\n]+)/i
  ];
  
  for (const pattern of statusPatterns) {
    const match = text.match(pattern);
    if (match && result.status === "未知") {
      result.status = match[1].trim();
      break;
    }
  }
  
  // 名称服务器
  if (result.nameServers.length === 0) {
    const nameServerPatterns = [
      /(?:name\s*server|ns|nserver)[^:]*:\s*([^\n]+)/gi,
      /Name Server[^:]*:\s*([^\n]+)/gi
    ];
    
    for (const pattern of nameServerPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        result.nameServers = matches.map(match => {
          const parts = match.split(':');
          if (parts.length > 1) {
            return parts[1].trim().split(/\s+/)[0];
          }
          return "";
        }).filter(Boolean);
        if (result.nameServers.length > 0) break;
      }
    }
  }
}
