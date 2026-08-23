import { describe, expect, it } from "vitest";
import { detectSource } from "./source";

describe("detectSource", () => {
  it("아는 채용 사이트를 판별한다", () => {
    expect(
      detectSource("https://www.saramin.co.kr/zf_user/jobs/relay/view"),
    ).toBe("saramin");
    expect(detectSource("https://www.wanted.co.kr/wd/12345")).toBe("wanted");
    expect(detectSource("https://www.jobplanet.co.kr/job/search")).toBe(
      "jobplanet",
    );
  });

  it("모르는 사이트와 잘못된 URL은 manual로 둔다", () => {
    expect(detectSource("https://careers.toss.im/job")).toBe("manual");
    expect(detectSource("not-a-url")).toBe("manual");
  });

  // saramin.co.kr.evil.com이 saramin으로 잡히면 출처 라벨이 거짓이 된다.
  it("호스트 뒤에 붙은 유사 도메인은 속지 않는다", () => {
    expect(detectSource("https://www.saramin.co.kr.evil.com/x")).toBe("manual");
  });
});
