// src/services/transfer-engine/transfer-engine.js - Core Transfer Engine
const TransferJob = require("./transfer-job");
const AWSS3Provider = require("../cloud-providers/aws-s3-provider");
const GoogleDriveProvider = require("../cloud-providers/google-drive-provider");
const encryptionService = require("../encryption");

class TransferEngine {
  constructor(database) {
    this.db = database;
    this.activeTransfers = new Map(); // jobId -> TransferJob
    this.maxConcurrentTransfers = 3; // Limit concurrent transfers
    this.transferQueue = [];
    this.isProcessing = false;
  }

  // Create a new transfer
  async createTransfer(options) {
    try {
      const {
        userId,
        sourceAccountId,
        destinationAccountId,
        sourceFilePath,
        destinationFilePath,
        fileName,
      } = options;

      // Validate accounts belong to user
      const sourceAccount = await this.db.getCloudAccountById(
        sourceAccountId,
        userId
      );
      const destAccount = await this.db.getCloudAccountById(
        destinationAccountId,
        userId
      );

      if (!sourceAccount || !destAccount) {
        throw new Error("Source or destination account not found");
      }

      if (sourceAccount.id === destAccount.id) {
        throw new Error("Source and destination accounts cannot be the same");
      }

      // Get file info from source to determine file size
      let fileSize = 0;
      try {
        const sourceCredentials = encryptionService.decryptCredentials(
          sourceAccount.encrypted_credentials
        );
        const sourceProvider = this.createProvider(
          sourceAccount.provider,
          sourceCredentials
        );
        const fileInfo = await sourceProvider.getFileInfo(sourceFilePath);
        fileSize = fileInfo.file.size;
      } catch (error) {
        console.log(
          "Could not get file size, proceeding without it:",
          error.message
        );
      }

      // Create transfer job in database
      const transferId = await this.db.createTransferJob({
        userId,
        sourceAccountId,
        destinationAccountId,
        sourceFilePath,
        destinationFilePath,
        fileName,
        fileSize,
      });

      // Create transfer job object
      const transferJob = new TransferJob({
        id: transferId,
        userId,
        sourceAccountId,
        destinationAccountId,
        sourceFilePath,
        destinationFilePath,
        fileName,
        fileSize,
      });

      console.log(`🚀 Created transfer job ${transferId}: ${fileName}`);
      console.log(
        `📁 Source: ${sourceAccount.provider} (${sourceAccount.account_name})`
      );
      console.log(
        `📁 Destination: ${destAccount.provider} (${destAccount.account_name})`
      );

      // Add to queue
      this.transferQueue.push(transferJob);

      // Start processing if not already running
      this.processQueue();

      return {
        transferId,
        status: "queued",
        message: "Transfer created and queued successfully",
      };
    } catch (error) {
      console.error("Error creating transfer:", error);
      throw error;
    }
  }

