import type { Plugin } from 'vite';

/**
 * Vite plugin to prevent non-VITE_ environment variables from being included in client bundle
 */
export function envSecurityPlugin(): Plugin {
  return {
    name: 'env-security',
    configResolved(config) {
      // Check if any non-VITE_ environment variables are being exposed
      const exposedVars = Object.keys(config.define || {})
        .filter(key => key.startsWith('import.meta.env.'))
        .map(key => key.replace('import.meta.env.', ''))
        .filter(key => !key.startsWith('VITE_') && key !== 'NODE_ENV' && key !== 'MODE');

      if (exposedVars.length > 0) {
        console.error(`❌ Security Error: Non-VITE_ environment variables detected in client bundle:`);
        exposedVars.forEach(varName => {
          console.error(`   - ${varName}`);
        });
        console.error(`\nOnly VITE_ prefixed variables should be exposed to the client.`);
        throw new Error('Environment variable security violation detected');
      }
    },
    transform(code, id) {
      // Skip node_modules and server files
      if (id.includes('node_modules') || id.includes('/supabase/')) {
        return null;
      }

      // Check for dangerous patterns in client code
      const dangerousPatterns = [
        /import\.meta\.env\.(?!VITE_|NODE_ENV|MODE)(\w+)/g,
        /process\.env\.(?!NODE_ENV)(\w+)/g,
      ];

      const secretPatterns = [
        /SUPABASE_SERVICE_ROLE_KEY/gi,
        /JWT_SECRET/gi,
        /SMTP_PASSWORD/gi,
        /DATABASE_URL/gi,
        /RESEND_API_KEY/gi,
        /STRIPE_SECRET_KEY/gi,
        /API_SECRET/gi,
        /PRIVATE_KEY/gi,
      ];

      // Check for dangerous patterns
      for (const pattern of dangerousPatterns) {
        const matches = code.match(pattern);
        if (matches) {
          throw new Error(`Security violation in ${id}: Found non-VITE_ environment variable usage: ${matches.join(', ')}`);
        }
      }

      // Check for potential secrets
      for (const pattern of secretPatterns) {
        if (pattern.test(code)) {
          throw new Error(`Security violation in ${id}: Potential secret detected in client code`);
        }
      }

      return null;
    }
  };
}