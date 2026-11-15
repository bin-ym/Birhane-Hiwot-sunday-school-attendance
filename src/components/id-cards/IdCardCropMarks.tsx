/** Corner trim guides for cardstock cutting (visible on screen and in print). */
export function IdCardCropMarks() {
  return (
    <div
      className="id-card-crop-marks pointer-events-none absolute inset-0 z-20"
      aria-hidden
    >
      <span className="id-card-crop-mark id-card-crop-mark--tl" />
      <span className="id-card-crop-mark id-card-crop-mark--tr" />
      <span className="id-card-crop-mark id-card-crop-mark--bl" />
      <span className="id-card-crop-mark id-card-crop-mark--br" />
    </div>
  );
}
