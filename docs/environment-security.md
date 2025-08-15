# Environment Variable Security

This document outlines the security practices for environment variable usage in SkillBridge to prevent secrets from being exposed in client bundles.

## Security Rules

### Client-Side Code (`src/` directory)
- **MUST** use `import.meta.env.VITE_*` only
- **NEVER** use `process.env.*` (except `NODE_ENV` for development checks)
- **NEVER** reference secrets or sensitive data

### Server-Side Code (`supabase/` directory, scripts)
- **MUST** use `process.env.*` for environment variables
- **CAN** access secrets and sensitive data
- **SHOULD** validate environment variables at startup

## Forbidden in Client Bundles

The following environment variables are considered secrets and must NEVER appear in client code:

- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `SMTP_PASSWORD`
- `DATABASE_URL`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `API_SECRET`
- `PRIVATE_KEY`

## Build-Time Security Checks

### Vite Plugin (`vite-plugins/env-security-plugin.ts`)
- Automatically scans code during build
- Fails build if non-VITE_ variables found in client code
- Detects potential secrets in client bundles
- Runs on every build and development start

### Environment Checker Script (`scripts/env-checker.ts`)
- Comprehensive static analysis of all source files
- Categorizes violations by severity (error/warning)
- Can be run independently: `npm run env-check`
- Integrated into build process

## Usage Examples

### ✅ Correct Usage

**Client Code:**
```typescript
// ✅ Public configuration (client-safe)
const orgName = import.meta.env.VITE_ORG_NAME || 'Default Org';
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.example.com';

// ✅ Development check
if (process.env.NODE_ENV === 'development') {
  console.log('Development mode');
}
```

**Server Code (Edge Functions):**
```typescript
// ✅ Server secrets
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const resendApiKey = Deno.env.get('RESEND_API_KEY');
```

### ❌ Incorrect Usage

**Client Code:**
```typescript
// ❌ Secret exposed to client
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// ❌ Non-VITE_ variable in client
const dbUrl = import.meta.env.DATABASE_URL;

// ❌ Process.env in client (except NODE_ENV)
const apiKey = process.env.API_KEY;
```

## Current Implementation Status

### Client Code Audit
- ✅ `src/config/organization.ts` - All VITE_ prefixed variables
- ✅ `src/components/demo/OrgSwitcher.tsx` - Only uses NODE_ENV check
- ✅ No secrets found in client code

### Server Code Audit  
- ✅ Edge functions properly use `Deno.env.get()`
- ✅ Secrets are managed through Supabase Vault
- ✅ No client-side secret exposure

## Security Verification

Run the following commands to verify security:

```bash
# Check environment variable usage
npm run env-check

# Build with security checks
npm run build

# Development with security monitoring
npm run dev
```

## Emergency Response

If a secret is accidentally committed or exposed:

1. **Immediately** rotate the compromised secret
2. Update the secret in Supabase Vault/environment
3. Audit build logs for potential exposure
4. Review deployment logs for unauthorized access
5. Run security scan: `npm run env-check`

## Best Practices

1. **Prefix all client environment variables** with `VITE_`
2. **Use Supabase Vault** for server-side secrets
3. **Never commit** `.env` files with real secrets
4. **Always run** `npm run env-check` before deployment
5. **Review build output** for any unexpected environment variables
6. **Use TypeScript** to enforce environment variable typing
7. **Validate environment variables** at application startup

## Integration with CI/CD

The environment security checks are integrated into:
- Build process (`npm run build`)
- Development server startup
- CI/CD pipeline (via build command)
- Pre-commit hooks (recommended)

Any security violation will fail the build and prevent deployment.