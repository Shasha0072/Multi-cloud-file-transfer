// src/routes/auth.js - Authentication Routes with Multi-Provider Support
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

async function authRoutes(fastify, options) {
  // Input validation schemas
  const registerSchema = {
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: {
          type: "string",
          format: "email",
          maxLength: 255,
        },
        password: {
          type: "string",
          minLength: 6,
          maxLength: 100,
        },
        firstName: {
          type: "string",
          maxLength: 50,
        },
        lastName: {
          type: "string",
          maxLength: 50,
        },
      },
      additionalProperties: false,
    },
  };

  const loginSchema = {
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
      },
      additionalProperties: false,
    },
  };

  // User Registration Endpoint
  fastify.post(
    "/register",
    {
      schema: registerSchema,
    },
    async (request, reply) => {
      const { email, password, firstName, lastName } = request.body;

      try {
        // Check if user already exists
        const existingUser = await fastify.db.getUserByEmail(email);
        if (existingUser) {
          return reply.code(409).send({
            error: "User already exists",
            message:
              "An account with this email already exists. Please use a different email or try logging in.",
          });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user in database
        const userId = await fastify.db.createUser(
          email,
          `${firstName || ""} ${lastName || ""}`.trim() || null,
          firstName,
          lastName
        );

        // Create email authentication provider
        await fastify.db.createAuthProvider(userId, "email", email, {
          email: email,
          passwordHash: passwordHash,
          isPrimary: true,
          isVerified: false, // Email verification can be added later
        });

        // Generate session token and JWT
        const sessionToken = uuidv4();

        // Create session in database
        const deviceInfo = {
          ip: request.ip,
          userAgent: request.headers["user-agent"],
        };

        await fastify.db.createSession(
          userId,
          sessionToken,
          "email",
          deviceInfo
        );

        // Generate JWT token
        const jwtToken = fastify.jwt.sign(
          {
            userId: userId,
            email: email,
            sessionToken: sessionToken,
            provider: "email",
          },
          {
            expiresIn: "7d",
          }
        );

        // Update last login
        await fastify.db.updateLastLogin(userId);

        reply.code(201).send({
          success: true,
          message: "User registered successfully",
          user: {
            id: userId,
            email: email,
            firstName: firstName,
            lastName: lastName,
            subscriptionTier: "free",
          },
          token: jwtToken,
          authProvider: "email",
          expiresIn: "7 days",
        });
      } catch (error) {
        fastify.log.error("Registration error:", error);

        // Handle specific database errors
        if (error.message.includes("UNIQUE constraint failed")) {
          return reply.code(409).send({
            error: "Email already registered",
            message: "This email is already associated with an account.",
          });
        }

        reply.code(500).send({
          error: "Registration failed",
          message: "Unable to create account. Please try again later.",
        });
      }
    }
  );

  // User Login Endpoint
  fastify.post(
    "/login",
    {
      schema: loginSchema,
    },
    async (request, reply) => {
      const { email, password } = request.body;

      try {
        // Find user and auth provider
        const authProvider = await fastify.db.getAuthProvider("email", email);

        if (!authProvider) {
          return reply.code(401).send({
            error: "Invalid credentials",
            message: "Email or password is incorrect.",
          });
        }

        // Check if user account is active
        if (!authProvider.is_active) {
          return reply.code(403).send({
            error: "Account deactivated",
            message:
              "Your account has been deactivated. Please contact support.",
          });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          password,
          authProvider.password_hash
        );
        if (!isValidPassword) {
          return reply.code(401).send({
            error: "Invalid credentials",
            message: "Email or password is incorrect.",
          });
        }

        // Generate new session token and JWT
        const sessionToken = uuidv4();

        // Create session in database
        const deviceInfo = {
          ip: request.ip,
          userAgent: request.headers["user-agent"],
        };

        await fastify.db.createSession(
          authProvider.user_id,
          sessionToken,
          "email",
          deviceInfo
        );

        // Generate JWT token
        const jwtToken = fastify.jwt.sign(
          {
            userId: authProvider.user_id,
            email: authProvider.email,
            sessionToken: sessionToken,
            provider: "email",
          },
          {
            expiresIn: "7d",
          }
        );

        // Update last login
        await fastify.db.updateLastLogin(authProvider.user_id);

        reply.send({
          success: true,
          message: "Login successful",
          user: {
            id: authProvider.user_id,
            email: authProvider.email,
            firstName: authProvider.first_name,
            lastName: authProvider.last_name,
          },
          token: jwtToken,
          authProvider: "email",
          expiresIn: "7 days",
        });
      } catch (error) {
        fastify.log.error("Login error:", error);
        reply.code(500).send({
          error: "Login failed",
          message: "Unable to process login. Please try again later.",
        });
      }
    }
  );

  // Get User Profile (Protected Route)
  fastify.get(
    "/profile",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = await fastify.db.getUserById(request.user.id);
        if (!user) {
          return reply.code(404).send({
            error: "User not found",
            message: "User profile could not be found.",
          });
        }

        // Get user's authentication providers
        const authProviders = await fastify.db.getUserAuthProviders(user.id);

        reply.send({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            subscriptionTier: user.subscription_tier,
            usageQuota: user.usage_quota,
            usageCurrent: user.usage_current,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
          },
          authProviders: authProviders.map((provider) => ({
            type: provider.provider_type,
            email: provider.provider_email,
            isPrimary: provider.is_primary,
            isVerified: provider.is_verified,
            createdAt: provider.created_at,
          })),
        });
      } catch (error) {
        fastify.log.error("Profile fetch error:", error);
        reply.code(500).send({
          error: "Profile fetch failed",
          message: "Unable to retrieve user profile.",
        });
      }
    }
  );

  // Logout Endpoint
  fastify.post(
    "/logout",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        // Deactivate current session
        await fastify.db.deactivateSession(request.user.sessionToken);

        reply.send({
          success: true,
          message: "Logged out successfully",
        });
      } catch (error) {
        fastify.log.error("Logout error:", error);
        reply.code(500).send({
          error: "Logout failed",
          message: "Unable to process logout.",
        });
      }
    }
  );

  // Check Authentication Status
  fastify.get(
    "/status",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      reply.send({
        success: true,
        authenticated: true,
        user: {
          id: request.user.id,
          email: request.user.email,
        },
      });
    }
  );
}

module.exports = authRoutes;
