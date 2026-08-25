import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // tsconfig.json의 "@/*" 경로 alias를 그대로 사용한다.
    tsconfigPaths: true,
    alias: {
      // server-only는 "클라이언트에서 import 하면 터져라"는 마커 모듈이다.
      // 테스트는 Node에서 서버 코드를 그대로 불러오므로 빈 모듈로 바꿔 준다.
      // (react-server 조건이 없는 환경에서는 import 자체가 throw 한다)
      "server-only": path.resolve(
        import.meta.dirname,
        "node_modules/server-only/empty.js",
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    css: false,
  },
});
