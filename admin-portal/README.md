# CoNest Admin Portal

Professional web-based admin portal for reviewing and managing verification requests in the CoNest platform.

## Features

- 🔐 **Secure Authentication** - JWT-based admin authentication
- 📋 **Verification Queue** - Real-time queue with SLA tracking
- 👁️ **Detailed Review** - Complete verification details with flagged records
- ✅ **Approve/Reject** - One-click actions with automatic refunds
- 📊 **Statistics Dashboard** - Comprehensive analytics and insights
- 🎨 **Modern UI** - Tailwind CSS with responsive design
- 🚀 **Production Ready** - Optimized build with Vercel deployment

## Tech Stack

- **React 18** - Modern React with TypeScript
- **React Router 6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client with interceptors
- **TypeScript** - Type-safe development

## Prerequisites

- Node.js 18+
- npm or yarn
- Running CoNest backend API

## Quick Start

### 1. Install Dependencies

```bash
cd admin-portal
npm install
```

### 2. Configure Environment

Create `.env.development` for local development:

```bash
REACT_APP_API_URL=http://localhost:3001
```

### 3. Start Development Server

```bash
npm start
```

The portal will open at [http://localhost:3000](http://localhost:3000)

### 4. Login

Use an admin account email that's listed in your backend's `ADMIN_EMAILS` environment variable.

**Default development admin emails** (configured in backend):
```
admin@conest.com
support@conest.com
```

## Project Structure

```
admin-portal/
├── public/
│   ├── index.html          # HTML template
│   └── manifest.json       # PWA manifest
├── src/
│   ├── components/         # React components
│   │   ├── Layout.tsx      # Main layout with navigation
│   │   ├── VerificationQueue.tsx
│   │   ├── VerificationDetailModal.tsx
│   │   └── StatsDashboard.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx # Authentication context
│   ├── pages/
│   │   └── LoginPage.tsx   # Login page
│   ├── services/
│   │   └── api.ts          # API client with axios
│   ├── App.tsx             # Main app with routing
│   ├── index.tsx           # App entry point
│   └── index.css           # Tailwind imports
├── .env.development        # Development environment
├── .env.production         # Production environment
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vercel.json             # Vercel deployment config
```

## Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm run build`
Builds the app for production to the `build` folder

### `npm test`
Launches the test runner in interactive watch mode

## Deployment

### Deploy to Vercel (Recommended)

#### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Add custom domain
vercel domains add admin.conest.app
```

#### Option 2: Vercel Dashboard

1. Push code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/dashboard)
3. Configure environment variables:
   - `REACT_APP_API_URL` = `https://api.conest.app`
4. Deploy

### Configure Custom Domain

#### DNS Configuration

Add CNAME record in your DNS provider:

```
admin.conest.app  CNAME  your-project.vercel.app
```

#### Vercel Dashboard

1. Go to Project Settings → Domains
2. Add `admin.conest.app`
3. Vercel will auto-provision SSL certificate

### Environment Variables

Set in Vercel dashboard or use `vercel env`:

```bash
# Production API URL
vercel env add REACT_APP_API_URL production
# Enter: https://api.conest.app
```

## Backend Configuration

Ensure your backend is configured to accept requests from the admin portal:

### CORS Configuration

Update `backend/.env`:

```env
CORS_ORIGIN=https://conest.app,https://admin.conest.app
```

### Admin Emails

Update `backend/.env`:

```env
ADMIN_EMAILS=admin@conest.com,yourname@conest.com
```

## Features Guide

### Verification Queue

- **SLA Tracking**: Color-coded indicators (🔴 <12h, 🟠 <24h, 🟢 >24h)
- **Sorting**: Oldest verifications first (SLA compliance)
- **Filtering**: View by status and flagged records
- **Real-time**: Manual refresh button

### Verification Review

**Review Process**:
1. Click "Review" on any queue item
2. Review user information
3. Check ID verification status
4. Examine flagged background check records
5. Review payment history
6. Provide detailed notes (required)
7. Approve or Reject

**Approve**:
- Updates verification status to "approved"
- User can now send connection requests
- Admin notes logged

**Reject & Refund**:
- Updates verification status to "rejected"
- Processes automatic 100% refund via Stripe
- User receives refund notification
- Admin notes logged

### Statistics Dashboard

**Verification Metrics**:
- Total verifications
- Fully verified count
- Approved/Rejected/Pending counts
- Average verification score

**Payment Metrics**:
- Total payments and revenue
- Successful payment count
- Total refunded amount
- Refund rate percentage

**Quick Insights**:
- Verification completion rate
- Approval/Rejection rates
- Average revenue per payment

## API Integration

The portal uses the following backend endpoints:

### Authentication
- `POST /api/auth/login` - Admin login

### Verification Management
- `GET /api/admin/verifications/queue` - Get review queue
- `GET /api/admin/verifications/:userId` - Get details
- `POST /api/admin/verifications/:userId/approve` - Approve
- `POST /api/admin/verifications/:userId/reject` - Reject & refund

### Statistics
- `GET /api/admin/verifications/stats/overview` - Get statistics
- `GET /api/admin/users/search?query=` - Search users

## Security

### Admin Authentication

- JWT token-based authentication
- Tokens stored in `localStorage`
- Automatic token refresh on API calls
- Automatic logout on 401 responses

### Admin Authorization

Backend validates admin access by checking user email against `ADMIN_EMAILS` environment variable.

**Add admin users**:
```env
# backend/.env
ADMIN_EMAILS=admin@conest.com,yourname@conest.com,support@conest.com
```

### Protected Routes

All routes except `/login` require authentication. Unauthenticated users are redirected to login page.

## Troubleshooting

### Cannot Login

**Problem**: "Admin access required" error

**Solution**:
- Ensure your email is in `ADMIN_EMAILS` in backend `.env`
- Restart backend after updating environment variables
- Check backend logs for authentication errors

### API Connection Failed

**Problem**: Cannot connect to API

**Solution**:
- Check `REACT_APP_API_URL` in `.env` file
- Ensure backend is running
- Check CORS configuration in backend
- Verify network connectivity

### Build Errors

**Problem**: Build fails with TypeScript errors

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment Issues

**Problem**: Vercel deployment fails

**Solution**:
- Ensure all environment variables are set in Vercel dashboard
- Check build logs for specific errors
- Verify `vercel.json` configuration

## Development

### Adding New Features

1. Create component in `src/components/`
2. Add route in `src/App.tsx`
3. Update navigation in `src/components/Layout.tsx`
4. Add API call in `src/services/api.ts`

### Code Style

- TypeScript strict mode enabled
- Functional components with hooks
- Tailwind CSS for styling
- Axios for API calls

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Production Checklist

- [ ] Configure `REACT_APP_API_URL` for production
- [ ] Update `ADMIN_EMAILS` in backend
- [ ] Configure CORS in backend
- [ ] Set up custom domain (`admin.conest.app`)
- [ ] Enable SSL/HTTPS
- [ ] Test admin login
- [ ] Test verification review flow
- [ ] Verify statistics dashboard
- [ ] Monitor error logs

## Support

For issues or questions:
- Backend API: Check [backend/README.md](../backend/README.md)
- Deployment: Check [Vercel Documentation](https://vercel.com/docs)
- Questions: Contact development team

## License

Copyright © 2025 CoNest. All rights reserved.
