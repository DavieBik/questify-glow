# SkillBridge - Single-Tenant Deployment Guide

## Overview

SkillBridge has been converted to a **single-tenant, clonable architecture**. Each deployment serves one organization but can be easily cloned for new clients by changing environment variables and redeploying.

## Features

✅ **Single Organization**: All users belong to one organization  
✅ **Easy Cloning**: Deploy new instances by changing `.env` and redeploying  
✅ **Automatic Setup**: Users auto-assigned to the organization on signup  
✅ **Centralized Config**: All org settings in one configuration file  
✅ **Docker Ready**: Complete Docker setup for easy deployment  
✅ **Seed Scripts**: Automated setup with sample data  

## Quick Start

### 1. Clone for a New Client

```bash
# Clone the repository
git clone [your-repo-url] skillbridge-client-name
cd skillbridge-client-name

# Copy environment template
cp .env.example .env

# Edit .env with client-specific settings
nano .env
```

### 2. Configure Environment

Edit `.env` with your client's details:

```bash
# Required: Generate a new UUID for each deployment
ORG_ID=12345678-1234-1234-1234-123456789012

# Organization details
ORG_NAME=Acme Disability Services
ORG_SLUG=acme-disability
ORG_CONTACT_EMAIL=admin@acme.org.au

# Application URLs
APP_URL=https://acme.skillbridge.com.au
APP_DOMAIN=acme.skillbridge.com.au

# Branding
ORG_PRIMARY_COLOR=#2563eb
ORG_LOGO_URL=https://acme.org.au/logo.png

# Admin user
DEFAULT_ADMIN_EMAIL=admin@acme.org.au
DEFAULT_ADMIN_PASSWORD=SecurePassword2024!

# Supabase (create new project for each client)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Deploy with Docker

```bash
# Build and start
docker-compose up -d

# Or use the npm script
npm run docker:up
```

### 4. Initialize Data

```bash
# Seed with default organization and admin user
npm run seed:single
```

### 5. Access Your Instance

- **URL**: Your configured `APP_URL`
- **Admin Login**: Your configured `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`

## Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
# Fresh deployment
npm run docker:fresh

# Update deployment
npm run docker:build
npm run docker:up
```

### Option 2: Manual Deployment

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Serve with your web server (nginx, Apache, etc.)
```

### Option 3: Cloud Platforms

- **Vercel**: Connect your repo and set environment variables
- **Netlify**: Same as Vercel
- **Railway**: Deploy directly from GitHub
- **DigitalOcean App Platform**: Use the Docker setup

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ORG_ID` | Unique UUID for this deployment | `12345678-1234-1234-1234-123456789012` |
| `ORG_NAME` | Organization display name | `Acme Disability Services` |
| `ORG_CONTACT_EMAIL` | Main contact email | `admin@acme.org.au` |
| `APP_URL` | Full application URL | `https://acme.skillbridge.com.au` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ORG_SLUG` | URL-friendly org name | Generated from `ORG_NAME` |
| `ORG_PRIMARY_COLOR` | Brand color (hex) | `#059669` |
| `ORG_LOGO_URL` | Logo image URL | Empty |
| `MAX_USERS` | Maximum users allowed | `999` |
| `ENABLE_SIGNUP` | Allow user registration | `true` |
| `SINGLE_TENANT_STRICT` | Remove org columns from DB | `false` |

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run seed:single` | Set up organization and admin user |
| `npm run truncate:org` | Delete all data (keeps org structure) |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |
| `npm run docker:fresh` | Rebuild and restart containers |

## Customization

### Branding

1. **Colors**: Set `ORG_PRIMARY_COLOR` in `.env`
2. **Logo**: Upload logo and set `ORG_LOGO_URL`
3. **Favicon**: Replace `public/favicon.ico`
4. **App Title**: Update `index.html` title tag

### Advanced Configuration

Edit `src/config/organization.ts` for additional customization:

- Email templates
- Feature flags
- Default user roles
- System limits

## Database Setup

### New Supabase Project

1. Create new Supabase project for each client
2. Run the single-tenant migration (automatic on first deployment)
3. Configure RLS policies (pre-configured)
4. Set up authentication (pre-configured)

### Existing Database

```bash
# Apply single-tenant migration
# (This is automatic on first deployment)
```

## Security Considerations

1. **Unique UUIDs**: Always generate new `ORG_ID` for each deployment
2. **Separate Databases**: Use different Supabase projects for each client
3. **Environment Isolation**: Never share `.env` files between deployments
4. **Strong Passwords**: Use secure `DEFAULT_ADMIN_PASSWORD`

## Troubleshooting

### Common Issues

**Issue: Users can't access the system**
```bash
# Check if organization exists
# Run seed script to ensure setup
npm run seed:single
```

**Issue: Docker won't start**
```bash
# Check environment variables
cat .env

# Rebuild containers
npm run docker:fresh
```

**Issue: Database connection fails**
```bash
# Verify Supabase credentials in .env
# Check Supabase project status
```

### Logs

```bash
# Docker logs
docker-compose logs -f skillbridge-web

# Application logs
# Check browser console for frontend errors
```

## Migration from Multi-Tenant

If migrating from the old multi-tenant version:

1. **Backup Data**: Export all important data
2. **Update Code**: Pull latest single-tenant changes
3. **Configure Environment**: Set up `.env` as above
4. **Run Migration**: The single-tenant migration runs automatically
5. **Import Data**: Re-import your organization's data

## Support

For technical support:

1. Check this README first
2. Review application logs
3. Check Supabase project logs
4. Contact development team with:
   - Environment configuration (without secrets)
   - Error messages
   - Steps to reproduce

## Development

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with development values

# Start development server
npm run dev

# Run with specific organization
ORG_NAME="Dev Org" npm run dev
```

### Contributing

1. Follow existing code patterns
2. Update documentation for any changes
3. Test with fresh deployments
4. Ensure Docker builds work

---

## 📋 How to Clone for a New Client (5 Steps)

1. **Copy repository and update environment**:
   ```bash
   # Clone to new directory
   git clone <your-repo-url> client-name-skillbridge
   cd client-name-skillbridge
   
   # Update .env with new client details
   cp .env.example .env
   # Set ORG_ID to a new UUID
   # Update ORG_NAME, ORG_CONTACT_EMAIL, etc.
   ```

2. **Generate new organization UUID**:
   ```bash
   # Generate a new UUID for the client
   node -e "console.log(require('crypto').randomUUID())"
   # Update ORG_ID in .env with this new UUID
   ```

3. **Update app_settings in database**:
   ```sql
   -- Connect to your Supabase project and run:
   UPDATE app_settings SET default_org_id = 'NEW_UUID_HERE' WHERE id = 1;
   ```

4. **Run seed script**:
   ```bash
   npm run seed:single
   ```

5. **Deploy and test**:
   ```bash
   # Deploy to your hosting platform
   # Test signup, course creation, and all core features
   ```

**Quick Go/No-Go Test Plan:**
- ✅ Signup assigns correct ORG_ID automatically
- ✅ CRUD operations (courses, departments) use default org
- ✅ Bad insert attempts with different org ID are rejected
- ✅ All pages load without org context errors  
- ✅ RLS policies enforce single-tenant access
- ✅ Fresh admin can create and access content

## Success Checklist

✅ Environment variables configured  
✅ Docker containers running  
✅ Seed script executed  
✅ Admin user can log in  
✅ Users can sign up and are auto-assigned to organization  
✅ Courses and content accessible  
✅ Branding appears correctly  

**Your SkillBridge instance is ready! 🚀**