// src/routes/accounts.js - Cloud Account Management Routes
const encryptionService = require("../services/encryption");
const AWSS3Provider = require("../services/cloud-providers/aws-s3-provider");
const GoogleDriveProvider = require("../services/cloud-providers/google-drive-provider");
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

        // Decrypt credentials
        const credentials = encryptionService.decryptCredentials(
          account.encrypted_credentials
        );

        let testResult;
        let connectionStatus = "error";
        let errorMessage = null;

        try {
          // Test connection based on provider type
          switch (account.provider) {
            case "aws-s3":
              const s3Provider = new AWSS3Provider(credentials);
              const authResult = await s3Provider.authenticate();

              testResult = {
                success: true,
                provider: account.provider,
                accountName: account.account_name,
                connectionStatus: "active",
                testedAt: new Date().toISOString(),
                message: authResult.message,
                details: {
                  bucket: authResult.bucket,
                  region: authResult.region,
                },
              };
              connectionStatus = "active";
              break;

            case "google-drive":
              const driveProvider = new GoogleDriveProvider(credentials);
              const driveAuthResult = await driveProvider.authenticate();

              testResult = {
                success: true,
                provider: account.provider,
                accountName: account.account_name,
                connectionStatus: "active",
                testedAt: new Date().toISOString(),
                message: driveAuthResult.message,
                details: {
                  user: driveAuthResult.user,
                  storage: driveAuthResult.storage,
                },
              };
              connectionStatus = "active";
              break;

            case "azure-blob":
              // TODO: Implement Azure Blob testing
              testResult = {
                success: false,
                provider: account.provider,
                accountName: account.account_name,
                connectionStatus: "error",
                testedAt: new Date().toISOString(),
                message: "Azure Blob integration not implemented yet",
              };
              connectionStatus = "error";
              errorMessage = "Azure Blob integration not implemented yet";
              break;

            case "dropbox":
              // TODO: Implement Dropbox testing
              testResult = {
                success: false,
                provider: account.provider,
                accountName: account.account_name,
                connectionStatus: "error",
                testedAt: new Date().toISOString(),
                message: "Dropbox integration not implemented yet",
              };
              connectionStatus = "error";
              errorMessage = "Dropbox integration not implemented yet";
              break;

            default:
              throw new Error(`Unsupported provider: ${account.provider}`);
          }
        } catch (connectionError) {
          // Connection test failed
          testResult = {
            success: false,
            provider: account.provider,
            accountName: account.account_name,
            connectionStatus: "error",
            testedAt: new Date().toISOString(),
            message: connectionError.message,
            error: connectionError.message,
          };
          connectionStatus = "error";
          errorMessage = connectionError.message;
        }

        // Update connection status in database
        await fastify.db.updateCloudAccount(accountId, request.user.id, {
          connection_status: connectionStatus,
          last_sync: new Date().toISOString(),
          error_message: errorMessage,
        });

        // Return appropriate response based on success/failure
        if (testResult.success) {
          reply.send(testResult);
        } else {
          reply.code(400).send(testResult);
        }
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

  fastify.get(
    "/:id/files",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", pattern: "^[0-9]+$" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            path: { type: "string", default: "" },
            limit: { type: "integer", minimum: 1, maximum: 1000, default: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const accountId = parseInt(request.params.id);
        const { path = "", limit = 100 } = request.query;

        // Check if account exists and belongs to user
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

        // Only support AWS S3 and Google Drive
        if (!["aws-s3", "google-drive"].includes(account.provider)) {
          return reply.code(400).send({
            error: "Provider not supported",
            message:
              "File operations are currently supported for AWS S3 and Google Drive accounts.",
          });
        }

        // Decrypt credentials and create provider
        const credentials = encryptionService.decryptCredentials(
          account.encrypted_credentials
        );

        let provider;
        let result;

        if (account.provider === "aws-s3") {
          provider = new AWSS3Provider(credentials);
          result = await provider.listFiles(path, { limit });
        } else if (account.provider === "google-drive") {
          provider = new GoogleDriveProvider(credentials);
          result = await provider.listFiles(path || "root", { limit });
        }

        reply.send({
          success: true,
          account: {
            id: account.id,
            name: account.account_name,
            provider: account.provider,
          },
          path: path,
          files: result.files,
          hasMore: result.hasMore,
          totalCount: result.totalCount,
        });
      } catch (error) {
        fastify.log.error("Error listing files:", error);
        reply.code(500).send({
          error: "Failed to list files",
          message:
            error.message || "Unable to retrieve files from cloud account.",
        });
      }
    }
  );

  // Get file information
  fastify.get(
    "/:id/files/info",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", pattern: "^[0-9]+$" },
          },
        },
        querystring: {
          type: "object",
          required: ["filePath"],
          properties: {
            filePath: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const accountId = parseInt(request.params.id);
        const { filePath } = request.query;

        // Check if account exists and belongs to user
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

        // Only support AWS S3 for now
        if (account.provider !== "aws-s3") {
          return reply.code(400).send({
            error: "Provider not supported",
            message:
              "File operations are currently only supported for AWS S3 accounts.",
          });
        }

        // Decrypt credentials and create provider
        const credentials = encryptionService.decryptCredentials(
          account.encrypted_credentials
        );
        const s3Provider = new AWSS3Provider(credentials);

        // Get file info
        const result = await s3Provider.getFileInfo(filePath);

        reply.send({
          success: true,
          account: {
            id: account.id,
            name: account.account_name,
            provider: account.provider,
          },
          file: result.file,
        });
      } catch (error) {
        fastify.log.error("Error getting file info:", error);

        if (error.message.includes("not found")) {
          return reply.code(404).send({
            error: "File not found",
            message: error.message,
          });
        }

        reply.code(500).send({
          error: "Failed to get file info",
          message: error.message || "Unable to retrieve file information.",
        });
      }
    }
  );

  // Upload file to cloud account
  // Replace the entire upload endpoint in src/routes/accounts.js with this:
  fastify.post(
    "/:id/files/upload",
    {
      preHandler: [fastify.authenticate],
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
              "Cloud account not found or you do not have permission to access it.",
          });
        }

        // Support both AWS S3 and Google Drive
        if (!["aws-s3", "google-drive"].includes(account.provider)) {
          return reply.code(400).send({
            error: "Provider not supported",
            message:
              "File upload is currently supported for AWS S3 and Google Drive accounts.",
          });
        }

        // Handle file upload (multipart/form-data)
        const data = await request.file();

        if (!data) {
          return reply.code(400).send({
            error: "No file provided",
            message: "Please select a file to upload.",
          });
        }

        // Get file buffer
        const fileBuffer = await data.toBuffer();
        const filename = data.filename;
        const mimetype = data.mimetype;

        // Decrypt credentials
        const credentials = encryptionService.decryptCredentials(
          account.encrypted_credentials
        );

        let result;
        let responseData;

        if (account.provider === "aws-s3") {
          // AWS S3 Upload
          const destinationPath = request.query.path
            ? `${request.query.path}/${filename}`
            : filename;

          const s3Provider = new AWSS3Provider(credentials);
          result = await s3Provider.uploadFile(fileBuffer, destinationPath, {
            contentType: mimetype,
            onProgress: (progress) => {
              console.log(`S3 Upload progress: ${progress.percentage}%`);
            },
          });

          responseData = {
            success: true,
            message: "File uploaded successfully to AWS S3",
            account: {
              id: account.id,
              name: account.account_name,
              provider: account.provider,
            },
            file: {
              name: filename,
              path: destinationPath,
              size: fileBuffer.length,
              contentType: mimetype,
              etag: result.file.etag,
              location: result.file.location,
            },
          };
        } else if (account.provider === "google-drive") {
          // Google Drive Upload
          const driveProvider = new GoogleDriveProvider(credentials);

          // For Google Drive, we can optionally specify a parent folder
          const uploadOptions = {
            contentType: mimetype,
          };

          // If path is specified, try to find/create folder
          if (request.query.path) {
            // For now, upload to root. Later we can implement folder creation
            console.log(`Google Drive upload to folder: ${request.query.path}`);
          }

          result = await driveProvider.uploadFile(
            fileBuffer,
            filename,
            uploadOptions
          );

          responseData = {
            success: true,
            message: "File uploaded successfully to Google Drive",
            account: {
              id: account.id,
              name: account.account_name,
              provider: account.provider,
            },
            file: {
              id: result.file.id,
              name: filename,
              size: fileBuffer.length,
              contentType: mimetype,
              webViewLink: result.file.webViewLink,
              driveFileId: result.file.id,
            },
          };
        }

        reply.send(responseData);
      } catch (error) {
        fastify.log.error("Error uploading file:", error);
        reply.code(500).send({
          error: "Upload failed",
          message: error.message || "Unable to upload file to cloud account.",
        });
      }
    }
  );

  // Download file from cloud account
  fastify.get(
    "/:id/files/download",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", pattern: "^[0-9]+$" },
          },
        },
        querystring: {
          type: "object",
          required: ["filePath"],
          properties: {
            filePath: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const accountId = parseInt(request.params.id);
        const { filePath } = request.query;

        // Check if account exists and belongs to user
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

        // Only support AWS S3 for now
        if (account.provider !== "aws-s3") {
          return reply.code(400).send({
            error: "Provider not supported",
            message:
              "File download is currently only supported for AWS S3 accounts.",
          });
        }

        // Decrypt credentials and create provider
        const credentials = encryptionService.decryptCredentials(
          account.encrypted_credentials
        );
        const s3Provider = new AWSS3Provider(credentials);

        // Get file info first
        const fileInfo = await s3Provider.getFileInfo(filePath);

        // Create S3 download parameters directly
        const params = {
          Bucket: credentials.bucketName,
          Key: filePath,
        };

        // Get the S3 object directly
        const s3Object = s3Provider.s3.getObject(params);

        // Set proper headers for download
        const filename = filePath.split("/").pop();
        reply.header(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        reply.header(
          "Content-Type",
          fileInfo.file.contentType || "application/octet-stream"
        );
        reply.header("Content-Length", fileInfo.file.size);

        // Send the S3 stream directly
        return reply.send(s3Object.createReadStream());
      } catch (error) {
        fastify.log.error("Error downloading file:", error);

        if (error.message.includes("not found")) {
          return reply.code(404).send({
            error: "File not found",
            message: error.message,
          });
        }

        reply.code(500).send({
          error: "Download failed",
          message:
            error.message || "Unable to download file from cloud account.",
        });
      }
    }
  );
}

module.exports = accountRoutes;
