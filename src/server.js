// src/server.js - Updated with Database Integration
require("dotenv").config();
const fastify = require("fastify")({
  logger: true,
});

// Import database
const database = require("./services/database");

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

fastify.register(require("@fastify/multipart"), {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1, // Only one file at a time
  },
});

// Add database to fastify instance
fastify.decorate("db", database);

// Authentication decorator for protected routes
fastify.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();

    // Validate session in database
    const session = await fastify.db.validateSession(request.user.sessionToken);
    if (!session || !session.is_active) {
      throw new Error("Invalid or expired session");
    }

    // Add user info to request
    request.user = {
      id: session.user_id,
      email: session.email,
      firstName: session.first_name,
      lastName: session.last_name,
      sessionToken: request.user.sessionToken,
    };
  } catch (err) {
    reply.code(401).send({
      error: "Authentication required",
      message: "Please login to access this resource",
    });
  }
});

// Health check endpoint - enhanced with database status
fastify.get("/health", async (request, reply) => {
  // Check database connection
  let dbStatus = "disconnected";
  try {
    if (fastify.db && fastify.db.db) {
      dbStatus = "connected";
    }
  } catch (err) {
    dbStatus = "error";
  }

  return {
    status: "ok",
    message: "Cloud Transfer API is running",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    version: require("../package.json").version,
    database: {
      status: dbStatus,
      type: "SQLite",
    },
    features: {
      multiAuth: true,
      cloudProviders: ["aws", "google", "azure"],
      maxFileSize: process.env.MAX_FILE_SIZE || "5GB",
    },
  };
});

// Root endpoint
fastify.get("/", async (request, reply) => {
  return {
    message: "Welcome to Cloud Transfer API",
    version: "1.0.0",
    documentation: "https://docs.cloudtransfer.app",
    endpoints: {
      health: "/health",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        profile: "GET /api/auth/profile",
        logout: "POST /api/auth/logout",
      },
      accounts: {
        list: "GET /api/accounts",
        create: "POST /api/accounts",
        test: "POST /api/accounts/:id/test",
      },
      transfers: {
        list: "GET /api/transfers",
        create: "POST /api/transfers",
        status: "GET /api/transfers/:id",
      },
    },
    supportedProviders: {
      authentication: ["email", "google", "okta", "microsoft"],
      cloudStorage: ["aws-s3", "google-drive", "azure-blob", "dropbox"],
    },
  };
});

// Database test endpoint (for development)
fastify.get("/api/db-test", async (request, reply) => {
  if (process.env.NODE_ENV === "production") {
    return reply.code(404).send({ error: "Not found" });
  }

  try {
    // Test database operations
    const testResults = {
      connection: "ok",
      tables: [],
      timestamp: new Date().toISOString(),
    };

    // You can add more test queries here during development
    return testResults;
  } catch (error) {
    return reply.code(500).send({
      error: "Database test failed",
      message: error.message,
    });
  }
});

// Register route modules
fastify.register(require("./routes/auth"), { prefix: "/api/auth" });
fastify.register(require("./routes/accounts"), { prefix: "/api/accounts" });
fastify.register(require('./routes/transfers'), { prefix: '/api/transfers' });

// Graceful shutdown handler
async function closeGracefully(signal) {
  console.log(`\n🛑 Received signal to terminate: ${signal}`);

  // Clean up expired sessions
  try {
    await fastify.db.cleanupExpiredSessions();
  } catch (err) {
    console.error("Error cleaning up sessions:", err);
  }

  // Close database connection
  fastify.db.close();

  // Close server
  await fastify.close();
  console.log("✅ Server closed gracefully");
  process.exit(0);
}

// Handle termination signals
process.on("SIGINT", closeGracefully);
process.on("SIGTERM", closeGracefully);

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });
    console.log(`🚀 Cloud Transfer API running on http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🔍 Database test: http://localhost:${port}/api/db-test`);
    console.log(`📚 API documentation: http://localhost:${port}/`);

    // Clean up expired sessions on startup
    setTimeout(async () => {
      try {
        await fastify.db.cleanupExpiredSessions();
      } catch (err) {
        console.error("Error cleaning up sessions on startup:", err);
      }
    }, 1000);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
