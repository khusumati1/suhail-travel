/**
 * Type definitions for Deno global namespace.
 * Used to satisfy IDE linting in hybrid Node/Deno projects.
 */
declare namespace Deno {
  export interface MemoryUsage {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  }
  export function memoryUsage(): MemoryUsage;

  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): { [key: string]: string };
  }
  export const env: Env;

  export interface ServeOptions {
    port?: number;
    hostname?: number;
    handler: (request: Request, info: any) => Response | Promise<Response>;
  }
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
  export function serve(options: any, handler: (request: Request) => Response | Promise<Response>): void;
}
