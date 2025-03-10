
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
  } else {
    return defaultRegex;
  }
}

export function getSpecialDomain(domain: string): string {
  return specialDomains[domain.toLowerCase()] ?? domain;
}

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
