
// Re-export the handler for Vercel API
module.exports = async (req, res) => {
  try {
    // This is a proxy to the actual handler
    const handler = require('../pages/api/direct-whois.js');
    
    // Call the handler directly
    if (typeof handler.default === 'function') {
      return handler.default(req, res);
    } 
    
    if (typeof handler === 'function') {
      return handler(req, res);
    }
    
    // If we get here, something is wrong with the handler
    return res.status(500).json({
      success: false,
      error: "Handler not properly exported"
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error"
    });
  }
};

// Also export as ES module
export default module.exports;
