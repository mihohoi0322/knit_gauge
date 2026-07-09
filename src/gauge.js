// ゲージ入力から mm 単位のグリッドレイアウトを計算する純粋ロジック

export const A4 = { width: 210, height: 297 }; // mm
export const MARGIN_MM = 10; // 用紙余白
export const HEADER_MM = 8; // ゲージ表記用のヘッダー領域

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
  const rowCount = Math.max(1, Math.floor(areaH / cellH));

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
  const hLines = [];
  for (let j = 0; j <= rowCount; j++) {
    hLines.push({
      y: originY + j * cellH,
      bold: boldEvery > 0 && j % boldEvery === 0,
    });
  }

  const unitLabel = unit === 'per1cm' ? '1cm' : '10cm';
  const label = `ゲージ: ${stitches}目 × ${rows}段 / ${unitLabel}`;

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
    label,
  };
}
