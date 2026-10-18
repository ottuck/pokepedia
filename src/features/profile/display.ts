import type { Locale } from "next-intl";
import { artworkUrl } from "@/features/pokemon/assets";
import { localizedName } from "@/features/pokemon/format";
import { googlePicture, pickAvatar } from "./avatar";

/**
 * The generated name's words and the picture's Pokémon, embedded in a profile read (see the
 * generated nicknames migration). Spread into a select next to the profile's own columns.
 */
export const NAME_COLUMNS =
  "nickname, nickname_adjective(name_ko, name_en, name_ja), avatar_pokemon:pokemon(name_ko, name_en, name_ja, artwork_path)";

type Names = { name_ko: string; name_en: string; name_ja: string };

export type ProfileNames = {
  nickname: string;
  avatar_path?: string | null;
  nickname_adjective?: Names | null;
  avatar_pokemon?: (Names & { artwork_path: string }) | null;
};

/** "Brave Pikachu" while the player has not chosen a nickname, else the nickname. */
export function trainerName(
  nickname: string,
  adjective: string | null | undefined,
  pokemonName: string | null | undefined,
): string {
  return adjective && pokemonName ? `${adjective} ${pokemonName}` : nickname;
}

/** A profile's name in the viewer's language. */
export function profileName(profile: ProfileNames, locale: Locale): string {
  const { nickname_adjective: adjective, avatar_pokemon: pokemon } = profile;
  return trainerName(
    profile.nickname,
    adjective && localizedName(adjective, locale),
    pokemon && localizedName(pokemon, locale),
  );
}

export type ProfilePicture = { url: string; kind: "photo" | "pokemon" };

/** An uploaded picture, else the Google picture, else the profile's Pokémon. */
export function profilePicture(
  profile: ProfileNames | null | undefined,
  userMetadata: unknown,
): ProfilePicture | null {
  const photo = pickAvatar(profile?.avatar_path, googlePicture(userMetadata));
  if (photo) return { url: photo, kind: "photo" };
  const pokemon = profile?.avatar_pokemon;
  return pokemon
    ? { url: artworkUrl(pokemon.artwork_path), kind: "pokemon" }
    : null;
}
