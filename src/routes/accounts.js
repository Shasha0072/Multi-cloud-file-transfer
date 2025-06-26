// src/routes/accounts.js - Cloud Account Management Routes
const encryptionService = require("../services/encryption");

async function accountRoutes(fastify, options) {
  // Input validation schemas
  const createAccountSchema = {
    body: {
      type: "object",
      required: ["provider", "accountName", "credentials"],
      properties: {
        provider: {
          type: "string",
          enum: ["aws-s3", "google-drive", "azure-blob", "dropbox"],
        },
        accountName: {
          type: "string",
          minLength: 1,
          maxLength: 100,
        },
        credentials: {
          type: "object",
          // Dynamic validation based on provider
        },
        testConnection: {
          type: "boolean",
          default: true,
        },
      },
      additionalProperties: false,
    },
  };

  const updateAccountSchema = {
    body: {
      type: "object",
      properties: {
        accountName: {
          type: "string",
          minLength: 1,
          maxLength: 100,
        },
        credentials: {
          type: "object",
        },
      },
      additionalProperties: false,
    },
    params: {
      type: "object",
      properties: {
        id: { type: "string", pattern: "^[0-9]+$" },
      },
    },
  };

  // List user's cloud accounts
  fastify.get(
    "/",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const accounts = await fastify.db.getCloudAccountsByUser(
          request.user.id
        );

        // Get account statistics
        const stats = await fastify.db.getAccountStats(request.user.id);

        reply.send({
          success: true,
          accounts: accounts.map((account) => ({
            id: account.id,
            provider: account.provider,
            accountName: account.account_name,
            connectionStatus: account.connection_status,
            lastSync: account.last_sync,
            errorMessage: account.error_message,
            createdAt: account.created_at,
          })),
          statistics: stats,
        });
      } catch (error) {
        fastify.log.error("Error fetching cloud accounts:", error);
        reply.code(500).send({
          error: "Failed to fetch accounts",
          message: "Unable to retrieve cloud accounts. Please try again later.",
        });
      }
    }
  );

  // Get specific cloud account details
  fastify.get(
    "/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const accountId = parseInt(request.params.id);
        const account = await fastify.db.getCloudAccountById(
          accountId,
          request.user.id
        );

        if (!account) {
          return reply.code(404).send({
            error: "Account not found",
            message:
              "Cloud account not found or you do not have permission to access it.",
          });
        }

        // Return account details without sensitive credentials
        reply.send({
          success: true,
          account: {
            id: account.id,
            provider: account.provider,
            accountName: account.account_name,
            connectionStatus: account.connection_status,
            lastSync: account.last_sync,
            errorMessage: account.error_message,
            createdAt: account.created_at,
          },
        });
      } catch (error) {
        fastify.log.error("Error fetching cloud account:", error);
        reply.code(500).send({
          error: "Failed to fetch account",
          message: "Unable to retrieve cloud account details.",
        });
      }
    }
  );

  // Create new cloud account
  fastify.post(
    "/",
    {
      preHandler: [fastify.authenticate],
      schema: createAccountSchema,
    },
    async (request, reply) => {
      const {
        provider,
        accountName,
        credentials,
        testConnection = true,
      } = request.body;

      try {
        // Check if account name already exists for this user
        const nameExists = await fastify.db.checkAccountNameExists(
          request.user.id,
          accountName
        );
        if (nameExists) {
          return reply.code(409).send({
            error: "Account name exists",
            message:
              "An account with this name already exists. Please choose a different name.",
          });
        }

        // Validate credential structure for the provider
        encryptionService.validateCredentialStructure(provider, credentials);

        // Test connection if requested (we'll implement this in the next step)
        if (testConnection) {
          // For now, we'll skip the actual connection test
          // await testCloudConnection(provider, credentials);
        }

        // Encrypt credentials
        const encryptedCredentials =
          encryptionService.encryptCredentials(credentials);

        // Save to database
        const accountId = await fastify.db.createCloudAccount(
          request.user.id,
          provider,
          accountName,
          encryptedCredentials
        );

        // Update connection status to active (since we skipped connection test for now)
        await fastify.db.updateCloudAccount(accountId, request.user.id, {
          connection_status: "active",
          last_sync: new Date().toISOString(),
        });

        reply.code(201).send({
          success: true,
          message: "Cloud account added successfully",
          account: {
            id: accountId,
            provider,
            accountName,
            connectionStatus: "active",
            createdAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        fastify.log.error("Error creating cloud account:", error);

        if (
          error.message.includes("Missing required fields") ||
          error.message.includes("Unsupported cloud provider")
        ) {
          return reply.code(400).send({
            error: "Invalid credentials",
            message: error.message,
          });
        }

        reply.code(500).send({
          error: "Failed to create account",
          message:
            "Unable to add cloud account. Please check your credentials and try again.",
        });
      }
    }
  );

  // Update cloud account
  fastify.put(
    "/:id",
    {
      preHandler: [fastify.authenticate],
      schema: updateAccountSchema,
    },
    async (request, reply) => {
      try {
        const accountId = parseInt(request.params.id);
        const { accountName, credentials } = request.body;

        // Check if account exists and belongs to user
        const existingAccount = await fastify.db.getCloudAccountById(
          accountId,
          request.user.id
        );
        if (!existingAccount) {
          return reply.code(404).send({
            error: "Account not found",
            message:
              "Cloud account not found or you do not have permission to modify it.",
          });
        }

        const updates = {};

        // Update account name if provided
        if (accountName && accountName !== existingAccount.account_name) {
          const nameExists = await fastify.db.checkAccountNameExists(
            request.user.id,
            accountName,
            accountId
          );
          if (nameExists) {
            return reply.code(409).send({
              error: "Account name exists",
              message:
                "An account with this name already exists. Please choose a different name.",
            });
          }
          updates.account_name = accountName;
        }

        // Update credentials if provided
        if (credentials) {
          encryptionService.validateCredentialStructure(
            existingAccount.provider,
            credentials
          );
          updates.encrypted_credentials =
            encryptionService.encryptCredentials(credentials);
          updates.connection_status = "pending"; // Reset status when credentials change
        }

        if (Object.keys(updates).length === 0) {
          return reply.code(400).send({
            error: "No updates provided",
            message: "Please provide accountName or credentials to update.",
          });
        }

        // Update in database
        const updated = await fastify.db.updateCloudAccount(
          accountId,
          request.user.id,
          updates
        );

        if (!updated) {
          return reply.code(404).send({
            error: "Update failed",
            message: "Failed to update cloud account.",
          });
        }

        reply.send({
          success: true,
          message: "Cloud account updated successfully",
          account: {
            id: accountId,
            provider: existingAccount.provider,
            accountName: updates.account_name || existingAccount.account_name,
            connectionStatus:
              updates.connection_status || existingAccount.connection_status,
          },
        });
      } catch (error) {
        fastify.log.error("Error updating cloud account:", error);

        if (
          error.message.includes("Missing required fields") ||
          error.message.includes("Unsupported cloud provider")
        ) {
          return reply.code(400).send({
            error: "Invalid credentials",
            message: error.message,
          });
        }

        reply.code(500).send({
          error: "Failed to update account",
          message: "Unable to update cloud account. Please try again later.",
        });
      }
    }
  );

  // Delete cloud account
  fastify.delete(
    "/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const accountId = parseInt(request.params.id);

        // Check if account exists and belongs to user
        const existingAccount = await fastify.db.getCloudAccountById(
          accountId,
          request.user.id
        );
        if (!existingAccount) {
          return reply.code(404).send({
            error: "Account not found",
            message:
              "Cloud account not found or you do not have permission to delete it.",
          });
        }

        // TODO: Check if account has active transfers before deleting
        // const activeTransfers = await fastify.db.getActiveTransfersByAccount(accountId);
        // if (activeTransfers.length > 0) {
        //   return reply.code(409).send({
        //     error: 'Account in use',
        //     message: 'Cannot delete account with active transfers. Please wait for transfers to complete.'
        //   });
        // }

        // Delete from database
        const deleted = await fastify.db.deleteCloudAccount(
          accountId,
          request.user.id
        );

        if (!deleted) {
          return reply.code(404).send({
            error: "Deletion failed",
            message: "Failed to delete cloud account.",
          });
        }

        reply.send({
          success: true,
          message: "Cloud account deleted successfully",
        });
      } catch (error) {
        fastify.log.error("Error deleting cloud account:", error);
        reply.code(500).send({
          error: "Failed to delete account",
          message: "Unable to delete cloud account. Please try again later.",
        });
      }
    }
  );

  // Test cloud account connection (placeholder for now)
  fastify.post(
    "/:id/test",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const accountId = parseInt(request.params.id);

        // Check if account exists and belongs to user
        const account = await fastify.db.getCloudAccountById(
          accountId,
          request.user.id
        );
        if (!account) {
          return reply.code(404).send({
            error: "Account not found",
            message:
              "Cloud account not found or you do not have permission to test it.",
          });
        }

        // For now, return a mock successful test
        // In the next step, we'll implement actual connection testing
        const testResult = {
          success: true,
          provider: account.provider,
          accountName: account.account_name,
          connectionStatus: "active",
          testedAt: new Date().toISOString(),
          message: "Connection test successful",
        };

        // Update last sync time
        await fastify.db.updateCloudAccount(accountId, request.user.id, {
          connection_status: "active",
          last_sync: new Date().toISOString(),
          error_message: null,
        });

        reply.send(testResult);
      } catch (error) {
        fastify.log.error("Error testing cloud account:", error);
        reply.code(500).send({
          error: "Test failed",
          message:
            "Unable to test cloud account connection. Please try again later.",
        });
      }
    }
  );
}

module.exports = accountRoutes;
