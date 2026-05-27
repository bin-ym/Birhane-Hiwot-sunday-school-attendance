import * as XLSX from "xlsx";

export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  // Convert the array of objects into a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Calculate maximum width for each column to auto-size
  const objectMaxLength: number[] = [];
  data.forEach((row) => {
    Object.keys(row).forEach((key, index) => {
      const value =
        row[key] !== null && row[key] !== undefined ? String(row[key]) : "";
      objectMaxLength[index] = Math.max(
        objectMaxLength[index] || key.length,
        value.length,
      );
    });
  });

  // Apply widths with some padding
  const wscols = objectMaxLength.map((w) => ({ wch: w + 2 }));
  worksheet["!cols"] = wscols;

  // Create a new workbook and append the sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  // Save via browser
  XLSX.writeFile(
    workbook,
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}
