"use client";

import type { CardSide } from "@/lib/idCardPdfExport";
import { StudentIdCardFront } from "@/components/id-cards/StudentIdCardFront";
import { StudentIdCardBack } from "@/components/id-cards/StudentIdCardBack";
import { IdCardCropMarks } from "@/components/id-cards/IdCardCropMarks";
import {
  IdCardPrintItem,
  IdCardPrintLayout,
  IdCardPrintOverridesMap,
  IdCardPrintUnit,
} from "@/lib/idCardPrintTypes";
import {
  applyPrintOverride,
  fieldVisibilityFromOverride,
  printItemFromUnit,
} from "@/lib/idCardPrintUtils";

interface IdCardPrintSheetProps {
  pageIndex: number;
  totalPages: number;
  units: IdCardPrintUnit[];
  viewSide: CardSide;
  layout: IdCardPrintLayout;
  overrides: IdCardPrintOverridesMap;
  selectedSlotKey: string | null;
  onSelectSlot: (item: IdCardPrintItem, slotKey: string) => void;
  interactive: boolean;
}

function FaceSlot({
  item,
  slotKey,
  override,
  isSelected,
  interactive,
  onSelectSlot,
}: {
  item: IdCardPrintItem;
  slotKey: string;
  override: IdCardPrintOverridesMap[string];
  isSelected: boolean;
  interactive: boolean;
  onSelectSlot: (item: IdCardPrintItem, slotKey: string) => void;
}) {
  const displayStudent = applyPrintOverride(item.student, override);
  const visibility = fieldVisibilityFromOverride(override);

  return (
    <div className="id-card-a4-slot">
      <button
        type="button"
        disabled={!interactive}
        onClick={() => interactive && onSelectSlot(item, slotKey)}
        className={`id-card-a4-slot-inner print-allow group ${interactive ? "cursor-pointer" : "cursor-default"} ${isSelected ? "id-card-a4-slot-inner--selected" : ""}`}
        aria-label={`Edit ${displayStudent.Unique_ID} ${item.side}`}
      >
        <IdCardCropMarks />
                {item.side === "front" ? (
                  <StudentIdCardFront
                    student={displayStudent}
                    fieldVisibility={visibility}
                    className="id-card-on-sheet"
                  />
                ) : (
                  <StudentIdCardBack
                    student={displayStudent}
                    fieldVisibility={visibility}
                    className="id-card-on-sheet"
                  />
                )}
        {interactive && (
          <span className="id-card-a4-slot-hint print:hidden">Click to edit</span>
        )}
      </button>
      <p className="id-card-a4-slot-label print:hidden">
        {displayStudent.Unique_ID} • {displayStudent.First_Name} ({item.side})
      </p>
    </div>
  );
}

export function IdCardPrintSheet({
  pageIndex,
  totalPages,
  units,
  viewSide,
  layout,
  overrides,
  selectedSlotKey,
  onSelectSlot,
  interactive,
}: IdCardPrintSheetProps) {
  const unitsPerPage =
    viewSide === "both" ? layout.pairedUnitsPerPage : layout.facesPerPage;

  const padded: (IdCardPrintUnit | null)[] = [...units];
  while (padded.length < unitsPerPage) {
    padded.push(null);
  }

  return (
    <section
      className="id-card-a4-page"
      data-page-size={layout.label.includes("Letter") ? "letter" : "a4"}
      style={{
        width: `${layout.pageWidthMm}mm`,
        minHeight: `${layout.pageHeightMm}mm`,
      }}
    >
      <header className="id-card-a4-page-header print:block">
        <span>
          Birhane Hiwot Sunday School • CR80 ({layout.cardWidthMm} ×{" "}
          {layout.cardHeightMm} mm)
        </span>
        <span>
          Page {pageIndex + 1} of {totalPages}
        </span>
      </header>

      {viewSide === "both" ? (
        <div
          className="id-card-a4-paired-rows flex flex-col"
          style={{ rowGap: `${layout.rowGapMm}mm` }}
        >
          {padded.map((unit, rowIndex) => {
            if (!unit) {
              return (
                <div
                  key={`empty-row-${rowIndex}`}
                  className="id-card-a4-pair-row id-card-a4-pair-row--empty"
                  aria-hidden
                  style={{
                    gridTemplateColumns: `repeat(2, ${layout.cardWidthMm}mm)`,
                    columnGap: `${layout.colGapMm}mm`,
                  }}
                />
              );
            }

            const override = overrides[unit.studentKey];
            const frontKey = `${unit.studentKey}-front-p${pageIndex}-r${rowIndex}`;
            const backKey = `${unit.studentKey}-back-p${pageIndex}-r${rowIndex}`;

            return (
              <div
                key={`${unit.studentKey}-row-${rowIndex}`}
                className="id-card-a4-pair-row grid"
                style={{
                  gridTemplateColumns: `repeat(2, ${layout.cardWidthMm}mm)`,
                  columnGap: `${layout.colGapMm}mm`,
                  justifyContent: "center",
                }}
              >
                <FaceSlot
                  item={printItemFromUnit(unit, "front")}
                  slotKey={frontKey}
                  override={override}
                  isSelected={selectedSlotKey === frontKey}
                  interactive={interactive}
                  onSelectSlot={onSelectSlot}
                />
                <FaceSlot
                  item={printItemFromUnit(unit, "back")}
                  slotKey={backKey}
                  override={override}
                  isSelected={selectedSlotKey === backKey}
                  interactive={interactive}
                  onSelectSlot={onSelectSlot}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="id-card-a4-grid"
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, ${layout.cardWidthMm}mm)`,
            columnGap: `${layout.colGapMm}mm`,
            rowGap: `${layout.rowGapMm}mm`,
          }}
        >
          {padded.map((unit, indexOnPage) => {
            if (!unit) {
              return (
                <div
                  key={`empty-${indexOnPage}`}
                  className="id-card-a4-slot id-card-a4-slot--empty"
                  aria-hidden
                />
              );
            }

            const side = unit.showFront ? "front" : "back";
            const slotKey = `${unit.studentKey}-${side}-p${pageIndex}-i${indexOnPage}`;
            const item = printItemFromUnit(unit, side);

            return (
              <FaceSlot
                key={slotKey}
                item={item}
                slotKey={slotKey}
                override={overrides[unit.studentKey]}
                isSelected={selectedSlotKey === slotKey}
                interactive={interactive}
                onSelectSlot={onSelectSlot}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
