
import { WhoisData } from "./use-whois-lookup";
import { processWhoisResults } from "@/utils/whoiserProcessor";
import * as whoiser from "whoiser";

export const useDirectLookup = () => {
  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    try {
      console.log("Attempting direct whoiser lookup for:", domain);
      
      // According to whoiser 2.0.0-beta.3 documentation, it should be used as follows
      // The library exports multiple functions but not as default export
      const whoiserResult = await whoiser.lookup({
        domain: domain,
        follow: 3 // Follow redirects for up to 3 times to get more complete data
      });
      
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
