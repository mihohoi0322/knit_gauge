// ゲージ入力から mm 単位のグリッドレイアウトを計算する純粋ロジック

export const A4 = { width: 210, height: 297 }; // mm
export const MARGIN_MM = 10; // 用紙余白
export const HEADER_MM = 8; // ゲージ表記用のヘッダー領域
export const ROWS_PER_HLINE = 2; // 編み物は2段で1往復のため横線は2段ごと

/**
 * 入力値を「10cmあたり」に正規化する。
 * @param {{stitches: number, rows: number, unit: 'per10cm'|'per1cm'}} input
 * @returns {{stitchesPer10cm: number, rowsPer10cm: number}}
 */
export function normalizeGauge({ stitches, rows, unit }) {
  const factor = unit === 'per1cm' ? 10 : 1;
  return {
    stitchesPer10cm: stitches * factor,
    rowsPer10cm: rows * factor,
  };
}

/**
 * A4 1枚に収まるグリッドレイアウトを計算する。
 * すべての座標・寸法は mm。
 *
 * @param {object} opts
 * @param {number} opts.stitches 入力された目数
 * @param {number} opts.rows 入力された段数
 * @param {'per10cm'|'per1cm'} opts.unit 入力単位
 * @param {'portrait'|'landscape'} opts.orientation 用紙の向き
 * @param {number} opts.boldEvery 太線の間隔(マス数)。0 なら太線なし
 */
export function computeLayout({ stitches, rows, unit, orientation, boldEvery }) {
  const { stitchesPer10cm, rowsPer10cm } = normalizeGauge({ stitches, rows, unit });

  const paperW = orientation === 'landscape' ? A4.height : A4.width;
  const paperH = orientation === 'landscape' ? A4.width : A4.height;

  // 1マスの実寸: 1目の幅 × 1段の高さ
  const cellW = 100 / stitchesPer10cm;
  const cellH = 100 / rowsPer10cm;

  // ヘッダーと余白を除いた印字領域に収まる最大マス数(A4 1枚に必ず収める)
  const areaW = paperW - MARGIN_MM * 2;
  const areaH = paperH - MARGIN_MM * 2 - HEADER_MM;
  const cols = Math.max(1, Math.floor(areaW / cellW));
  // 2段で1往復なので横線は2段ごと。段数は偶数に揃える
  const rowCount = Math.max(ROWS_PER_HLINE, Math.floor(areaH / (cellH * ROWS_PER_HLINE)) * ROWS_PER_HLINE);

  const gridW = cols * cellW;
  const gridH = rowCount * cellH;
  const originX = MARGIN_MM;
  const originY = MARGIN_MM + HEADER_MM;

  const vLines = [];
  for (let i = 0; i <= cols; i++) {
    vLines.push({
      x: originX + i * cellW,
      bold: boldEvery > 0 && i % boldEvery === 0,
    });
  }
  // 段は下から数える(編み進む方向)ため、太線・数字とも下端を0段目とする
  const hLines = [];
  for (let j = 0; j <= rowCount; j += ROWS_PER_HLINE) {
    hLines.push({
      y: originY + j * cellH,
      bold: boldEvery > 0 && (rowCount - j) % boldEvery === 0,
    });
  }
  // 往復の間の1段(奇数段)は点線で引く
  const hDashLines = [];
  for (let j = 1; j < rowCount; j += ROWS_PER_HLINE) {
    hDashLines.push({ y: originY + j * cellH });
  }

  // 軸の数字ラベル(太線の間隔ごと。太線なしのときは10マスごと)
  const labelEvery = boldEvery > 0 ? boldEvery : 10;
  const xLabels = [];
  for (let i = labelEvery; i <= cols; i += labelEvery) {
    xLabels.push({ x: originX + i * cellW, text: String(i) });
  }
  // 段のラベルは下から数え、横線がある位置(偶数段)にだけ付ける
  const yLabelEvery = labelEvery % ROWS_PER_HLINE === 0 ? labelEvery : labelEvery * ROWS_PER_HLINE;
  const yLabels = [];
  for (let c = yLabelEvery; c <= rowCount; c += yLabelEvery) {
    yLabels.push({ y: originY + (rowCount - c) * cellH, text: String(c) });
  }

  const unitLabel = unit === 'per1cm' ? '1cm' : '10cm';
  const label = `ゲージ: ${stitches}目(横) × ${rows}段(縦) / ${unitLabel}`;

  return {
    paperW,
    paperH,
    originX,
    originY,
    gridW,
    gridH,
    cellW,
    cellH,
    cols,
    rowCount,
    vLines,
    hLines,
    hDashLines,
    xLabels,
    yLabels,
    label,
  };
}
