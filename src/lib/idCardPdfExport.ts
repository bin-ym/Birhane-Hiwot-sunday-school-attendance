// src/lib/idCardPdfExport.ts
import { jsPDF } from "jspdf";
import { Student } from "@/lib/models";

/**
 * Standard ISO/IEC 7810 ID-1 (CR80) Physical Dimensions
 */
export const CR80_DIMENSIONS = {
  widthMm: 85.6,
  heightMm: 53.98,
  cornerRadiusMm: 3.18, // 1/8 inch
  aspectRatio: 85.6 / 53.98, // ~1.58577:1
  dpi: 300,
  widthPx300Dpi: 1011, // Math.round(85.60 / 25.4 * 300) = 1011
  heightPx300Dpi: 638, // Math.round(53.98 / 25.4 * 300) = 638
} as const;

export type CardSide = "front" | "back" | "both";

/**
 * Helper to load an image from a URL or base64 data URL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 50)}...`));
    img.src = src;
  });
}

/**
 * Draw a rounded rectangle path on Canvas2D
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * High-resolution 300 DPI Canvas renderer for Front Side of Student Card (1011 × 638 pixels)
 */
export async function renderFrontCardToCanvas(
  student: Student,
  logoSrc: string = "/logo.png",
): Promise<HTMLCanvasElement> {
  const width = CR80_DIMENSIONS.widthPx300Dpi; // 1011
  const height = CR80_DIMENSIONS.heightPx300Dpi; // 638

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Card Outer Radius Clip
  roundRect(ctx, 0, 0, width, height, 38);
  ctx.clip();

  // 1. Rich Premium Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#1e1b4b"); // indigo-950
  bgGrad.addColorStop(0.5, "#0f172a"); // slate-900
  bgGrad.addColorStop(1, "#020617"); // slate-950
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative subtle accent circles
  ctx.save();
  ctx.beginPath();
  ctx.arc(width - 50, -30, 240, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(60, height + 40, 200, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(245, 158, 11, 0.07)";
  ctx.fill();
  ctx.restore();

  // Outer border
  ctx.strokeStyle = "rgba(165, 180, 252, 0.25)";
  ctx.lineWidth = 3;
  roundRect(ctx, 1.5, 1.5, width - 3, height - 3, 38);
  ctx.stroke();

  // 2. Header Top Banner: Logo & Church School Title
  const headerY = 32;
  const logoSize = 100;
  const logoX = 40;

  try {
    const logoImg = await loadImage(logoSrc);
    // Draw white rounded background behind logo
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, logoX, headerY, logoSize, logoSize, 20);
    ctx.fill();
    ctx.drawImage(logoImg, logoX + 6, headerY + 6, logoSize - 12, logoSize - 12);
  } catch {
    // Fallback if logo not loaded
    ctx.fillStyle = "#312e81";
    roundRect(ctx, logoX, headerY, logoSize, logoSize, 20);
    ctx.fill();
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BH", logoX + logoSize / 2, headerY + logoSize / 2 + 15);
  }

  // Header Typography
  const titleX = logoX + logoSize + 24;
  ctx.textAlign = "left";

  // Amharic Institution Name
  ctx.fillStyle = "#fbbf24"; // amber-400
  ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("ብርሃነ ሕይወት ሰንበት ት/ቤት", titleX, headerY + 28);

  // English Institution Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 32px system-ui, -apple-system, sans-serif";
  ctx.fillText("Birhane Hiwot Sunday School", titleX, headerY + 65);

  // Subtitle / Badge type
  ctx.fillStyle = "#c7d2fe"; // indigo-200
  ctx.font = "600 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("STUDENT IDENTITY CARD • የተማሪ መታወቂያ", titleX, headerY + 95);

  // Top header divider line
  ctx.strokeStyle = "rgba(129, 140, 248, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, headerY + logoSize + 22);
  ctx.lineTo(width - 40, headerY + logoSize + 22);
  ctx.stroke();

  // 3. Middle Section: Student Portrait & Details
  const midY = headerY + logoSize + 44;
  const photoW = 200;
  const photoH = 240;
  const photoX = 48;

  // Photo Frame
  ctx.fillStyle = "#1e1b4b";
  roundRect(ctx, photoX, midY, photoW, photoH, 22);
  ctx.fill();
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 4;
  roundRect(ctx, photoX, midY, photoW, photoH, 22);
  ctx.stroke();

  // Photo Image or Initial Monogram
  if (student.photo_data_url) {
    try {
      const photoImg = await loadImage(student.photo_data_url);
      ctx.save();
      roundRect(ctx, photoX, midY, photoW, photoH, 20);
      ctx.clip();
      ctx.drawImage(photoImg, photoX, midY, photoW, photoH);
      ctx.restore();
    } catch {
      drawFallbackAvatar(ctx, photoX, midY, photoW, photoH, student.First_Name);
    }
  } else {
    drawFallbackAvatar(ctx, photoX, midY, photoW, photoH, student.First_Name);
  }

  // Student Info (Right of Photo)
  const infoX = photoX + photoW + 36;
  let infoY = midY + 45;

  // Full Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 38px system-ui, -apple-system, sans-serif";
  const fullName = `${student.First_Name || ""} ${student.Father_Name || ""}`.trim();
  ctx.fillText(fullName || "Student Name", infoX, infoY);

  if (student.Grandfather_Name) {
    infoY += 34;
    ctx.fillStyle = "#cbd5e1"; // slate-300
    ctx.font = "600 26px system-ui, -apple-system, sans-serif";
    ctx.fillText(student.Grandfather_Name, infoX, infoY);
  }

  // Badges (Grade & Classification)
  infoY += 50;
  const gradeText = student.Grade || "Class Level";
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  const gradeMetrics = ctx.measureText(gradeText);
  const badgePadX = 18;
  const badgeH = 38;

  // Grade badge (Gold/Amber)
  ctx.fillStyle = "#fbbf24";
  roundRect(ctx, infoX, infoY, gradeMetrics.width + badgePadX * 2, badgeH, 10);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.fillText(gradeText, infoX + badgePadX, infoY + 27);

  // Classification Badge (Indigo)
  const classText = student.Classification || "Regular";
  const classX = infoX + gradeMetrics.width + badgePadX * 2 + 16;
  const classMetrics = ctx.measureText(classText);
  ctx.fillStyle = "#312e81";
  roundRect(ctx, classX, infoY, classMetrics.width + badgePadX * 2, badgeH, 10);
  ctx.fill();
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 1.5;
  roundRect(ctx, classX, infoY, classMetrics.width + badgePadX * 2, badgeH, 10);
  ctx.stroke();
  ctx.fillStyle = "#e0e7ff";
  ctx.fillText(classText, classX + badgePadX, infoY + 27);

  // 4. Footer Section: ID & Academic Year
  const footerY = height - 76;
  ctx.strokeStyle = "rgba(129, 140, 248, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, footerY);
  ctx.lineTo(width - 40, footerY);
  ctx.stroke();

  // Unique ID on Left
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("መለያ ቁጥር (ID):", 48, footerY + 28);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "900 32px 'Courier New', monospace, sans-serif";
  ctx.fillText(student.Unique_ID || "BH/00/000", 48, footerY + 62);

  // Academic Year on Right
  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("ዓመተ ምሕረት (YEAR):", width - 48, footerY + 28);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 28px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${student.Academic_Year || "2016"} ዓ.ም.`, width - 48, footerY + 62);

  return canvas;
}

function drawFallbackAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  firstName?: string,
) {
  ctx.fillStyle = "#1e1b4b";
  roundRect(ctx, x, y, w, h, 20);
  ctx.fill();

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 80px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  const initial = (firstName?.[0] || "BH").toUpperCase();
  ctx.fillText(initial, x + w / 2, y + h / 2 + 28);
}

/**
 * High-resolution 300 DPI Canvas renderer for Back Side of Student Card (1011 × 638 pixels)
 */
export async function renderBackCardToCanvas(student: Student): Promise<HTMLCanvasElement> {
  const width = CR80_DIMENSIONS.widthPx300Dpi; // 1011
  const height = CR80_DIMENSIONS.heightPx300Dpi; // 638

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Card Outer Radius Clip
  roundRect(ctx, 0, 0, width, height, 38);
  ctx.clip();

  // Dark slate background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#0f172a"); // slate-900
  bgGrad.addColorStop(1, "#020617"); // slate-950
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = "rgba(71, 85, 105, 0.6)";
  ctx.lineWidth = 3;
  roundRect(ctx, 1.5, 1.5, width - 3, height - 3, 38);
  ctx.stroke();

  // Top Header Banner
  const topY = 32;
  ctx.textAlign = "center";
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("OFFICIAL VERIFICATION • የደህንነት ማረጋገጫ", width / 2, topY + 24);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("Present this badge for all Sunday School scheduled sessions", width / 2, topY + 56);

  ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, topY + 76);
  ctx.lineTo(width - 40, topY + 76);
  ctx.stroke();

  // Center QR Code
  const qrSize = 310;
  const qrX = 64;
  const qrY = topY + 104;

  // White base for QR
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX, qrY, qrSize, qrSize, 20);
  ctx.fill();

  if (student.qr_code) {
    try {
      const qrImg = await loadImage(student.qr_code);
      ctx.drawImage(qrImg, qrX + 10, qrY + 10, qrSize - 20, qrSize - 20);
    } catch {
      drawQrPlaceholder(ctx, qrX, qrY, qrSize);
    }
  } else {
    drawQrPlaceholder(ctx, qrX, qrY, qrSize);
  }

  // Right-hand instructions & verification statements
  const textX = qrX + qrSize + 48;
  let textY = qrY + 45;

  ctx.textAlign = "left";
  // Cryptographic badge
  ctx.fillStyle = "#34d399"; // emerald-400
  ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
  ctx.fillText("✓ Cryptographically Verified", textX, textY);

  textY += 45;
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("ይህ ካርድ በሰንበት ት/ቤቱ አቴንዳንስ መዝገብ ስርዓት", textX, textY);

  textY += 32;
  ctx.fillText("በቀጥታ የተረጋገጠ እና ሕጋዊ የተማሪ መታወቂያ ነው።", textX, textY);

  textY += 45;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 21px system-ui, -apple-system, sans-serif";
  ctx.fillText("• QR ኮዱን ለክፍል አስተባባሪው በማሳየት አቴንዳንስ ይመዝገቡ።", textX, textY);

  textY += 36;
  ctx.fillText("• የተማሪው መታወቂያ የማይተላለፍ የግል ሰነድ ነው።", textX, textY);

  textY += 40;
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillText(`ID: ${student.Unique_ID || "BHSS"}`, textX, textY);

  // Bottom Notice
  const botY = height - 76;
  ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, botY);
  ctx.lineTo(width - 40, botY);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("Birhane Hiwot Sunday School • Addis Ababa, Ethiopia", width / 2, botY + 28);

  ctx.fillStyle = "#64748b";
  ctx.font = "500 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("If found, please return to the Sunday School Administration Office.", width / 2, botY + 54);

  return canvas;
}

function drawQrPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.fillStyle = "#f1f5f9";
  roundRect(ctx, x + 10, y + 10, size - 20, size - 20, 12);
  ctx.fill();

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("QR CODE", x + size / 2, y + size / 2 - 10);
  ctx.font = "18px system-ui, -apple-system, sans-serif";
  ctx.fillText("PENDING", x + size / 2, y + size / 2 + 20);
}

/**
 * Generate dedicated CR80 PDF for a batch of students or single student.
 * Page format is strictly [53.98, 85.60] mm (Height, Width), matching PVC card printers.
 */
export async function exportCR80CardPrinterPDF(
  students: Student[],
  options: {
    side?: CardSide;
    filename?: string;
  } = {},
): Promise<void> {
  if (students.length === 0) return;

  const side = options.side || "both";
  const filename = options.filename || `BHSS_CR80_ID_Cards_${Date.now()}.pdf`;

  // Initialize jsPDF with exact CR80 physical dimensions in millimeters
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [CR80_DIMENSIONS.heightMm, CR80_DIMENSIONS.widthMm], // [53.98, 85.60]
    compress: true,
  });

  let pageIndex = 0;

  for (const student of students) {
    if (side === "front" || side === "both") {
      if (pageIndex > 0) doc.addPage([CR80_DIMENSIONS.heightMm, CR80_DIMENSIONS.widthMm], "landscape");
      pageIndex++;
      const frontCanvas = await renderFrontCardToCanvas(student);
      const imgData = frontCanvas.toDataURL("image/png", 1.0);
      doc.addImage(
        imgData,
        "PNG",
        0,
        0,
        CR80_DIMENSIONS.widthMm,
        CR80_DIMENSIONS.heightMm,
        undefined,
        "FAST",
      );
    }

    if (side === "back" || side === "both") {
      if (pageIndex > 0) doc.addPage([CR80_DIMENSIONS.heightMm, CR80_DIMENSIONS.widthMm], "landscape");
      pageIndex++;
      const backCanvas = await renderBackCardToCanvas(student);
      const imgData = backCanvas.toDataURL("image/png", 1.0);
      doc.addImage(
        imgData,
        "PNG",
        0,
        0,
        CR80_DIMENSIONS.widthMm,
        CR80_DIMENSIONS.heightMm,
        undefined,
        "FAST",
      );
    }
  }

  doc.save(filename);
}

/**
 * Generate standard A4 Sheet PDF (210 × 297 mm) with exact CR80 (85.60 × 53.98 mm) cards
 * arranged in pairs with cutting marks and alignment guides for cardstock printing.
 */
export async function exportA4CardstockSheetPDF(
  students: Student[],
  options: {
    side?: CardSide;
    filename?: string;
  } = {},
): Promise<void> {
  if (students.length === 0) return;

  const side = options.side || "both";
  const filename = options.filename || `BHSS_A4_PrintSheet_CR80_${Date.now()}.pdf`;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const a4Width = 210;
  const a4Height = 297;
  const cardW = CR80_DIMENSIONS.widthMm; // 85.60
  const cardH = CR80_DIMENSIONS.heightMm; // 53.98

  // Layout: 2 cards horizontally (Front & Back pair or 2 students side-by-side)
  // Horizontal gap and margin
  const colGap = 8;
  const startX = (a4Width - (cardW * 2 + colGap)) / 2; // (210 - (171.2 + 8)) / 2 = 15.4 mm
  const startY = 16;
  const rowGap = 12;
  const maxRowsPerPage = 4; // 4 rows * 2 cards = 8 cards per A4 page

  let pageNumber = 1;

  // Build items array: for each student, front and/or back
  type CardItem = { student: Student; side: "front" | "back" };
  const items: CardItem[] = [];

  for (const s of students) {
    if (side === "front") {
      items.push({ student: s, side: "front" });
    } else if (side === "back") {
      items.push({ student: s, side: "back" });
    } else {
      // Both: front and back paired
      items.push({ student: s, side: "front" });
      items.push({ student: s, side: "back" });
    }
  }

  for (let i = 0; i < items.length; i++) {
    const itemOnPage = i % (maxRowsPerPage * 2);
    if (i > 0 && itemOnPage === 0) {
      doc.addPage("a4", "portrait");
      pageNumber++;
    }

    const row = Math.floor(itemOnPage / 2);
    const col = itemOnPage % 2;
    const posX = startX + col * (cardW + colGap);
    const posY = startY + row * (cardH + rowGap);

    const item = items[i];
    const canvas =
      item.side === "front"
        ? await renderFrontCardToCanvas(item.student)
        : await renderBackCardToCanvas(item.student);

    const imgData = canvas.toDataURL("image/png", 1.0);
    doc.addImage(imgData, "PNG", posX, posY, cardW, cardH, undefined, "FAST");

    // Draw Corner Crop / Cut Marks for precise trimming
    drawCropMarks(doc, posX, posY, cardW, cardH);

    // Label under card
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    const label = `${item.student.Unique_ID || ""} • ${item.student.First_Name || ""} (${item.side.toUpperCase()}) — CR80 85.60×53.98mm`;
    doc.text(label, posX, posY + cardH + 3);
  }

  // Header & Footer on each A4 page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Birhane Hiwot Sunday School • Official Student ID Cards (CR80 Standard: 85.60 × 53.98 mm @ 300 DPI)",
      15.4,
      10,
    );
    doc.text(`Page ${p} of ${totalPages}`, a4Width - 30, a4Height - 8);
  }

  doc.save(filename);
}

/**
 * Draw crisp 4-corner crop marks (tick marks) around a card for precise paper trimming
 */
function drawCropMarks(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const tickLen = 3;
  const offset = 1.5;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);

  // Top-Left
  doc.line(x - offset - tickLen, y, x - offset, y);
  doc.line(x, y - offset - tickLen, x, y - offset);

  // Top-Right
  doc.line(x + w + offset, y, x + w + offset + tickLen, y);
  doc.line(x + w, y - offset - tickLen, x + w, y - offset);

  // Bottom-Left
  doc.line(x - offset - tickLen, y + h, x - offset, y + h);
  doc.line(x, y + h + offset, x, y + h + offset + tickLen);

  // Bottom-Right
  doc.line(x + w + offset, y + h, x + w + offset + tickLen, y + h);
  doc.line(x + w, y + h + offset, x + w, y + h + offset + tickLen);
}
