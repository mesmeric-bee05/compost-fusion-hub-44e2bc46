/**
 * Structured logger. No-op friendly; ready for Sentry/PostHog later.
 */
type Level = "info" | "warn" | "error";

interface LogPayload {
  level: Level;
  message: string;
  context?: Record<string, unknown>;
}

function emit({ level, message, context }: LogPayload) {
  const entry = { ts: new Date().toISOString(), level, message, ...context };
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else if (import.meta.env.DEV) console.log(entry);
}

export const log = {
  info: (message: string, context?: Record<string, unknown>) => emit({ level: "info", message, context }),
  warn: (message: string, context?: Record<string, unknown>) => emit({ level: "warn", message, context }),
  error: (message: string, context?: Record<string, unknown>) => emit({ level: "error", message, context }),
};

/** Safely surfaces a user-facing error message without leaking internals. */
export function toFriendlyError(err: unknown): string {
  if (err instanceof Error) {
    if (/network|fetch|offline/i.test(err.message)) return "Network error. Please check your connection.";
    if (/permission|denied|rls/i.test(err.message)) return "You don't have permission to do that.";
    if (/rate|429|too many/i.test(err.message)) return "Too many requests. Please wait a moment.";
    return err.message.length > 140 ? "Something went wrong. Please try again." : err.message;
  }
  return "Something went wrong. Please try again.";
}
