# KAM Dashboard - Unified Next.js Application

A comprehensive Key Account Manager (KAM) dashboard built with Next.js, Convex, and Caddy for secure HTTPS access.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Start Development Environment (One Command)

```bash
npm run dev
```

This single command starts:
1. **Convex Backend** - Database and real-time functions
2. **Next.js Server** - Application server (internal port 3022)
3. **Caddy Proxy** - HTTPS gateway (public port 3020)

The script automatically waits 8 seconds for Next.js to initialize before starting Caddy.

### Access Your Application

**Primary URL:** https://localhost:3020

When you first access the app, your browser will show a certificate warning (normal for development). Click "Advanced" → "Proceed to localhost".

### Stop Development

Press `Ctrl+C` in the terminal to stop all services.

## 🏗️ Architecture

```
Browser
   ↓
Caddy (Port 3020) - HTTPS Entry Point
   ↓
Next.js (Port 3022) - Internal Application Server
   ↓
Convex (Cloud) - Database & Real-time Backend
```

### Why This Architecture?

- **Single Entry Point**: Always access via https://localhost:3020
- **HTTPS by Default**: Secure connections in development
- **Security Headers**: CORS, XSS protection, and more
- **Performance**: Gzip/Zstd compression enabled
- **Logging**: All requests logged for debugging
- **Production-Ready**: Same setup works in production

## 📊 Port Configuration

| Service | Port | Protocol | Access |
|---------|------|----------|--------|
| Caddy Proxy | 3020 | HTTPS | Public (use this) |
| Next.js Server | 3022 | HTTP | Internal only |
| Convex Backend | Cloud | WSS/HTTPS | Automatic |

## 🛠️ Development

### Start Development
```bash
npm run dev
```

This starts all services (Convex, Next.js, and Caddy) with one command.

### Stop Development
Press `Ctrl+C` in the terminal.

### Individual Services (for debugging)
```bash
# Only Next.js
npm run dev:next

# Only Convex
npm run dev:convex
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm run start:prod
```

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── login/             # Authentication pages
│   └── ...
├── components/            # React components
├── convex/               # Convex backend functions
├── lib/                  # Utilities and helpers
├── caddy/                # Caddy executable
├── Caddyfile             # Caddy configuration
├── start-dev.bat         # Unified startup script
└── package.json          # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

The application uses `.env.local` for configuration:

```bash
# Convex Configuration
CONVEX_DEPLOYMENT=dev:opulent-rabbit-360
CONVEX_URL=https://opulent-rabbit-360.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://opulent-rabbit-360.convex.cloud

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Application Configuration
# Primary access URL: https://localhost:3020
```

### Caddy Configuration

The `Caddyfile` is pre-configured with:
- HTTPS on port 3020
- Proxy to Next.js on port 3022
- Security headers
- Compression
- Health checks
- Request logging

To validate the configuration:
```bash
npm run caddy:validate
```

## 🔐 Security Features

✅ **HTTPS/TLS Encryption** - All traffic encrypted
✅ **CORS Headers** - Configured for API access
✅ **XSS Protection** - Cross-site scripting prevention
✅ **Content Sniffing Prevention** - X-Content-Type-Options
✅ **Clickjacking Protection** - X-Frame-Options
✅ **Secure Referrer Policy** - Privacy protection

## ⚡ Performance Features

✅ **Gzip Compression** - ~70% size reduction
✅ **Zstd Compression** - ~75% size reduction (better than gzip)
✅ **Health Checks** - Automatic monitoring every 30s
✅ **Connection Pooling** - Optimized connections
✅ **Request Logging** - JSON format for analysis

## 📝 Available Scripts

```bash
npm run dev              # Start all services (Convex + Next.js + Caddy)
npm run dev:next         # Start only Next.js on port 3022
npm run dev:convex       # Start only Convex backend
npm run build            # Build for production
npm run start            # Start production Next.js server
npm run start:prod       # Start production with Caddy
npm run lint             # Run ESLint
npm run caddy:validate   # Validate Caddyfile
npm run caddy:format     # Format Caddyfile
```

## 🧪 Testing

### Test the Setup
```bash
test-caddy-setup.bat
```

This validates:
- Caddy executable exists
- Caddyfile syntax is valid
- Scripts are configured
- Documentation is present

### Access Logs
```bash
# View access logs (JSON format)
type access.log

# View Caddy error logs
type caddy.log
```

## 🐛 Troubleshooting

### Port 3020 Already in Use?

Edit `Caddyfile` line 11:
```
:3020 {  # Change to another port like :3021
```

Then update your access URL accordingly.

### Certificate Warning in Browser?

This is normal for development with self-signed certificates. Click:
1. "Advanced" or "Show Details"
2. "Proceed to localhost" or "Accept Risk"

For production, use a real domain and Caddy will automatically get Let's Encrypt certificates.

### Services Won't Start?

1. Check if ports 3020 or 3022 are already in use
2. Ensure `caddy.exe` exists in the `caddy` folder
3. Validate Caddyfile: `npm run caddy:validate`
4. Check logs: `type caddy.log`

### Convex Connection Issues?

1. Verify `NEXT_PUBLIC_CONVEX_URL` in `.env.local`
2. Check Convex dashboard at https://dashboard.convex.dev
3. Ensure `npx convex dev` is running

## 📚 Documentation

- `START_HERE_CADDY.md` - Quick start guide
- `CADDY_SETUP_GUIDE.md` - Detailed setup instructions
- `CADDY_ARCHITECTURE.md` - Architecture details
- `CADDY_QUICK_REFERENCE.md` - Quick reference

## 🚀 Deployment

### Production Deployment

1. Update `Caddyfile` with your domain:
```
yourdomain.com {
    reverse_proxy localhost:3022
}
```

2. Caddy will automatically:
   - Get Let's Encrypt SSL certificates
   - Handle HTTPS
   - Renew certificates automatically

3. Deploy your Next.js app and Caddy together

## 🎯 Key Features

### Dashboard Features
- User authentication and role-based access
- Visit management and tracking
- Demo scheduling and management
- Health check monitoring
- Churn analytics and CSV upload
- MOM (Minutes of Meeting) management
- Follow-up notifications
- Team statistics and reporting

### Technical Features
- Server-side rendering (SSR)
- Real-time data with Convex
- API routes for backend logic
- Responsive design with Tailwind CSS
- Type-safe with TypeScript
- Secure authentication with JWT

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the documentation files
3. Check Caddy logs: `type caddy.log`
4. Check access logs: `type access.log`

## 📄 License

MIT

---

**Ready to start?** Run `start-dev.bat` and access your app at https://localhost:3020 🚀
