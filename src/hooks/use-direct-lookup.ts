
import { WhoisData } from "./use-whois-lookup";
import { processWhoisResults } from "@/utils/whoiserProcessor";
import * as whoiser from "whoiser";

export const useDirectLookup = () => {
  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    try {
      console.log("Attempting direct whoiser lookup for:", domain);
      
      // Use the correct whoiser API - it doesn't have a direct lookup method
      // Instead, we use the domain method
      const whoiserResult = await whoiser.domain(domain);
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
