// src/services/cloud-providers/aws-s3-provider.js - AWS S3 Real Integration
const AWS = require("aws-sdk");

class AWSS3Provider {
  constructor(credentials) {
    this.credentials = credentials;
    this.s3 = null;
    this.authenticated = false;
    this.lastError = null;
  }

  // Initialize S3 client with credentials
  initialize() {
    try {
      this.s3 = new AWS.S3({
        accessKeyId: this.credentials.accessKeyId,
        secretAccessKey: this.credentials.secretAccessKey,
        region: this.credentials.region || "us-east-1",
        maxRetries: 3,
        retryDelayOptions: {
          customBackoff: function (retryCount) {
            return Math.pow(2, retryCount) * 100; // Exponential backoff
          },
        },
      });
      return true;
    } catch (error) {
      this.lastError = `Failed to initialize S3 client: ${error.message}`;
      return false;
    }
  }

  // Test authentication and bucket access
  async authenticate() {
    try {
      if (!this.s3) {
        if (!this.initialize()) {
          throw new Error(this.lastError);
        }
      }

      // Test bucket access
      const params = {
        Bucket: this.credentials.bucketName,
        MaxKeys: 1, // Just test access, don't load many objects
      };

      await this.s3.listObjectsV2(params).promise();

      this.authenticated = true;
      this.lastError = null;

      return {
        success: true,
        provider: "AWS S3",
        bucket: this.credentials.bucketName,
        region: this.credentials.region || "us-east-1",
        message: "Authentication successful",
      };
    } catch (error) {
      this.authenticated = false;
      this.lastError = error.message;

      // Handle specific AWS errors
      let friendlyMessage = "Authentication failed";

      if (error.code === "InvalidAccessKeyId") {
        friendlyMessage = "Invalid AWS Access Key ID";
      } else if (error.code === "SignatureDoesNotMatch") {
        friendlyMessage = "Invalid AWS Secret Access Key";
      } else if (error.code === "NoSuchBucket") {
        friendlyMessage = `Bucket '${this.credentials.bucketName}' does not exist`;
      } else if (error.code === "AccessDenied") {
        friendlyMessage = `Access denied to bucket '${this.credentials.bucketName}'`;
      } else if (error.code === "NetworkingError") {
        friendlyMessage =
          "Network connection failed. Please check your internet connection.";
      }

      throw new Error(friendlyMessage);
    }
  }

  // List files in bucket
  async listFiles(prefix = "", options = {}) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      const params = {
        Bucket: this.credentials.bucketName,
        Prefix: prefix,
        MaxKeys: options.limit || 1000,
        ContinuationToken: options.continuationToken,
      };

      const response = await this.s3.listObjectsV2(params).promise();

      const files = response.Contents.map((obj) => ({
        name: obj.Key.split("/").pop() || obj.Key,
        path: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
        storageClass: obj.StorageClass,
        type: obj.Key.endsWith("/") ? "folder" : "file",
      }));

      // Also get "folders" (common prefixes)
      const folders = (response.CommonPrefixes || []).map((prefix) => ({
        name: prefix.Prefix.split("/")
          .filter((p) => p)
          .pop(),
        path: prefix.Prefix,
        type: "folder",
        size: 0,
        lastModified: null,
      }));

      return {
        success: true,
        files: [...folders, ...files],
        hasMore: response.IsTruncated,
        nextContinuationToken: response.NextContinuationToken,
        totalCount: files.length + folders.length,
      };
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Get file information
  async getFileInfo(filePath) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      const params = {
        Bucket: this.credentials.bucketName,
        Key: filePath,
      };

      const response = await this.s3.headObject(params).promise();

      return {
        success: true,
        file: {
          name: filePath.split("/").pop() || filePath,
          path: filePath,
          size: response.ContentLength,
          lastModified: response.LastModified,
          etag: response.ETag,
          contentType: response.ContentType,
          storageClass: response.StorageClass,
          metadata: response.Metadata,
        },
      };
    } catch (error) {
      if (error.code === "NotFound") {
        throw new Error(`File '${filePath}' not found`);
      }
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  // Upload file with progress tracking
  async uploadFile(fileBuffer, destinationPath, options = {}) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      const params = {
        Bucket: this.credentials.bucketName,
        Key: destinationPath,
        Body: fileBuffer,
        ContentType: options.contentType || "application/octet-stream",
      };

      // Add metadata if provided
      if (options.metadata) {
        params.Metadata = options.metadata;
      }

      const upload = this.s3.upload(params);

      // Track progress if callback provided
      if (options.onProgress) {
        upload.on("httpUploadProgress", (progress) => {
          const percentage = Math.round(
            (progress.loaded / progress.total) * 100
          );
          options.onProgress({
            loaded: progress.loaded,
            total: progress.total,
            percentage: percentage,
          });
        });
      }

      const result = await upload.promise();

      return {
        success: true,
        file: {
          path: result.Key,
          etag: result.ETag,
          location: result.Location,
          bucket: result.Bucket,
        },
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  // Download file
  async downloadFile(filePath, options = {}) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      const params = {
        Bucket: this.credentials.bucketName,
        Key: filePath,
      };

      // Get file info first for progress tracking
      const fileInfo = await this.getFileInfo(filePath);

      const request = this.s3.getObject(params);
      const stream = request.createReadStream();

      let downloadedBytes = 0;

      if (options.onProgress) {
        stream.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          const percentage = Math.round(
            (downloadedBytes / fileInfo.file.size) * 100
          );
          options.onProgress({
            loaded: downloadedBytes,
            total: fileInfo.file.size,
            percentage: percentage,
          });
        });
      }

      return {
        success: true,
        stream: stream,
        fileInfo: fileInfo.file,
      };
    } catch (error) {
      if (error.code === "NoSuchKey") {
        throw new Error(`File '${filePath}' not found`);
      }
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      const params = {
        Bucket: this.credentials.bucketName,
        Key: filePath,
      };

      await this.s3.deleteObject(params).promise();

      return {
        success: true,
        message: `File '${filePath}' deleted successfully`,
      };
    } catch (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  // Create folder (S3 doesn't have folders, but we can create an empty object with trailing slash)
  async createFolder(folderPath) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      // Ensure folder path ends with /
      const normalizedPath = folderPath.endsWith("/")
        ? folderPath
        : folderPath + "/";

      const params = {
        Bucket: this.credentials.bucketName,
        Key: normalizedPath,
        Body: "",
        ContentType: "application/x-directory",
      };

      await this.s3.putObject(params).promise();

      return {
        success: true,
        folder: {
          path: normalizedPath,
          name: folderPath
            .split("/")
            .filter((p) => p)
            .pop(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  // Get connection status
  getStatus() {
    return {
      authenticated: this.authenticated,
      provider: "AWS S3",
      bucket: this.credentials.bucketName,
      region: this.credentials.region || "us-east-1",
      lastError: this.lastError,
    };
  }
}

module.exports = AWSS3Provider;
