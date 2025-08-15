# SkillBridge Single-Tenant Deployment Guide

## Quick Start Clone & Setup

This guide walks you through cloning and deploying a fresh SkillBridge single-tenant instance.

### Prerequisites

- Node.js 18+ and npm/yarn
- Access to a Supabase project
- Domain name (for production)
- Git access to this repository

---

## 🚀 Initial Deployment

### Step 1: Clone Repository

```bash
git clone <repository-url> skillbridge-client
cd skillbridge-client
npm install
```

### Step 2: Environment Configuration

Copy the example environment file and customize:

```bash
cp .env.example .env
```

#### Configure Environment Variables

**CRITICAL: VITE_* vs Server-Only Variables**

| Variable Type | Usage | Required |
|--------------|-------|----------|
| `VITE_*` | Client-side (exposed to browser) | ✅ Must set |
| `*_SECRET_KEY` | Server-side only (scripts, edge functions) | ✅ Must set |
| `DATABASE_URL` | Server-side only (optional) | ❌ Optional |

**Required Client Variables (VITE_*)**
```bash
# Organization Configuration
VITE_ORG_ID=<generate-new-uuid>
VITE_ORG_NAME="Your Company Learning"
VITE_ORG_SLUG="yourcompany"
VITE_ORG_CONTACT_EMAIL="admin@yourcompany.com"

# Application URLs
VITE_APP_URL="https://learning.yourcompany.com"
VITE_APP_DOMAIN="learning.yourcompany.com"

# Supabase Configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"

# Admin User (for initial setup)
VITE_DEFAULT_ADMIN_EMAIL="admin@yourcompany.com"
VITE_DEFAULT_ADMIN_PASSWORD="YourSecurePassword123!"
VITE_DEFAULT_ADMIN_FIRST_NAME="Admin"
VITE_DEFAULT_ADMIN_LAST_NAME="User"

# Branding (optional)
VITE_ORG_PRIMARY_COLOR="#059669"
VITE_ORG_LOGO_URL=""
```

**Required Server Variables (Scripts/Edge Functions)**
```bash
# Server-side Supabase access
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Optional external services
RESEND_API_KEY="your-resend-key"
```

> ⚠️ **Security Note**: Never commit actual secrets to git. Use deployment-specific environment configuration.

### Step 3: Database Setup

#### Run Migrations

```bash
# Apply all database migrations
npx supabase db reset
# OR if using existing database:
npx supabase db push
```

#### Initial Seeding

```bash
# Seed fresh single-tenant data
node scripts/seed-single.js
```

Expected output:
```
🌱 Starting single-tenant seeding...
📋 Organization: Your Company Learning (yourcompany)
🏢 Setting up organization...
👤 Creating admin user...
📚 Creating sample courses...
✅ Seeding completed successfully!
🚀 Your SkillBridge instance is ready to use!
```

### Step 4: Configure App Settings

Set the default organization ID in the database:

```bash
# Get the org ID from seeding output, then:
npx supabase sql --db-url="$DATABASE_URL" --file=- <<EOF
UPDATE app_settings 
SET default_org_id = '<org-id-from-seeding>'
WHERE id = 1;
EOF
```

Or use the admin panel after first login to verify in Deployment Health widget.

### Step 5: Update Branding

#### Logo & Favicon
1. Place logo files in `public/` directory
2. Update environment variables:
   ```bash
   VITE_ORG_LOGO_URL="/logo.png"
   VITE_ORG_FAVICON_URL="/favicon.ico"
   ```

#### Colors & Theme
Update in `.env`:
```bash
VITE_ORG_PRIMARY_COLOR="#your-brand-color"
```

The color will automatically apply to the entire design system.

### Step 6: Supabase Authentication Setup

#### URL Configuration
In Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://learning.yourcompany.com
```

**Redirect URLs (add all that apply):**
```
https://learning.yourcompany.com
https://preview-abc123.lovable.app  # Preview URL
http://localhost:5173              # Development
```

#### CORS Origins
In Supabase Dashboard → Settings → API → CORS:
```
https://learning.yourcompany.com
https://preview-abc123.lovable.app
http://localhost:5173
```

### Step 7: Build & Deploy

```bash
# Production build
npm run build

