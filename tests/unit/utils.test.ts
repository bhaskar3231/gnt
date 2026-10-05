import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  slugify,
  generateOrderNumber,
} from '@/lib/utils/format';

describe('Format Utilities', () => {
  describe('formatCurrency', () => {
    it('should format currency with INR symbol', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('₹');
      expect(result).toContain('1,000');
    });

    it('should handle decimal amounts', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('₹');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('₹');
    });
  });

  describe('slugify', () => {
    it('should convert text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello @ World!')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello    World')).toBe('hello-world');
    });

    it('should convert to lowercase', () => {
      expect(slugify('UPPERCASE')).toBe('uppercase');
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate unique order numbers', () => {
      const order1 = generateOrderNumber();
      const order2 = generateOrderNumber();
      expect(order1).not.toBe(order2);
    });

    it('should start with ORD-', () => {
      const order = generateOrderNumber();
      expect(order).toMatch(/^ORD-/);
    });

    it('should have correct format', () => {
      const order = generateOrderNumber();
      expect(order).toMatch(/^ORD-[A-Z0-9]+-[A-Z0-9]+$/);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-01-15');
      const result = formatDate(date);
      expect(result).toContain('2026');
      expect(result).toContain('January');
      expect(result).toContain('15');
    });
  });
});