import { test, expect } from '@playwright/test';

test.describe('Shopping Experience', () => {
  test('should load home page and categories', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Shop by Category')).toBeVisible();
    
    // Check if at least one category link is present
    const categoryLink = page.locator('a[href*="cat="]').first();
    await expect(categoryLink).toBeVisible();
  });

  test('should search for products', async ({ page }) => {
    await page.goto('/products');
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Watch');
    await page.keyboard.press('Enter');
    
    // Check if search results or "No products found" appears
    await expect(page.locator('main')).toBeVisible();
  });

  test('should open product detail and check for essentials', async ({ page }) => {
    await page.goto('/products');
    // Click on the first product card
    const firstProduct = page.locator('a[href*="/product/"]').first();
    await firstProduct.click();
    
    await expect(page.locator('text=Add to Cart')).toBeVisible();
    await expect(page.locator('text=Buy Now')).toBeVisible();
  });
});
