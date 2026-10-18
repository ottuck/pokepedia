import { describe, expect, it } from "vitest";
import { profileName, profilePicture } from "./display";

const brave = { name_ko: "용감한", name_en: "Brave", name_ja: "ゆうかんな" };
const pikachu = {
  name_ko: "피카츄",
  name_en: "Pikachu",
  name_ja: "ピカチュウ",
  artwork_path: "normal/025.webp",
};

describe("profileName", () => {
  it("reads a generated name in the viewer's language", () => {
    const profile = {
      nickname: "Trainer-1A2B",
      nickname_adjective: brave,
      avatar_pokemon: pikachu,
    };
    expect(profileName(profile, "ko")).toBe("용감한 피카츄");
    expect(profileName(profile, "en")).toBe("Brave Pikachu");
    expect(profileName(profile, "ja")).toBe("ゆうかんな ピカチュウ");
  });

  it("shows a chosen nickname as it is", () => {
    const profile = {
      nickname: "레드",
      nickname_adjective: null,
      avatar_pokemon: pikachu,
    };
    expect(profileName(profile, "en")).toBe("레드");
  });
});

describe("profilePicture", () => {
  const google = { picture: "https://lh3.googleusercontent.com/a/me" };

  it("prefers an upload, then the Google picture, then the Pokémon", () => {
    const profile = { nickname: "레드", avatar_pokemon: pikachu };
    expect(
      profilePicture(
        { ...profile, avatar_path: "me/1790300000000.webp" },
        google,
      ),
    ).toMatchObject({
      kind: "photo",
      url: expect.stringContaining("/avatars/"),
    });
    expect(profilePicture(profile, google)).toEqual({
      kind: "photo",
      url: google.picture,
    });
    expect(profilePicture(profile, {})).toEqual({
      kind: "pokemon",
      url: expect.stringContaining("normal/025.webp"),
    });
    expect(profilePicture({ nickname: "레드" }, {})).toBeNull();
  });
});
