# Single-Tenant Learning Management System

## Clone in 10 Minutes ⚡

This guide will help you set up a complete learning management system with demo data in under 10 minutes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Supabase CLI](https://supabase.com/docs/guides/cli) 
- Git

### Step 1: Clone and Setup 📁

```bash
# Clone the repository
git clone [YOUR_REPO_URL]
cd [YOUR_PROJECT_NAME]

# Install dependencies
npm install
```

### Step 2: Create Supabase Project 🗃️

1. **Create a new Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Note down your project details:**
   - Project URL (e.g., `https://abcdefghijk.supabase.co`)
   - Project API Keys (anon public key and service_role key)

### Step 3: Environment Setup 🔧

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: Organization Name (fallback)
VITE_ORG_NAME=Your Organization Name
VITE_PRIMARY_COLOR=#059669
```

**⚠️ Important:** Replace the placeholder values with your actual Supabase project details.

### Step 4: Database Setup 🗄️

```bash
# Initialize Supabase locally
supabase init

# Link to your remote project (use your project reference ID)
supabase link --project-ref your-project-id

# Run migrations to create all tables
supabase db reset

# Seed the database with demo data
node scripts/seed-single.js
```

The seeding will create:
- ✅ Default organization
- ✅ Admin user (admin@demo-org.com / admin123!)
- ✅ 4 demo users (password123!)
- ✅ 4 departments
- ✅ 4 courses with modules
- ✅ 2 curricula with assigned courses
- ✅ Sample enrollments
- ✅ Welcome announcements
- ✅ Branding defaults

### Step 5: Configure Supabase Auth 🔐

In your Supabase dashboard, go to **Authentication > URL Configuration**:

1. **Site URL:** `http://localhost:5173` (for development)
2. **Redirect URLs:** Add these URLs:
   ```
   http://localhost:5173
   http://localhost:5173/**
   ```

3. **Optional: Disable email confirmation** for faster testing:
   - Go to **Authentication > Settings**
   - Turn off "Enable email confirmations"

### Step 6: Launch the Application 🚀

```bash
# Start the development server
npm run dev

# Or build and preview
npm run build
npm run preview
```

Visit `http://localhost:5173` and sign in with:
- **Email:** admin@demo-org.com
- **Password:** admin123!

### Demo User Accounts 👥

After seeding, you can also test with these demo accounts:

| Email | Password | Role | Department |
|-------|----------|------|------------|
| admin@demo-org.com | admin123! | Admin | - |
| manager@demo-org.com | password123! | Manager | Management |
| john.smith@demo-org.com | password123! | Worker | Customer Service |
| mary.jones@demo-org.com | password123! | Worker | Human Resources |
| bob.davis@demo-org.com | password123! | Worker | Operations |

## Production Deployment 🌐

### Using Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   VITE_ORG_NAME=Your Organization Name
   VITE_PRIMARY_COLOR=#059669
   ```
3. **Update Supabase Auth URLs** with your Vercel domain:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

### Using Other Platforms

The app is a standard Vite React application and can be deployed to:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify
- Any static hosting service

## Features Overview 🎯

### For Administrators
- **User Management:** Invite users, assign roles, manage departments
- **Course Management:** Create courses, modules, quizzes
- **Curricula:** Build structured learning paths
- **Analytics:** Track progress, completion rates, performance
- **Approvals:** Review and approve course completions
- **Branding:** Customize colors, logos, external links

### For Managers
- **Team Dashboard:** Monitor team progress and compliance
- **Approval Queue:** Process pending requests
- **Reports:** Export compliance and progress data

### For Learners
- **Personal Dashboard:** Track progress and assignments
- **Course Catalog:** Browse and enroll in courses
- **Messaging:** Communicate with peers and instructors
- **Certificates:** View and download completion certificates

## Customization 🎨

### Branding
1. Sign in as admin
2. Go to **Settings > Branding**
3. Upload logo, set colors, add external links

### Content
1. **Courses:** Go to **Admin > Courses** to add your content
2. **Curricula:** Create learning paths in **Admin > Curricula**
3. **Users:** Invite real users in **Admin > Users**

### Remove Demo Data
To start fresh after testing:
```bash
# Reset database and re-run migrations only (no demo data)
supabase db reset
```

## Troubleshooting 🔧

### Common Issues

**"Invalid credentials" error:**
- Verify your Supabase URL and keys in `.env.local`
- Check that your project is active and billing is set up

**"useBranding must be used within a BrandingProvider" error:**
- This should be fixed in the latest version
- Try refreshing the page

**Auth redirect issues:**
- Ensure redirect URLs are properly configured in Supabase
- Check that Site URL matches your domain

**Database errors:**
- Run `supabase db reset` to ensure all migrations are applied
- Check Supabase dashboard for any policy or permission issues

### Getting Help

1. Check the browser console for detailed error messages
2. Verify Supabase project status in the dashboard
3. Ensure all environment variables are set correctly

## Security Notes 🔒

### Development
- The seeded admin password should be changed immediately
- Demo users should be deleted before production use

### Production
- Enable email confirmation for user registration
- Set up proper RLS policies for your use case
- Configure proper CORS settings
- Use strong passwords for admin accounts
- Enable 2FA where possible

## Next Steps 📈

After successful setup:

1. **Change admin password** for security
2. **Add your organization's branding**
3. **Create your actual courses and content**
4. **Invite real users** and delete demo accounts
5. **Configure email settings** for notifications
6. **Set up backups** for your Supabase project

---

**🎉 Congratulations!** You now have a fully functional learning management system. The platform is ready for customization and production use.

For advanced configuration and features, refer to the main documentation or contact support.