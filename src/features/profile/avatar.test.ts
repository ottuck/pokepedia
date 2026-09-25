import { describe, expect, it } from "vitest";
import {
  googlePicture,
  isOwnAvatarPath,
  newAvatarPath,
  pickAvatar,
} from "./avatar";

const me = "4b0c8a4e-9d0e-4b9f-8c2b-1a2b3c4d5e6f";

describe("avatar paths", () => {
  it("names each upload freshly inside the owner's folder", () => {
    expect(newAvatarPath(me, "webp", 1790300000000)).toBe(
      `${me}/1790300000000.webp`,
    );
  });

  it.each([
    [`${me}/1790300000000.webp`, true],
    [`${me}/1790300000000.jpg`, true],
    [`other-user/1790300000000.webp`, false],
    [`${me}/1790300000000.png`, false],
    [`${me}/../other/1790300000000.webp`, false],
    [`${me}/sub/1790300000000.webp`, false],
    [`${me}/avatar.webp`, false],
  ])("%s is own: %s", (path, expected) => {
    expect(isOwnAvatarPath(me, path)).toBe(expected);
  });
});

describe("pickAvatar", () => {
  it("prefers the uploaded picture, then the Google one", () => {
    expect(pickAvatar(`${me}/1.webp`, "https://google/pic")).toMatch(
      /\/storage\/v1\/object\/public\/avatars\/.+\/1\.webp$/,
    );
    expect(pickAvatar(null, "https://google/pic")).toBe("https://google/pic");
    expect(pickAvatar(null, null)).toBeNull();
  });
});

describe("googlePicture", () => {
  it("reads avatar_url or picture, https only", () => {
    expect(googlePicture({ avatar_url: "https://a/1" })).toBe("https://a/1");
    expect(googlePicture({ picture: "https://a/2" })).toBe("https://a/2");
    expect(googlePicture({ avatar_url: "javascript:alert(1)" })).toBeNull();
    expect(googlePicture({ avatar_url: 42 })).toBeNull();
    expect(googlePicture(null)).toBeNull();
  });
});
