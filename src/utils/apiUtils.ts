
import axios from 'axios';

/**
 * Extract the TLD from a domain name
 */
export function extractTLD(domain: string): string | null {
  if (!domain) return null;
  const parts = domain.trim().toLowerCase().split('.');
  if (parts.length < 2) return null;
  return parts[parts.length - 1];
}

/**
 * Build an appropriate API URL based on the current environment
 */
export function buildApiUrl(path: string): string {
  // Handle different deployment environments
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  const isLovable = typeof window !== 'undefined' && window.location.hostname.includes('lovable');
  
  // For Lovable preview environments, try to use relative paths
  if (isLovable) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  // Default to current host for most deployments
  return path;
}

/**
 * Generic function to retry a request with exponential backoff
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelay: number = 300,
  backoffFactor: number = 1.5,
  maxDelay: number = 5000,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  let lastError: any;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      if (onRetry) {
        onRetry(attempt, error);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }
  
  throw lastError;
}

/**
 * Try to fetch data from multiple APIs
 * This function attempts to query domain information from public APIs
 * when our primary methods fail
 */
export async function fetchFromMultipleAPIs(domain: string) {
  if (!domain) return null;
  
  console.log(`Attempting to fetch data for ${domain} from public APIs`);
  const cleanDomain = domain.trim().toLowerCase();
  
  // List of APIs to try
  const apiEndpoints = [
    {
      url: `https://rdap.org/domain/${cleanDomain}`,
      process: (data: any) => {
        return {
          success: true,
          source: 'rdap.org',
          data: {
            domain: cleanDomain,
            whoisServer: "RDAP.org",
            registrar: data.entities?.[0]?.name || "未知",
            registrationDate: data.events?.find(e => e.eventAction === "registration")?.eventDate || "未知",
            expiryDate: data.events?.find(e => e.eventAction === "expiration")?.eventDate || "未知",
            nameServers: (data.nameservers || []).map(ns => ns.ldhName),
            registrant: "未知", // RDAP often doesn't expose this
            status: Array.isArray(data.status) ? data.status.join(', ') : data.status || "未知",
            rawData: JSON.stringify(data, null, 2),
            protocol: "rdap" as "rdap" | "whois" | "error"
          }
        };
      }
    },
    {
      url: `https://api.who.cx/whois/${cleanDomain}`,
      process: (data: any) => {
        return {
          success: true,
          source: 'who.cx',
          data: {
            domain: cleanDomain,
            whoisServer: data.whois_server || "未知",
            registrar: data.registrar || "未知",
            registrationDate: data.created || "未知",
            expiryDate: data.expires || "未知",
            nameServers: data.nameservers || [],
            registrant: data.registrant || "未知",
            status: data.status || "未知",
            rawData: data.raw || `No raw data available for ${cleanDomain}`,
            protocol: "whois" as "rdap" | "whois" | "error"
          }
        };
      }
    }
  ];
  
  // Try each API
  for (const api of apiEndpoints) {
    try {
      console.log(`Trying API: ${api.url}`);
      const response = await axios.get(api.url, { 
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Domain-Lookup-Tool/1.0'
        }
      });
      
      if (response.data) {
        console.log(`Got response from ${api.url}`);
        return api.process(response.data);
      }
    } catch (error) {
      console.error(`Error with API ${api.url}:`, error);
    }
  }
  
  // If all APIs fail, return null
  return null;
}

/**
 * Create a mock WHOIS response for testing and fallback purposes
 */
export function getMockWhoisResponse(domain: string) {
  const now = new Date();
  const expiryDate = new Date();
  expiryDate.setFullYear(now.getFullYear() + 1);
  
  const tld = extractTLD(domain) || 'com';
  
  return {
    success: true,
    source: 'mock-data',
    data: {
      domain: domain,
      whoisServer: `whois.${tld}`,
      registrar: "模拟注册商 (Mock Registrar)",
      registrationDate: now.toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      nameServers: [
        `ns1.example.${tld}`,
        `ns2.example.${tld}`
      ],
      registrant: "模拟域名所有者 (Mock Owner)",
      status: "active",
      rawData: `This is mock WHOIS data for ${domain} generated for testing when API connectivity fails.\nCreated: ${now.toISOString()}\nExpires: ${expiryDate.toISOString()}`,
      protocol: "whois" as "whois" | "rdap" | "error"
    }
  };
}

/**
 * Format a domain name (remove http://, www, etc.)
 */
export function formatDomain(input: string): string {
  if (!input) return '';
  
  let domain = input.trim().toLowerCase();
  
  // Remove protocol
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  
  // Remove path, query parameters, etc.
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  domain = domain.split('#')[0];
  
  return domain;
}