  // Process the transfer queue
  async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      while (
        this.transferQueue.length > 0 &&
        this.activeTransfers.size < this.maxConcurrentTransfers
      ) {
        const job = this.transferQueue.shift();
        this.activeTransfers.set(job.id, job);

        // Process transfer in background
        this.processTransfer(job).catch((error) => {
          console.error(`Transfer ${job.id} failed:`, error);
          job.fail(error);
          this.activeTransfers.delete(job.id);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual transfer
  async processTransfer(job) {
    try {
      console.log(`🔄 Starting transfer ${job.id}: ${job.fileName}`);

      // Update job status
      job.start();
      await this.updateJobInDatabase(job);

      // Get account credentials
      const sourceAccount = await this.db.getCloudAccountById(
        job.sourceAccountId,
        job.userId
      );
      const destAccount = await this.db.getCloudAccountById(
        job.destinationAccountId,
        job.userId
      );

      const sourceCredentials = encryptionService.decryptCredentials(
        sourceAccount.encrypted_credentials
      );
      const destCredentials = encryptionService.decryptCredentials(
        destAccount.encrypted_credentials
      );

      // Create providers
      const sourceProvider = this.createProvider(
        sourceAccount.provider,
        sourceCredentials
      );
      const destProvider = this.createProvider(
        destAccount.provider,
        destCredentials
      );

      console.log(
        `📥 Downloading from ${sourceAccount.provider}: ${job.sourceFilePath}`
      );

      // Download from source with progress tracking
      const downloadResult = await sourceProvider.downloadFile(
        job.sourceFilePath,
        {
          onProgress: (progress) => {
            // Update progress (download is 0-50% of total progress)
            const overallProgress = Math.round(progress.percentage * 0.5);
            job.updateProgress(
              (overallProgress * job.fileSize) / 100,
              job.fileSize,
              progress.speed || 0
            );
            this.updateJobInDatabase(job);
          },
        }
      );

      console.log(
        `📤 Uploading to ${destAccount.provider}: ${job.destinationFilePath}`
      );

      // Convert stream to buffer for upload
      const chunks = [];
      downloadResult.stream.on("data", (chunk) => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        downloadResult.stream.on("end", resolve);
        downloadResult.stream.on("error", reject);
      });

      const fileBuffer = Buffer.concat(chunks);

      // Upload to destination with progress tracking
      const uploadResult = await destProvider.uploadFile(
        fileBuffer,
        job.destinationFilePath,
        {
          contentType:
            downloadResult.fileInfo.contentType || "application/octet-stream",
          onProgress: (progress) => {
            // Update progress (upload is 50-100% of total progress)
            const overallProgress = 50 + Math.round(progress.percentage * 0.5);
            job.updateProgress(
              (overallProgress * job.fileSize) / 100,
              job.fileSize,
              progress.speed || 0
            );
            this.updateJobInDatabase(job);
          },
        }
      );

      // Complete transfer
      job.complete();
      await this.updateJobInDatabase(job);

      console.log(`✅ Transfer ${job.id} completed successfully!`);
      console.log(
        `📊 File: ${job.fileName} (${this.formatFileSize(job.fileSize)})`
      );

      // Remove from active transfers
      this.activeTransfers.delete(job.id);

      // Process next item in queue
      this.processQueue();

      return {
        success: true,
        transferId: job.id,
        sourceLocation: job.sourceFilePath,
        destinationLocation: uploadResult.file.id || uploadResult.file.path,
        fileSize: job.fileSize,
      };
    } catch (error) {
      console.error(`❌ Transfer ${job.id} failed:`, error.message);
      job.fail(error);
      await this.updateJobInDatabase(job);
      this.activeTransfers.delete(job.id);

      // Continue processing other transfers
      this.processQueue();

      throw error;
    }
  }

  // Create cloud provider instance
  createProvider(providerType, credentials) {
    switch (providerType) {
      case "aws-s3":
        return new AWSS3Provider(credentials);
      case "google-drive":
        return new GoogleDriveProvider(credentials);
      default:
        throw new Error(`Unsupported provider: ${providerType}`);
    }
  }

  // Update job status in database
  async updateJobInDatabase(job) {
    try {
      const updates = {
        status: job.status,
        progress: job.progress,
        transferred_bytes: job.transferredBytes,
        transfer_speed: job.transferSpeed,
        error_message: job.error,
        started_at: job.startedAt ? job.startedAt.toISOString() : null,
        completed_at: job.completedAt ? job.completedAt.toISOString() : null,
      };

      await this.db.updateTransferJob(job.id, updates);
    } catch (error) {
      console.error("Error updating job in database:", error);
    }
  }

  // Get transfer status
  async getTransferStatus(transferId, userId) {
    try {
      // Check if transfer is active in memory
      if (this.activeTransfers.has(transferId)) {
        const job = this.activeTransfers.get(transferId);
        return job.getStats();
      }

      // Get from database
      const transfer = await this.db.getTransferById(transferId, userId);
      if (!transfer) {
        throw new Error("Transfer not found");
      }

      return {
        id: transfer.id,
        fileName: transfer.file_name,
        status: transfer.status,
        progress: transfer.progress,
        fileSize: transfer.file_size,
        transferredBytes: transfer.transferred_bytes,
        transferSpeed: transfer.transfer_speed,
        error: transfer.error_message,
        createdAt: transfer.created_at,
        startedAt: transfer.started_at,
        completedAt: transfer.completed_at,
      };
    } catch (error) {
      console.error("Error getting transfer status:", error);
      throw error;
    }
  }

  // Cancel transfer
  async cancelTransfer(transferId, userId) {
    try {
      // Check if transfer is active
      if (this.activeTransfers.has(transferId)) {
        const job = this.activeTransfers.get(transferId);
        job.cancel();
        await this.updateJobInDatabase(job);
        this.activeTransfers.delete(transferId);
        console.log(`🛑 Transfer ${transferId} cancelled`);
        return { success: true, message: "Transfer cancelled" };
      }

      // Update in database if not active
      await this.db.updateTransferJob(transferId, {
        status: "cancelled",
        completed_at: new Date().toISOString(),
      });

      return { success: true, message: "Transfer cancelled" };
    } catch (error) {
      console.error("Error cancelling transfer:", error);
      throw error;
    }
  }

  // Get queue status
  getQueueStatus() {
    return {
      activeTransfers: this.activeTransfers.size,
      queuedTransfers: this.transferQueue.length,
      maxConcurrentTransfers: this.maxConcurrentTransfers,
      totalTransfers: this.activeTransfers.size + this.transferQueue.length,
    };
  }

  // Helper method to format file size
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

module.exports = TransferEngine;
