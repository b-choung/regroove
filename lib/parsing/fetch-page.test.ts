import { describe, expect, it } from "vitest";
import { PageFetchError, assertFetchableUrl } from "./fetch-page";

describe("assertFetchableUrl", () => {
  it("공개 http/https 주소는 통과시킨다", () => {
    expect(assertFetchableUrl("https://www.wanted.co.kr/wd/1")).toBe(
      "https://www.wanted.co.kr/wd/1",
    );
  });

  it.each([
    "http://localhost:3000/admin",
    "http://127.0.0.1/",
    "http://10.0.0.5/",
    "http://192.168.0.1/",
    "http://172.16.0.9/",
    "http://169.254.169.254/latest/meta-data/",
    "http://db.internal/",
  ])("내부망 주소를 막는다: %s", (url) => {
    expect(() => assertFetchableUrl(url)).toThrow(PageFetchError);
  });

  it("http/https가 아닌 스킴을 막는다", () => {
    expect(() => assertFetchableUrl("file:///etc/passwd")).toThrow(
      PageFetchError,
    );
  });
});
