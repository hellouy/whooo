
import { WhoisData } from "./use-whois-lookup";
import { processWhoisResults } from "@/utils/whoiserProcessor";
import whoiser from "whoiser";

export const useDirectLookup = () => {
  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    try {
      console.log("Attempting direct whoiser lookup for:", domain);
      
      // Use the whoiser library correctly
      // For version 2.0.0-beta.3, we need to access the lookup function
      const whoiserResult = await whoiser.lookup(domain);
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
