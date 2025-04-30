export type DomainRegex = {
  domainName: string;
  registrar?: string;
  updatedDate?: string;
  creationDate?: string;
  expirationDate?: string;
  status?: string;
  nameServers?: string;
  dateFormat?: string;
  notFound: string;
  rateLimited?: string;
  unknownTLD?: boolean;
};

export const defaultRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Registrar: *(.+)",
  updatedDate: "Updated Date: *(.+)",
  creationDate: "Creat(ed|ion) Date: *(.+)",
  expirationDate: "Expir\\w+ Date: *(.+)",
  status: "Status:\\s*(.+)\\s*\\n",
  nameServers: "Name Server: *(.+)",
  dateFormat: "YYYY-MM-DDThh:mm:ssZ",
  notFound: "(No match for |Domain not found|NOT FOUND\\s)",
  unknownTLD: true,
};

export const comRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Registrar: *(.+)",
  updatedDate: "Updated Date: *(.+)",
  creationDate: "Creation Date: *(.+)",
  expirationDate: "Expir\\w+ Date: *(.+)",
  status: "Status:\\s*(.+)\\s*\\n",
  nameServers: "Name Server: *(.+)",
  notFound: "No match for ",
};

export const orgRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Registrar: *(.+)",
  updatedDate: "Updated Date: *(.+)",
  creationDate: "Creation Date: *(.+)",
  expirationDate: "Expir\\w+ Date: *(.+)",
  status: "Status: *(.+)",
  nameServers: "Name Server: *(.+)",
  notFound: "^NOT FOUND",
};

export const auRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  updatedDate: "Last Modified: *(.+)",
  registrar: "Registrar Name: *(.+)",
  status: "Status: *(.+)",
  nameServers: "Name Server: *(.+)",
  rateLimited: "WHOIS LIMIT EXCEEDED",
  notFound: "^NOT FOUND",
};

export const usRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Registrar: *(.+)",
  status: "Domain Status: *(.+)",
  creationDate: "Creation Date: *(.+)",
  expirationDate: "Registry Expiry Date: *(.+)",
  updatedDate: "Updated Date: *(.+)",
  nameServers: "Name Server: *(.+)",
  notFound: "^No Data Found",
  dateFormat: "YYYY-MM-DDThh:mm:ssZ",
};

export const ruRegex: DomainRegex = {
  // and .рф .su
  domainName: "domain: *([^\\s]+)",
  registrar: "registrar: *(.+)",
  creationDate: "created: *(.+)",
  expirationDate: "paid-till: *(.+)",
  status: "state: *(.+)",
  notFound: "No entries found",
};

export const ukRegex: DomainRegex = {
  domainName: "Domain name:\\s*([^\\s]+)",
  registrar: "Registrar:\\s*(.+)",
  status: "Registration status:\\s*(.+)",
  creationDate: "Registered on:\\s*(.+)",
  expirationDate: "Expiry date:\\s*(.+)",
  updatedDate: "Last updated:\\s*(.+)",
  notFound: "No match for ",
  dateFormat: "DD-MMM-YYYY",
};

export const frRegex: DomainRegex = {
  domainName: "domain: *([^\\s]+)",
  registrar: "registrar: *(.+)",
  creationDate: "created: *(.+)",
  expirationDate: "Expir\\w+ Date:\\s?(.+)",
  status: "status: *(.+)",
  updatedDate: "last-update: *(.+)",
  notFound: "No entries found in ",
  dateFormat: "YYYY-MM-DDThh:mm:ssZ",
};

export const nlRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Registrar: *\\s*(.+)",
  status: "Status: *(.+)",
  notFound: "\\.nl is free",
  rateLimited: "maximum number of requests per second exceeded",
};

export const fiRegex: DomainRegex = {
  domainName: "domain\\.*: *([\\S]+)",
  registrar: "registrar\\.*: *(.*)",
  status: "status\\.*: *([\\S]+)",
  creationDate: "created\\.*: *([\\S]+)",
  updatedDate: "modified\\.*: *([\\S]+)",
  expirationDate: "expires\\.*: *([\\S]+)",
  notFound: "Domain not found",
  dateFormat: "DD.MM.YYYY hh:mm:ss",
};

export const jpRegex: DomainRegex = {
  domainName: "\\[Domain Name\\]\\s*([^\\s]+)",
  creationDate: "\\[Created on\\]\\s*(.+)",
  updatedDate: "\\[Last Updated\\]\\s?(.+)",
  expirationDate: "\\[Expires on\\]\\s?(.+)",
  status: "\\[Status\\]\\s*(.+)",
  notFound: "No match!!",
  dateFormat: "YYYY/MM/DD",
};

