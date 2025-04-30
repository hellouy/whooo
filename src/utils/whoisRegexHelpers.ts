
import {
  DomainRegex,
  defaultRegex,
  comRegex,
  orgRegex,
  auRegex,
  usRegex,
  ruRegex,
  ukRegex,
  frRegex,
  nlRegex,
  fiRegex,
  jpRegex,
  plRegex,
  brRegex,
  euRegex,
  eeRegex,
  krRegex,
  bgRegex,
  deRegex,
  atRegex,
  caRegex,
  beRegex,
  infoRegex,
  kgRegex,
  idRegex,
  skRegex,
  seRegex,
  isRegex,
  coRegex,
  trRegex,
  cnRegex,
  twRegex,
  hkRegex,
  sgRegex,
  thRegex,
  vietRegex,
  specialDomains
} from './whoisRegexPatterns';

export function getDomainRegex(domain: string): DomainRegex {
  if (
    domain.endsWith(".com") ||
    domain.endsWith(".net") ||
    domain.endsWith(".name")
  ) {
    return comRegex;
  } else if (
    domain.endsWith(".org") ||
    domain.endsWith(".me") ||
    domain.endsWith(".mobi")
  ) {
    return orgRegex;
  } else if (domain.endsWith(".au")) {
    return auRegex;
  } else if (
    domain.endsWith(".ru") ||
    domain.endsWith(".рф") ||
    domain.endsWith(".su")
  ) {
    return ruRegex;
  } else if (domain.endsWith(".us") || domain.endsWith(".biz")) {
    return usRegex;
  } else if (domain.endsWith(".uk")) {
    return ukRegex;
  } else if (domain.endsWith(".fr")) {
    return frRegex;
  } else if (domain.endsWith(".nl")) {
    return nlRegex;
  } else if (domain.endsWith(".fi")) {
    return fiRegex;
  } else if (domain.endsWith(".jp")) {
    return jpRegex;
  } else if (domain.endsWith(".pl")) {
    return plRegex;
  } else if (domain.endsWith(".br")) {
    return brRegex;
  } else if (domain.endsWith(".eu")) {
    return euRegex;
  } else if (domain.endsWith(".ee")) {
    return eeRegex;
  } else if (domain.endsWith(".kr")) {
    return krRegex;
  } else if (domain.endsWith(".bg")) {
    return bgRegex;
  } else if (domain.endsWith(".de")) {
    return deRegex;
  } else if (domain.endsWith(".at")) {
    return atRegex;
  } else if (domain.endsWith(".ca")) {
    return caRegex;
  } else if (domain.endsWith(".be")) {
    return beRegex;
  } else if (domain.endsWith(".kg")) {
    return kgRegex;
  } else if (domain.endsWith(".info")) {
    return infoRegex;
  } else if (domain.endsWith(".id")) {
    return idRegex;
  } else if (domain.endsWith(".sk")) {
    return skRegex;
  } else if (domain.endsWith(".se") || domain.endsWith(".nu")) {
    return seRegex;
  } else if (domain.endsWith(".is")) {
    return isRegex;
  } else if (domain.endsWith(".co")) {
    return coRegex;
  } else if (domain.endsWith(".tr")) {
    return trRegex;
  } else if (domain.endsWith(".cn") || domain.endsWith(".中国")) {
    return cnRegex;
  } else if (domain.endsWith(".tw") || domain.endsWith(".台湾")) {
    return twRegex;
  } else if (domain.endsWith(".hk") || domain.endsWith(".香港")) {
    return hkRegex;
  } else if (domain.endsWith(".sg")) {
    return sgRegex;
  } else if (domain.endsWith(".th")) {
    return thRegex;
  } else if (domain.endsWith(".vn")) {
    return vietRegex;
  } else {
    return defaultRegex;
  }
}

export function getSpecialDomain(domain: string): string {
  return specialDomains[domain.toLowerCase()] ?? domain;
}

