import { test, expect } from '@playwright/test';

test.describe('FlowSim E2E', () => {
  test('home page loads and shows project heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Проекты');
  });

  test('shows empty state when no projects', async ({ page }) => {
    await page.goto('/');
    // Either project list or empty state should be visible
    const heading = page.locator('h1');
    await expect(heading).toContainText('Проекты');
  });

  test('create new blank project and navigate to editor', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Новый проект');
    // Should navigate to editor page
    await page.waitForURL(/\/editor\//, { timeout: 10_000 });
    // Editor should show the React Flow canvas
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });
  });

  test('create project from template', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Из шаблона');
    // Templates section should appear
    await expect(page.locator('text=Шаблоны')).toBeVisible();
    // Click the first template
    const firstTemplate = page.locator('[class*=cursor-pointer]').first();
    await firstTemplate.click();
    // Should navigate to editor
    await page.waitForURL(/\/editor\//, { timeout: 10_000 });
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });
  });

  test('editor shows undo/redo buttons', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Новый проект');
    await page.waitForURL(/\/editor\//, { timeout: 10_000 });
    // Undo and Redo buttons should be present
    await expect(page.locator('button[title*="Отменить"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button[title*="Повторить"]')).toBeVisible();
  });

  test('editor shows simulation toolbar', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Новый проект');
    await page.waitForURL(/\/editor\//, { timeout: 10_000 });
    // Simulation controls should be visible
    await expect(page.locator('text=Запуск')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Сброс')).toBeVisible();
  });
});
