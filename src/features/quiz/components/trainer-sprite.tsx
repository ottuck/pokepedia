/**
 * The player's trainer, seen from behind as in Game Boy battles. Original pixel art for
 * Pokepedia (no game asset is used): a red cap, a yellow backpack, a blue jacket.
 * Each character is one pixel; "." is transparent.
 */
export const TRAINER_PIXELS = [
  "........KKKKKKKK........",
  "......KKRRRRRRRRKK......",
  ".....KRRRRRRRRRRRRK.....",
  "....KRRRRRWWWWRRRRRK....",
  "....KRRRRRRRRRRRRRRK....",
  "...KKKKKKKKKKKKKKKKKK...",
  "....KHHHHHHHHHHHHHHK....",
  "....KHHHHHHHHHHHHHHK....",
  "....KSHHHHHHHHHHHHSK....",
  ".....KSSHHHHHHHHSSK.....",
  "......KKSSSSSSSSKK......",
  "....KKBBBKKKKKKBBBKK....",
  "...KBBBBKYYYYYYKBBBBK...",
  "..KBBBBKYYYYYYYYKBBBBK..",
  "..KBBBBKYYYYYYYYKBBBBK..",
  ".KBBBBBKYYYOOYYYKBBBBBK.",
  ".KSSBBBKYYYOOYYYKBBBSSK.",
  ".KSSKBBKYYYYYYYYKBBKSSK.",
  "..KK.KBBKYYYYYYKBBK.KK..",
  ".....KBBBKKKKKKBBBK.....",
  ".....KDDDDDDDDDDDDK.....",
  ".....KDDDDDKKDDDDDK.....",
  ".....KDDDDK..KDDDDK.....",
  ".....KKKKKK..KKKKKK.....",
] as const;

export const TRAINER_PALETTE: Record<string, string> = {
  K: "#1f1d1a",
  R: "#e3342f",
  W: "#ffffff",
  H: "#3b2a20",
  S: "#f2c9a0",
  B: "#3a6fd8",
  Y: "#f5c542",
  O: "#c98a1a",
  D: "#26324d",
};

// Pixel runs merged per row: one <rect> per run of a color instead of one per pixel.
const RECTS = TRAINER_PIXELS.flatMap((row, y) => {
  const rects: { x: number; y: number; width: number; fill: string }[] = [];
  for (let x = 0; x < row.length;) {
    const color = row[x];
    let end = x + 1;
    while (end < row.length && row[end] === color) end++;
    if (color !== ".") {
      rects.push({ x, y, width: end - x, fill: TRAINER_PALETTE[color] });
    }
    x = end;
  }
  return rects;
});

export function TrainerSprite({ className }: { className?: string }) {
  const size = TRAINER_PIXELS.length;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${TRAINER_PIXELS[0].length} ${size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      {RECTS.map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={1}
          fill={rect.fill}
        />
      ))}
    </svg>
  );
}
