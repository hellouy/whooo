
/// <reference types="vite/client" />

// Add declarations for whoiser module
declare module 'whoiser' {
  interface WhoiserOptions {
    server?: string;
    follow?: number;
    timeout?: number;
    [key: string]: any;
  }

  export function lookup(domain: string, options?: WhoiserOptions): Promise<any>;
  
  // Add other whoiser methods if needed
}
