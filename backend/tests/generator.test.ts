import { describe, it, expect } from 'vitest';
import { generateInline } from '../src/services/generator.service';
import { generateForJob, buildPatternPrefixes, padNumber, formatSubdomain } from '../src/services/generator.core';
import type { GenerateRequest } from '../src/types';

const baseRequest: GenerateRequest = {
  domains: ['example.com'],
  count: 500,
  categories: [],
  customPrefixes: [],
  pattern: { enabled: false, bases: [], start: 1, digits: 2, direction: 'asc' },
  randomMode: false,
  aiMode: false,
  format: 'subdomain',
};

describe('generateInline', () => {
  it('generates the requested number of unique subdomains', () => {
    const { results, stats } = generateInline({ ...baseRequest, count: 1000 });
    expect(results.length).toBe(1000);
    expect(new Set(results).size).toBe(1000);
    expect(stats.unique).toBe(1000);
    expect(results[0]).toBe('mail.example.com');
  });

  it('returns the documented first results for example.com', () => {
    const { results } = generateInline({ ...baseRequest, count: 10 });
    const prefixes = results.map((r) => r.split('.')[0]);
    expect(prefixes).toContain('mail');
    expect(prefixes).toContain('www');
    expect(prefixes).toContain('api');
  });

  it('generates for every bulk domain', () => {
    const { results } = generateInline({
      ...baseRequest,
      domains: ['example.com', 'google.com'],
      count: 100,
    });
    expect(results.some((r) => r.endsWith('example.com'))).toBe(true);
    expect(results.some((r) => r.endsWith('google.com'))).toBe(true);
  });

  it('includes custom prefixes', () => {
    const { results } = generateInline({
      ...baseRequest,
      count: 50,
      customPrefixes: ['abc', 'test', 'support'],
      categories: ['common'],
    });
    expect(results).toContain('abc.example.com');
    expect(results).toContain('test.example.com');
    expect(results).toContain('support.example.com');
  });

  it('never emits duplicates even when prefix pool is tiny', () => {
    const { results, stats } = generateInline({
      ...baseRequest,
      count: 500,
      categories: ['email'],
      customPrefixes: [],
    });
    expect(new Set(results).size).toBe(results.length);
    expect(stats.duplicatesRemoved).toBe(0);
  });

  it('supports https and http output formats', () => {
    const https = generateInline({ ...baseRequest, count: 5, format: 'https' });
    expect(https.results[0]).toMatch(/^https:\/\/mail\.example\.com$/);
    const http = generateInline({ ...baseRequest, count: 5, format: 'http' });
    expect(http.results[0]).toMatch(/^http:\/\/mail\.example\.com$/);
  });

  it('ai smart mode uses realistic curated prefixes', () => {
    const { results } = generateInline({ ...baseRequest, count: 50, aiMode: true, categories: [] });
    expect(results[0]).toBe('customer-support.example.com');
    const prefixes = results.map((r) => r.split('.')[0]);
    expect(prefixes).toContain('billing');
    expect(prefixes).toContain('gateway');
    expect(prefixes).toContain('login');
  });

  it('random mode produces readable prefixes', () => {
    const { results } = generateInline({
      ...baseRequest,
      count: 40,
      randomMode: true,
      categories: [],
    });
    const prefixes = results.map((r) => r.split('.')[0]);
    expect(prefixes).toContain('horizon');
    expect(prefixes).toContain('nova');
  });

  it('pattern mode generates padded sequential subdomains', () => {
    const { results } = generateInline({
      ...baseRequest,
      count: 6,
      categories: [],
      pattern: {
        enabled: true,
        bases: ['mail', 'mx'],
        start: 1,
        digits: 2,
        direction: 'asc',
      },
    });
    expect(results).toEqual([
      'mail01.example.com',
      'mx01.example.com',
      'mail02.example.com',
      'mx02.example.com',
      'mail03.example.com',
      'mx03.example.com',
    ]);
  });

  it('pattern mode respects per-base digit overrides', () => {
    const { results } = generateInline({
      ...baseRequest,
      count: 2,
      categories: [],
      pattern: { enabled: true, bases: ['server:3'], start: 1, digits: 2, direction: 'asc' },
    });
    expect(results).toEqual(['server001.example.com', 'server002.example.com']);
  });
});

describe('generateForJob', () => {
  it('caps results at the share', () => {
    const { results } = generateForJob({
      domains: ['example.com'],
      prefixes: ['a', 'b', 'c'],
      share: 2,
      format: 'subdomain',
    });
    expect(results).toEqual(['a.example.com', 'b.example.com']);
  });
});

describe('padNumber', () => {
  it('pads to the requested width', () => {
    expect(padNumber(1, 2)).toBe('01');
    expect(padNumber(42, 4)).toBe('0042');
    expect(padNumber(7, 0)).toBe('7');
  });
});

describe('buildPatternPrefixes', () => {
  it('builds descending sequences', () => {
    const prefixes = buildPatternPrefixes(['mail'], 1, 2, 'desc', 3);
    expect(prefixes).toEqual(['mail03', 'mail02', 'mail01']);
  });
});

describe('formatSubdomain', () => {
  it('formats each output style', () => {
    expect(formatSubdomain('mail', 'example.com', 'subdomain')).toBe('mail.example.com');
    expect(formatSubdomain('mail', 'example.com', 'https')).toBe('https://mail.example.com');
    expect(formatSubdomain('mail', 'example.com', 'http')).toBe('http://mail.example.com');
  });
});
