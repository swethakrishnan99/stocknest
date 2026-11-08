// Saves a table as Excel, CSV or PDF. The Excel and PDF libraries are loaded only when
// someone actually exports, so they don't slow down the first page load.
import { downloadCsv } from "./csv";

export const EXPORT_FORMATS = [
  { key: "xlsx", label: "Excel", ext: ".xlsx", hint: "Opens in Excel, Google Sheets or Numbers" },
  { key: "csv", label: "CSV", ext: ".csv", hint: "Plain text; works with any app and with Import" },
  { key: "pdf", label: "PDF", ext: ".pdf", hint: "Ready to print or share as a report" },
];

const NAVY = [15, 30, 61];

/**
 * table = { title, subtitle, header: [..], rows: [[..], ..], numeric: [column indexes], widths: [Excel column widths] }
 * Numbers stay numbers in Excel so they can be added up; PDF right-aligns them.
 */
export async function exportTable(format, fileName, table) {
  if (format === "csv") {
    downloadCsv(`${fileName}.csv`, table.header, table.rows);
    return;
  }

  if (format === "xlsx") {
    const { default: writeExcelFile } = await import("write-excel-file/browser");
    const sheetData = [
      table.header.map((h) => ({ value: h, fontWeight: "bold", backgroundColor: "#EEF0F5" })),
      ...table.rows.map((row) =>
        row.map((v, i) =>
          table.numeric?.includes(i) && v !== "" && !Number.isNaN(Number(v))
            ? { value: Number(v), type: Number }
            : { value: v == null ? "" : String(v), type: String }
        )
      ),
    ];
    await writeExcelFile(sheetData, {
      sheet: table.sheet ?? "Products",
      stickyRowsCount: 1,
      columns: table.widths?.map((width) => ({ width })),
    }).toFile(`${fileName}.xlsx`);
    return;
  }

  if (format === "pdf") {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text(table.title, 40, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(91, 100, 120);
    doc.text(table.subtitle ?? "", 40, 66);
    const numericStyles = Object.fromEntries((table.numeric ?? []).map((i) => [i, { halign: "right" }]));
    autoTable(doc, {
      startY: 82,
      head: [table.header],
      body: table.rows.map((r) => r.map((v) => (v == null ? "" : String(v)))),
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: [15, 30, 61] },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 246, 250] },
      columnStyles: numericStyles,
      margin: { left: 40, right: 40 },
      didDrawPage: () => {
        const page = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(91, 100, 120);
        doc.text(`StockNest · page ${page}`, doc.internal.pageSize.getWidth() - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
      },
    });
    doc.save(`${fileName}.pdf`);
  }
}

/** Reads the first sheet of an .xlsx file into rows of text, the same shape parseCsv returns. */
export async function readSpreadsheet(file) {
  const { readSheet } = await import("read-excel-file/browser");
  const rows = await readSheet(file);
  return rows
    .map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))))
    .filter((r) => r.some((c) => c.trim() !== ""));
}
