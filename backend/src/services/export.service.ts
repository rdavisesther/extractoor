import ExcelJS from 'exceljs';
import type { ExportFormat } from '../types';

const FIELD_LABELS: Record<string, string> = {
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

function fieldToValue(row: Record<string, unknown>, field: string): string {
  const val = row[field];
  if (val === undefined || val === null) return '';
  if (Array.isArray(val)) return val.map(String).join('; ');
  return String(val);
}

function labelFor(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export class ExportService {
  toCSV(data: Record<string, unknown>[], fields: string[]): string {
    const header = fields.map((f) => escapeCSV(labelFor(f))).join(',');
    const rows = data.map((row) => fields.map((f) => escapeCSV(fieldToValue(row, f))).join(','));
    return '\uFEFF' + header + '\n' + rows.join('\n') + '\n';
  }

  toJSON(data: Record<string, unknown>[], fields: string[]): string {
    const filtered = data.map((row) => {
      const obj: Record<string, string> = {};
      for (const field of fields) {
        obj[labelFor(field)] = fieldToValue(row, field);
      }
      return obj;
    });
    return JSON.stringify(filtered, null, 2);
  }

  toTXT(data: Record<string, unknown>[]): string {
    const emails = data
      .map((r) => r.fromEmail)
      .filter((e): e is string => !!e && typeof e === 'string');
    return [...new Set(emails)].join('\n') + '\n';
  }

  async toXLSX(data: Record<string, unknown>[], fields: string[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MailCMH';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Emails');

    const headerRow = sheet.addRow(fields.map((f) => labelFor(f)));
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };

    for (const row of data) {
      sheet.addRow(fields.map((f) => fieldToValue(row, f)));
    }

    fields.forEach((_, i) => {
      sheet.getColumn(i + 1).width = Math.max(20, Math.min(45, labelFor(fields[i]).length + 10));
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: fields.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  formatToContentType(format: ExportFormat): string {
    switch (format) {
      case 'csv':
        return 'text/csv; charset=utf-8';
      case 'json':
        return 'application/json; charset=utf-8';
      case 'txt':
        return 'text/plain; charset=utf-8';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
  }
}

export const exportService = new ExportService();
