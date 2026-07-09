// computeLayout の結果 (mm 単位) を Canvas / jsPDF に描画する

const THIN_LINE_MM = 0.15;
const BOLD_LINE_MM = 0.45;
const LABEL_FONT_MM = 4; // ゲージ表記の文字サイズ

const THIN_COLOR = '#9db4c8';
const BOLD_COLOR = '#3d6a92';
const LABEL_COLOR = '#333333';

/**
 * Canvas に描画する(画面プレビューと JPEG 出力で共用)。
 * @param {HTMLCanvasElement} canvas
 * @param {object} layout computeLayout の結果
 * @param {number} pxPerMm 1mm あたりのピクセル数
 */
export function renderToCanvas(canvas, layout, pxPerMm) {
  canvas.width = Math.round(layout.paperW * pxPerMm);
  canvas.height = Math.round(layout.paperH * pxPerMm);
  const ctx = canvas.getContext('2d');

  ctx.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0); // 以降は mm 座標で描ける

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, layout.paperW, layout.paperH);

  const top = layout.originY;
  const bottom = layout.originY + layout.gridH;
  const left = layout.originX;
  const right = layout.originX + layout.gridW;

  // 細線 → 太線の順に描き、太線が上に来るようにする
  for (const bold of [false, true]) {
    ctx.strokeStyle = bold ? BOLD_COLOR : THIN_COLOR;
    ctx.lineWidth = bold ? BOLD_LINE_MM : THIN_LINE_MM;
    ctx.beginPath();
    for (const line of layout.vLines) {
      if (line.bold !== bold) continue;
      ctx.moveTo(line.x, top);
      ctx.lineTo(line.x, bottom);
    }
    for (const line of layout.hLines) {
      if (line.bold !== bold) continue;
      ctx.moveTo(left, line.y);
      ctx.lineTo(right, line.y);
    }
    ctx.stroke();
  }

  // 外枠
  ctx.strokeStyle = BOLD_COLOR;
  ctx.lineWidth = BOLD_LINE_MM;
  ctx.strokeRect(left, top, layout.gridW, layout.gridH);

  // ゲージ表記(右上)
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = `${LABEL_FONT_MM}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(layout.label, right, layout.originY - 2);
}

/**
 * jsPDF ドキュメントに mm 単位で直接描画する(実寸精度)。
 * @param {import('jspdf').jsPDF} doc
 * @param {object} layout computeLayout の結果
 */
export function renderToPdf(doc, layout) {
  const top = layout.originY;
  const bottom = layout.originY + layout.gridH;
  const left = layout.originX;
  const right = layout.originX + layout.gridW;

  for (const bold of [false, true]) {
    doc.setDrawColor(bold ? BOLD_COLOR : THIN_COLOR);
    doc.setLineWidth(bold ? BOLD_LINE_MM : THIN_LINE_MM);
    for (const line of layout.vLines) {
      if (line.bold !== bold) continue;
      doc.line(line.x, top, line.x, bottom);
    }
    for (const line of layout.hLines) {
      if (line.bold !== bold) continue;
      doc.line(left, line.y, right, line.y);
    }
  }

  doc.setDrawColor(BOLD_COLOR);
  doc.setLineWidth(BOLD_LINE_MM);
  doc.rect(left, top, layout.gridW, layout.gridH);

  // jsPDF の標準フォントは日本語を含まないため、ゲージ表記は
  // Canvas で描画した画像として右上に貼り付ける(フォント埋め込み不要)
  const labelImage = makeLabelImage(layout.label);
  doc.addImage(
    labelImage.dataUrl,
    'PNG',
    right - labelImage.widthMm,
    layout.originY - 2 - LABEL_FONT_MM,
    labelImage.widthMm,
    labelImage.heightMm,
  );
}

function makeLabelImage(text) {
  const pxPerMm = 12; // 約 300dpi 相当
  const fontPx = LABEL_FONT_MM * pxPerMm;
  const heightMm = LABEL_FONT_MM * 1.4;

  const canvas = document.createElement('canvas');
  const measureCtx = canvas.getContext('2d');
  measureCtx.font = `${fontPx}px sans-serif`;
  const widthPx = Math.ceil(measureCtx.measureText(text).width);

  canvas.width = widthPx;
  canvas.height = Math.round(heightMm * pxPerMm);
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontPx}px sans-serif`;
  ctx.fillStyle = LABEL_COLOR;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 0, 0);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    widthMm: widthPx / pxPerMm,
    heightMm,
  };
}
