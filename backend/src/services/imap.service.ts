import { ImapFlow, MailboxObject } from 'imapflow';
import type { ListResponse } from 'imapflow';
import { simpleParser } from 'mailparser';
import type {
  MailboxCredentials,
  ProviderConfig,
  ExtractOptions,
  ExtractField,
  ExtractionProgress,
  EmailData,
  Folder,
} from '../types';
import { logger } from '../utils/logger';

const PROVIDERS: Record<string, ProviderConfig> = {
  'gmail.com': { host: 'imap.gmail.com', port: 993, secure: true, name: 'Gmail' },
  'googlemail.com': { host: 'imap.gmail.com', port: 993, secure: true, name: 'Gmail' },
  'outlook.com': { host: 'outlook.office365.com', port: 993, secure: true, name: 'Outlook' },
  'hotmail.com': { host: 'outlook.office365.com', port: 993, secure: true, name: 'Outlook' },
  'live.com': { host: 'outlook.office365.com', port: 993, secure: true, name: 'Outlook' },
  'live.fr': { host: 'outlook.office365.com', port: 993, secure: true, name: 'Outlook' },
  'yahoo.com': { host: 'imap.mail.yahoo.com', port: 993, secure: true, name: 'Yahoo' },
  'yahoo.fr': { host: 'imap.mail.yahoo.com', port: 993, secure: true, name: 'Yahoo' },
  'aol.com': { host: 'imap.aol.com', port: 993, secure: true, name: 'AOL' },
  'icloud.com': { host: 'imap.mail.me.com', port: 993, secure: true, name: 'iCloud' },
  'me.com': { host: 'imap.mail.me.com', port: 993, secure: true, name: 'iCloud' },
};

function detectProvider(email: string): ProviderConfig | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  return PROVIDERS[domain] ?? null;
}

function buildClientConfig(creds: MailboxCredentials): {
  host: string;
  port: number;
  secure: boolean;
} {
  if (creds.host) {
    return {
      host: creds.host,
      port: creds.port ?? 993,
      secure: creds.secure ?? true,
    };
  }
  const provider = detectProvider(creds.email);
  if (provider) {
    return { host: provider.host, port: provider.port, secure: provider.secure };
  }
  return { host: '', port: 993, secure: true };
}

function imapErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('invalid credentials') || lower.includes('authentication failed') || lower.includes('login failed')) {
    return 'Authentication failed. The mailbox rejected the credentials.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Connection timed out. The server did not respond in time.';
  }
  if (lower.includes('econnrefused') || lower.includes('connect')) {
    return 'Unable to connect to the mailbox server. Check the host and port settings.';
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return 'Could not resolve the mail server hostname. Check the email address or host settings.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'The provider temporarily limited requests. Please retry later.';
  }
  if (lower.includes('ssl') || lower.includes('tls') || lower.includes('certificate')) {
    return 'SSL/TLS handshake failed. The server certificate may be invalid.';
  }
  return 'Unable to connect to the mailbox. Check the email address, app password, and provider settings.';
}

type AddressLike = { name?: string; address?: string };

function toAddressArray(value: unknown): AddressLike[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return value.filter((v): v is AddressLike => typeof v === 'object' && v !== null);
  }
  if (typeof value === 'object') return [value as AddressLike];
  return [];
}

function extractFrom(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const obj = typeof value === 'object' && !Array.isArray(value) ? (value as { value?: unknown }) : undefined;
  const inner = Array.isArray(value) ? value : obj?.value;
  return extractAddress(inner);
}

function extractAddress(value: unknown): string | undefined {
  const addrs = toAddressArray(value);
  if (addrs.length === 0) return undefined;
  return addrs
    .map((a) => (a.name && a.address ? `${a.name} <${a.address}>` : a.address ?? a.name ?? ''))
    .filter(Boolean)
    .join(', ');
}

function extractAddressEmails(value: unknown): string | undefined {
  const addrs = toAddressArray(value);
  if (addrs.length === 0) return undefined;
  return addrs
    .map((a) => a.address)
    .filter((a): a is string => !!a)
    .join(', ');
}

export class ImapService {
  private activeConnections = new Map<string, ImapFlow>();

  getProviderInfo(email: string): ProviderConfig | null {
    return detectProvider(email);
  }

