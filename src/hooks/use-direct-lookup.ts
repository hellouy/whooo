
import { WhoisData } from "./use-whois-lookup";
import { processWhoisResults } from "@/utils/whoiserProcessor";
import whoiser from "whoiser";

export const useDirectLookup = () => {
  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    try {
      console.log("Attempting direct whoiser lookup for:", domain);
      
      // The correct way to use whoiser in v2.0.0-beta.3
      // whoiser is an object with methods, not directly callable
      const whoiserResult = await whoiser.lookup(domain, { follow: 3 });
      
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
