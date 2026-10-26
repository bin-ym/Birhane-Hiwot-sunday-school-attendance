"use client";

import type { IdCardPrintPageSize } from "@/lib/idCardPrintTypes";

interface IdCardPrintStylesProps {
  pageSize: IdCardPrintPageSize;
}

/** Global print + on-screen A4 sheet styling for ID card batches. */
export function IdCardPrintStyles({ pageSize }: IdCardPrintStylesProps) {
  const pageRule =
    pageSize === "letter"
      ? "@page { size: letter portrait; margin: 0; }"
      : "@page { size: A4 portrait; margin: 0; }";

  return (
    <style jsx global>{`
      .cr80-card-box {
        width: 325px;
        height: 205px;
        box-sizing: border-box;
      }

      @media (min-width: 640px) {
        .cr80-card-box {
          width: 342.4px;
          height: 215.92px;
        }
      }

      .id-card-a4-page {
        box-sizing: border-box;
        margin-left: auto;
        margin-right: auto;
        padding: 10mm 15.4mm 8mm;
        background: #ffffff;
        box-shadow: 0 4px 24px rgba(15, 23, 42, 0.12);
        border: 1px solid #e2e8f0;
      }

      .id-card-a4-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 8px;
        color: #64748b;
        margin-bottom: 2.5mm;
        padding-bottom: 1mm;
        border-bottom: 1px solid #f1f5f9;
      }

      .id-card-a4-grid {
        display: grid;
        justify-content: center;
      }

      .id-card-a4-paired-rows {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .id-card-a4-pair-row {
        page-break-inside: avoid;
        break-inside: avoid;
        width: 100%;
        display: grid;
        justify-content: center;
        align-items: center;
      }

      .id-card-a4-slot {
        position: relative;
        width: 85.6mm;
        flex-shrink: 0;
      }

      .id-card-a4-slot-inner {
        position: relative;
        display: block;
        width: 85.6mm;
        height: 53.98mm;
        padding: 0;
        border: 1px dashed transparent;
        border-radius: 4px;
        background: transparent;
        text-align: left;
        overflow: hidden;
        transition: border-color 0.15s, box-shadow 0.15s;
        box-sizing: border-box;
      }

      .id-card-a4-slot-inner--selected {
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.35);
      }

      .id-card-a4-slot-inner:not(:disabled):hover {
        border-color: #cbd5e1;
      }

      .id-card-a4-slot-hint {
        position: absolute;
        right: 4px;
        top: 4px;
        z-index: 30;
        font-size: 7px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 2px 5px;
        border-radius: 4px;
        background: rgba(15, 23, 42, 0.75);
        color: #fde68a;
        opacity: 0;
        transition: opacity 0.15s;
      }

      .id-card-a4-slot-inner:hover .id-card-a4-slot-hint {
        opacity: 1;
      }

      .id-card-a4-slot-label {
        margin-top: 2px;
        font-size: 7px;
        color: #94a3b8;
        text-align: center;
        line-height: 1.2;
      }

      .id-card-crop-mark {
        position: absolute;
        width: 3mm;
        height: 3mm;
        border-color: #b4b4b4;
        border-style: solid;
        border-width: 0;
        z-index: 25;
      }

      .id-card-crop-mark--tl {
        left: -1.5mm;
        top: -1.5mm;
        border-top-width: 0.2mm;
        border-left-width: 0.2mm;
      }

      .id-card-crop-mark--tr {
        right: -1.5mm;
        top: -1.5mm;
        border-top-width: 0.2mm;
        border-right-width: 0.2mm;
      }

      .id-card-crop-mark--bl {
        left: -1.5mm;
        bottom: -1.5mm;
        border-bottom-width: 0.2mm;
        border-left-width: 0.2mm;
      }

      .id-card-crop-mark--br {
        right: -1.5mm;
        bottom: -1.5mm;
        border-bottom-width: 0.2mm;
        border-right-width: 0.2mm;
      }

      .id-card-a4-slot-inner .cr80-card-box,
      .id-card-a4-slot-inner .id-card-front,
      .id-card-a4-slot-inner .id-card-back {
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
        min-height: 0 !important;
        max-height: none !important;
        box-sizing: border-box !important;
        border-radius: 3.18mm !important;
        overflow: hidden !important;
        margin: 0 !important;
        box-shadow: none !important;
      }

      .id-card-on-sheet.id-card-back {
        padding: 2.2mm 2.5mm !important;
        gap: 0 !important;
        line-height: 1.15 !important;
        box-sizing: border-box !important;
        height: 53.98mm !important;
        max-height: 53.98mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
      }

      .id-card-on-sheet.id-card-back .id-card-back-qr-wrap {
        height: 17.5mm !important;
        width: 17.5mm !important;
        padding: 1mm !important;
      }

      .id-card-on-sheet.id-card-back .id-card-back-qr-inner {
        height: 100% !important;
        width: 100% !important;
      }

      .id-card-on-sheet.id-card-back .id-card-back-main {
        padding-top: 0.8mm !important;
        padding-bottom: 0.8mm !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
      }

      .id-card-on-sheet.id-card-back .id-card-back-footer {
        padding-top: 0.8mm !important;
        flex-shrink: 0 !important;
      }

      .id-card-on-sheet.id-card-back .id-card-back-footer p {
        margin-top: 0.8mm !important;
      }

      @media print {
        ${pageRule}

        html,
        body {
          background: #ffffff !important;
          padding: 0 !important;
          margin: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Ensure parent wrappers do not clip or hide content in print */
        body.id-card-print-active,
        body.id-card-print-active main,
        body.id-card-print-active [class*="container"],
        body.id-card-print-active .id-card-page-root {
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          max-width: none !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
          display: block !important;
          background: transparent !important;
        }

        /* Hide non-preview layout elements */
        body.id-card-print-active nav,
        body.id-card-print-active aside,
        body.id-card-print-active header:not(.id-card-a4-page-header),
        body.id-card-print-active .id-card-admin-chrome,
        body.id-card-print-active .id-card-browse-grid,
        body.id-card-print-active .id-card-page-root > *:not(.id-card-print-preview-root) {
          display: none !important;
        }

        /* Preview overlay container resets to pure print document */
        body.id-card-print-active .id-card-print-preview-root,
        body.id-card-print-active .id-card-print-surface,
        body.id-card-print-active .id-card-a4-print-stack {
          position: static !important;
          inset: auto !important;
          display: block !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          background: #ffffff !important;
          padding: 0 !important;
          margin: 0 !important;
          z-index: auto !important;
        }

        body.id-card-print-active .print\\:hidden {
          display: none !important;
        }

        /* Override any global button:not(.print-allow) hiding rules */
        body.id-card-print-active button.id-card-a4-slot-inner,
        body.id-card-print-active .id-card-a4-slot-inner,
        body.id-card-print-active .id-card-a4-slot,
        body.id-card-print-active .cr80-card-box,
        body.id-card-print-active .id-card-front,
        body.id-card-print-active .id-card-back {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        .id-card-a4-print-stack {
          gap: 0 !important;
        }

        .id-card-a4-page {
          box-shadow: none !important;
          border: none !important;
          page-break-after: always;
          break-after: page;
          margin: 0 auto !important;
          padding: 10mm 15.4mm 6mm !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }

        .id-card-a4-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        .id-card-a4-slot-inner {
          border: none !important;
          box-shadow: none !important;
        }

        .id-card-a4-pair-row,
        .id-card-a4-slot,
        .id-card-a4-slot-inner,
        .cr80-card-box,
        .id-card-front,
        .id-card-back {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
    `}</style>
  );
}
