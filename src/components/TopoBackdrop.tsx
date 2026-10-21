// Topographic contour lines drawn behind the page. The lines are traced
// from a fixed, smooth "terrain" with marching squares, so they never cross
// and look the same on every visit.

const COLS = 128;
const ROWS = 80;
const CELL = 12.5; // viewBox is 1600 x 1000
const LEVELS = 16;
const INDEX_EVERY = 4; // every 4th line is drawn heavier, as on real maps

// Hills as [x, y, radius, height], in 0-1 page coordinates
const HILLS: [number, number, number, number][] = [
  [0.2, 0.28, 0.2, 1],
  [0.72, 0.22, 0.16, 0.85],
  [0.58, 0.78, 0.24, 1.1],
  [0.1, 0.88, 0.14, 0.55],
  [0.93, 0.66, 0.18, 0.7],
  [0.42, 0.45, 0.1, 0.35],
];

const height = (x: number, y: number): number => {
  let h = 0;
  for (const [hx, hy, r, amp] of HILLS) {
    const dx = (x - hx) * 1.6; // the page is wider than tall
    const dy = y - hy;
    h += amp * Math.exp(-(dx * dx + dy * dy) / (2 * r * r));
  }
  // Gentle ripples so the contours wander instead of forming circles
  h +=
    0.1 * Math.sin(x * 7 + y * 5) +
    0.08 * Math.sin(y * 9 - x * 4) +
    0.045 * Math.sin(x * 15 + y * 13 + 1.3) +
    0.03 * Math.sin(x * 23 - y * 19);
  return h;
};

const buildContours = () => {
  const grid: number[][] = [];
  let min = Infinity;
  let max = -Infinity;
  for (let row = 0; row <= ROWS; row++) {
    const values: number[] = [];
    for (let col = 0; col <= COLS; col++) {
      const value = height(col / COLS, row / ROWS);
      values.push(value);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    grid.push(values);
  }

  const paths = { regular: '', index: '' };
  const fmt = (n: number) => n.toFixed(1);

  for (let level = 1; level <= LEVELS; level++) {
    const threshold = min + ((max - min) * level) / (LEVELS + 1);
    let d = '';

    // Point where the contour crosses the edge between two grid corners
    const cross = (
      x1: number,
      y1: number,
      v1: number,
      x2: number,
      y2: number,
      v2: number
    ) => {
      const t = (threshold - v1) / (v2 - v1);
      return [(x1 + (x2 - x1) * t) * CELL, (y1 + (y2 - y1) * t) * CELL];
    };

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tl = grid[row][col];
        const tr = grid[row][col + 1];
        const br = grid[row + 1][col + 1];
        const bl = grid[row + 1][col];
        const index =
          (tl > threshold ? 8 : 0) |
          (tr > threshold ? 4 : 0) |
          (br > threshold ? 2 : 0) |
          (bl > threshold ? 1 : 0);
        if (index === 0 || index === 15) continue;

        const top = () => cross(col, row, tl, col + 1, row, tr);
        const right = () => cross(col + 1, row, tr, col + 1, row + 1, br);
        const bottom = () =>
          cross(col, row + 1, bl, col + 1, row + 1, br);
        const left = () => cross(col, row, tl, col, row + 1, bl);

        const segments: number[][][] = [];
        switch (index) {
          case 1:
          case 14:
            segments.push([left(), bottom()]);
            break;
          case 2:
          case 13:
            segments.push([bottom(), right()]);
            break;
          case 3:
          case 12:
            segments.push([left(), right()]);
            break;
          case 4:
          case 11:
            segments.push([top(), right()]);
            break;
          case 6:
          case 9:
            segments.push([top(), bottom()]);
            break;
          case 7:
          case 8:
            segments.push([left(), top()]);
            break;
          case 5:
            segments.push([left(), top()], [bottom(), right()]);
            break;
          case 10:
            segments.push([top(), right()], [left(), bottom()]);
            break;
        }

        for (const [[x1, y1], [x2, y2]] of segments) {
          d += `M${fmt(x1)} ${fmt(y1)}L${fmt(x2)} ${fmt(y2)}`;
        }
      }
    }

    if (level % INDEX_EVERY === 0) paths.index += d;
    else paths.regular += d;
  }

  return paths;
};

// The terrain never changes, so trace it once per page load
const CONTOURS = buildContours();

export default function TopoBackdrop() {
  return (
    <svg
      className='topo-backdrop'
      viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
      preserveAspectRatio='xMidYMid slice'
      aria-hidden='true'
      focusable='false'
    >
      <g
        fill='none'
        strokeLinecap='round'
        strokeLinejoin='round'
        vectorEffect='non-scaling-stroke'
      >
        <path
          d={CONTOURS.regular}
          stroke='rgb(var(--contour))'
          strokeWidth={1}
          vectorEffect='non-scaling-stroke'
        />
        <path
          d={CONTOURS.index}
          stroke='rgb(var(--contour-index))'
          strokeWidth={1.75}
          vectorEffect='non-scaling-stroke'
        />
      </g>
    </svg>
  );
}
