import pino from "pino";

// Structured JSON logger — used everywhere instead of console.log/error
// In development, set LOG_LEVEL=debug for verbose output
export const log = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "nasaq-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
});