  async testConnection(creds: MailboxCredentials): Promise<{ success: boolean; provider: string; error?: string }> {
    const config = buildClientConfig(creds);
    if (!config.host) {
      return { success: false, provider: 'Unknown', error: 'Could not detect IMAP server for this email domain. Please provide host and port manually.' };
    }
    const provider = detectProvider(creds.email);
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: creds.email, pass: creds.password },
      logger: false,
      connectionTimeout: 15000,
      greetingTimeout: 10000,
    });
    try {
      await client.connect();
      await client.logout();
      return { success: true, provider: provider?.name ?? 'Custom IMAP' };
    } catch (err) {
      logger.warn('Connection test failed', { email: creds.email, error: imapErrorMessage(err) });
      return { success: false, provider: provider?.name ?? 'Custom IMAP', error: imapErrorMessage(err) };
    }
  }

  async listFolders(creds: MailboxCredentials): Promise<Folder[]> {
    const config = buildClientConfig(creds);
    if (!config.host) throw new Error('Could not detect IMAP server for this email domain.');
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: creds.email, pass: creds.password },
      logger: false,
      connectionTimeout: 15000,
    });
    try {
      await client.connect();
      const mailboxes: ListResponse[] = await client.list();
      await client.logout();
      return mailboxes.map((mb) => ({
        name: mb.name,
        path: mb.path,
        delimiter: mb.delimiter ?? '/',
        flags: Array.from(mb.flags ?? []).map((f) => String(f)),
      }));
    } catch (err) {
      throw new Error(imapErrorMessage(err));
    }
  }

  async *extractEmails(
    creds: MailboxCredentials,
    options: ExtractOptions,
    onProgress: (progress: ExtractionProgress) => void,
  ): AsyncGenerator<EmailData> {
    const config = buildClientConfig(creds);
    if (!config.host) throw new Error('Could not detect IMAP server for this email domain.');

    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: creds.email, pass: creds.password },
      logger: false,
      connectionTimeout: 15000,
    });

    let disconnected = false;
    try {
      onProgress({ phase: 'connecting', currentFolder: '', processed: 0, total: 0, found: 0, skipped: 0, errors: 0 });
      await client.connect();

      let totalEstimate = 0;
      const folderCounts: Record<string, number> = {};
      for (const folderPath of options.folders) {
        try {
          const lock = await client.getMailboxLock(folderPath);
          try {
            const status = await client.status(folderPath, { messages: true });
            folderCounts[folderPath] = status.messages ?? 0;
            totalEstimate += status.messages ?? 0;
          } finally {
            lock.release();
          }
        } catch {
          folderCounts[folderPath] = 0;
        }
      }

      onProgress({
        phase: 'listing',
        currentFolder: '',
        processed: 0,
        total: Math.min(totalEstimate, options.count),
        found: 0,
        skipped: 0,
        errors: 0,
      });

      let processed = 0;
      let found = 0;
      let skipped = 0;
      let errors = 0;
      let totalYielded = 0;

      for (const folderPath of options.folders) {
        if (totalYielded >= options.count) break;

        onProgress({
          phase: 'extracting',
          currentFolder: folderPath,
          processed,
          total: Math.min(totalEstimate, options.count),
          found,
          skipped,
          errors,
        });

        let lock;
        try {
          lock = await client.getMailboxLock(folderPath);
        } catch {
          errors++;
          logger.warn('Could not open folder', { folder: folderPath });
          continue;
        }

        try {
          const folderMessages = folderCounts[folderPath] ?? 0;
          if (folderMessages === 0) continue;

          const startSeq = Math.max(1, options.startFrom);
          const endSeq = Math.min(startSeq + options.count - 1, folderMessages);

          if (startSeq > folderMessages) {
            skipped += folderMessages;
            continue;
          }

          const seqRange = `${startSeq}:${endSeq}`;
          const fetchOpts: Record<string, boolean | { peek: boolean }> = {
            uid: true,
            envelope: true,
            bodyStructure: true,
            source: { peek: true },
          };

          for await (const message of client.fetch(seqRange, fetchOpts)) {
            if (totalYielded >= options.count) break;
            processed++;

            try {
              if (!message.source) {
                skipped++;
                continue;
              }

              const parsed = await simpleParser(message.source);
              const envelope = message.envelope;

              const emailData: EmailData = {
                uid: message.uid ?? processed,
                folder: folderPath,
              };

              for (const field of options.fields) {
                switch (field) {
                  case 'fromName':
                    emailData.fromName = parsed.from?.value?.[0]?.name ?? undefined;
                    break;
                  case 'fromEmail':
                    emailData.fromEmail = parsed.from?.value?.[0]?.address ?? undefined;
                    break;
                  case 'to':
                    emailData.to = extractFrom(parsed.to);
                    break;
                  case 'cc':
                    emailData.cc = extractFrom(parsed.cc);
                    break;
                  case 'bcc':
                    emailData.bcc = extractFrom(parsed.bcc);
                    break;
                  case 'subject':
                    emailData.subject = parsed.subject ?? envelope?.subject ?? undefined;
                    break;
                  case 'date':
                    emailData.date = (parsed.date ?? envelope?.date)?.toISOString() ?? undefined;
                    break;
                  case 'messageId':
                    emailData.messageId = parsed.messageId ?? envelope?.messageId ?? undefined;
                    break;
                  case 'replyTo':
                    emailData.replyTo = extractFrom(parsed.replyTo);
                    break;
                  case 'body':
                    emailData.body = parsed.text ?? undefined;
                    break;
                  case 'htmlBody':
                    emailData.htmlBody = typeof parsed.html === 'string' ? parsed.html : undefined;
                    break;
                  case 'textBody':
                    emailData.textBody = parsed.text ?? undefined;
                    break;
                  case 'attachments':
                    emailData.attachments = parsed.attachments?.map((a) => a.filename ?? 'unnamed') ?? [];
                    break;
                }
              }

              totalYielded++;
              found++;

              onProgress({
                phase: 'extracting',
                currentFolder: folderPath,
                processed,
                total: Math.min(totalEstimate, options.count),
                found,
                skipped,
                errors,
              });

              yield emailData;
            } catch (parseErr) {
              errors++;
              logger.debug('Failed to parse email', { uid: message.uid, error: String(parseErr) });
            }
          }
        } finally {
          lock.release();
        }
      }

      onProgress({
        phase: 'complete',
        currentFolder: '',
        processed,
        total: Math.min(totalEstimate, options.count),
        found,
        skipped,
        errors,
      });
    } catch (err) {
      disconnected = true;
      try { await client.logout(); } catch { /* ignore */ }
      throw new Error(imapErrorMessage(err));
    } finally {
      if (!disconnected) {
        try { await client.logout(); } catch { /* ignore */ }
      }
    }
  }
}

export const imapService = new ImapService();
