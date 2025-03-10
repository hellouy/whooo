
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
