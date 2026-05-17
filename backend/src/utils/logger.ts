export const logger = {
  info(message: string): void {
    console.log(`[info] ${message}`);
  },
  error(message: string, error?: unknown): void {
    console.error(`[error] ${message}`, error || "");
  },
};
