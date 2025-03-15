
import { WhoisData } from "./use-whois-lookup";
import { processWhoisResults } from "@/utils/whoiserProcessor";
import * as whoiserLib from "whoiser";

export const useDirectLookup = () => {
  const performDirectLookup = async (domain: string): Promise<WhoisData> => {
    try {
      console.log("Attempting direct whoiser lookup for:", domain);
      
      // Access the lookup function from the whoiser library
      // The structure of the library might have changed in newer versions
      const lookup = whoiserLib.lookup || whoiserLib.default || 
                     (typeof whoiserLib === 'function' ? whoiserLib : null);
      
      if (!lookup || typeof lookup !== 'function') {
        console.error("Whoiser lookup function not found in library");
        throw new Error("Whoiser library doesn't provide a lookup function");
      }
      
      // Call the lookup function with the domain
      const whoiserResult = await lookup(domain, { follow: 3 });
      
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
