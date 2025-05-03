
/// <reference types="vite/client" />

// Add declarations for whoiser module
declare module 'whoiser' {
  interface WhoiserOptions {
    server?: string;
    follow?: number;
    timeout?: number;
    [key: string]: any;
  }

  // Make the module export a namespace that includes the lookup function
  const whoiser: {
    lookup: (domain: string, options?: WhoiserOptions) => Promise<any>;
    // Add other whoiser methods if needed
  };
  
  export = whoiser;
}
