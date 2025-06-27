// src/services/transfer-engine/transfer-job.js - Transfer Job Management
class TransferJob {
  constructor(options) {
    this.id = options.id;
    this.userId = options.userId;
    this.sourceAccountId = options.sourceAccountId;
    this.destinationAccountId = options.destinationAccountId;
    this.sourceFilePath = options.sourceFilePath;
    this.destinationFilePath = options.destinationFilePath;
    this.fileName = options.fileName;

    // Transfer status
    this.status = "queued"; // queued, running, completed, failed, cancelled
    this.progress = 0; // 0-100
    this.fileSize = options.fileSize || 0;
    this.transferredBytes = 0;
    this.transferSpeed = 0; // bytes per second
    this.error = null;

    // Timestamps
    this.createdAt = new Date();
    this.startedAt = null;
    this.completedAt = null;

    // Progress tracking
    this.progressCallbacks = [];
  }

  // Add progress callback
  onProgress(callback) {
    this.progressCallbacks.push(callback);
  }

  // Update progress
  updateProgress(transferred, total, speed = 0) {
    this.transferredBytes = transferred;
    this.fileSize = total;
    this.progress = total > 0 ? Math.round((transferred / total) * 100) : 0;
    this.transferSpeed = speed;

    // Call all progress callbacks
    this.progressCallbacks.forEach((callback) => {
      try {
        callback({
          jobId: this.id,
          progress: this.progress,
          transferred: this.transferredBytes,
          total: this.fileSize,
          speed: this.transferSpeed,
          status: this.status,
        });
      } catch (error) {
        console.error("Progress callback error:", error);
      }
    });
  }

  // Start transfer
  start() {
    this.status = "running";
    this.startedAt = new Date();
    this.updateProgress(this.transferredBytes, this.fileSize);
  }

  // Complete transfer
  complete() {
    this.status = "completed";
    this.completedAt = new Date();
    this.progress = 100;
    this.updateProgress(this.fileSize, this.fileSize);
  }

  // Fail transfer
  fail(error) {
    this.status = "failed";
    this.completedAt = new Date();
    this.error = error.message || error;
    this.updateProgress(this.transferredBytes, this.fileSize);
  }

  // Cancel transfer
  cancel() {
    this.status = "cancelled";
    this.completedAt = new Date();
    this.updateProgress(this.transferredBytes, this.fileSize);
  }

  // Get transfer statistics
  getStats() {
    const elapsed = this.startedAt
      ? (this.completedAt || new Date()) - this.startedAt
      : 0;

    return {
      id: this.id,
      fileName: this.fileName,
      status: this.status,
      progress: this.progress,
      fileSize: this.fileSize,
      transferredBytes: this.transferredBytes,
      transferSpeed: this.transferSpeed,
      elapsedTime: Math.round(elapsed / 1000), // seconds
      estimatedTimeRemaining:
        this.transferSpeed > 0
          ? Math.round(
              (this.fileSize - this.transferredBytes) / this.transferSpeed
            )
          : null,
      error: this.error,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    };
  }
}

module.exports = TransferJob;
