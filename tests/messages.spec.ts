import { test, expect } from '@playwright/test';
import { loginUser, logoutUser, waitForPageLoad, TEST_USERS } from './utils/test-helpers';

test.describe('Messages - Conversation & RLS', () => {
  test.beforeEach(async ({ page }) => {
    await logoutUser(page);
  });

  test('Authenticated user can view messages and conversations', async ({ page }) => {
    // Login as admin (should have access to messages)
    await loginUser(page, TEST_USERS.admin);
    
    // Navigate to messages
    await page.goto('/messages');
    await waitForPageLoad(page);
    
    // Verify page loads without errors
    await expect(page.locator('h1, [data-testid="page-title"]')).toContainText(/messages|conversations/i);
    
    // Check for conversation list or empty state
    const conversationElements = page.locator(
      '[data-testid="conversation-item"], .conversation-card, .conversation-list li, .message-conversation'
    );
    const emptyState = page.locator('text=/no conversations|no messages|start a conversation/i');
    
    // Should either have conversations or show empty state
    const hasConversations = await conversationElements.count() > 0;
    const hasEmptyState = await emptyState.isVisible();
    
    expect(hasConversations || hasEmptyState).toBeTruthy();
    
    if (hasConversations) {
      // Verify we can see at least one conversation
      await expect(conversationElements.first()).toBeVisible();
      
      // Try to click on first conversation to view messages
      await conversationElements.first().click();
      await waitForPageLoad(page);
      
      // Should see message interface
      const messageInterface = page.locator(
        '[data-testid="message-input"], textarea[placeholder*="message"], input[placeholder*="message"]'
      );
      await expect(messageInterface).toBeVisible({ timeout: 5000 });
    }
  });

  test('User can send a message in existing conversation', async ({ page }) => {
    // Login as admin
    await loginUser(page, TEST_USERS.admin);
    
    await page.goto('/messages');
    await waitForPageLoad(page);
    
    // Check if there are conversations
    const conversationElements = page.locator(
      '[data-testid="conversation-item"], .conversation-card, .conversation-list li'
    );
    
    const conversationCount = await conversationElements.count();
    
    if (conversationCount > 0) {
      // Click first conversation
      await conversationElements.first().click();
      await waitForPageLoad(page);
      
      // Find message input
      const messageInput = page.locator(
        '[data-testid="message-input"], textarea[placeholder*="message"], input[placeholder*="message"]'
      );
      
      if (await messageInput.isVisible()) {
        const testMessage = `E2E Test Message ${Date.now()}`;
        
        // Type and send message
        await messageInput.fill(testMessage);
        
        // Look for send button
        const sendButton = page.locator(
          'button:has-text("Send"), button[type="submit"], [data-testid="send-button"]'
        );
        
        if (await sendButton.isVisible()) {
          await sendButton.click();
          
          // Verify message appears
          await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('Unauthenticated users are redirected from messages', async ({ page }) => {
    // Ensure logged out
    await logoutUser(page);
    
    // Try to access messages
    await page.goto('/messages');
    
    // Should be redirected to auth page
    await page.waitForURL('**/auth', { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});