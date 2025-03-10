
import { getDomainRegex, getSpecialDomain } from './whoisRegexHelpers';

// Function to parse raw WHOIS data using regex patterns
export function parseRawData(domain: string, rawData: string) {
  if (!rawData) return null;

  const domainRegex = getDomainRegex(domain);
  
  // Check if the domain is not found
  if (domainRegex.notFound && rawData.match(new RegExp(domainRegex.notFound, "i"))) {
    return { error: "Domain not found" };
  }

  // Check if rate limited
  if (domainRegex.rateLimited && rawData.match(new RegExp(domainRegex.rateLimited, "i"))) {
    return { error: "Rate limit exceeded" };
  }

  // Create the result object
  const result: Record<string, any> = { domain };

  // Parse registrar
  if (domainRegex.registrar) {
    const registrarMatch = rawData.match(new RegExp(domainRegex.registrar, "i"));
    result.registrar = registrarMatch ? registrarMatch[1].trim() : "未知";
  }

  // Parse creation date
  if (domainRegex.creationDate) {
    const creationMatch = rawData.match(new RegExp(domainRegex.creationDate, "i"));
    result.creationDate = creationMatch ? creationMatch[1].trim() : "未知";
  }

  // Parse expiry date
  if (domainRegex.expirationDate) {
    const expiryMatch = rawData.match(new RegExp(domainRegex.expirationDate, "i"));
    result.expiryDate = expiryMatch ? expiryMatch[1].trim() : "未知";
  }

  // Parse updated date
  if (domainRegex.updatedDate) {
    const updatedMatch = rawData.match(new RegExp(domainRegex.updatedDate, "i"));
    result.updatedDate = updatedMatch ? updatedMatch[1].trim() : "未知";
  }

  // Parse status
  if (domainRegex.status) {
    const statusMatch = rawData.match(new RegExp(domainRegex.status, "i"));
    result.status = statusMatch ? statusMatch[1].trim() : "未知";
  }

  // Parse name servers
  if (domainRegex.nameServers) {
    const nameServerMatches = rawData.match(new RegExp(domainRegex.nameServers, "ig"));
    result.nameServers = nameServerMatches 
      ? nameServerMatches.map(match => {
          const serverMatch = match.match(new RegExp(domainRegex.nameServers!, "i"));
          return serverMatch ? serverMatch[1].trim() : "";
        }).filter(Boolean)
      : [];
  }

  return result;
}
