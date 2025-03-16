
/// <reference types="vite/client" />

// Add declarations for whoiser module
declare module 'whoiser' {
  interface WhoiserOptions {
    server?: string;
    follow?: number;
    [key: string]: any;
  }

  function whoiser(domain: string, options?: WhoiserOptions): Promise<any>;
  
  export = whoiser;
}
