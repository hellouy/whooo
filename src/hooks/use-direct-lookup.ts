
import { WhoisData } from "./use-whois-lookup";
import { processWhoisResults } from "@/utils/whoiserProcessor";
// Use require instead of import for whoiser
const whoiser = require("whoiser");
// Import the WHOIS servers JSON file
const whoisServers = require("../../api/whois-servers.json");

export const useDirectLookup = () => {
  // Function to extract TLD from domain
  const extractTLD = (domain: string): string | null => {
    // Remove protocol and www prefix
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
    
    // Split domain parts
    const parts = domain.split('.');
    
    // Handle compound TLDs
    if (parts.length >= 3) {
      const lastTwo = parts[parts.length - 2] + '.' + parts[parts.length - 1];
      // Check if it's a compound TLD (like .co.uk, .com.cn, etc.)
      if (whoisServers[lastTwo]) {
        return lastTwo;
      }
    }
    
    // Return standard TLD
    return parts.length > 1 ? parts[parts.length - 1] : null;
  };

  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    try {
      console.log("Attempting direct whoiser lookup for:", domain);
      
      // Get the TLD to find the specific WHOIS server
      const tld = extractTLD(domain);
      console.log("Domain TLD:", tld);
      
      // Determine which WHOIS server to use based on TLD
      let options: { follow: number; server?: string } = { follow: 3 };
      
      if (tld && whoisServers[tld]) {
        console.log(`Using specific WHOIS server for .${tld}:`, whoisServers[tld]);
        // Add server option from whois-servers.json
        options = { ...options, server: whoisServers[tld] };
      }
      
      // Use whoiser as a function with our enhanced options
      const whoiserResult = await whoiser(domain, options);
      
      console.log("Whoiser raw result:", whoiserResult);
      
      // Process the whoiser results with our utility function
      const result = processWhoisResults(domain, whoiserResult);
      console.log("Processed whoiser result:", result);
      
      return result;
    } catch (error) {
      console.error("Direct whoiser lookup error:", error);
      throw error;
    }
  };

  return { performDirectLookup };
};
