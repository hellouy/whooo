
import { WhoisData } from "@/hooks/use-whois-lookup";

export function processWhoisResults(domain: string, whoiserResult: any): WhoisData {
  // Initialize the result object with default values
  let result: WhoisData = {
    domain: domain,
    whoisServer: "直接查询",
    registrar: "未知",
    registrationDate: "未知",
    expiryDate: "未知",
    nameServers: [],
    registrant: "未知",
    status: "未知",
    rawData: JSON.stringify(whoiserResult, null, 2)
  };

  // Process domain information from top-level domain object
  if (whoiserResult.domain) {
    const domainInfo = whoiserResult.domain;
    
    // Extract registrar information
    if (domainInfo.registrar) {
      result.registrar = domainInfo.registrar;
    }
    
    // Extract creation date
    if (domainInfo.createdDate) {
      result.registrationDate = domainInfo.createdDate;
    } else if (domainInfo['Creation Date']) {
      result.registrationDate = domainInfo['Creation Date'];
    }
    
    // Extract expiry date
    if (domainInfo.expiryDate) {
      result.expiryDate = domainInfo.expiryDate;
    } else if (domainInfo['Registry Expiry Date']) {
      result.expiryDate = domainInfo['Registry Expiry Date'];
    }
    
    // Extract status
    if (domainInfo.status) {
      result.status = Array.isArray(domainInfo.status) ? domainInfo.status.join(', ') : domainInfo.status;
    } else if (domainInfo['Domain Status']) {
      result.status = Array.isArray(domainInfo['Domain Status']) ? domainInfo['Domain Status'].join(', ') : domainInfo['Domain Status'];
    }
    
    // Extract name servers
    if (domainInfo.nameServers && Array.isArray(domainInfo.nameServers)) {
      result.nameServers = domainInfo.nameServers;
    }
  }

  // Also check for TLD-specific data formats (for different WHOIS servers)
  // These are common fields in the top-level of WHOIS responses
  const topLevelFields = [
    'Domain Name',
    'Registrar',
    'Creation Date',
    'Registry Expiry Date',
    'Updated Date',
    'Domain Status',
    'Name Server'
  ];

  topLevelFields.forEach(field => {
    if (whoiserResult[field]) {
      switch(field) {
        case 'Domain Name':
          // Already have domain from input
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
      }
    }
  });

  // Look for data in other section objects
  Object.keys(whoiserResult).forEach(key => {
    const section = whoiserResult[key];
    if (typeof section === 'object' && section !== null) {
      // Try to extract registrar information from each section
      if (section.registrar && result.registrar === "未知") {
        result.registrar = section.registrar;
      }
      
      // Try to extract creation date from each section
      if (result.registrationDate === "未知") {
        if (section.createdDate) {
          result.registrationDate = section.createdDate;
        } else if (section['Creation Date']) {
          result.registrationDate = section['Creation Date'];
        }
      }
      
      // Try to extract expiry date from each section
      if (result.expiryDate === "未知") {
        if (section.expiryDate) {
          result.expiryDate = section.expiryDate;
        } else if (section['Registry Expiry Date']) {
          result.expiryDate = section['Registry Expiry Date'];
        }
      }
      
      // Try to extract status from each section
      if (result.status === "未知") {
        if (section.status) {
          result.status = Array.isArray(section.status) ? section.status.join(', ') : section.status;
        } else if (section['Domain Status']) {
          result.status = Array.isArray(section['Domain Status']) ? section['Domain Status'].join(', ') : section['Domain Status'];
        }
      }
      
      // Try to extract name servers from each section
      if (result.nameServers.length === 0 && section.nameServers && Array.isArray(section.nameServers)) {
        result.nameServers = section.nameServers;
      }
    }
  });

  // Try some special handling for common WHOIS response formats
  // For international domains with specific formats
  tryInternationalFormats(whoiserResult, result);

  return result;
}

// Special handling for international domain formats
function tryInternationalFormats(whoiserResult: any, result: WhoisData): void {
  // Common keys used in different WHOIS responses
  const creationDateKeys = [
    'created', 'Created On', 'registered', 'Registration Date', 'created date'
  ];
  
  const expiryDateKeys = [
    'expires', 'expire', 'paid-till', 'expiration', 'expiry date', 'Expiration Date'
  ];
  
  const registrarKeys = [
    'registrar', 'Sponsoring Registrar', 'Registrar Organization', 'Registrar Name'
  ];
  
  const statusKeys = [
    'status', 'state', 'Domain Status'
  ];
  
  const nameServerKeys = [
    'nserver', 'Name Server', 'name servers', 'Nameservers'
  ];
  
  // Search for creation date
  if (result.registrationDate === "未知") {
    for (const key of creationDateKeys) {
      if (findDeepValue(whoiserResult, key)) {
        result.registrationDate = findDeepValue(whoiserResult, key);
        break;
      }
    }
  }
  
  // Search for expiry date
  if (result.expiryDate === "未知") {
    for (const key of expiryDateKeys) {
      if (findDeepValue(whoiserResult, key)) {
        result.expiryDate = findDeepValue(whoiserResult, key);
        break;
      }
    }
  }
  
  // Search for registrar
  if (result.registrar === "未知") {
    for (const key of registrarKeys) {
      if (findDeepValue(whoiserResult, key)) {
        result.registrar = findDeepValue(whoiserResult, key);
        break;
      }
    }
  }
  
  // Search for status
  if (result.status === "未知") {
    for (const key of statusKeys) {
      if (findDeepValue(whoiserResult, key)) {
        const status = findDeepValue(whoiserResult, key);
        result.status = Array.isArray(status) ? status.join(', ') : status;
        break;
      }
    }
  }
  
  // Search for name servers
  if (result.nameServers.length === 0) {
    for (const key of nameServerKeys) {
      const nameServers = findDeepValue(whoiserResult, key);
      if (nameServers) {
        result.nameServers = Array.isArray(nameServers) ? nameServers : [nameServers];
        break;
      }
    }
  }
}

// Helper function to find a value deep in the WHOIS result object
function findDeepValue(obj: any, key: string): any {
  if (!obj || typeof obj !== 'object') return null;
  
  const normalizedKey = key.toLowerCase();
  
  // Check if the key exists directly in the object
  for (const objKey in obj) {
    if (objKey.toLowerCase() === normalizedKey && obj[objKey] !== null && obj[objKey] !== undefined) {
      return obj[objKey];
    }
  }
  
  // If not found, search recursively in nested objects
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
