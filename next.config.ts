import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 홈 디렉터리의 package-lock.json을 워크스페이스 루트로 오인하지 않도록 고정한다.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