export const plRegex: DomainRegex = {
  domainName: "DOMAIN NAME: *([^\\s]+)[s]+$",
  registrar: "REGISTRAR: *\\s*(.+)",
  status: "Registration status:\\n\\s*(.+)",
  creationDate: "created: *(.+)",
  expirationDate: "renewal date: *(.+)",
  updatedDate: "last modified: *(.+)",
  notFound: "No information available about domain name",
  dateFormat: "YYYY.MM.DD hh:mm:ss",
};

export const brRegex: DomainRegex = {
  domainName: "domain: *([^\\s]+)\n",
  status: "status: *(.+)",
  creationDate: "created: *(.+)",
  expirationDate: "expires: *(.+)",
  updatedDate: "changed: *(.+)",
  dateFormat: "YYYYMMDD",
  notFound: "No match for ",
};

export const euRegex: DomainRegex = {
  domainName: "Domain: *([^\\n\\r]+)",
  registrar: "Registrar: *\\n *Name: *([^\\n\\r]+)",
  notFound: "Status: AVAILABLE",
};

export const eeRegex: DomainRegex = {
  domainName: "Domain: *[\\n\\r]+s*name: *([^\\n\\r]+)",
  status: "Domain: *[\\n\\r]+\\s*name: *[^\\n\\r]+\\sstatus: *([^\\n\\r]+)",
  creationDate:
    "Domain: *[\\n\\r]+\\s*name: *[^\\n\\r]+\\sstatus: *[^\\n\\r]+\\sregistered: *([^\\n\\r]+)",
  updatedDate:
    "Domain: *[\\n\\r]+\\s*name: *[^\\n\\r]+\\sstatus: *[^\\n\\r]+\\sregistered: *[^\\n\\r]+\\schanged: *([^\\n\\r]+)",
  expirationDate:
    "Domain: *[\\n\\r]+\\s*name: *[^\\n\\r]+\\sstatus: *[^\\n\\r]+\\sregistered: *[^\\n\\r]+\\schanged: *[^\\n\\r]+\\sexpire: *([^\\n\\r]+)",
  registrar: "Registrar: *[\\n\\r]+\\s*name: *([^\\n\\r]+)",
  notFound: "Domain not found",
  dateFormat: "YYYY-MM-DD",
};

export const krRegex: DomainRegex = {
  domainName: "Domain Name\\s*: *([^\\s]+)",
  creationDate: "Registered Date\\s*: *(.+)",
  updatedDate: "Last Updated Date\\s*: *(.+)",
  expirationDate: "Expiration Date\\s*: *(.+)",
  registrar: "Authorized Agency\\s*: *(.+)",
  dateFormat: "YYYY. MM. DD.",
  notFound: "The requested domain was not found ",
};

export const bgRegex: DomainRegex = {
  domainName: "DOMAIN NAME: *([^\\s]+)",
  status: "registration status:\\s*(.+)",
  notFound: "registration status: available",
  rateLimited: "Query limit exceeded",
};

export const deRegex: DomainRegex = {
  domainName: "Domain: *([^\\s]+)",
  status: "Status: *(.+)",
  updatedDate: "Changed: *(.+)",
  notFound: "Status: *free",
};

export const atRegex: DomainRegex = {
  domainName: "domain: *([^\\s]+)",
  updatedDate: "changed: *(.+)",
  registrar: "registrar: *(.+)",
  notFound: " nothing found",
  dateFormat: "YYYYMMDD hh:mm:ss",
  rateLimited: "Quota exceeded",
};

export const caRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  status: "Domain Status: *(.+)",
  updatedDate: "Updated Date: *(.+)",
  creationDate: "Creation Date: *(.+)",
  expirationDate: "Expiry Date: *(.+)",
  registrar: "Registrar: *(.+)",
  notFound: "Not found: ",
};

export const beRegex: DomainRegex = {
  domainName: "Domain:\\s*([^\\s]+)",
  registrar: "Registrar: *[\\n\\r]+\\s*Name:\\s*(.+)",
  status: "Status:\\s*(.+)",
  creationDate: "Registered: *(.+)",
  dateFormat: "ddd MMM DD YYYY",
  notFound: "Status:\\s*AVAILABLE",
};

export const infoRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Registrar: *(.+)",
  updatedDate: "Updated Date: *(.+)",
  creationDate: "Creation Date: *(.+)",
  expirationDate: "Registrar Registration Expiration Date: *(.+)",
  status: "Status: *(.+)",
  nameServers: "Name Server: *(.+)",
  notFound: "NOT FOUND",
};

export const kgRegex: DomainRegex = {
  domainName: "^Domain\\s*([^\\s]+)",
  registrar: "Domain support: \\s*(.+)",
  creationDate: "Record created:\\s*(.+)",
  expirationDate: "Record expires on:\\s*(.+)",
  updatedDate: "Record last updated on:\\s*(.+)",
  dateFormat: "ddd MMM DD HH:mm:ss YYYY",
  notFound: "domain is available for registration",
};

