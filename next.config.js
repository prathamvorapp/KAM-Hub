/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure for production with strict CSP
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Development CSP - more permissive for hot reload and debugging
    const devCSP = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; connect-src 'self' https: http: wss: ws: https://*.convex.cloud wss://*.convex.cloud http://localhost:* http://127.0.0.1:* http://192.168.4.210:*; img-src 'self' data: blob: https:; media-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval';";
    
    // Production CSP - strict security
    const prodCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Note: Consider using nonces in future
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.vercel.app",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: isDevelopment ? devCSP : prodCSP
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // HSTS - only in production
          ...(isDevelopment ? [] : [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }])
        ]
      }
    ]
  }
}

module.exports = nextConfig