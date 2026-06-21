export default () => ({
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  version: process.env.npm_package_version ?? "0.0.1",
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  },
  database: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/cvforge",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  },
  queue: {
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY ?? "5", 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? "20", 10),
    rateLimitDurationMs: parseInt(
      process.env.RATE_LIMIT_DURATION_MS ?? "60000",
      10,
    ),
  },
  bullBoard: {
    user: process.env.BULL_BOARD_USER ?? "admin",
    password: process.env.BULL_BOARD_PASSWORD ?? "change-me",
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(","),
  },
});