export const idRegex: DomainRegex = {
  domainName: "Domain Name:([^\\s]+)",
  creationDate: "Created On:(.+)",
  expirationDate: "Expiration Date(.+)",
  updatedDate: "Last Updated On(.+)",
  registrar: "Sponsoring Registrar Organization:(.+)",
  status: "Status:(.+)",
  notFound: "DOMAIN NOT FOUND",
  dateFormat: "DD-MMM-YYYY HH:mm:ss UTC",
};

export const skRegex: DomainRegex = {
  domainName: "Domain:\\s*([^\\s]+)",
  creationDate: "Created:\\s*(.+)",
  expirationDate: "Valid Until:\\s*(.+)",
  status: "EPP Status:\\s*(.+)",
  updatedDate: "Updated:\\s*(.+)",
  registrar: "Registrar:\\s*(.+)",
  dateFormat: "YYYY-MM-DD",
  notFound: "Domain not found",
};

export const seRegex: DomainRegex = {
  domainName: "domain\\.*: *([^\\s]+)",
  creationDate: "created\\.*: *(.+)",
  updatedDate: "modified\\.*: *(.+)",
  expirationDate: "expires\\.*: *(.+)",
  status: "status\\.*: *(.+)",
  registrar: "registrar: *(.+)",
  dateFormat: "YYYY-MM-DD",
  notFound: '\\" not found.',
};

export const isRegex: DomainRegex = {
  domainName: "domain\\.*: *([^\\s]+)",
  creationDate: "created\\.*: *(.+)",
  expirationDate: "expires\\.*: *(.+)",
  dateFormat: "MMM DD YYYY",
  notFound: "No entries found for query",
};

export const coRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Registrar: *(.+)",
  updatedDate: "Updated Date: *(.+)",
  creationDate: "Creation Date: *(.+)",
  expirationDate: "Expir\\w+ Date: *(.+)",
  status: "Status:\\s*(.+)\\s*\\n",
  nameServers: "Name Server: *(.+)",
  notFound: "No Data Found",
};

export const trRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Organization Name\t: *(.+)",
  creationDate: "Created on..............: *(.+)",
  expirationDate: "Expires on..............: *(.+)",
  dateFormat: "YYYY-MMM-DD",
  notFound: "No match found",
};

export const cnRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Sponsoring Registrar: *(.+)",
  creationDate: "Registration Time: *(.+)",
  expirationDate: "Expiration Time: *(.+)",
  status: "Domain Status: *(.+)",
  notFound: "No matching record.",
  dateFormat: "YYYY-MM-DD hh:mm:ss",
};

export const twRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Registrant: *(.+)",
  creationDate: "Record created on *(.+)",
  expirationDate: "Record expires on *(.+)",
  updatedDate: "Record last updated on *(.+)",
  status: "Domain Status: *(.+)",
  nameServers: "Domain servers in listed order:\\s*(.+)",
  notFound: "No found",
};

export const hkRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  creationDate: "Domain Name Commencement Date: *(.+)",
  expirationDate: "Expiry Date: *(.+)",
  status: "Domain Status: *(.+)",
  notFound: "The domain has not been registered.",
  dateFormat: "DD-MM-YYYY",
};

export const sgRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Registrar: *(.+)",
  creationDate: "Creation Date: *(.+)",
  updatedDate: "Updated Date: *(.+)",
  expirationDate: "Expiration Date: *(.+)",
  notFound: "Domain Not Found",
  dateFormat: "DD-MMM-YYYY hh:mm:ss",
};

export const thRegex: DomainRegex = {
  domainName: "Domain Name: *([^\\s]+)",
  registrar: "Registrar: *(.+)",
  status: "Status: *(.+)",
  notFound: "No match for",
};

export const vietRegex: DomainRegex = {
  domainName: "Domain name: *([^\\s]+)",
  registrar: "Registrar: *(.+)",
  creationDate: "Registration date: *(.+)",
  expirationDate: "Expiration date: *(.+)",
  status: "Status: *(.+)",
  notFound: "No Data Found",
  dateFormat: "DD-MM-YYYY",
};

export const specialDomains: Record<string, string> = {
  "gov.cn": "www.gov.cn",
  "cn.com": "www.cn.com",
  "com.cn": "www.com.cn",
  "org.cn": "www.org.cn",
  "net.cn": "www.net.cn",
  "edu.cn": "www.edu.cn",
  "mil.cn": "www.mil.cn",
  "gov.hk": "www.gov.hk",
  "edu.hk": "www.edu.hk",
  "com.hk": "www.com.hk",
  "org.hk": "www.org.hk",
  "net.hk": "www.net.hk",
  "gov.tw": "www.gov.tw",
  "edu.tw": "www.edu.tw",
  "com.tw": "www.com.tw",
  "org.tw": "www.org.tw",
  "net.tw": "www.net.tw",
  "co.kr": "www.co.kr",
  "or.kr": "www.or.kr",
  "ne.kr": "www.ne.kr",
  "ac.kr": "www.ac.kr",
  "go.kr": "www.go.kr",
};
