# CoNest Admin Portal - Deployment Guide

Complete guide for deploying the admin portal to `admin.conest.app` with Vercel.

## Prerequisites

- ✅ Domain `conest.app` configured and working
- ✅ Backend API running at `api.conest.app` (or `conest.app/api`)
- ✅ Vercel account (free tier is sufficient)
- ✅ Admin emails configured in backend

## Deployment Steps

### Step 1: Prepare Backend

#### 1.1 Configure Admin Emails

Update `backend/.env`:

```env
# Admin Configuration
ADMIN_EMAILS=admin@conest.com,yourname@conest.com
```

#### 1.2 Update CORS

```env
# CORS Configuration
CORS_ORIGIN=https://conest.app,https://admin.conest.app,http://localhost:3000
```

#### 1.3 Restart Backend

```bash
cd backend
# If using Docker
docker-compose restart

# If running directly
npm run dev
```

### Step 2: Build Admin Portal

```bash
cd admin-portal

# Install dependencies
npm install

# Test build locally
npm run build

# Test production build
serve -s build
# Visit http://localhost:3000
```

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI (Fastest)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Expected output:
# ✅ Production: https://conest-admin-xyz.vercel.app
```

#### Option B: Using Vercel Dashboard

1. **Push to GitHub**:
   ```bash
   cd admin-portal
   git init
   git add .
   git commit -m "Initial admin portal"
   git remote add origin https://github.com/yourusername/conest-admin.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import from GitHub
   - Select `conest-admin` repository
   - Configure:
     - **Framework Preset**: Create React App
     - **Root Directory**: `./` (or `admin-portal/` if in monorepo)
     - **Build Command**: `npm run build`
     - **Output Directory**: `build`

3. **Add Environment Variable**:
   - Go to Project Settings → Environment Variables
   - Add variable:
     - **Name**: `REACT_APP_API_URL`
     - **Value**: `https://api.conest.app`
     - **Environment**: Production
   - Click "Save"

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete (~2 minutes)
   - Get deployment URL: `https://conest-admin-xyz.vercel.app`

### Step 4: Configure Custom Domain

#### 4.1 Add Domain in Vercel

**Using CLI**:
```bash
vercel domains add admin.conest.app
```

**Using Dashboard**:
1. Go to Project Settings → Domains
2. Click "Add Domain"
3. Enter `admin.conest.app`
4. Click "Add"

#### 4.2 Configure DNS

In your DNS provider (Cloudflare, Namecheap, etc.):

**Add CNAME Record**:
```
Type:  CNAME
Name:  admin
Value: cname.vercel-dns.com
TTL:   Auto or 3600
```

**Alternative (if using A record)**:
```
Type:  A
Name:  admin
Value: 76.76.21.21
TTL:   Auto or 3600
```

**Verify Configuration**:
```bash
# Check DNS propagation
dig admin.conest.app

# Or use online tool
# https://dnschecker.org/#A/admin.conest.app
```

#### 4.3 Wait for SSL

Vercel automatically provisions SSL certificate:
- Initial setup: 5-10 minutes
- DNS propagation: Up to 24 hours (usually <1 hour)

**Check SSL Status**:
- Vercel Dashboard → Domains → admin.conest.app
- Status should show "Valid Certificate"

### Step 5: Verify Deployment

#### 5.1 Access Admin Portal

Visit: `https://admin.conest.app`

Expected: Login page with CoNest branding

#### 5.2 Test Login

1. Enter admin email (from `ADMIN_EMAILS`)
2. Enter password
3. Should redirect to verification queue

**If login fails**:
- Check browser console for errors
- Verify `REACT_APP_API_URL` is correct
- Check backend CORS configuration
- Verify backend is accessible

#### 5.3 Test Functionality

- [ ] Login with admin credentials
- [ ] View verification queue
- [ ] Open verification detail modal
- [ ] Check statistics dashboard
- [ ] Logout and re-login

### Step 6: Production Configuration

#### 6.1 Security Headers

Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### 6.2 Enable Analytics

Vercel Dashboard → Project → Analytics → Enable

#### 6.3 Configure Alerts

Vercel Dashboard → Project → Settings → Notifications:
- Enable deployment notifications
- Enable error alerts
- Add email for notifications

## Continuous Deployment

### Auto-Deploy on Git Push

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update admin portal"
git push

# Vercel automatically:
# 1. Detects push
# 2. Builds project
# 3. Deploys to production
# 4. Updates admin.conest.app
```

### Preview Deployments

Every pull request gets a unique preview URL:

```bash
# Create feature branch
git checkout -b feature/new-admin-feature

