// src/lib/idCardPdfExport.ts
import { jsPDF } from "jspdf";
import { Student } from "@/lib/models";
import type {
  IdCardFieldVisibility,
  IdCardPrintOverridesMap,
} from "@/lib/idCardPrintTypes";
import {
  A4_PRINT_LAYOUT,
  LETTER_PRINT_LAYOUT,
} from "@/lib/idCardPrintTypes";
import {
  buildPrintUnits,
  chunkPrintUnits,
  resolvePrintJobMeta,
} from "@/lib/idCardPrintUtils";

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

export type CardCanvasOptions = {
  fieldVisibility?: Partial<IdCardFieldVisibility>;
};

export type IdCardPdfExportOptions = {
  side?: CardSide;
  filename?: string;
  overrides?: IdCardPrintOverridesMap;
  pageFormat?: "a4" | "letter";
};

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
  options: CardCanvasOptions = {},
): Promise<HTMLCanvasElement> {
  const showPhoto = options.fieldVisibility?.photo !== false;
  const showGrade = options.fieldVisibility?.grade !== false;
  const showClassification = options.fieldVisibility?.classification !== false;
  const showUniqueId = options.fieldVisibility?.uniqueId !== false;
  const showAcademicYear = options.fieldVisibility?.academicYear !== false;
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

  if (showPhoto) {
    ctx.fillStyle = "#1e1b4b";
    roundRect(ctx, photoX, midY, photoW, photoH, 22);
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 4;
    roundRect(ctx, photoX, midY, photoW, photoH, 22);
    ctx.stroke();
    if (student.photo_data_url) {
      try {
        const photoImg = await loadImage(student.photo_data_url);
        ctx.save();
        roundRect(ctx, photoX, midY, photoW, photoH, 20);
        ctx.clip();
        ctx.drawImage(photoImg, photoX, midY, photoW, photoH);
        ctx.restore();
      } catch {
        drawFallbackAvatar(
          ctx,
          photoX,
          midY,
          photoW,
          photoH,
          student.First_Name,
        );
      }
    } else {
      drawFallbackAvatar(ctx, photoX, midY, photoW, photoH, student.First_Name);
    }
  }

  // Student Info (Right of Photo, or flush left when photo hidden)
  const infoX = showPhoto ? photoX + photoW + 36 : photoX;
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

  if (showGrade || showClassification) {
    infoY += 50;
    const badgePadX = 18;
    const badgeH = 38;
    let badgeX = infoX;

    if (showGrade) {
      const gradeText = student.Grade || "Class Level";
      ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
      const gradeMetrics = ctx.measureText(gradeText);
      ctx.fillStyle = "#fbbf24";
      roundRect(
        ctx,
        badgeX,
        infoY,
        gradeMetrics.width + badgePadX * 2,
        badgeH,
        10,
      );
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.fillText(gradeText, badgeX + badgePadX, infoY + 27);
      badgeX += gradeMetrics.width + badgePadX * 2 + 16;
    }

    if (showClassification) {
      const classText = student.Classification || "Regular";
      const classMetrics = ctx.measureText(classText);
      ctx.fillStyle = "#312e81";
      roundRect(
        ctx,
        badgeX,
        infoY,
        classMetrics.width + badgePadX * 2,
        badgeH,
        10,
      );
      ctx.fill();
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 1.5;
      roundRect(
        ctx,
        badgeX,
        infoY,
        classMetrics.width + badgePadX * 2,
        badgeH,
        10,
      );
      ctx.stroke();
      ctx.fillStyle = "#e0e7ff";
      ctx.fillText(classText, badgeX + badgePadX, infoY + 27);
    }
  }

  if (showUniqueId || showAcademicYear) {
    const footerY = height - 76;
    ctx.strokeStyle = "rgba(129, 140, 248, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, footerY);
    ctx.lineTo(width - 40, footerY);
    ctx.stroke();

    if (showUniqueId) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.fillText("መለያ ቁጥር (ID):", 48, footerY + 28);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "900 32px 'Courier New', monospace, sans-serif";
      ctx.fillText(student.Unique_ID || "BH/00/000", 48, footerY + 62);
    }

    if (showAcademicYear) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.fillText("ዓመተ ምሕረት (YEAR):", width - 48, footerY + 28);
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 28px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        `${student.Academic_Year || "2016"} ዓ.ም.`,
        width - 48,
        footerY + 62,
      );
    }
  }

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
export async function renderBackCardToCanvas(
  student: Student,
  options: CardCanvasOptions = {},
): Promise<HTMLCanvasElement> {
  const showQr = options.fieldVisibility?.qr !== false;
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

  if (showQr && student.qr_code) {
    try {
      const qrImg = await loadImage(student.qr_code);
      ctx.drawImage(qrImg, qrX + 10, qrY + 10, qrSize - 20, qrSize - 20);
    } catch {
      drawQrPlaceholder(ctx, qrX, qrY, qrSize);
    }
  } else if (!showQr) {
    drawQrPlaceholder(ctx, qrX, qrY, qrSize);
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QR HIDDEN", qrX + qrSize / 2, qrY + qrSize / 2 + 8);
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
  options: IdCardPdfExportOptions = {},
): Promise<void> {
  if (students.length === 0) return;

  const side = options.side || "both";
  const filename = options.filename || `BHSS_CR80_ID_Cards_${Date.now()}.pdf`;
  const jobMeta = resolvePrintJobMeta(students, options.overrides);

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [CR80_DIMENSIONS.heightMm, CR80_DIMENSIONS.widthMm],
    compress: true,
  });

  let pageIndex = 0;

  for (const { student, visibility } of jobMeta) {
    if (side === "front" || side === "both") {
      if (pageIndex > 0) {
        doc.addPage(
          [CR80_DIMENSIONS.heightMm, CR80_DIMENSIONS.widthMm],
          "landscape",
        );
      }
      pageIndex++;
      const frontCanvas = await renderFrontCardToCanvas(student, "/logo.png", {
        fieldVisibility: visibility,
      });
      doc.addImage(
        frontCanvas.toDataURL("image/png", 1.0),
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
      if (pageIndex > 0) {
        doc.addPage(
          [CR80_DIMENSIONS.heightMm, CR80_DIMENSIONS.widthMm],
          "landscape",
        );
      }
      pageIndex++;
      const backCanvas = await renderBackCardToCanvas(student, {
        fieldVisibility: visibility,
      });
      doc.addImage(
        backCanvas.toDataURL("image/png", 1.0),
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
async function renderCardFaceToCanvas(
  student: Student,
  face: "front" | "back",
  visibility: Partial<IdCardFieldVisibility>,
): Promise<HTMLCanvasElement> {
  return face === "front"
    ? renderFrontCardToCanvas(student, "/logo.png", { fieldVisibility: visibility })
    : renderBackCardToCanvas(student, { fieldVisibility: visibility });
}

export async function exportA4CardstockSheetPDF(
  students: Student[],
  options: IdCardPdfExportOptions = {},
): Promise<void> {
  if (students.length === 0) return;

  const side = options.side || "both";
  const pageFormat = options.pageFormat || "a4";
  const filename =
    options.filename || `BHSS_A4_PrintSheet_CR80_${Date.now()}.pdf`;
  const layout =
    pageFormat === "letter" ? LETTER_PRINT_LAYOUT : A4_PRINT_LAYOUT;

  const jobMeta = resolvePrintJobMeta(students, options.overrides);
  const visibilityByKey = Object.fromEntries(
    jobMeta.map((m) => [m.studentKey, m.visibility]),
  );
  const mergedStudents = jobMeta.map((m) => m.student);
  const units = buildPrintUnits(mergedStudents, side);
  const pages = chunkPrintUnits(units, side, layout);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: pageFormat === "letter" ? "letter" : "a4",
    compress: true,
  });

  const a4Width = layout.pageWidthMm;
  const a4Height = layout.pageHeightMm;
  const cardW = layout.cardWidthMm;
  const cardH = layout.cardHeightMm;
  const colGap = layout.colGapMm;
  const startX = layout.marginHorizontalMm;
  const startY = layout.marginTopMm;
  const rowGap = layout.rowGapMm;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    if (pageIndex > 0) {
      doc.addPage(pageFormat === "letter" ? "letter" : "a4", "portrait");
    }

    const pageUnits = pages[pageIndex];

    if (side === "both") {
      for (let row = 0; row < pageUnits.length; row++) {
        const unit = pageUnits[row];
        const visibility = visibilityByKey[unit.studentKey] ?? {};
        const posY = startY + row * (cardH + rowGap);
        const frontX = startX;
        const backX = startX + cardW + colGap;

        const frontCanvas = await renderCardFaceToCanvas(
          unit.student,
          "front",
          visibility,
        );
        doc.addImage(
          frontCanvas.toDataURL("image/png", 1.0),
          "PNG",
          frontX,
          posY,
          cardW,
          cardH,
          undefined,
          "FAST",
        );
        drawCropMarks(doc, frontX, posY, cardW, cardH);

        const backCanvas = await renderCardFaceToCanvas(
          unit.student,
          "back",
          visibility,
        );
        doc.addImage(
          backCanvas.toDataURL("image/png", 1.0),
          "PNG",
          backX,
          posY,
          cardW,
          cardH,
          undefined,
          "FAST",
        );
        drawCropMarks(doc, backX, posY, cardW, cardH);
      }
    } else {
      for (let i = 0; i < pageUnits.length; i++) {
        const unit = pageUnits[i];
        const face = unit.showFront ? "front" : "back";
        const visibility = visibilityByKey[unit.studentKey] ?? {};
        const row = Math.floor(i / 2);
        const col = i % 2;
        const posX = startX + col * (cardW + colGap);
        const posY = startY + row * (cardH + rowGap);

        const canvas = await renderCardFaceToCanvas(
          unit.student,
          face,
          visibility,
        );
        doc.addImage(
          canvas.toDataURL("image/png", 1.0),
          "PNG",
          posX,
          posY,
          cardW,
          cardH,
          undefined,
          "FAST",
        );
        drawCropMarks(doc, posX, posY, cardW, cardH);
      }
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Birhane Hiwot Sunday School • Official Student ID Cards (CR80 Standard: 85.60 × 53.98 mm @ 300 DPI)",
      startX,
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
