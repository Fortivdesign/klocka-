import type { KlockaApi } from '../electron/preload';

declare global {
  interface Window {
    klocka: KlockaApi;
  }
}

export {};
