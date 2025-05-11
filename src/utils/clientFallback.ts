
import axios from 'axios';
import { formatDomain } from './apiUtils';

/**
 * Client-side fallback for when the API endpoint is not available
 * This is especially useful in Lovable preview environments where 
 * the API routes may not be properly deployed
 */
export async function clientFallbackLookup(domain: string) {
  const formattedDomain = formatDomain(domain);
  
  try {
    console.log("尝试使用客户端后备查询机制...");
    
    // First try to get the static JSON file
    const response = await axios.get('/api/direct-whois.json', {
      timeout: 5000
    });
    
    if (response.data && response.data.success) {
      console.log("成功从客户端后备获取数据");
      
      // Replace placeholders in the data
      let responseData = JSON.stringify(response.data);
      responseData = responseData.replace(/\{DOMAIN\}/g, formattedDomain);
      
      // Parse back to object
      const processedData = JSON.parse(responseData);
      
      return processedData;
    }
  } catch (error) {
    console.error("客户端后备查询失败:", error);
  }
  
  // If static file fails, generate a response on the client
  console.log("生成本地模拟数据...");
  
  const now = new Date();
  const expiryDate = new Date();
  expiryDate.setFullYear(now.getFullYear() + 1);
  
  return {
    success: true,
    source: "client-generated",
    data: {
      domain: formattedDomain,
      whoisServer: "client.fallback.lovable",
      registrar: "Lovable Client Fallback",
      registrationDate: now.toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      nameServers: [
        "ns1.lovable-fallback.com",
        "ns2.lovable-fallback.com"
      ],
      registrant: "Lovable User",
      status: "clientTransferProhibited",
      rawData: `This is generated client-side fallback data for ${formattedDomain} when the API endpoint is not available.\nCreated: ${now.toISOString()}`,
      protocol: "whois" as "whois" | "rdap" | "error"
    }
  };
}
