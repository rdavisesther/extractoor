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
  [key: string]: unknown;
}

export interface Folder {
  name: string;
  path: string;
  delimiter: string;
  flags: string[];
}
