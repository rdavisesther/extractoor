export interface DnsRecord {
  type: string;
  host: string;
  value: string;
  ttl?: number;
  priority?: number;
}

export interface DnsResult {
  domain: string;
  records: DnsRecord[];
  queryTime: number;
}
