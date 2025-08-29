import { Page, Locator } from '@playwright/test';
import { testData } from '../test-data';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '') {
    await this.page.goto(path);
  }

  async waitForLoadingToComplete() {
    try {
      await this.page.waitForSelector(testData.ui.selectors.loadingSpinner, { 
        state: 'detached', 
        timeout: 10000 
      });
    } catch (error) {
      // Loading spinner might not exist, continue
    }
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      const errorElement = this.page.locator(testData.ui.selectors.errorMessage);
      if (await errorElement.isVisible()) {
        return await errorElement.textContent();
      }
    } catch (error) {
      // Error element might not exist
    }
    return null;
  }

  async getSuccessMessage(): Promise<string | null> {
    try {
      const successElement = this.page.locator(testData.ui.selectors.successMessage);
      if (await successElement.isVisible()) {
        return await successElement.textContent();
      }
    } catch (error) {
      // Success element might not exist
    }
    return null;
  }

  async clickElement(selector: string) {
    await this.page.click(selector);
    await this.waitForLoadingToComplete();
  }

  async fillInput(selector: string, value: string) {
    await this.page.fill(selector, value);
  }

  async selectOption(selector: string, value: string) {
    await this.page.selectOption(selector, value);
  }

  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  async isElementVisible(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isVisible();
    } catch (error) {
      return false;
    }
  }

  async isElementEnabled(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isEnabled();
    } catch (error) {
      return false;
    }
  }

  async getElementText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  async getElementValue(selector: string): Promise<string> {
    return await this.page.locator(selector).inputValue();
  }

  async waitForElement(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  async waitForUrl(urlPattern: string | RegExp, timeout: number = 10000) {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async pressKey(key: string) {
    await this.page.keyboard.press(key);
  }

  async hover(selector: string) {
    await this.page.hover(selector);
  }

  async dragAndDrop(sourceSelector: string, targetSelector: string) {
    await this.page.dragAndDrop(sourceSelector, targetSelector);
  }

  async uploadFile(fileInputSelector: string, filePath: string) {
    await this.page.setInputFiles(fileInputSelector, filePath);
  }

  async setCookie(name: string, value: string, domain?: string) {
    await this.page.context().addCookies([{
      name,
      value,
      domain: domain || 'localhost',
      path: '/'
    }]);
  }

  async clearCookies() {
    await this.page.context().clearCookies();
  }

  async reloadPage() {
    await this.page.reload();
    await this.waitForLoadingToComplete();
  }

  async goBack() {
    await this.page.goBack();
    await this.waitForLoadingToComplete();
  }

  async goForward() {
    await this.page.goForward();
    await this.waitForLoadingToComplete();
  }
}