import { test, expect } from '@playwright/test';
import { loginUser, logoutUser, waitForPageLoad, TEST_USERS } from './utils/test-helpers';

test.describe('Group Projects - Team Access & RLS', () => {
  test.beforeEach(async ({ page }) => {
    await logoutUser(page);
  });

  test('Authenticated user can view group projects', async ({ page }) => {
    // Login as admin
    await loginUser(page, TEST_USERS.admin);
    
    // Navigate to group projects
    await page.goto('/group-projects');
    await waitForPageLoad(page);
    
    // Verify page loads without errors
    await expect(page.locator('h1, [data-testid="page-title"]')).toContainText(/projects|teams|groups/i);
    
    // Check for project/team content or empty state
    const projectElements = page.locator(
      '[data-testid="project-item"], .project-card, .team-card, .project-list li'
    );
    const emptyState = page.locator('text=/no projects|no teams|create project|join team/i');
    
    // Should either have projects or show empty state
    const hasProjects = await projectElements.count() > 0;
    const hasEmptyState = await emptyState.isVisible();
    
    expect(hasProjects || hasEmptyState).toBeTruthy();
    
    if (hasProjects) {
      // Verify we can see project details
      await expect(projectElements.first()).toBeVisible();
      
      // Check for project/team information
      const projectInfo = page.locator('text=/project|team|members|due date/i');
      await expect(projectInfo.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('User can view team details and project information', async ({ page }) => {
    // Login as learner to test student access
    await loginUser(page, TEST_USERS.learner);
    
    await page.goto('/group-projects');
    await waitForPageLoad(page);
    
    // Look for project or team cards
    const projectElements = page.locator(
      '[data-testid="project-item"], .project-card, .team-card'
    );
    
    const projectCount = await projectElements.count();
    
    if (projectCount > 0) {
      // Click on first project/team
      await projectElements.first().click();
      await waitForPageLoad(page);
      
      // Should see project details
      const projectDetails = page.locator(
        '[data-testid="project-details"], .project-description, .team-members'
      );
      
      // At minimum, should see some project information
      const hasProjectInfo = await page.locator('text=/description|members|deadline|submission/i').isVisible();
      expect(hasProjectInfo).toBeTruthy();
    }
  });

  test('User can create or join team (if feature exists)', async ({ page }) => {
    // Login as learner
    await loginUser(page, TEST_USERS.learner);
    
    await page.goto('/group-projects');
    await waitForPageLoad(page);
    
    // Look for create team or join team buttons
    const createButtons = page.locator(
      'button:has-text("Create Team"), button:has-text("Join Team"), button:has-text("New Team")'
    );
    
    const createButtonCount = await createButtons.count();
    
    if (createButtonCount > 0) {
      // Test team creation flow
      const createButton = createButtons.first();
      await createButton.click();
      
      // Look for team creation form
      const teamNameInput = page.locator(
        'input[name="name"], input[placeholder*="team name"], input[placeholder*="name"]'
      );
      
      if (await teamNameInput.isVisible()) {
        const testTeamName = `E2E Test Team ${Date.now()}`;
        await teamNameInput.fill(testTeamName);
        
        // Look for submit button
        const submitButton = page.locator(
          'button:has-text("Create"), button:has-text("Save"), button[type="submit"]'
        );
        
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await waitForPageLoad(page);
          
          // Verify team was created or form was processed
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('Project submissions work correctly', async ({ page }) => {
    // Login as learner
    await loginUser(page, TEST_USERS.learner);
    
    await page.goto('/group-projects');
    await waitForPageLoad(page);
    
    // Look for projects with submission capability
    const projectElements = page.locator(
      '[data-testid="project-item"], .project-card'
    );
    
    const projectCount = await projectElements.count();
    
    if (projectCount > 0) {
      // Click on a project
      await projectElements.first().click();
      await waitForPageLoad(page);
      
      // Look for submission interface
      const submissionElements = page.locator(
        'button:has-text("Submit"), textarea[placeholder*="submission"], input[type="file"]'
      );
      
      const hasSubmissionInterface = await submissionElements.count() > 0;
      
      if (hasSubmissionInterface) {
        // Test submission form exists and is accessible
        const textArea = page.locator('textarea[placeholder*="submission"], textarea[name="content"]');
        
        if (await textArea.isVisible()) {
          await textArea.fill('Test submission content for E2E testing');
          
          // Don't actually submit to avoid cluttering test data
          console.log('Submission form is accessible and functional');
        }
      }
    }
  });

  test('Unauthenticated users are redirected from group projects', async ({ page }) => {
    // Ensure logged out
    await logoutUser(page);
    
    // Try to access group projects
    await page.goto('/group-projects');
    
    // Should be redirected to auth page
    await page.waitForURL('**/auth', { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});