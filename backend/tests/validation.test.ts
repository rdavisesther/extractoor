import { describe, it, expect } from 'vitest';
import {
  isValidDomain,
  sanitizePrefix,
  isValidPrefix,
  parseDomains,
  normalizeDomain,
  firstCsvColumn,
} from '../src/utils/validation';

describe('isValidDomain', () => {
  it('accepts common domains', () => {
    expect(isValidDomain('example.com')).toBe(true);
    expect(isValidDomain('mail.example.co.uk')).toBe(true);
    expect(isValidDomain('EXAMPLE.COM')).toBe(true);
    expect(isValidDomain('https://example.com')).toBe(true);
    expect(isValidDomain('sub-domain.io')).toBe(true);
  });

  it('rejects invalid domains', () => {
    expect(isValidDomain('')).toBe(false);
    expect(isValidDomain('notadomain')).toBe(false);
    expect(isValidDomain('.com')).toBe(false);
    expect(isValidDomain('example.c')).toBe(false);
    expect(isValidDomain('example.c-om')).toBe(false);
    expect(isValidDomain('exa mple.com')).toBe(false);
    expect(isValidDomain('http://example.com/path')).toBe(false);
    expect(isValidDomain('user@example.com')).toBe(false);
    expect(isValidDomain('192.168.0.1')).toBe(false);
  });
});

describe('sanitizePrefix', () => {
  it('strips unsafe characters', () => {
    expect(sanitizePrefix('  Mail  ')).toBe('mail');
    expect(sanitizePrefix('hello world')).toBe('hello-world');
    expect(sanitizePrefix('<script>alert(1)</script>')).toBe('script-alert-1-script');
    expect(sanitizePrefix('---p---')).toBe('p');
  });

  it('caps length at 63 characters', () => {
    expect(sanitizePrefix('a'.repeat(100)).length).toBe(63);
  });
});

describe('isValidPrefix', () => {
  it('accepts dns-safe labels', () => {
    expect(isValidPrefix('mail')).toBe(true);
    expect(isValidPrefix('customer-support')).toBe(true);
  });
  it('rejects unsafe labels', () => {
    expect(isValidPrefix('')).toBe(false);
    expect(isValidPrefix('has space')).toBe(false);
  });
});

describe('parseDomains', () => {
  it('parses and deduplicates lines', () => {
    expect(parseDomains('example.com\ngoogle.com\nexample.com\n')).toEqual([
      'example.com',
      'google.com',
    ]);
  });
});

describe('normalizeDomain', () => {
  it('strips scheme and trailing slashes', () => {
    expect(normalizeDomain('HTTPS://Example.COM/')).toBe('example.com');
  });
});

describe('firstCsvColumn', () => {
  it('handles plain and quoted cells', () => {
    expect(firstCsvColumn('example.com,www,other')).toBe('example.com');
    expect(firstCsvColumn('"example,com",x')).toBe('example,com');
    expect(firstCsvColumn('   google.com   ')).toBe('google.com');
  });
});
