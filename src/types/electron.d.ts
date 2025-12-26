export {};

declare global {
  interface Window {
    moviesode?: {
      pickVideoFile: () => Promise<string | null>;
    };
  }
}
