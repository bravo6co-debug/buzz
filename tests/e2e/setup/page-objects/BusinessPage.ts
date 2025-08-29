import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { testData, generateBusinessData } from '../test-data';

export class BusinessPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Navigation
  async navigateToBusinessRegistration() {
    await this.goto('/business/register');
    await this.waitForLoadingToComplete();
  }

  async navigateToBusinessDashboard() {
    await this.goto('/dashboard');
    await this.waitForLoadingToComplete();
  }

  async navigateToQRManagement() {
    await this.goto('/qr');
    await this.waitForLoadingToComplete();
  }

  async navigateToCustomerManagement() {
    await this.goto('/customers');
    await this.waitForLoadingToComplete();
  }

  async navigateToSettlements() {
    await this.goto('/settlements');
    await this.waitForLoadingToComplete();
  }

  async navigateToReviews() {
    await this.goto('/reviews');
    await this.waitForLoadingToComplete();
  }

  async navigateToAnalytics() {
    await this.goto('/analytics');
    await this.waitForLoadingToComplete();
  }

  // Business registration
  async fillBusinessRegistrationForm(businessData: {
    businessName: string;
    businessPhone: string;
    address: string;
    category: string;
    description?: string;
  }) {
    await this.fillInput('[data-testid="business-name"]', businessData.businessName);
    await this.fillInput('[data-testid="business-phone"]', businessData.businessPhone);
    await this.fillInput('[data-testid="business-address"]', businessData.address);
    await this.selectOption('[data-testid="business-category"]', businessData.category);
    
    if (businessData.description) {
      await this.fillInput('[data-testid="business-description"]', businessData.description);
    }
  }

  async uploadBusinessImage(imagePath: string) {
    const imageInput = '[data-testid="business-image-upload"]';
    if (await this.isElementVisible(imageInput)) {
      await this.uploadFile(imageInput, imagePath);
    }
  }

  async submitBusinessRegistration() {
    await this.clickElement('[data-testid="submit-business-registration"]');
    await this.waitForLoadingToComplete();
  }

  async registerBusiness(businessData: {
    businessName: string;
    businessPhone: string;
    address: string;
    category: string;
    description?: string;
  }) {
    await this.navigateToBusinessRegistration();
    await this.fillBusinessRegistrationForm(businessData);
    await this.submitBusinessRegistration();
  }

  // Business status
  async getBusinessStatus(): Promise<string> {
    const statusElement = '[data-testid="business-status"]';
    if (await this.isElementVisible(statusElement)) {
      return await this.getElementText(statusElement);
    }
    return '';
  }

  async isBusinessApproved(): Promise<boolean> {
    const status = await this.getBusinessStatus();
    return status.includes('승인') || status.includes('approved');
  }

  async isPendingApproval(): Promise<boolean> {
    const status = await this.getBusinessStatus();
    return status.includes('대기') || status.includes('pending');
  }

  async isBusinessRejected(): Promise<boolean> {
    const status = await this.getBusinessStatus();
    return status.includes('반려') || status.includes('rejected');
  }

  // QR Code management
  async generateQRCode(options?: {
    amount?: number;
    description?: string;
    expiresIn?: number;
  }) {
    await this.navigateToQRManagement();
    
    const generateButton = '[data-testid="generate-qr-code"]';
    await this.clickElement(generateButton);
    
    if (options?.amount) {
      const amountInput = '[data-testid="qr-amount"]';
      if (await this.isElementVisible(amountInput)) {
        await this.fillInput(amountInput, options.amount.toString());
      }
    }
    
    if (options?.description) {
      const descriptionInput = '[data-testid="qr-description"]';
      if (await this.isElementVisible(descriptionInput)) {
        await this.fillInput(descriptionInput, options.description);
      }
    }
    
    if (options?.expiresIn) {
      const expirySelect = '[data-testid="qr-expiry"]';
      if (await this.isElementVisible(expirySelect)) {
        await this.selectOption(expirySelect, options.expiresIn.toString());
      }
    }
    
    const confirmButton = '[data-testid="confirm-generate-qr"]';
    await this.clickElement(confirmButton);
    await this.waitForLoadingToComplete();
  }

  async isQRCodeGenerated(): Promise<boolean> {
    const qrCodeImage = '[data-testid="generated-qr-code"]';
    return await this.isElementVisible(qrCodeImage);
  }

  async downloadQRCode() {
    const downloadButton = '[data-testid="download-qr-code"]';
    if (await this.isElementVisible(downloadButton)) {
      await this.clickElement(downloadButton);
    }
  }

  async getQRCodeList(): Promise<Array<{
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    isActive: boolean;
  }>> {
    await this.navigateToQRManagement();
    
    const qrList = this.page.locator('[data-testid="qr-code-item"]');
    const count = await qrList.count();
    const codes = [];
    
    for (let i = 0; i < count; i++) {
      const item = qrList.nth(i);
      
      const id = await item.getAttribute('data-qr-id') || '';
      const amountText = await item.locator('[data-testid="qr-item-amount"]').textContent() || '0';
      const amount = parseInt(amountText.replace(/[^\d]/g, '')) || 0;
      const description = await item.locator('[data-testid="qr-item-description"]').textContent() || '';
      const createdAt = await item.locator('[data-testid="qr-item-created"]').textContent() || '';
      const isActive = await item.locator('[data-testid="qr-item-active"]').isVisible();
      
      codes.push({ id, amount, description, createdAt, isActive });
    }
    
    return codes;
  }

  async deactivateQRCode(qrId: string) {
    const deactivateButton = `[data-testid="deactivate-qr-${qrId}"]`;
    if (await this.isElementVisible(deactivateButton)) {
      await this.clickElement(deactivateButton);
      await this.waitForLoadingToComplete();
    }
  }

  // Customer management
  async getCustomerList(): Promise<Array<{
    name: string;
    email: string;
    phone: string;
    totalTransactions: number;
    lastVisit: string;
    mileageBalance: number;
  }>> {
    await this.navigateToCustomerManagement();
    
    const customerRows = this.page.locator('[data-testid="customer-row"]');
    const count = await customerRows.count();
    const customers = [];
    
    for (let i = 0; i < count; i++) {
      const row = customerRows.nth(i);
      
      const name = await row.locator('[data-testid="customer-name"]').textContent() || '';
      const email = await row.locator('[data-testid="customer-email"]').textContent() || '';
      const phone = await row.locator('[data-testid="customer-phone"]').textContent() || '';
      const transactionText = await row.locator('[data-testid="customer-transactions"]').textContent() || '0';
      const totalTransactions = parseInt(transactionText) || 0;
      const lastVisit = await row.locator('[data-testid="customer-last-visit"]').textContent() || '';
      const mileageText = await row.locator('[data-testid="customer-mileage"]').textContent() || '0';
      const mileageBalance = parseInt(mileageText.replace(/[^\d]/g, '')) || 0;
      
      customers.push({ name, email, phone, totalTransactions, lastVisit, mileageBalance });
    }
    
    return customers;
  }

  async searchCustomer(searchTerm: string) {
    await this.navigateToCustomerManagement();
    
    const searchInput = '[data-testid="customer-search"]';
    await this.fillInput(searchInput, searchTerm);
    
    const searchButton = '[data-testid="search-customer"]';
    if (await this.isElementVisible(searchButton)) {
      await this.clickElement(searchButton);
    } else {
      await this.pressKey('Enter');
    }
    
    await this.waitForLoadingToComplete();
  }

  async viewCustomerDetails(customerEmail: string) {
    const customerRow = `[data-customer-email="${customerEmail}"]`;
    if (await this.isElementVisible(customerRow)) {
      await this.clickElement(customerRow);
      await this.waitForLoadingToComplete();
    }
  }

  // Review management
  async getReviews(): Promise<Array<{
    customerName: string;
    rating: number;
    comment: string;
    date: string;
    hasReply: boolean;
  }>> {
    await this.navigateToReviews();
    
    const reviewRows = this.page.locator('[data-testid="review-row"]');
    const count = await reviewRows.count();
    const reviews = [];
    
    for (let i = 0; i < count; i++) {
      const row = reviewRows.nth(i);
      
      const customerName = await row.locator('[data-testid="review-customer"]').textContent() || '';
      const ratingText = await row.locator('[data-testid="review-rating"]').textContent() || '0';
      const rating = parseInt(ratingText) || 0;
      const comment = await row.locator('[data-testid="review-comment"]').textContent() || '';
      const date = await row.locator('[data-testid="review-date"]').textContent() || '';
      const hasReply = await row.locator('[data-testid="review-reply"]').isVisible();
      
      reviews.push({ customerName, rating, comment, date, hasReply });
    }
    
    return reviews;
  }

  async replyToReview(reviewId: string, replyText: string) {
    const replyButton = `[data-testid="reply-review-${reviewId}"]`;
    if (await this.isElementVisible(replyButton)) {
      await this.clickElement(replyButton);
      
      const replyInput = '[data-testid="review-reply-input"]';
      await this.fillInput(replyInput, replyText);
      
      const submitReplyButton = '[data-testid="submit-review-reply"]';
      await this.clickElement(submitReplyButton);
      await this.waitForLoadingToComplete();
    }
  }

  async getAverageRating(): Promise<number> {
    const ratingElement = '[data-testid="average-rating"]';
    if (await this.isElementVisible(ratingElement)) {
      const ratingText = await this.getElementText(ratingElement);
      return parseFloat(ratingText) || 0;
    }
    return 0;
  }

  // Settlement management
  async getSettlements(): Promise<Array<{
    period: string;
    amount: number;
    platformFee: number;
    netAmount: number;
    status: string;
    requestedAt: string;
  }>> {
    await this.navigateToSettlements();
    
    const settlementRows = this.page.locator('[data-testid="settlement-row"]');
    const count = await settlementRows.count();
    const settlements = [];
    
    for (let i = 0; i < count; i++) {
      const row = settlementRows.nth(i);
      
      const period = await row.locator('[data-testid="settlement-period"]').textContent() || '';
      const amountText = await row.locator('[data-testid="settlement-amount"]').textContent() || '0';
      const amount = parseInt(amountText.replace(/[^\d]/g, '')) || 0;
      const feeText = await row.locator('[data-testid="settlement-fee"]').textContent() || '0';
      const platformFee = parseInt(feeText.replace(/[^\d]/g, '')) || 0;
      const netText = await row.locator('[data-testid="settlement-net"]').textContent() || '0';
      const netAmount = parseInt(netText.replace(/[^\d]/g, '')) || 0;
      const status = await row.locator('[data-testid="settlement-status"]').textContent() || '';
      const requestedAt = await row.locator('[data-testid="settlement-requested"]').textContent() || '';
      
      settlements.push({ period, amount, platformFee, netAmount, status, requestedAt });
    }
    
    return settlements;
  }

  async requestSettlement(period: string) {
    const requestButton = `[data-testid="request-settlement-${period}"]`;
    if (await this.isElementVisible(requestButton)) {
      await this.clickElement(requestButton);
      
      const confirmButton = '[data-testid="confirm-settlement-request"]';
      if (await this.isElementVisible(confirmButton)) {
        await this.clickElement(confirmButton);
      }
      
      await this.waitForLoadingToComplete();
    }
  }

  async downloadSettlementReport(settlementId: string) {
    const downloadButton = `[data-testid="download-settlement-${settlementId}"]`;
    if (await this.isElementVisible(downloadButton)) {
      await this.clickElement(downloadButton);
    }
  }

  // Analytics and statistics
  async getDashboardStats(): Promise<{
    totalCustomers: number;
    totalTransactions: number;
    totalRevenue: number;
    averageRating: number;
    todayTransactions: number;
    monthlyGrowth: number;
  }> {
    await this.navigateToBusinessDashboard();
    
    const totalCustomersText = await this.getElementText('[data-testid="total-customers"]');
    const totalTransactionsText = await this.getElementText('[data-testid="total-transactions"]');
    const totalRevenueText = await this.getElementText('[data-testid="total-revenue"]');
    const averageRatingText = await this.getElementText('[data-testid="average-rating"]');
    const todayTransactionsText = await this.getElementText('[data-testid="today-transactions"]');
    const monthlyGrowthText = await this.getElementText('[data-testid="monthly-growth"]');
    
    return {
      totalCustomers: parseInt(totalCustomersText.replace(/[^\d]/g, '')) || 0,
      totalTransactions: parseInt(totalTransactionsText.replace(/[^\d]/g, '')) || 0,
      totalRevenue: parseInt(totalRevenueText.replace(/[^\d]/g, '')) || 0,
      averageRating: parseFloat(averageRatingText) || 0,
      todayTransactions: parseInt(todayTransactionsText.replace(/[^\d]/g, '')) || 0,
      monthlyGrowth: parseFloat(monthlyGrowthText.replace(/[^\d.-]/g, '')) || 0
    };
  }

  async getTransactionHistory(): Promise<Array<{
    date: string;
    customerName: string;
    amount: number;
    type: string;
    status: string;
  }>> {
    const transactionRows = this.page.locator('[data-testid="transaction-row"]');
    const count = await transactionRows.count();
    const transactions = [];
    
    for (let i = 0; i < count; i++) {
      const row = transactionRows.nth(i);
      
      const date = await row.locator('[data-testid="transaction-date"]').textContent() || '';
      const customerName = await row.locator('[data-testid="transaction-customer"]').textContent() || '';
      const amountText = await row.locator('[data-testid="transaction-amount"]').textContent() || '0';
      const amount = parseInt(amountText.replace(/[^\d]/g, '')) || 0;
      const type = await row.locator('[data-testid="transaction-type"]').textContent() || '';
      const status = await row.locator('[data-testid="transaction-status"]').textContent() || '';
      
      transactions.push({ date, customerName, amount, type, status });
    }
    
    return transactions;
  }

  // Business settings
  async updateBusinessInfo(updates: {
    businessName?: string;
    businessPhone?: string;
    address?: string;
    description?: string;
  }) {
    await this.goto('/settings');
    await this.waitForLoadingToComplete();
    
    if (updates.businessName) {
      await this.fillInput('[data-testid="edit-business-name"]', updates.businessName);
    }
    
    if (updates.businessPhone) {
      await this.fillInput('[data-testid="edit-business-phone"]', updates.businessPhone);
    }
    
    if (updates.address) {
      await this.fillInput('[data-testid="edit-business-address"]', updates.address);
    }
    
    if (updates.description) {
      await this.fillInput('[data-testid="edit-business-description"]', updates.description);
    }
    
    const saveButton = '[data-testid="save-business-info"]';
    await this.clickElement(saveButton);
    await this.waitForLoadingToComplete();
  }

  // Success/Error messages
  async getBusinessSuccess(): Promise<string | null> {
    return await this.getSuccessMessage();
  }

  async getBusinessError(): Promise<string | null> {
    return await this.getErrorMessage();
  }

  // Validation methods
  async isBusinessDashboardVisible(): Promise<boolean> {
    const dashboardHeader = '[data-testid="dashboard-header"]';
    return await this.isElementVisible(dashboardHeader);
  }

  async hasBusinessAccess(): Promise<boolean> {
    // Check if user has business account access
    const businessNav = '[data-testid="business-navigation"]';
    const businessMenu = '[data-testid="business-menu"]';
    
    return await this.isElementVisible(businessNav) || 
           await this.isElementVisible(businessMenu);
  }
}