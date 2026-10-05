import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/gnt-test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';