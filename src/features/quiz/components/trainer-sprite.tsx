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

/** The ball in the trainer's hand: hidden while it is thrown, and drawn alone as the ball in flight. */
const BALL = { x: 23, y: 22, width: 5, height: 6 };
const inBall = (x: number, y: number) =>
  x >= BALL.x && y >= BALL.y && y < BALL.y + BALL.height;

type Run = { x: number; y: number; width: number; fill: string };

// Pixel runs merged per row: one <rect> per run of a color instead of one per pixel.
function runs(keep: (x: number, y: number) => boolean): Run[] {
  return TRAINER_PIXELS.flatMap((row, y) => {
    const rects: Run[] = [];
    for (let x = 0; x < row.length;) {
      const color = row[x];
      let end = x + 1;
      while (
        end < row.length &&
        row[end] === color &&
        keep(end, y) === keep(x, y)
      )
        end++;
      if (color !== "." && keep(x, y)) {
        rects.push({ x, y, width: end - x, fill: TRAINER_PALETTE[color] });
      }
      x = end;
    }
    return rects;
  });
}

const BODY = runs((x, y) => !inBall(x, y));
const BALL_RECTS = runs(inBall);

function Pixels({ rects }: { rects: Run[] }) {
  return rects.map((rect) => (
    <rect
      key={`${rect.x}-${rect.y}`}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={1}
      fill={rect.fill}
    />
  ));
}

/** `throwing`: the hand is empty (the ball is in flight, see ThrownBall). */
export function TrainerSprite({
  className,
  throwing = false,
}: {
  className?: string;
  throwing?: boolean;
}) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${TRAINER_PIXELS[0].length} ${TRAINER_PIXELS.length}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <Pixels rects={BODY} />
      {!throwing && <Pixels rects={BALL_RECTS} />}
    </svg>
  );
}

/** The same pixel ball on its own, for the throw. */
export function BallSprite({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox={`${BALL.x} ${BALL.y} ${BALL.width} ${BALL.height}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <Pixels rects={BALL_RECTS} />
    </svg>
  );
}
