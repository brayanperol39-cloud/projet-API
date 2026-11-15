import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://brayanmbe@localhost:5432/support_test",
      JWT_ACCESS_SECRET: "test-access-secret-not-for-production",
      JWT_REFRESH_SECRET: "test-refresh-secret-not-for-production",
      ACCESS_TOKEN_TTL: "15m",
      REFRESH_TOKEN_TTL_DAYS: "7",
      APP_URL: "http://localhost:3000",
      EMAIL_FROM: "test@example.com",
      RESEND_API_KEY: "re_test_dummy",
      DISABLE_RATE_LIMIT: "1",
    },
  },
});
