// src/server.js
require("dotenv").config();
const fastify = require("fastify")({
  logger: true,
});

// Register CORS plugin
fastify.register(require("@fastify/cors"), {
  origin: true,
  credentials: true,
});

// Register JWT plugin
fastify.register(require("@fastify/jwt"), {
  secret:
    process.env.JWT_SECRET || "your-development-secret-change-in-production",
});

// Health check endpoint
fastify.get("/health", async (request, reply) => {
  return {
    status: "ok",
    message: "Cloud Transfer API is running",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    version: require("../package.json").version,
  };
});

// Root endpoint
fastify.get("/", async (request, reply) => {
  return {
    message: "Welcome to Cloud Transfer API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      docs: "/docs (coming soon)",
    },
  };
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });
    console.log(`🚀 Cloud Transfer API running on http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await fastify.close();
  process.exit(0);
});

start();