# Make changes and push
git push origin feature/new-admin-feature

# Create PR in GitHub
# Vercel creates preview: https://conest-admin-git-feature-xyz.vercel.app
```

## Monitoring

### Check Deployment Logs

```bash
# Using Vercel CLI
vercel logs

# Or in Vercel Dashboard
# Project → Deployments → [Latest] → View Logs
```

### Monitor Performance

Vercel Dashboard → Analytics:
- Page views
- Unique visitors
- Top pages
- Response times

### Error Tracking

Browser Console:
- Check for API errors
- Verify CORS issues
- Monitor authentication failures

## Troubleshooting

### DNS Not Resolving

**Problem**: `admin.conest.app` doesn't load

**Solution**:
```bash
# Check DNS
dig admin.conest.app

# Should show:
# admin.conest.app. 300 IN CNAME cname.vercel-dns.com.
```

If not:
- Verify DNS record is correct
- Wait for DNS propagation (up to 24h)
- Try clearing DNS cache: `sudo dscacheutil -flushcache`

### SSL Certificate Error

**Problem**: "Your connection is not private"

**Solution**:
- Wait 5-10 minutes for Vercel to provision SSL
- Check Vercel Dashboard → Domains → Certificate status
- If still failing, remove and re-add domain

### API Connection Failed

**Problem**: "Failed to load verification queue"

**Solution**:
1. Open browser console (F12)
2. Check Network tab for failed requests
3. Verify API URL:
   ```javascript
   console.log(process.env.REACT_APP_API_URL)
   // Should show: https://api.conest.app
   ```
4. Test API directly:
   ```bash
   curl https://api.conest.app/health
   ```
5. Check CORS in backend:
   ```env
   CORS_ORIGIN=https://admin.conest.app
   ```

### Admin Login Fails

**Problem**: "Admin access required"

**Solution**:
1. Check backend logs for authentication errors
2. Verify email in `ADMIN_EMAILS`:
   ```bash
   # In backend
   echo $ADMIN_EMAILS
   ```
3. Restart backend after updating `ADMIN_EMAILS`
4. Try login with correct admin email

### Build Fails

**Problem**: Vercel build fails

**Solution**:
1. Check build logs in Vercel Dashboard
2. Test build locally:
   ```bash
   npm run build
   ```
3. Fix TypeScript errors
4. Ensure all dependencies are in `package.json`
5. Verify Node.js version matches (18+)

## Rollback

### Rollback to Previous Deployment

**Using Dashboard**:
1. Vercel Dashboard → Deployments
2. Find working deployment
3. Click "..." → Promote to Production

**Using CLI**:
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel promote <deployment-url>
```

## Advanced Configuration

### Custom Domain with Subdomain

If you want `admin.app.conest.com`:

```
Type:  CNAME
Name:  admin.app
Value: cname.vercel-dns.com
```

### Multiple Environments

**Staging**:
```bash
# Deploy to staging
vercel

# Get preview URL
# Add staging domain: staging-admin.conest.app
```

**Production**:
```bash
# Deploy to production
vercel --prod

# Uses: admin.conest.app
```

## Performance Optimization

### Enable Compression

Automatic with Vercel (gzip + brotli)

### CDN Caching

Vercel Edge Network:
- Static assets: Cached globally
- API routes: Not cached
- HTML: Short cache (revalidation)

### Build Optimization

```bash
# Analyze bundle size
npm install -g source-map-explorer
npm run build
source-map-explorer 'build/static/js/*.js'
```

## Support

**Vercel Issues**:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)

**DNS Issues**:
- Check with your DNS provider
- Use [DNS Checker](https://dnschecker.org)

**Backend Issues**:
- Check backend logs
- Verify CORS configuration
- Test API endpoints directly

## Checklist

### Pre-Deployment
- [ ] Backend running at `api.conest.app`
- [ ] `ADMIN_EMAILS` configured
- [ ] CORS includes `admin.conest.app`
- [ ] Local build successful

### Deployment
- [ ] Vercel project created
- [ ] Environment variables set
- [ ] Build successful
- [ ] Preview deployment works

### DNS Configuration
- [ ] CNAME record added
- [ ] DNS propagated
- [ ] SSL certificate valid

### Post-Deployment
- [ ] `admin.conest.app` accessible
- [ ] Login works
- [ ] Queue loads
- [ ] Statistics work
- [ ] Approve/reject functions work

### Monitoring
- [ ] Analytics enabled
- [ ] Error tracking configured
- [ ] Deployment notifications enabled

---

**Deployment Complete!** 🎉

Your admin portal is now live at `https://admin.conest.app`
