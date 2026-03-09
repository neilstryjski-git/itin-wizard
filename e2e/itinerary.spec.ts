import { test, expect } from '@playwright/test';

test.describe('Itinerary Workflow', () => {
  test('should focus and highlight new event card when added', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');

    // 2. Handle the email prompt (Identity Management)
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test-user@example.com');
    await page.click('button:has-text("Continue")');

    // 3. Create a new trip from dashboard
    await page.click('button:has-text("New Trip")');
    
    // Should be on the interview page, but let's jump to itinerary
    // Extract projectId from URL
    const url = page.url();
    const projectId = url.split('/project/')[1].split('/')[0];
    await page.goto(`/project/${projectId}/itinerary`);

    // 4. Click "Add Event"
    const addEventButton = page.locator('button:has-text("Add Event")');
    await addEventButton.click();

    // 5. Verify the new event card UI improvements
    // The card should have the primary border/highlight
    const activeCard = page.locator('.border-primary.ring-2');
    await expect(activeCard).toBeVisible();

    // The title input should be focused and selected
    const titleInput = activeCard.locator('input[name="title"]');
    await expect(titleInput).toBeFocused();
    
    // Check if other creation features are disabled
    await expect(addEventButton).toBeDisabled();
    await expect(page.locator('button:has-text("Parse")')).toBeDisabled();

    // 6. Fill details and save
    await titleInput.fill('Test E2E Event');
    await page.click('button:has-text("Save Changes")');

    // 7. Verify it's saved and button is enabled again
    await expect(addEventButton).toBeEnabled();
    await expect(page.locator('h4:has-text("Test E2E Event")')).toBeVisible();
  });
});
