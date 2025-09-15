import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Excel = require('exceljs');

describe('excel-export e2e', () => {
  it('TGL export reflects JSON meta and sheet', async () => {
    const wb = new Excel.Workbook();
    await wb.xlsx.readFile('out/demo/営業_2025夏_TGL.xlsx');
    const ws = wb.getWorksheet('営業');
    expect(ws).toBeTruthy();
    const period = String(ws!.getCell('ZZ1').value || '');
    const dept = String(ws!.getCell('ZZ2').value || '');
    const code = String(ws!.getCell('ZZ3').value || '');
    const role = String(ws!.getCell('ZZ4').value || '');
    const ver = String(ws!.getCell('ZZ5').value || '');
    expect(period).toBe('2025夏');
    expect(dept).toBe('営業');
    expect(code).toBe('TGL');
    expect(role).toBe('manager');
    expect(ver.startsWith('tpl:')).toBe(true);
  });
});
