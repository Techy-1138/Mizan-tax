// ============================================================================
// Mizan (ميزان) - Deterministic Bank Statement CSV/Excel Parser
// Zero Gemini API / Zero Cloud AI Dependency (100% Deterministic Local Engine)
// Statutory Framework: Article 69 of UAE VAT Executive Regulations (CBUAE FX Rates)
// Article 32 Federal Decree-Law No. 47/2022 (Entertainment 50% Disallowance)
// ============================================================================

import { CbUaeRatesService } from '../services/cbuaeRates';

export interface ParsedBankTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  rawDate: string;
  description: string;
  reference?: string;
  originalCurrency: string;
  originalAmount: number;
  exchangeRate: number;
  amountAED: number;
  type: 'EXPENSE' | 'INCOME';
  category: string;
  categoryLabel: string;
  isEntertainmentSplit?: boolean;
  corporateTaxDeductibleAED?: number;
  corporateTaxAddbackAED?: number;
  vatRecoverableAED?: number;
  balance?: number;
}

export interface BankStatementParseResult {
  bankName: string;
  totalRows: number;
  parsedTransactions: ParsedBankTransaction[];
  skippedRows: number;
  totalDebitsAED: number;
  totalCreditsAED: number;
  netCashflowAED: number;
  currenciesDetected: string[];
}

/**
 * Deterministic UAE vendor categorization rules.
 * Maps known merchant keywords to official UAE tax categories.
 */
interface VendorRule {
  regex: RegExp;
  category: string;
  label: string;
  isEntertainment?: boolean;
}

const DETERMINISTIC_VENDOR_RULES: VendorRule[] = [
  // Utilities
  { regex: /\b(dewa|sewa|fewa|addc|aadc|empower|tabreed)\b/i, category: 'UTILITIES', label: 'Utilities & Power' },
  // Telecom
  { regex: /\b(etisalat|e&|du\b|virgin\s*mobile|telecom)/i, category: 'TELECOM', label: 'Telecommunications' },
  // Fuel & Vehicle
  { regex: /\b(adnoc|enoc|eppco|emarat|fuel|petrol|salik|rta\b)/i, category: 'VEHICLE_EXPENSES', label: 'Vehicle & Transportation' },
  // Article 32 Entertainment & Hospitality (50% CT / 0% VAT)
  {
    regex: /\b(restaurant|dining|cafe|coffee|starbucks|costa|paul\b|deliveroo|talabat|noon\s*food|zomato|catering|bistro|steakhouse|barista)\b/i,
    category: 'MEALS_ENTERTAINMENT',
    label: 'Entertainment & Hospitality (Art. 32 Split)',
    isEntertainment: true,
  },
  // Government Fees & Licensing
  { regex: /\b(ded\b|det\b|amer\b|tasheel|mohre|fta\b|tax\s*authority|municipality|mofa\b|customs|court|notary)\b/i, category: 'GOVERNMENT_FEES', label: 'Government & Statutory Fees' },
  // Office Supplies & Technology
  { regex: /\b(amazon|noon\b|sharaf\s*dg|carrefour|lulu|ikea|office\s*depot|apple\s*store|microsoft|jarir)\b/i, category: 'OFFICE_SUPPLIES', label: 'Office Supplies & IT' },
  // Rent & Property
  { regex: /\b(rent|lease|property|nakheel|emaar|wasl|damac|sobh\w*|ejari)\b/i, category: 'RENT', label: 'Office Rent & Property' },
  // Marketing & Software Subscriptions
  { regex: /\b(google\s*ads|facebook\s*ads|meta\s*platforms|linkedin|tiktok|twitter|adobe|slack|atlassian|github|aws|azure)\b/i, category: 'MARKETING_ADVERTISING', label: 'Marketing & Cloud Software' },
  // Bank Charges & Interest
  { regex: /\b(bank\s*charge|service\s*fee|transfer\s*fee|card\s*fee|interest\s*charge|vat\s*on\s*charge)\b/i, category: 'BANK_CHARGES', label: 'Bank Charges & Financial Fees' },
  // Salaries & Payroll
  { regex: /\b(salary|wages|payroll|wps\b|employee|stipend)\b/i, category: 'SALARIES', label: 'Salaries & Staff Costs' },
];

/**
 * Categorizes a transaction description deterministically without any AI.
 */
export function categorizeTransaction(
  description: string,
  type: 'EXPENSE' | 'INCOME'
): { category: string; label: string; isEntertainment: boolean } {
  if (type === 'INCOME') {
    return {
      category: 'SALES_REVENUE',
      label: 'Commercial Sales & Inflows',
      isEntertainment: false,
    };
  }

  for (const rule of DETERMINISTIC_VENDOR_RULES) {
    if (rule.regex.test(description)) {
      return {
        category: rule.category,
        label: rule.label,
        isEntertainment: Boolean(rule.isEntertainment),
      };
    }
  }

  return {
    category: 'OTHER_EXPENSES',
    label: 'General Operating Expense',
    isEntertainment: false,
  };
}

