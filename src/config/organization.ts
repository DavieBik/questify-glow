/**
 * Centralized organization configuration for single-tenant deployment
 * This file contains all organization-specific settings that can be customized per deployment
 */

// Organization Configuration
export const ORG_CONFIG = {
  // Core Organization Settings
  ORG_ID: import.meta.env.VITE_ORG_ID || '00000000-0000-0000-0000-000000000001',
  ORG_NAME: import.meta.env.VITE_ORG_NAME || 'SkillBridge Learning',
  ORG_SLUG: import.meta.env.VITE_ORG_SLUG || 'skillbridge',
  ORG_CONTACT_EMAIL: import.meta.env.VITE_ORG_CONTACT_EMAIL || 'admin@skillbridge.com.au',
  
  // Branding
  ORG_LOGO_URL: import.meta.env.VITE_ORG_LOGO_URL || '',
  ORG_PRIMARY_COLOR: import.meta.env.VITE_ORG_PRIMARY_COLOR || '#059669',
  ORG_FAVICON_URL: import.meta.env.VITE_ORG_FAVICON_URL || '/favicon.ico',
  
  // Application URLs
  APP_URL: import.meta.env.VITE_APP_URL || 'https://skillbridge.com.au',
  APP_DOMAIN: import.meta.env.VITE_APP_DOMAIN || 'skillbridge.com.au',
  
  // Email Configuration
  SMTP_FROM: import.meta.env.VITE_SMTP_FROM || 'SkillBridge <noreply@skillbridge.com.au>',
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || 'support@skillbridge.com.au',
  
  // Subscription Settings
  SUBSCRIPTION_PLAN: import.meta.env.VITE_SUBSCRIPTION_PLAN || 'enterprise',
  MAX_USERS: parseInt(import.meta.env.VITE_MAX_USERS || '999'),
  
  // Feature Flags
  SINGLE_TENANT_STRICT: import.meta.env.VITE_SINGLE_TENANT_STRICT === 'true',
  ENABLE_SIGNUP: import.meta.env.VITE_ENABLE_SIGNUP !== 'false', // Allow signup by default
  
  // Default Admin User (for seeding)
  DEFAULT_ADMIN_EMAIL: import.meta.env.VITE_DEFAULT_ADMIN_EMAIL || 'admin@skillbridge.com.au',
  DEFAULT_ADMIN_PASSWORD: import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || 'SkillBridge2024!',
  DEFAULT_ADMIN_FIRST_NAME: import.meta.env.VITE_DEFAULT_ADMIN_FIRST_NAME || 'System',
  DEFAULT_ADMIN_LAST_NAME: import.meta.env.VITE_DEFAULT_ADMIN_LAST_NAME || 'Administrator',
} as const;

// Helper function to get organization data for use in components
export const getOrganizationConfig = () => ({
  id: ORG_CONFIG.ORG_ID,
  name: ORG_CONFIG.ORG_NAME,
  slug: ORG_CONFIG.ORG_SLUG,
  contact_email: ORG_CONFIG.ORG_CONTACT_EMAIL,
  logo_url: ORG_CONFIG.ORG_LOGO_URL,
  primary_color: ORG_CONFIG.ORG_PRIMARY_COLOR,
  subscription_plan: ORG_CONFIG.SUBSCRIPTION_PLAN,
  max_users: ORG_CONFIG.MAX_USERS,
  is_active: true,
  app_url: ORG_CONFIG.APP_URL,
  support_email: ORG_CONFIG.SUPPORT_EMAIL,
});

// Validation function
export const validateOrganizationConfig = () => {
  const errors: string[] = [];
  
  if (!ORG_CONFIG.ORG_ID || ORG_CONFIG.ORG_ID === '00000000-0000-0000-0000-000000000001') {
    errors.push('ORG_ID must be set to a valid UUID');
  }
  
  if (!ORG_CONFIG.ORG_NAME) {
    errors.push('ORG_NAME is required');
  }
  
  if (!ORG_CONFIG.ORG_CONTACT_EMAIL || !ORG_CONFIG.ORG_CONTACT_EMAIL.includes('@')) {
    errors.push('ORG_CONTACT_EMAIL must be a valid email address');
  }
  
  if (!ORG_CONFIG.APP_URL || !ORG_CONFIG.APP_URL.startsWith('http')) {
    errors.push('APP_URL must be a valid URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Runtime validation
if (typeof window === 'undefined') {
  // Only validate on server-side/build time
  const validation = validateOrganizationConfig();
  if (!validation.isValid) {
    console.warn('Organization configuration validation warnings:', validation.errors);
  }
}