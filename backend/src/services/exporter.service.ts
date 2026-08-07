/**
 * Export service - serializes result lists into TXT, CSV, JSON and XLSX.
 */
import ExcelJS from 'exceljs';

export type ExportFormat = 'txt' | 'csv' | 'json' | 'xlsx';

export interface ExportResult {
  content: string | Buffer;
  filename: string;
  mime: string;
}

const FILE_NAMES: Record<ExportFormat, string> = {
  txt: 'subdomains.txt',
  csv: 'subdomains.csv',
  json: 'subdomains.json',
  xlsx: 'subdomains.xlsx',
};

const MIMES: Record<ExportFormat, string> = {
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function escapeCsv(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toTxt(results: string[]): string {
  return `${results.join('\n')}\n`;
}

function toCsv(results: string[]): string {
  const header = 'subdomain\n';
  const body = results.map((r) => escapeCsv(r)).join('\n');
  return `${header}${body}\n`;
}

function toJson(results: string[], meta?: Record<string, unknown>): string {
  return JSON.stringify(
    {
      success: true,
      total: results.length,
      ...(meta ?? {}),
      results,
    },
    null,
    2,
  );
}

async function toXlsx(results: string[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Subdomain Generator';
  const sheet = workbook.addWorksheet('Subdomains');

  sheet.columns = [{ header: '#', key: 'index', width: 8 }, { header: 'Subdomain', key: 'subdomain', width: 48 }];
  results.forEach((subdomain, index) => {
    sheet.addRow({ index: index + 1, subdomain });
  });

  sheet.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Serializes results into the requested export format. */
export async function buildExport(
  format: ExportFormat,
  results: string[],
  meta?: Record<string, unknown>,
): Promise<ExportResult> {
  let content: string | Buffer;
  switch (format) {
    case 'txt':
      content = toTxt(results);
      break;
    case 'csv':
      content = toCsv(results);
      break;
    case 'json':
      content = toJson(results, meta);
      break;
    case 'xlsx':
      content = await toXlsx(results);
      break;
  }
  return { content, filename: FILE_NAMES[format], mime: MIMES[format] };
}
