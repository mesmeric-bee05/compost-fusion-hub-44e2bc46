import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import helmet from 'helmet';

// In-memory store for rate limiting (NOT suitable for production)
// In production, use Redis or similar distributed store
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// Clean old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  }
}, 5 * 60 * 1000);

// Rate limiter configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window

// Initialize helmet
const helmetMiddleware = helmet();

export async function middleware(request: NextRequest) {
  // Apply security headers via helmet
  const helmetHeaders = helmetMiddleware({}, {} as any, () => {});

  const response = NextResponse.next();

  // Apply security headers
  Object.keys(helmetHeaders).forEach(key => {
    response.headers.set(key, helmetHeaders[key]);
  });

  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? 'unknown';
    const now = Date.now();

    // Get or create rate limit entry for this IP
    if (!rateLimitStore[ip]) {
      rateLimitStore[ip] = {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS,
      };
    } else {
      // Reset if window has passed
      if (now > rateLimitStore[ip].resetTime) {
        rateLimitStore[ip] = {
          count: 1,
          resetTime: now + RATE_LIMIT_WINDOW_MS,
        };
      } else {
        // Increment count
        rateLimitStore[ip].count += 1;
      }
    }

    const currentCount = rateLimitStore[ip].count;
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - currentCount);

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitStore[ip].resetTime).toISOString());

    // If rate limit exceeded, return 429
    if (currentCount > RATE_LIMIT_MAX_REQUESTS) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Content-Type': 'text/plain',
          'Retry-After': Math.ceil((rateLimitStore[ip].resetTime - now) / 1000).toString(),
        },
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};