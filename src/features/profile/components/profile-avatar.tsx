import type { ProfilePicture } from "../display";

/**
 * A round profile picture: a photo fills the circle, a Pokémon sits on the Pokédex screen
 * blue, and without either the name's initial shows. Size and ring come from `className`.
 */
export function ProfileAvatar({
  name,
  picture,
  className,
}: {
  name: string;
  picture: ProfilePicture | null;
  className: string;
}) {
  const circle = `flex shrink-0 items-center justify-center overflow-hidden rounded-full font-black ${className}`;
  if (!picture) {
    return (
      <span aria-hidden className={`${circle} bg-dex-red text-white`}>
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  const pokemon = picture.kind === "pokemon";
  return (
    <span className={`${circle} ${pokemon ? "bg-dex-screen" : ""}`}>
      {/* A plain img: Google picture hosts are not worth adding to next/image remotePatterns. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={picture.url}
        alt=""
        referrerPolicy="no-referrer"
        className={
          pokemon ? "size-[85%] object-contain" : "size-full object-cover"
        }
      />
    </span>
  );
}
