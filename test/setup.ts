/**
 * Test setup file
 * Runs before all tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/buzz_test';
process.env.SESSION_SECRET = 'test-secret-key';
process.env.API_URL = 'http://localhost:8083/api';

// Global test setup
beforeAll(() => {
  // Setup that runs once before all tests
  console.log('🧪 Starting test suite...');
});

afterAll(() => {
  // Cleanup that runs once after all tests
  console.log('✅ Test suite completed');
});

beforeEach(() => {
  // Setup that runs before each test
  // Reset mocks, clear caches, etc.
});

afterEach(() => {
  // Cleanup that runs after each test
  // Clear timers, restore mocks, etc.
});

// Mock fetch for Node.js environment
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn();
}

// Mock window object for tests that need it
global.window = {
  location: {
    href: 'http://localhost:8010',
    origin: 'http://localhost:8010',
  },
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
} as any;