# Test preview locally
npm run preview
```

### Step 8: Smoke Testing

Test these critical paths:

#### Authentication Flow
1. ✅ Visit `/auth` - should load login page
2. ✅ Login with admin credentials from `.env`
3. ✅ Should redirect to dashboard without errors

#### Admin Functions
1. ✅ Visit `/admin` - should show admin dashboard
2. ✅ Check Deployment Health widget shows:
   - Correct ORG_ID
   - User count: 1+
   - No red error badges
3. ✅ Visit `/admin/users` - should list admin user

#### Core Features
1. ✅ Visit `/courses` - should show seeded courses
2. ✅ Visit `/profile` - should show admin profile
3. ✅ Test enrollment in a course
4. ✅ Verify no console errors

#### Branding Verification
1. ✅ Logo appears in navigation (if configured)
2. ✅ Primary color theme applied
3. ✅ Correct favicon in browser tab
4. ✅ Organization name in page titles

---

## 🔄 Update Flow (From Git Tag)

### Production Update Process

When updating an existing deployment to a new version:

#### Step 1: Backup Current State
```bash
# Backup database (recommended)
npx supabase db dump > backup-$(date +%Y%m%d).sql

# Note current git commit
git rev-parse HEAD > current-version.txt
```

#### Step 2: Pull Latest Code
```bash
# Fetch and checkout specific version tag
git fetch --tags
git checkout tags/v1.2.0  # Replace with desired version

# Install any new dependencies
npm install
```

#### Step 3: Apply Database Changes
```bash
# Run any new migrations
npx supabase db push

# Check for migration conflicts
npx supabase db diff
```

#### Step 4: Update Seed Data (If Needed)
```bash
# For major updates that include new sample content:
node scripts/seed-single.js --update

# OR to completely refresh demo content:
node scripts/truncate-org.js
node scripts/seed-single.js
```

#### Step 5: Rebuild Application
```bash
# Clean build
rm -rf dist
npm run build
```

#### Step 6: Restart Services
```bash
# Restart your application server/container
systemctl restart skillbridge  # Example for systemd
# OR
docker-compose restart         # Example for Docker
# OR redeploy to your hosting platform
```

#### Step 7: Verify Update
1. ✅ Check Deployment Health widget for new version info
2. ✅ Test critical user flows
3. ✅ Verify no regression in existing data
4. ✅ Check console for errors

### Rollback Process (If Needed)
```bash
# Restore database from backup
psql -d skillbridge < backup-20240815.sql

# Revert to previous git version
git checkout $(cat current-version.txt)
npm install
npm run build

# Restart services
systemctl restart skillbridge
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] `.env` configured with production values
- [ ] Database credentials secured
- [ ] Domain DNS configured
- [ ] SSL certificate ready

### Database Setup
- [ ] Migrations applied successfully
- [ ] Initial seeding completed
- [ ] `app_settings.default_org_id` set correctly
- [ ] Admin user created and accessible

### Application Configuration
- [ ] Supabase Auth URLs configured
- [ ] CORS origins configured
- [ ] Branding assets uploaded
- [ ] Environment variables validated

### Testing
- [ ] Authentication flow working
- [ ] Admin dashboard accessible
- [ ] Course enrollment working
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Performance acceptable

### Production Ready
- [ ] Production build created
- [ ] Assets served correctly
- [ ] CDN configured (if applicable)
- [ ] Monitoring/logging setup
- [ ] Backup strategy implemented

---

## 🛠 Scripts Reference

All referenced scripts exist in the `scripts/` directory:

| Script | Purpose | Usage |
|--------|---------|-------|
| `seed-single.js` | Initial tenant setup | `node scripts/seed-single.js` |
| `truncate-org.js` | Clean slate for re-seeding | `node scripts/truncate-org.js` |

### Script Environment Variables

All scripts require:
- `VITE_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

---

## 🔧 Troubleshooting

### Common Issues

**"ORG_ID not found" in Deployment Health**
- Check `app_settings` table has correct `default_org_id`
- Verify organization was created during seeding

**Authentication redirect errors**
- Verify Supabase Auth URL configuration
- Check CORS settings match your domain

**Missing admin user**
- Re-run seeding script
- Check environment variables for admin credentials

**Red badges in Deployment Health**
- Check RLS policies allow admin access
- Verify database connection and permissions

### Getting Help

1. Check the Deployment Health widget for specific error details
2. Review console logs for client-side issues
3. Check Supabase logs for server-side issues
4. Verify all environment variables are set correctly

---

## 📚 Related Documentation

- [README-SINGLE-TENANT.md](./README-SINGLE-TENANT.md) - Architecture overview
- [supabase/README.md](./supabase/README.md) - Database schema
- [src/config/organization.ts](./src/config/organization.ts) - Configuration options