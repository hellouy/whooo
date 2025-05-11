
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
 */
export async function fetchFromMultipleAPIs(domain: string) {
  // Implementation left as a placeholder
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
