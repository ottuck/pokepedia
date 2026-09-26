/**
 * The player's trainer as in later Game Boy battles: a boy seen over the shoulder, upper body
 * cut off by the bottom of the screen, cap worn forward, a ball ready in hand. Original pixel
 * art for Pokepedia (no game asset is used).
 * Each character is one pixel; "." is transparent. Letters are roles (cap, hair, skin…),
 * mapped to the Game Boy greys below.
 */
const TRAINER_PIXELS = [
  ".........KKKKKKK............",
  ".......KKCCCCCCCKK..........",
  "......KWWWCCCCCCCCK.........",
  ".....KcccCCCCCCCCCCK........",
  "....KccccCCCCCCCCCCCK.......",
  "....KccccCCCCCCCCKKKKKKKKK..",
  "....KcKKcCCCCCCCKBBBBBBBBBK.",
  "....KcKKcCCCCCCCCKBBBBBBBBBK",
  "....KKKKKKKKKKKKKKKBBKKKKKK.",
  "..KKHHKHHHHHHHKSKSSKK.......",
  "..KHHHKHHHHHHKSsSKSSK.......",
  "...KHHKHHHHHHKSsSKSSK.......",
  "..KHHHHKHHHHHKSsSKSSK.......",
  ".KKKKHHKHHHHHHKKKSSSK.......",
  ".....KHHKHHHHHKSSSSK........",
  "....KKKKHHHHHHKSssK.........",
  "...K....KHHHHHKSsK..........",
  "......KKKKKHHKKKKK..........",
  "......KTTTTKKSSSSK..........",
  ".....KTTTTTTKSSSSSK.........",
  ".....KTTTTTTTKKKKKJKK.......",
  "....KTTTTTTTTTTKJJKKKK......",
  "....KTTTTTTTTTKJJKJJJJK.KKK.",
  "...KKTTTTTTTTKJJJKJJJKKKPPPK",
  "..KJJKKKKKKKKJJJJKJJKSKPPPPK",
  ".KjjjJJjjKJJJJJJJJKJKSKKKKKK",
  ".KjjjJJjjKJJJJJJJJKJKSKWWWWK",
  ".KjjjJJjjKJJJJJJJJJKKSSKKKK.",
  ".KjjjJJjjKJJJJJJJJJJKKKK....",
  "KjjjjJJjjKJJJJJJJJJJJKJK....",
  "KjjjjJJjjKJJJJJJJJJJJJJJK...",
  "KjjjjJJjjKJJJJJJJJJJJJJJK...",
  "KjjjjJJjjKJJJJJJJJJJJJJJK...",
] as const;

/** The four greys of the original Game Boy screen, like the rest of the battle. */
const TRAINER_PALETTE: Record<string, string> = {
  K: "#1f1d1a", // outline
  C: "#55534d", // cap
  c: "#34322e", // cap, shaded
  B: "#34322e", // brim
  H: "#34322e", // hair
  S: "#d9d6cc", // skin
  s: "#bdbab0", // skin, shaded
  J: "#8a877f", // jacket
  j: "#55534d", // jacket, shaded
  T: "#bdbab0", // hood
  P: "#55534d", // ball, top
  W: "#f8f8f0", // white
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
