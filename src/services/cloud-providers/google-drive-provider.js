// src/services/cloud-providers/google-drive-provider.js - Google Drive Integration
const { google } = require("googleapis");

class GoogleDriveProvider {
  constructor(credentials) {
    this.credentials = credentials;
    this.drive = null;
    this.auth = null;
    this.authenticated = false;
    this.lastError = null;
  }

  // Initialize Google Drive client with service account
  // Replace the initialize() method with this debug version
  async initialize() {
    try {
      console.log("🔍 Debug: Starting Google Drive initialization");

      // Parse service account key
      let serviceAccount;

      if (typeof this.credentials.serviceAccountKey === "string") {
        serviceAccount = JSON.parse(this.credentials.serviceAccountKey);
      } else {
        serviceAccount = this.credentials.serviceAccountKey;
      }

      console.log(
        "🔍 Debug: Service account email:",
        serviceAccount.client_email
      );

      // Create JWT auth client with proper configuration
      this.auth = new google.auth.JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });

      // Authorize the client
      await this.auth.authorize();
      console.log("🔍 Debug: JWT authorization successful");

      // Create Drive API client
      this.drive = google.drive({ version: "v3", auth: this.auth });

      console.log("🔍 Debug: Google Drive client created");
      return true;
    } catch (error) {
      console.log("🔍 Debug: Initialization error:", error.message);
      this.lastError = `Failed to initialize Google Drive client: ${error.message}`;
      return false;
    }
  }

  // Test authentication and access
  // async authenticate() {
  //   try {
  //     if (!this.drive) {
  //       if (!(await this.initialize())) {
  //         throw new Error(this.lastError);
  //       }
  //     }

  //     // Test access by getting user info
  //     const response = await this.drive.about.get({
  //       fields: "user, storageQuota",
  //     });

  //     this.authenticated = true;
  //     this.lastError = null;

  //     return {
  //       success: true,
  //       provider: "Google Drive",
  //       user: response.data.user.emailAddress,
  //       storage: {
  //         limit: response.data.storageQuota.limit,
  //         usage: response.data.storageQuota.usage,
  //         usageInDrive: response.data.storageQuota.usageInDrive,
  //       },
  //       message: "Authentication successful",
  //     };
  //   } catch (error) {
  //     this.authenticated = false;
  //     this.lastError = error.message;

  //     // Handle specific Google API errors
  //     let friendlyMessage = "Authentication failed";

  //     if (error.code === 401) {
  //       friendlyMessage = "Invalid Google service account credentials";
  //     } else if (error.code === 403) {
  //       friendlyMessage =
  //         "Google Drive API access denied. Check service account permissions.";
  //     } else if (error.message.includes("private_key")) {
  //       friendlyMessage = "Invalid private key in service account credentials";
  //     } else if (error.message.includes("client_email")) {
  //       friendlyMessage = "Invalid client email in service account credentials";
  //     }

  //     throw new Error(friendlyMessage);
  //   }
  // }
  async authenticate() {
    try {
      if (!this.drive) {
        if (!(await this.initialize())) {
          throw new Error(this.lastError);
        }
      }

      console.log("🔍 Debug: Testing Google Drive API access...");

      // Test access with a simple API call
      const response = await this.drive.about.get({
        fields: "user, storageQuota",
      });

      console.log("🔍 Debug: API call successful");

      this.authenticated = true;
      this.lastError = null;

      return {
        success: true,
        provider: "Google Drive",
        user: response.data.user?.emailAddress || "Service Account User",
        storage: response.data.storageQuota,
        message: "Authentication successful",
      };
    } catch (error) {
      this.authenticated = false;
      this.lastError = error.message;

      console.log("🔍 Debug: Authentication error:", error.message);

      let friendlyMessage = "Authentication failed";

      if (
        error.message.includes(
          "Request is missing required authentication credential"
        )
      ) {
        friendlyMessage =
          "Service account authentication failed. Check if Google Drive API is enabled.";
      } else if (error.code === 401) {
        friendlyMessage = "Invalid service account credentials";
      } else if (error.code === 403) {
        friendlyMessage =
          "Service account does not have access to Google Drive API";
      }

      throw new Error(friendlyMessage);
    }
  }
  // List files in Google Drive
  async listFiles(folderId = "root", options = {}) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      const query =
        folderId === "root"
          ? `'${folderId}' in parents and trashed = false`
          : `'${folderId}' in parents and trashed = false`;

      const params = {
        q: query,
        pageSize: options.limit || 100,
        fields:
          "nextPageToken, files(id, name, size, mimeType, modifiedTime, parents, webViewLink, thumbnailLink)",
        orderBy: "folder,name",
      };

      if (options.pageToken) {
        params.pageToken = options.pageToken;
      }

      const response = await this.drive.files.list(params);

      const files = response.data.files.map((file) => ({
        id: file.id,
        name: file.name,
        path: file.id, // Google Drive uses IDs as paths
        size: parseInt(file.size) || 0,
        lastModified: file.modifiedTime,
        mimeType: file.mimeType,
        type:
          file.mimeType === "application/vnd.google-apps.folder"
            ? "folder"
            : "file",
        webViewLink: file.webViewLink,
        thumbnailLink: file.thumbnailLink,
        parents: file.parents,
      }));

      return {
        success: true,
        files: files,
        hasMore: !!response.data.nextPageToken,
        nextPageToken: response.data.nextPageToken,
        totalCount: files.length,
      };
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Get file information
  async getFileInfo(fileId) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        fields:
          "id, name, size, mimeType, modifiedTime, createdTime, parents, webViewLink, exportLinks",
      });

      const file = response.data;

      return {
        success: true,
        file: {
          id: file.id,
          name: file.name,
          path: file.id,
          size: parseInt(file.size) || 0,
          lastModified: file.modifiedTime,
          createdTime: file.createdTime,
          mimeType: file.mimeType,
          type:
            file.mimeType === "application/vnd.google-apps.folder"
              ? "folder"
              : "file",
          webViewLink: file.webViewLink,
          downloadLink: file.downloadLink,
          exportLinks: file.exportLinks,
          parents: file.parents,
        },
      };
    } catch (error) {
      if (error.code === 404) {
        throw new Error(`File with ID '${fileId}' not found`);
      }
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  // Upload file to Google Drive
  async uploadFile(fileBuffer, fileName, options = {}) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      console.log("🔍 Debug: Starting Google Drive upload");
      console.log("🔍 Debug: File name:", fileName);
      console.log("🔍 Debug: File size:", fileBuffer.length);
      console.log("🔍 Debug: Content type:", options.contentType);

      const fileMetadata = {
        name: fileName,
        parents: options.parentId ? [options.parentId] : ["root"],
      };

      // Convert buffer to stream for Google Drive
      const { Readable } = require("stream");
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null); // End of stream

      const media = {
        mimeType: options.contentType || "application/octet-stream",
        body: bufferStream,
      };

      console.log("🔍 Debug: Calling Google Drive API...");

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, name, size, webViewLink, mimeType",
      });

      console.log("🔍 Debug: Upload successful:", response.data);

      return {
        success: true,
        file: {
          id: response.data.id,
          name: response.data.name,
          size: response.data.size || fileBuffer.length,
          webViewLink: response.data.webViewLink,
          mimeType: response.data.mimeType,
        },
      };
    } catch (error) {
      console.log("🔍 Debug: Upload error:", error.message);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  // Download file from Google Drive
  async downloadFile(fileId, options = {}) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      // Get file info first
      const fileInfo = await this.getFileInfo(fileId);

      // Check if it's a Google Workspace file (needs export)
      if (fileInfo.file.mimeType.startsWith("application/vnd.google-apps.")) {
        // Handle Google Workspace files (Docs, Sheets, etc.)
        const exportMimeType = this.getExportMimeType(fileInfo.file.mimeType);

        const response = await this.drive.files.export(
          {
            fileId: fileId,
            mimeType: exportMimeType,
          },
          { responseType: "stream" }
        );

        return {
          success: true,
          stream: response.data,
          fileInfo: fileInfo.file,
        };
      } else {
        // Handle regular files
        const response = await this.drive.files.get(
          {
            fileId: fileId,
            alt: "media",
          },
          { responseType: "stream" }
        );

        return {
          success: true,
          stream: response.data,
          fileInfo: fileInfo.file,
        };
      }
    } catch (error) {
      if (error.code === 404) {
        throw new Error(`File with ID '${fileId}' not found`);
      }
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  // Delete file from Google Drive
  async deleteFile(fileId) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      await this.drive.files.delete({
        fileId: fileId,
      });

      return {
        success: true,
        message: `File with ID '${fileId}' deleted successfully`,
      };
    } catch (error) {
      if (error.code === 404) {
        throw new Error(`File with ID '${fileId}' not found`);
      }
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  // Create folder in Google Drive
  async createFolder(folderName, parentId = "root") {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      const fileMetadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: "id, name, webViewLink",
      });

      return {
        success: true,
        folder: {
          id: response.data.id,
          name: response.data.name,
          webViewLink: response.data.webViewLink,
        },
      };
    } catch (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  // Helper method to get export MIME type for Google Workspace files
  getExportMimeType(googleMimeType) {
    const exportMap = {
      "application/vnd.google-apps.document":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.google-apps.spreadsheet":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.google-apps.presentation":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.google-apps.drawing": "image/png",
    };

    return exportMap[googleMimeType] || "application/pdf";
  }

  // Get connection status
  getStatus() {
    return {
      authenticated: this.authenticated,
      provider: "Google Drive",
      lastError: this.lastError,
    };
  }
}

module.exports = GoogleDriveProvider;
