// computeLayout の結果 (mm 単位) を Canvas / jsPDF に描画する

const THIN_LINE_MM = 0.15;
const BOLD_LINE_MM = 0.45;
const LABEL_FONT_MM = 4; // ゲージ表記の文字サイズ
const AXIS_NUM_FONT_MM = 2.5; // 軸の数字
const AXIS_TITLE_FONT_MM = 3; // 「目数」「段数」の軸タイトル
const DASH_PATTERN_MM = [1.2, 1]; // 奇数段の点線パターン

const THIN_COLOR = '#9db4c8';
const BOLD_COLOR = '#3d6a92';
const LABEL_COLOR = '#333333';

/**
 * Canvas に描画する(画面プレビューで使用)。
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

  // 往復の間の1段は点線で描く
  ctx.strokeStyle = THIN_COLOR;
  ctx.lineWidth = THIN_LINE_MM;
  ctx.setLineDash(DASH_PATTERN_MM);
  ctx.beginPath();
  for (const line of layout.hDashLines) {
    ctx.moveTo(left, line.y);
    ctx.lineTo(right, line.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

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

  // 軸の数字: 下辺に目数、左辺に段数
  ctx.font = `${AXIS_NUM_FONT_MM}px sans-serif`;
  ctx.textAlign = 'center';
  for (const l of layout.xLabels) {
    ctx.fillText(l.text, l.x, bottom + AXIS_NUM_FONT_MM + 0.8);
  }
  ctx.textAlign = 'right';
  for (const l of layout.yLabels) {
    ctx.fillText(l.text, left - 1, l.y + AXIS_NUM_FONT_MM * 0.35);
  }

  // 軸タイトル: 下中央「目数 →」、左中央「段数 →」(回転、段は下から上へ数える)
  ctx.font = `${AXIS_TITLE_FONT_MM}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('目数 →', (left + right) / 2, bottom + AXIS_NUM_FONT_MM + AXIS_TITLE_FONT_MM + 2);
  ctx.save();
  ctx.translate(left - AXIS_NUM_FONT_MM - 3.5, (top + bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('段数 →', 0, 0);
  ctx.restore();
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

  // 往復の間の1段は点線で描く
  doc.setDrawColor(THIN_COLOR);
  doc.setLineWidth(THIN_LINE_MM);
  doc.setLineDashPattern(DASH_PATTERN_MM, 0);
  for (const line of layout.hDashLines) {
    doc.line(left, line.y, right, line.y);
  }
  doc.setLineDashPattern([], 0);

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

  // jsPDF の標準フォントは日本語を含まないため、ゲージ表記や軸タイトルは
  // Canvas で描画した画像として貼り付ける(フォント埋め込み不要)
  const labelImage = makeLabelImage(layout.label, LABEL_FONT_MM);
  doc.addImage(
    labelImage.dataUrl,
    'PNG',
    right - labelImage.widthMm,
    layout.originY - 2 - LABEL_FONT_MM,
    labelImage.widthMm,
    labelImage.heightMm,
  );

  // 軸の数字(数字のみなので標準フォントで描ける)
  doc.setTextColor(LABEL_COLOR);
  doc.setFontSize(AXIS_NUM_FONT_MM * PT_PER_MM);
  for (const l of layout.xLabels) {
    doc.text(l.text, l.x, bottom + AXIS_NUM_FONT_MM + 0.8, { align: 'center' });
  }
  for (const l of layout.yLabels) {
    doc.text(l.text, left - 1, l.y + AXIS_NUM_FONT_MM * 0.35, { align: 'right' });
  }

  // 軸タイトル: 下中央「目数 →」、左中央「段数 →」(縦向き、下から上へ)
  const xTitle = makeLabelImage('目数 →', AXIS_TITLE_FONT_MM);
  doc.addImage(
    xTitle.dataUrl,
    'PNG',
    (left + right) / 2 - xTitle.widthMm / 2,
    bottom + AXIS_NUM_FONT_MM + 1.6,
    xTitle.widthMm,
    xTitle.heightMm,
  );
  const yTitle = makeLabelImage('段数 →', AXIS_TITLE_FONT_MM, true);
  doc.addImage(
    yTitle.dataUrl,
    'PNG',
    left - AXIS_NUM_FONT_MM - 3.5 - yTitle.widthMm / 2,
    (top + bottom) / 2 - yTitle.heightMm / 2,
    yTitle.widthMm,
    yTitle.heightMm,
  );
}

const PT_PER_MM = 72 / 25.4;

function makeLabelImage(text, fontMm, vertical = false) {
  const pxPerMm = 12; // 約 300dpi 相当
  const fontPx = fontMm * pxPerMm;
  const lineHeightMm = fontMm * 1.4;

  const canvas = document.createElement('canvas');
  const measureCtx = canvas.getContext('2d');
  measureCtx.font = `${fontPx}px sans-serif`;
  const textWidthPx = Math.ceil(measureCtx.measureText(text).width);
  const lineHeightPx = Math.round(lineHeightMm * pxPerMm);

  // vertical の場合はテキストを -90° 回転した状態で画像化する
  canvas.width = vertical ? lineHeightPx : textWidthPx;
  canvas.height = vertical ? textWidthPx : lineHeightPx;
  const ctx = canvas.getContext('2d');
  if (vertical) {
    ctx.translate(0, textWidthPx);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.font = `${fontPx}px sans-serif`;
  ctx.fillStyle = LABEL_COLOR;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 0, 0);

  const widthMm = canvas.width / pxPerMm;
  const heightMm = canvas.height / pxPerMm;
  return { dataUrl: canvas.toDataURL('image/png'), widthMm, heightMm };
}
