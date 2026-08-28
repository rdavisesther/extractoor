import dns from 'dns';
import { promisify } from 'util';
import type { DnsQuery, DnsRecord, DnsResult } from '../types';
import { logger } from '../utils/logger';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolveNs = promisify(dns.resolveNs);
const resolveSoa = promisify(dns.resolveSoa);
const resolveSrv = promisify(dns.resolveSrv);
const resolvePtr = promisify(dns.resolvePtr);

const DNS_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'CNAME', 'NS', 'SOA', 'SRV', 'DMARC', 'SPF'] as const;

export function getSupportedDnsTypes(): string[] {
  return [...DNS_TYPES];
}

async function queryA(domain: string): Promise<DnsRecord[]> {
  try {
    const addresses = await resolve4(domain, { ttl: true });
    return addresses.map((a) => ({
      type: 'A',
      host: domain,
      value: a.address,
      ttl: a.ttl,
    }));
  } catch {
    return [];
  }
}

async function queryAAAA(domain: string): Promise<DnsRecord[]> {
  try {
    const addresses = await resolve6(domain, { ttl: true });
    return addresses.map((a) => ({
      type: 'AAAA',
      host: domain,
      value: a.address,
      ttl: a.ttl,
    }));
  } catch {
    return [];
  }
}

async function queryMX(domain: string): Promise<DnsRecord[]> {
  try {
    const records = await resolveMx(domain);
    return records
      .sort((a, b) => a.priority - b.priority)
      .map((r) => ({
        type: 'MX',
        host: domain,
        value: r.exchange,
        priority: r.priority,
      }));
  } catch {
    return [];
  }
}

async function queryTXT(domain: string): Promise<DnsRecord[]> {
  try {
    const records = await resolveTxt(domain);
    return records.map((r) => ({
      type: 'TXT',
      host: domain,
      value: r.join(''),
    }));
  } catch {
    return [];
  }
}

async function queryCNAME(domain: string): Promise<DnsRecord[]> {
  try {
    const records = await resolveCname(domain);
    return records.map((r) => ({
      type: 'CNAME',
      host: domain,
      value: r,
    }));
  } catch {
    return [];
  }
}

async function queryNS(domain: string): Promise<DnsRecord[]> {
  try {
    const records = await resolveNs(domain);
    return records.map((r) => ({
      type: 'NS',
      host: domain,
      value: r,
    }));
  } catch {
    return [];
  }
}

async function querySOA(domain: string): Promise<DnsRecord[]> {
  try {
    const record = await resolveSoa(domain);
    return [
      {
        type: 'SOA',
        host: domain,
        value: `${record.nsname} ${record.hostmaster} ${record.serial} ${record.refresh} ${record.retry} ${record.expire} ${record.minttl}`,
      },
    ];
  } catch {
    return [];
  }
}

async function querySRV(domain: string): Promise<DnsRecord[]> {
  try {
    const records = await resolveSrv(domain);
    return records.map((r) => ({
      type: 'SRV',
      host: domain,
      value: `${r.priority} ${r.weight} ${r.port} ${r.name}`,
      priority: r.priority,
    }));
  } catch {
    return [];
  }
}

async function queryDMARC(domain: string): Promise<DnsRecord[]> {
  try {
    const records = await resolveTxt(`_dmarc.${domain}`);
    const dmarcRecords = records
      .map((r) => r.join(''))
      .filter((r) => r.toLowerCase().startsWith('v=dmarc1'));
    return dmarcRecords.map((r) => ({
      type: 'DMARC',
      host: `_dmarc.${domain}`,
      value: r,
    }));
  } catch {
    return [];
  }
}

async function querySPF(domain: string): Promise<DnsRecord[]> {
  try {
    const records = await resolveTxt(domain);
    const spfRecords = records
      .map((r) => r.join(''))
      .filter((r) => r.toLowerCase().startsWith('v=spf1'));
    return spfRecords.map((r) => ({
      type: 'SPF',
      host: domain,
      value: r,
    }));
  } catch {
    return [];
  }
}

const QUERY_MAP: Record<string, (domain: string) => Promise<DnsRecord[]>> = {
  A: queryA,
  AAAA: queryAAAA,
  MX: queryMX,
  TXT: queryTXT,
  CNAME: queryCNAME,
  NS: queryNS,
  SOA: querySOA,
  SRV: querySRV,
  DMARC: queryDMARC,
  SPF: querySPF,
};

export class DnsService {
  async lookup(query: DnsQuery): Promise<DnsResult> {
    const start = Date.now();
    const domain = query.domain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const types = query.types.filter((t) => t in QUERY_MAP);

    if (types.length === 0) {
      return { domain, records: [], queryTime: 0 };
    }

    const results = await Promise.all(
      types.map(async (type) => {
        try {
          return await QUERY_MAP[type](domain);
        } catch (err) {
          logger.warn('DNS query failed', { domain, type, error: String(err) });
          return [];
        }
      }),
    );

    const records = results.flat();
    return { domain, records, queryTime: Date.now() - start };
  }
}

export const dnsService = new DnsService();
