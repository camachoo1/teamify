// Faint tournament bracket drawn behind the event title: eight entries
// on the left join round by round into an empty champion slot on the
// right. Place it inside a `relative isolate` parent.

const ROUND_X = [0, 160, 320, 480]; // viewBox is 700 x 300
const SLOT_X = 580;
const SLOT_WIDTH = 120;
const SLOT_HEIGHT = 44;

const buildBracket = () => {
  let rows = Array.from({ length: 8 }, (_, i) => 26 + i * 35);
  let lines = '';

  for (let round = 0; round < 3; round++) {
    const from = ROUND_X[round];
    const to = ROUND_X[round + 1];
    const next: number[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      const [top, bottom] = [rows[i], rows[i + 1]];
      lines += `M${from} ${top}H${to}M${from} ${bottom}H${to}`;
      lines += `M${to} ${top}V${bottom}`;
      next.push((top + bottom) / 2);
    }
    rows = next;
  }

  const finalY = rows[0];
  return {
    lines,
    final: `M${ROUND_X[3]} ${finalY}H${SLOT_X}`,
    slotY: finalY - SLOT_HEIGHT / 2,
  };
};

// The bracket never changes, so build it once per page load
const BRACKET = buildBracket();

export default function BracketBackdrop() {
  return (
    <svg
      className='bracket-backdrop'
      viewBox={`-10 0 ${SLOT_X + SLOT_WIDTH + 20} 300`}
      preserveAspectRatio='xMaxYMid meet'
      aria-hidden='true'
      focusable='false'
    >
      <g
        fill='none'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path
          d={BRACKET.lines}
          stroke='rgb(var(--bracket-line))'
          strokeWidth={2}
        />
        <path
          d={BRACKET.final}
          stroke='rgb(var(--bracket-final))'
          strokeWidth={3}
        />
        <rect
          x={SLOT_X}
          y={BRACKET.slotY}
          width={SLOT_WIDTH}
          height={SLOT_HEIGHT}
          rx={10}
          stroke='rgb(var(--bracket-final))'
          strokeWidth={3}
          strokeDasharray='8 6'
        />
      </g>
    </svg>
  );
}