// Helper function to check if a domain appears to be registered
export function isDomainRegistered(rawData: string): boolean {
  const notRegisteredPatterns = [
    /no match/i,
    /not found/i,
    /no entries found/i,
    /domain not found/i,
    /no data found/i,
    /domain available/i,
    /available for registration/i,
    /not registered/i,
    /status:\s*available/i,
    /status:\s*free/i,
    /no information found/i,
    /domain is free/i,
  ];
  
  // Check if any pattern matches the raw data
  return !notRegisteredPatterns.some(pattern => pattern.test(rawData));
}

// Helper function to check if a domain appears to be reserved
export function isDomainReserved(rawData: string): boolean {
  const reservedPatterns = [
    /reserved/i,
    /reserved by/i,
    /reserved domain/i,
    /registry reserved/i,
    /not available for registration/i,
    /restricted/i,
    /prohibited/i,
    /domain blocked/i,
    /premium domain/i,
  ];
  
  return reservedPatterns.some(pattern => pattern.test(rawData));
}

// Helper function to calculate domain age in years from registration date
export function calculateDomainAge(registrationDate: string): number | null {
  if (!registrationDate || registrationDate === "未知") {
    return null;
  }
  
  try {
    // Try to parse the date in various formats
    const date = new Date(registrationDate);
    
    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      const now = new Date();
      const ageInMilliseconds = now.getTime() - date.getTime();
      const ageInYears = ageInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
      return Math.floor(ageInYears);
    }
    
    // Try to extract and parse YYYY-MM-DD
    const dateMatch = registrationDate.match(/(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
    if (dateMatch) {
      const [_, year, month, day] = dateMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const now = new Date();
      const ageInMilliseconds = now.getTime() - date.getTime();
      const ageInYears = ageInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
      return Math.floor(ageInYears);
    }
    
    return null;
  } catch (error) {
    console.error("Error calculating domain age:", error);
    return null;
  }
}

// Enhanced domain status converter (English to Chinese)
export function translateDomainStatus(status: string): string {
  if (!status || status === "未知") return "未知";
  
  const statusMap: Record<string, string> = {
    // Common statuses
    "clientTransferProhibited": "注册商禁止转移",
    "clientUpdateProhibited": "注册商禁止更新",
    "clientDeleteProhibited": "注册商禁止删除",
    "clientHold": "注册商暂停解析",
    "serverTransferProhibited": "服务器禁止转移",
    "serverUpdateProhibited": "服务器禁止更新", 
    "serverDeleteProhibited": "服务器禁止删除",
    "serverHold": "服务器暂停解析",
    "active": "正常",
    "inactive": "不活跃",
    "ok": "正常",
    "autoRenewPeriod": "自动续费期",
    "transferPeriod": "转移期",
    "redemptionPeriod": "赎回期",
    "pendingDelete": "待删除",
    "pendingTransfer": "待转移",
    "pendingUpdate": "待更新",
    "pendingRestore": "待恢复",
    "pendingRenew": "待续费",
    "renewPeriod": "续费期",
    "serverRenewProhibited": "服务器禁止续费",
    "clientRenewProhibited": "注册商禁止续费",
    "addPeriod": "新增期",
    "locked": "已锁定",
    "reserved": "已保留",
    
    // Specialized or extended statuses
    "serverDeleteProhibited serverUpdateProhibited serverTransferProhibited": "服务器保护状态",
    "clientDeleteProhibited clientUpdateProhibited clientTransferProhibited": "注册商保护状态",
    "premium": "高级域名",
    "disputed": "争议中",
    "hold": "暂停解析",
    "published": "已发布",
    "pending": "待处理",
  };

  // If it's a compound status with multiple values separated by commas
  if (status.includes(',')) {
    const parts = status.split(',').map(part => part.trim());
    const translated = parts.map(part => statusMap[part] || part).join(', ');
    return translated;
  }

  // Regular single status
  return statusMap[status.trim()] || status;
}
