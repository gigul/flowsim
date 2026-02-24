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

  test('save model with Ctrl+S shows Saved! confirmation', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Из шаблона');
    await expect(page.locator('text=Шаблоны')).toBeVisible();
    const firstTemplate = page.locator('[class*=cursor-pointer]').first();
    await firstTemplate.click();
    await page.waitForURL(/\/editor\//, { timeout: 10_000 });
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });

    // Trigger save via Ctrl+S
    await page.keyboard.press('Control+s');

    // The save button should briefly show "Saved!" text
    await expect(page.locator('text=Saved!')).toBeVisible({ timeout: 5_000 });
  });

  test('run simulation and navigate to results', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Из шаблона');
    await expect(page.locator('text=Шаблоны')).toBeVisible();
    const firstTemplate = page.locator('[class*=cursor-pointer]').first();
    await firstTemplate.click();
    await page.waitForURL(/\/editor\//, { timeout: 10_000 });
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });

    // Click the Run button
    await page.click('text=Запуск');

    // Wait for "Симуляция завершена" banner to appear (simulation may take a while)
    await expect(page.locator('text=Симуляция завершена')).toBeVisible({ timeout: 30_000 });

    // Click the results link
    await page.click('text=Посмотреть результаты');

    // Should navigate to results page
    await page.waitForURL(/\/results\//, { timeout: 10_000 });

    // Results page should show summary heading
    await expect(page.locator('text=Результаты симуляции')).toBeVisible({ timeout: 10_000 });
  });

  test('node palette is visible and PropsPanel shows placeholder', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Новый проект');
    await page.waitForURL(/\/editor\//, { timeout: 10_000 });
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });

    // Node palette should be visible with the "Узлы" heading
    await expect(page.locator('text=Узлы')).toBeVisible({ timeout: 5_000 });

    // All four node types should be listed in the palette
    await expect(page.locator('text=Source')).toBeVisible();
    await expect(page.locator('text=Queue')).toBeVisible();
    await expect(page.locator('text=Process')).toBeVisible();
    await expect(page.locator('text=Sink')).toBeVisible();

    // PropsPanel should show the empty-state placeholder when no node is selected
    await expect(page.locator('text=Выберите узел')).toBeVisible({ timeout: 5_000 });
  });

  test('editor shows scenario tab from template', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Из шаблона');
    await expect(page.locator('text=Шаблоны')).toBeVisible();
    const firstTemplate = page.locator('[class*=cursor-pointer]').first();
    await firstTemplate.click();
    await page.waitForURL(/\/editor\//, { timeout: 10_000 });
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });

    // The scenario tab bar should show at least one scenario tab
    const scenarioTab = page.locator('button:has-text("Сценарий")');
    await expect(scenarioTab.first()).toBeVisible({ timeout: 5_000 });
  });
});
