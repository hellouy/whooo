import axios from 'axios';
import fs from 'fs';

// Load WHOIS server list from a local file
const WHOIS_SERVERS_FILE = 'src/data/whois-servers.json';

async function queryRDAP(domain: string): Promise<any> {
  try {
    const response = await axios.get(`https://rdap.org/domain/${domain}`);
    if (response.data) {
      console.log('RDAP query successful:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error('RDAP query failed:', error.message);
  }
  return null;
}

async function queryWHOIS(domain: string): Promise<any> {
  try {
    const whoisServers = JSON.parse(fs.readFileSync(WHOIS_SERVERS_FILE, 'utf-8'));
    const tld = domain.split('.').pop();
    const whoisServer = whoisServers[tld];

    if (!whoisServer) {
      throw new Error(`No WHOIS server found for TLD: ${tld}`);
    }

    const response = await axios.get(`https://${whoisServer}/whois?domain=${domain}`);
    if (response.data) {
      console.log('WHOIS query successful:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error('WHOIS query failed:', error.message);
  }
  return null;
}

export async function lookupDomain(domain: string): Promise<any> {
  const rdapResult = await queryRDAP(domain);
  if (rdapResult) {
    return rdapResult;
  }
  console.log('Falling back to WHOIS query...');
  return await queryWHOIS(domain);
}
