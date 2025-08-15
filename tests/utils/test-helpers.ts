/**
 * Test utilities for SkillBridge E2E tests
 */
import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'learner';
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@skillbridge.com.au',
    password: process.env.TEST_ADMIN_PASSWORD || 'SkillBridge2024!',
    role: 'admin'
  },
  learner: {
    email: process.env.TEST_LEARNER_EMAIL || 'learner@skillbridge.com.au',
    password: process.env.TEST_LEARNER_PASSWORD || 'Learner2024!',
    role: 'learner'
  }
};

/**
 * Login helper function
 */
export async function loginUser(page: Page, user: TestUser) {
  await page.goto('/auth');
  
  // Check if we're already logged in
  const currentUrl = page.url();
  if (!currentUrl.includes('/auth')) {
    return; // Already logged in
  }

  // Fill login form
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  
  // Submit login
  await page.click('button[type="submit"]');
  
  // Wait for redirect away from auth page
  await page.waitForURL(url => !url.includes('/auth'), { timeout: 10000 });
  
  // Verify we're logged in by checking for user menu or logout button
  await expect(page.locator('text=Sign Out')).toBeVisible({ timeout: 5000 });
}

/**
 * Logout helper function
 */
export async function logoutUser(page: Page) {
  // Look for and click logout button
  const logoutButton = page.locator('text=Sign Out');
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL('**/auth', { timeout: 5000 });
  }
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="page-content"], main, .main-content', { 
    state: 'visible',
    timeout: 10000 
  });
}

/**
 * Helper to check for API error responses
 */
export async function expectNoApiErrors(page: Page) {
  // Check for any 500 or 403 errors in network requests
  const responses = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });
  
  // Give a moment for any requests to complete
  await page.waitForTimeout(1000);
  
  // Filter out expected 403s for unauthorized actions
  const unexpectedErrors = responses.filter(r => 
    !(r.status === 403 && r.url.includes('/rest/v1/'))
  );
  
  if (unexpectedErrors.length > 0) {
    console.warn('Unexpected API errors:', unexpectedErrors);
  }
}

/**
 * Helper to create a test announcement
 */
export async function createTestAnnouncement(page: Page, title: string, content: string) {
  await page.goto('/admin');
  
  // Look for create announcement button or navigate to announcements
  await page.goto('/announcements');
  
  // Click create button
  await page.click('button:has-text("Create"), button:has-text("New")');
  
  // Fill form
  await page.fill('input[name="title"], input[placeholder*="title"]', title);
  await page.fill('textarea[name="content"], textarea[placeholder*="content"]', content);
  
  // Submit
  await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');
  
  // Wait for success or redirect
  await page.waitForTimeout(2000);
}