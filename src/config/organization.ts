/**
 * Centralized organization configuration for single-tenant deployment
 * This file contains all organization-specific settings that can be customized per deployment
 */

// Organization Configuration
export const ORG_CONFIG = {
  // Core Organization Settings
  ORG_ID: process.env.ORG_ID || '00000000-0000-0000-0000-000000000001',
  ORG_NAME: process.env.ORG_NAME || 'SkillBridge Learning',
  ORG_SLUG: process.env.ORG_SLUG || 'skillbridge',
  ORG_CONTACT_EMAIL: process.env.ORG_CONTACT_EMAIL || 'admin@skillbridge.com.au',
  
  // Branding
  ORG_LOGO_URL: process.env.ORG_LOGO_URL || '',
  ORG_PRIMARY_COLOR: process.env.ORG_PRIMARY_COLOR || '#059669',
  ORG_FAVICON_URL: process.env.ORG_FAVICON_URL || '/favicon.ico',
  
  // Application URLs
  APP_URL: process.env.APP_URL || 'https://skillbridge.com.au',
  APP_DOMAIN: process.env.APP_DOMAIN || 'skillbridge.com.au',
  
  // Email Configuration
  SMTP_FROM: process.env.SMTP_FROM || 'SkillBridge <noreply@skillbridge.com.au>',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@skillbridge.com.au',
  
  // Subscription Settings
  SUBSCRIPTION_PLAN: process.env.SUBSCRIPTION_PLAN || 'enterprise',
  MAX_USERS: parseInt(process.env.MAX_USERS || '999'),
  
  // Feature Flags
  SINGLE_TENANT_STRICT: process.env.SINGLE_TENANT_STRICT === 'true',
  ENABLE_SIGNUP: process.env.ENABLE_SIGNUP !== 'false', // Allow signup by default
  
  // Default Admin User (for seeding)
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || 'admin@skillbridge.com.au',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || 'SkillBridge2024!',
  DEFAULT_ADMIN_FIRST_NAME: process.env.DEFAULT_ADMIN_FIRST_NAME || 'System',
  DEFAULT_ADMIN_LAST_NAME: process.env.DEFAULT_ADMIN_LAST_NAME || 'Administrator',
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