/**
 * Standardizes various date formats into YYYY-MM-DD.
 * Handles: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD-MMM-YYYY (e.g. 15-Oct-2026), MM/DD/YYYY
 */
export function normalizeDateString(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  const cleaned = dateStr.trim();

  // 1. Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 10);
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Check DD-MMM-YYYY (e.g. 15-Jan-2026 or 15 Jan 2026)
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const mmmMatch = cleaned.match(/^(\d{1,2})[\s\-]([a-zA-Z]{3})[\s\-](\d{4})/i);
  if (mmmMatch) {
    const day = mmmMatch[1].padStart(2, '0');
    const mStr = mmmMatch[2].toLowerCase();
    const month = months[mStr] || '01';
    const year = mmmMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback to JS Date parse
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Parses numeric currency strings, stripping currency symbols, commas, and formatting.
 */
export function parseCleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;

  const str = String(val)
    .replace(/[AED$€£,\s]/gi, '')
    .trim();

  // If format is like (150.00) representing negative
  if (str.startsWith('(') && str.endsWith(')')) {
    const inner = parseFloat(str.slice(1, -1));
    return isNaN(inner) ? 0 : -inner;
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Splits a CSV line into columns, correctly handling commas inside quotation marks.
 */
export function tokenizeCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        // Escaped quote
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Main Deterministic UAE Bank Statement Parser.
 * Automatically identifies columns and handles multi-currency conversions using CBUAE rates.
 */
export function parseBankStatementCsv(
  csvContent: string,
  defaultCurrency = 'AED'
): BankStatementParseResult {
  const rawLines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    throw new Error('Bank statement CSV is empty.');
  }

  // Detect bank identity from header lines
  let bankName = 'UAE Business Bank';
  const headerSearch = rawLines.slice(0, 10).join(' ').toLowerCase();
  if (headerSearch.includes('emirates nbd') || headerSearch.includes('enbd')) {
    bankName = 'Emirates NBD';
  } else if (headerSearch.includes('adcb') || headerSearch.includes('abu dhabi commercial')) {
    bankName = 'Abu Dhabi Commercial Bank (ADCB)';
  } else if (headerSearch.includes('mashreq')) {
    bankName = 'Mashreq Bank';
  } else if (headerSearch.includes('first abu dhabi') || headerSearch.includes('fab')) {
    bankName = 'First Abu Dhabi Bank (FAB)';
  } else if (headerSearch.includes('wio')) {
    bankName = 'Wio Bank';
  } else if (headerSearch.includes('dubai islamic bank') || headerSearch.includes('dib')) {
    bankName = 'Dubai Islamic Bank (DIB)';
  }

  // Locate the header row containing Date, Description, Amount
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(rawLines.length, 15); i++) {
    const tokens = tokenizeCsvLine(rawLines[i]).map((t) => t.toLowerCase());
    const hasDate = tokens.some((t) => t.includes('date') || t.includes('تاريخ'));
    const hasDesc = tokens.some((t) =>
      t.includes('desc') || t.includes('detail') || t.includes('narration') || t.includes('particular') || t.includes('بيان')
    );
    const hasAmount = tokens.some((t) =>
      t.includes('amount') || t.includes('debit') || t.includes('credit') || t.includes('withdrawal') || t.includes('deposit') || t.includes('مبلغ')
    );

    if (hasDate && (hasDesc || hasAmount)) {
      headerIndex = i;
      headers = tokens;
      break;
    }
  }

  if (headerIndex === -1) {
    // If no distinct header found, treat first row as header
    headerIndex = 0;
    headers = tokenizeCsvLine(rawLines[0]).map((t) => t.toLowerCase());
  }

  // Map column indexes
  let dateCol = headers.findIndex((h) => h.includes('date') || h.includes('تاريخ'));
  let descCol = headers.findIndex((h) =>
    h.includes('desc') || h.includes('detail') || h.includes('narration') || h.includes('particular') || h.includes('memo') || h.includes('بيان')
  );
  let debitCol = headers.findIndex((h) =>
    h.includes('debit') || h.includes('withdrawal') || h.includes('paid out') || h.includes('dr') || h.includes('مدين')
  );
  let creditCol = headers.findIndex((h) =>
    h.includes('credit') || h.includes('deposit') || h.includes('paid in') || h.includes('cr') || h.includes('دائن')
  );
  let amountCol = headers.findIndex((h) =>
    h.includes('amount') || h.includes('net') || h.includes('مبلغ')
  );
  let currCol = headers.findIndex((h) =>
    h.includes('curr') || h.includes('ccy') || h.includes('عملة')
  );
  let balanceCol = headers.findIndex((h) =>
    h.includes('balance') || h.includes('رصيد')
  );
  let refCol = headers.findIndex((h) =>
    h.includes('ref') || h.includes('chq') || h.includes('cheque') || h.includes('id') || h.includes('مرجع')
  );

  // Fallbacks if columns are not explicitly labeled
  if (dateCol === -1) dateCol = 0;
  if (descCol === -1) descCol = 1;

  const parsedTransactions: ParsedBankTransaction[] = [];
  const detectedCurrencies = new Set<string>();
  let skippedRows = 0;
  let totalDebitsAED = 0;
  let totalCreditsAED = 0;

  for (let i = headerIndex + 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) {
      skippedRows++;
      continue;
    }

    const cols = tokenizeCsvLine(line);
    if (cols.length < 2) {
      skippedRows++;
      continue;
    }

    const rawDate = cols[dateCol] || '';
    const description = cols[descCol] || 'Bank Transaction';

    // Parse currency
    let rowCurrency = defaultCurrency;
    if (currCol !== -1 && cols[currCol]) {
      rowCurrency = cols[currCol].trim().toUpperCase();
    } else {
      // Check if description has embedded currency tag like USD or EUR
      const ccyMatch = description.match(/\b(USD|EUR|GBP|SAR|QAR|KWD|BHD|OMR|INR|AED)\b/i);
      if (ccyMatch) {
        rowCurrency = ccyMatch[1].toUpperCase();
      }
    }
    detectedCurrencies.add(rowCurrency);

    // Determine Debit / Credit & Amount
    let type: 'EXPENSE' | 'INCOME' = 'EXPENSE';
    let originalAmount = 0;

    if (debitCol !== -1 && creditCol !== -1) {
      const debitVal = parseCleanNumber(cols[debitCol]);
      const creditVal = parseCleanNumber(cols[creditCol]);

      if (debitVal > 0) {
        type = 'EXPENSE';
        originalAmount = debitVal;
      } else if (creditVal > 0) {
        type = 'INCOME';
        originalAmount = creditVal;
      } else {
        skippedRows++;
        continue;
      }
    } else if (amountCol !== -1) {
      const amtVal = parseCleanNumber(cols[amountCol]);
      if (amtVal < 0) {
        type = 'EXPENSE';
        originalAmount = Math.abs(amtVal);
      } else if (amtVal > 0) {
        type = 'INCOME';
        originalAmount = amtVal;
      } else {
        skippedRows++;
        continue;
      }
    } else {
      // Try finding any numeric column in the row
      let foundAmt = false;
      for (let c = 0; c < cols.length; c++) {
        if (c !== dateCol && c !== descCol) {
          const val = parseCleanNumber(cols[c]);
          if (val !== 0) {
            type = val < 0 ? 'EXPENSE' : 'INCOME';
            originalAmount = Math.abs(val);
            foundAmt = true;
            break;
          }
        }
      }
      if (!foundAmt) {
        skippedRows++;
        continue;
      }
    }

    // Convert to AED using official CBUAE exchange rates
    const fxRate = CbUaeRatesService.getRate(rowCurrency).rateToAED;
    const amountAED = Math.round(originalAmount * fxRate * 100) / 100;

    // Categorize deterministically
    const catResult = categorizeTransaction(description, type);

    // Article 32 Entertainment split calculations
    let isEntertainmentSplit = false;
    let corporateTaxDeductibleAED: number | undefined;
    let corporateTaxAddbackAED: number | undefined;
    let vatRecoverableAED: number | undefined;

    if (type === 'EXPENSE' && catResult.isEntertainment) {
      isEntertainmentSplit = true;
      corporateTaxDeductibleAED = Math.round(amountAED * 0.5 * 100) / 100;
      corporateTaxAddbackAED = Math.round(amountAED * 0.5 * 100) / 100;
      vatRecoverableAED = 0.0; // Blocked under Art. 53
    }

    if (type === 'EXPENSE') {
      totalDebitsAED += amountAED;
    } else {
      totalCreditsAED += amountAED;
    }

    const txId = `tx-bank-${Date.now().toString(36)}-${parsedTransactions.length + 1}`;
    const cleanDate = normalizeDateString(rawDate);

    parsedTransactions.push({
      id: txId,
      date: cleanDate,
      rawDate,
      description: description.replace(/\s+/g, ' ').trim(),
      reference: refCol !== -1 ? cols[refCol] : undefined,
      originalCurrency: rowCurrency,
      originalAmount,
      exchangeRate: fxRate,
      amountAED,
      type,
      category: catResult.category,
      categoryLabel: catResult.label,
      isEntertainmentSplit,
      corporateTaxDeductibleAED,
      corporateTaxAddbackAED,
      vatRecoverableAED,
      balance: balanceCol !== -1 ? parseCleanNumber(cols[balanceCol]) : undefined,
    });
  }

  return {
    bankName,
    totalRows: rawLines.length - (headerIndex + 1),
    parsedTransactions,
    skippedRows,
    totalDebitsAED: Math.round(totalDebitsAED * 100) / 100,
    totalCreditsAED: Math.round(totalCreditsAED * 100) / 100,
    netCashflowAED: Math.round((totalCreditsAED - totalDebitsAED) * 100) / 100,
    currenciesDetected: Array.from(detectedCurrencies),
  };
}
