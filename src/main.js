import { jsPDF } from 'jspdf';
import { computeLayout } from './gauge.js';
import { renderToCanvas, renderToPdf } from './render.js';

const JPEG_DPI = 300;
const MM_PER_INCH = 25.4;

const form = document.getElementById('gauge-form');
const stitchesInput = document.getElementById('stitches');
const rowsInput = document.getElementById('rows');
const orientationSelect = document.getElementById('orientation');
const boldEverySelect = document.getElementById('bold-every');
const previewCanvas = document.getElementById('preview');
const gridInfo = document.getElementById('grid-info');

let currentUnit = 'per10cm';

function readOptions() {
  return {
    stitches: parseFloat(stitchesInput.value),
    rows: parseFloat(rowsInput.value),
    unit: currentUnit,
    orientation: orientationSelect.value,
    boldEvery: parseInt(boldEverySelect.value, 10),
  };
}

function validOptions(opts) {
  return opts.stitches > 0 && opts.rows > 0;
}

function updatePreview() {
  const opts = readOptions();
  if (!validOptions(opts)) return;

  const layout = computeLayout(opts);

  const paneWidth = previewCanvas.parentElement.clientWidth;
  const pxPerMm = (paneWidth / layout.paperW) * (window.devicePixelRatio || 1);
  renderToCanvas(previewCanvas, layout, pxPerMm);
  previewCanvas.style.width = `${paneWidth}px`;

  const cellW = layout.cellW.toFixed(2);
  const cellH = layout.cellH.toFixed(2);
  gridInfo.textContent = `1マス: 幅 ${cellW}mm × 高さ ${cellH}mm(${layout.cols}目 × ${layout.rowCount}段がA4に入ります)`;
}

function downloadPdf() {
  const opts = readOptions();
  if (!validOptions(opts)) return;

  const layout = computeLayout(opts);
  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: 'a4',
  });
  renderToPdf(doc, layout);
  doc.save('knit-gauge.pdf');
}

function downloadJpeg() {
  const opts = readOptions();
  if (!validOptions(opts)) return;

  const layout = computeLayout(opts);
  const canvas = document.createElement('canvas');
  renderToCanvas(canvas, layout, JPEG_DPI / MM_PER_INCH);
  canvas.toBlob(
    (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'knit-gauge.jpg';
      link.click();
      URL.revokeObjectURL(url);
    },
    'image/jpeg',
    0.92,
  );
}

// 単位切替時は入力値を換算して同じグリッドを保つ
function onUnitChange(event) {
  const nextUnit = event.target.value;
  if (nextUnit === currentUnit) return;
  const factor = nextUnit === 'per1cm' ? 0.1 : 10;
  for (const input of [stitchesInput, rowsInput]) {
    const value = parseFloat(input.value);
    if (value > 0) {
      input.value = parseFloat((value * factor).toFixed(2));
    }
  }
  currentUnit = nextUnit;
  updatePreview();
}

for (const radio of form.querySelectorAll('input[name="unit"]')) {
  radio.addEventListener('change', onUnitChange);
}
for (const el of [stitchesInput, rowsInput, orientationSelect, boldEverySelect]) {
  el.addEventListener('input', updatePreview);
}
window.addEventListener('resize', updatePreview);
document.getElementById('download-pdf').addEventListener('click', downloadPdf);
document.getElementById('download-jpeg').addEventListener('click', downloadJpeg);

updatePreview();
