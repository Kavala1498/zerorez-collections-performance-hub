import ExcelJS from 'exceljs';

const HEADERS = [
  'Client Name',
  'Company Name',
  'Service Date',
  'Amount Due',
  'Paid Amount',
  'Invoice Number',
  'Client Url',
  'Invoice Url',
  'Technician',
  'AccStatus',
  'Accountability',
  'Terms',
  'Last contacted',
  'Next action',
  'N. action date',
  'AccNotes',
  'BM Notes',
] as const;

type SyntheticRow = {
  clientName: string;
  companyName?: string;
  serviceDate: Date | null;
  amountDue: number | null;
  paidAmount?: number;
  invoiceNumber?: string;
  status?: string;
  lastContacted?: Date | string;
  nextAction?: string;
  nextActionDate?: Date | string;
  technician?: string;
};

function writeTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  segmentTitle: string,
  rows: SyntheticRow[],
): number {
  let r = startRow;
  sheet.getCell(r, 1).value = segmentTitle;
  r += 1;
  HEADERS.forEach((h, i) => {
    sheet.getCell(r, i + 1).value = h;
  });
  r += 1;
  for (const row of rows) {
    sheet.getCell(r, 1).value = row.clientName;
    sheet.getCell(r, 2).value = row.companyName ?? null;
    sheet.getCell(r, 3).value = row.serviceDate;
    sheet.getCell(r, 4).value = row.amountDue;
    sheet.getCell(r, 5).value = row.paidAmount ?? 0;
    sheet.getCell(r, 6).value = row.invoiceNumber ?? null;
    sheet.getCell(r, 7).value = null;
    sheet.getCell(r, 8).value = null;
    sheet.getCell(r, 9).value = row.technician ?? null;
    sheet.getCell(r, 10).value = row.status ?? null;
    sheet.getCell(r, 11).value = null;
    sheet.getCell(r, 12).value = null;
    sheet.getCell(r, 13).value = row.lastContacted ?? null;
    sheet.getCell(r, 14).value = row.nextAction ?? null;
    sheet.getCell(r, 15).value = row.nextActionDate ?? null;
    sheet.getCell(r, 16).value = null;
    sheet.getCell(r, 17).value = null;
    r += 1;
  }
  return r;
}

/**
 * Synthetic 3-base workbook (Dallas, Phoenix, SLC) with Residential + Commercial
 * tables. Invented clients/invoices only — no real customer data.
 */
export async function buildSyntheticWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const dallas = wb.addWorksheet('Dallas');
  let row = 1;
  row = writeTable(dallas, row, 'COMMERCIAL', [
    {
      clientName: 'Acme Retail LLC',
      companyName: 'Acme Holdings',
      serviceDate: new Date(Date.UTC(2026, 9, 1)),
      amountDue: 1250.5,
      paidAmount: 100,
      invoiceNumber: 'DAL-C-1001',
      status: 'P2P',
      lastContacted: new Date(Date.UTC(2026, 10, 1)),
      nextAction: 'Call AP',
      nextActionDate: new Date(Date.UTC(2026, 10, 15)),
      technician: 'Tech A',
    },
    {
      clientName: 'Acme Retail LLC',
      companyName: 'Acme Holdings',
      serviceDate: new Date(Date.UTC(2026, 9, 5)),
      amountDue: 1250.5,
      invoiceNumber: 'DAL-C-1001', // intentional duplicate
      status: 'P2P',
    },
    {
      clientName: 'TOTAL',
      serviceDate: new Date(Date.UTC(2026, 9, 1)),
      amountDue: 9999,
      invoiceNumber: 'DAL-TOTAL',
    },
  ]);
  row += 1;
  writeTable(dallas, row, 'RESIDENTIAL', [
    {
      clientName: 'Jordan Lee',
      serviceDate: new Date(Date.UTC(2026, 8, 12)),
      amountDue: 189.99,
      invoiceNumber: 'DAL-R-2001',
      status: 'Escalated',
      nextActionDate: 'Follow up Friday', // text → next_action
    },
  ]);

  const phoenix = wb.addWorksheet('PHX'); // alias for Phoenix
  row = 1;
  row = writeTable(phoenix, row, 'Commercial Accounts', [
    {
      clientName: 'Desert Offices Inc',
      companyName: 'Desert Group',
      serviceDate: new Date(Date.UTC(2026, 7, 20)),
      amountDue: 3400,
      invoiceNumber: 'PHX-C-3001',
      status: 'Legal Demand Letter Requested',
    },
  ]);
  row += 1;
  writeTable(phoenix, row, 'RESIDENATIAL', [
    {
      clientName: 'Sam Rivera',
      serviceDate: new Date(Date.UTC(2026, 9, 18)),
      amountDue: 75.25,
      invoiceNumber: 'PHX-R-4001',
      paidAmount: 0,
    },
  ]);

  const slc = wb.addWorksheet('Salt Lake City');
  row = 1;
  row = writeTable(slc, row, 'COMMERCIAL', [
    {
      clientName: 'Wasatch Clinics',
      companyName: 'Wasatch Health',
      serviceDate: new Date(Date.UTC(2026, 6, 3)),
      amountDue: 890,
      invoiceNumber: 'SLC-C-5001',
      status: 'Sent to Collections',
      nextAction: 'ROM review',
      nextActionDate: new Date(Date.UTC(2026, 11, 1)),
    },
  ]);
  row += 1;
  writeTable(slc, row, 'Residential', [
    {
      clientName: 'Casey Nguyen',
      serviceDate: new Date(Date.UTC(2026, 9, 28)),
      amountDue: 220,
      invoiceNumber: 'SLC-R-6001',
    },
    {
      clientName: 'Missing Amount Row',
      serviceDate: new Date(Date.UTC(2026, 9, 28)),
      amountDue: null,
      invoiceNumber: 'SLC-R-INVALID',
    },
  ]);

  wb.addWorksheet('Summary'); // unknown → warning
  wb.addWorksheet('Instructions'); // unknown → warning

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
