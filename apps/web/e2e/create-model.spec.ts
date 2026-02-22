import { test, expect } from '@playwright/test';

test('home page loads and shows project list', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Проекты')).toBeVisible();
});

test('can create a new project', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Новый проект');
  await expect(page).toHaveURL(/\/editor\//);
});
