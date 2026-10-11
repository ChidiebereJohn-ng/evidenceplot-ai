import { CSV_LIMITS } from './contracts';

export interface ParsedCsvData {
  fileName: string;
  byteLength: number;
  sha256: string;
  headers: string[];
  rows: Record<string, string>[];
}

export class CsvValidationError extends Error {
  public readonly code:
    | 'INVALID_EXTENSION'
    | 'FILE_TOO_LARGE'
    | 'EMPTY_FILE'
    | 'BINARY_OR_INVALID_UTF8'
    | 'TOO_MANY_ROWS'
    | 'TOO_MANY_COLUMNS'
    | 'MALFORMED_CSV';

  constructor(
    code: CsvValidationError['code'],
    message: string
  ) {
    super(message);
    this.name = 'CsvValidationError';
    this.code = code;
  }
}

export async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function containsBinaryNullBytes(bytes: Uint8Array): boolean {
  const checkLen = Math.min(bytes.length, 8192);
  for (let i = 0; i < checkLen; i++) {
    if (bytes[i] === 0) {
      return true;
    }
  }
  return false;
}

/**
 * RFC-4180 compliant CSV parser that preserves raw cell strings (including leading/trailing whitespace)
 * so the profiler can report exact whitespace and formatting issues without silent alteration.
 */
export function parseCsvString(rawText: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  // Strip UTF-8 BOM if present
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;

  if (!text || text.trim().length === 0) {
    throw new CsvValidationError('EMPTY_FILE', 'The uploaded CSV file is empty.');
  }

  const records: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"' && currentField.length === 0) {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField);
        records.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField);
        records.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (inQuotes) {
    throw new CsvValidationError(
      'MALFORMED_CSV',
      'CSV contains an unclosed quoted value. Check quote formatting and try again.'
    );
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    records.push(currentRow);
  }

  // Filter out trailing completely blank newline records
  const nonEmptyRecords = records.filter(
    (r) => !(r.length === 1 && r[0].trim() === '')
  );

  if (nonEmptyRecords.length < 2) {
    throw new CsvValidationError(
      'EMPTY_FILE',
      'CSV must contain a header row and at least one observation row.'
    );
  }

  const rawHeaders = nonEmptyRecords[0].map((h) => h.trim());
  if (rawHeaders.length === 0 || rawHeaders.every((h) => h === '')) {
    throw new CsvValidationError('MALFORMED_CSV', 'CSV header row is missing column names.');
  }

  if (rawHeaders.length > CSV_LIMITS.MAX_COLUMNS) {
    throw new CsvValidationError(
      'TOO_MANY_COLUMNS',
      `CSV has ${rawHeaders.length} columns, exceeding the maximum of ${CSV_LIMITS.MAX_COLUMNS} columns.`
    );
  }

  const dataRecords = nonEmptyRecords.slice(1);
  if (dataRecords.length > CSV_LIMITS.MAX_ROWS) {
    throw new CsvValidationError(
      'TOO_MANY_ROWS',
      `CSV has ${dataRecords.length} rows, exceeding the maximum of ${CSV_LIMITS.MAX_ROWS} rows.`
    );
  }

  const rows: Record<string, string>[] = dataRecords.map((record) => {
    const obj: Record<string, string> = {};
    for (let colIdx = 0; colIdx < rawHeaders.length; colIdx++) {
      const key = rawHeaders[colIdx] || `col_${colIdx + 1}`;
      obj[key] = record[colIdx] ?? '';
    }
    return obj;
  });

  return { headers: rawHeaders, rows };
}

export async function parseAndValidateCsvBuffer(
  fileName: string,
  buffer: ArrayBuffer
): Promise<ParsedCsvData> {
  if (!fileName.toLowerCase().endsWith('.csv')) {
    throw new CsvValidationError(
      'INVALID_EXTENSION',
      `Unsupported file "${fileName}". Please upload a .csv file (max 5 MB).`
    );
  }

  if (buffer.byteLength === 0) {
    throw new CsvValidationError('EMPTY_FILE', 'The uploaded file is empty (0 bytes).');
  }

  if (buffer.byteLength > CSV_LIMITS.MAX_BYTES) {
    throw new CsvValidationError(
      'FILE_TOO_LARGE',
      `File size (${(buffer.byteLength / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB limit.`
    );
  }

  const bytes = new Uint8Array(buffer);
  if (containsBinaryNullBytes(bytes)) {
    throw new CsvValidationError(
      'BINARY_OR_INVALID_UTF8',
      'File appears to be binary rather than plain-text UTF-8 CSV.'
    );
  }

  let text: string;
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    text = decoder.decode(bytes);
  } catch {
    throw new CsvValidationError(
      'BINARY_OR_INVALID_UTF8',
      'File encoding is not valid UTF-8. Please save the CSV as UTF-8 and try again.'
    );
  }

  const sha256 = await computeSha256Hex(buffer);
  const { headers, rows } = parseCsvString(text);

  return {
    fileName,
    byteLength: buffer.byteLength,
    sha256,
    headers,
    rows,
  };
}
