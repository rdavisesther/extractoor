export interface MailboxCredentials {
  email: string;
  password: string;
  host?: string;
  port?: number;
  secure?: boolean;
}

export interface ProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  name: string;
}

export type ExtractField =
  | 'fromName'
  | 'fromEmail'
  | 'to'
  | 'cc'
  | 'bcc'
  | 'subject'
  | 'date'
  | 'messageId'
  | 'replyTo'
  | 'body'
  | 'htmlBody'
  | 'textBody'
  | 'attachments';

export const ALL_FIELDS: ExtractField[] = [
  'fromName', 'fromEmail', 'to', 'cc', 'bcc', 'subject',
  'date', 'messageId', 'replyTo', 'body', 'htmlBody',
  'textBody', 'attachments',
];

export const FIELD_LABELS: Record<ExtractField, string> = {
  fromName: 'From Name',
  fromEmail: 'From Email',
  to: 'To',
  cc: 'CC',
  bcc: 'BCC',
  subject: 'Subject',
  date: 'Date',
  messageId: 'Message ID',
  replyTo: 'Reply-To',
  body: 'Email Body',
  htmlBody: 'HTML Body',
  textBody: 'Plain Text Body',
  attachments: 'Attachments',
};

export interface ExtractOptions {
  folders: string[];
  startFrom: number;
  count: number;
  fields: ExtractField[];
}

export interface ExtractionProgress {
  phase: 'connecting' | 'listing' | 'extracting' | 'complete';
  currentFolder: string;
  processed: number;
  total: number;
  found: number;
  skipped: number;
  errors: number;
}

export interface ExtractionEvent {
  type: 'progress' | 'complete' | 'error';
  phase?: ExtractionProgress['phase'];
  currentFolder?: string;
  processed?: number;
  total?: number;
  found?: number;
  skipped?: number;
  errors?: number;
  results?: EmailData[];
  error?: string;
}

export interface EmailData {
  uid: number;
  folder: string;
  fromName?: string;
  fromEmail?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  date?: string;
  messageId?: string;
  replyTo?: string;
  body?: string;
  htmlBody?: string;
  textBody?: string;
  attachments?: string[];
}

export interface Folder {
  name: string;
  path: string;
  delimiter: string;
  flags: string[];
}

export interface DnsQuery {
  domain: string;
  types: string[];
}

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

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'txt';

export interface ExportRequest {
  data: EmailData[];
  fields: ExtractField[];
  format: ExportFormat;
}

export interface TestConnectionRequest {
  email: string;
  password: string;
  host?: string;
  port?: number;
}

export interface ListFoldersRequest {
  email: string;
  password: string;
  host?: string;
  port?: number;
}

export interface ExtractRequest extends TestConnectionRequest {
  folders: string[];
  startFrom: number;
  count: number;
  fields: ExtractField[];
}
