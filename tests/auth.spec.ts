import { test, expect } from '@playwright/test';
import { loginUser, logoutUser, waitForPageLoad, TEST_USERS } from './utils/test-helpers';

test.describe('Authentication & Core Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await logoutUser(page);
  });

  test('User can login and access dashboard', async ({ page }) => {
    // Test admin login
    await loginUser(page, TEST_USERS.admin);
    
    // Should be redirected to dashboard or main page
    await waitForPageLoad(page);
    
    // Verify we're logged in
    await expect(page.locator('text=Sign Out')).toBeVisible();
    
    // Verify dashboard loads
    const dashboardElements = page.locator('h1, [data-testid="page-title"], .dashboard');
    await expect(dashboardElements.first()).toBeVisible();
  });

  test('Admin can access admin pages', async ({ page }) => {
    await loginUser(page, TEST_USERS.admin);
    
    // Test admin dashboard access
    await page.goto('/admin');
    await waitForPageLoad(page);
    
    await expect(page.locator('h1')).toContainText(/admin|dashboard/i);
    
    // Test admin users page
    await page.goto('/admin/users');
    await waitForPageLoad(page);
    
    // Should see user management interface
    const userElements = page.locator('table, .user-list, [data-testid="user-item"]');
    await expect(userElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('Learner cannot access admin pages', async ({ page }) => {
    await loginUser(page, TEST_USERS.learner);
    
    // Try to access admin page
    await page.goto('/admin');
    
    // Should either redirect or show access denied
    const accessDenied = page.locator('text=/access denied|unauthorized|forbidden|permission/i');
    const redirected = !page.url().includes('/admin');
    
    // Either should be denied or redirected away
    expect(redirected || await accessDenied.isVisible()).toBeTruthy();
  });

  test('Protected routes redirect unauthenticated users', async ({ page }) => {
    // Ensure logged out
    await logoutUser(page);
    
    const protectedRoutes = ['/admin', '/profile', '/courses', '/messages'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      
      // Should redirect to auth page
      await page.waitForURL('**/auth', { timeout: 10000 });
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test('User logout works correctly', async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USERS.admin);
    
    // Verify logged in
    await expect(page.locator('text=Sign Out')).toBeVisible();
    
    // Logout
    await logoutUser(page);
    
    // Verify redirected to auth
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Try to access protected route
    await page.goto('/admin');
    
    // Should still be on auth page or redirected back
    await page.waitForURL('**/auth', { timeout: 10000 });
  });
});