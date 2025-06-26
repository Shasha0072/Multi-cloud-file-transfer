// src/services/encryption.js - Secure Credential Encryption
const CryptoJS = require("crypto-js");
const crypto = require("crypto");

class EncryptionService {
  constructor() {
    // Use environment variable or generate a secure key
    this.encryptionKey =
      process.env.ENCRYPTION_KEY || "your-32-character-encryption-key-here!";

    if (this.encryptionKey === "your-32-character-encryption-key-here!") {
      console.warn(
        "⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY environment variable for production!"
      );
    }
  }

  // Encrypt cloud provider credentials
  encryptCredentials(credentials) {
    try {
      const credentialsString = JSON.stringify(credentials);
      const encrypted = CryptoJS.AES.encrypt(
        credentialsString,
        this.encryptionKey
      ).toString();
      return encrypted;
    } catch (error) {
      throw new Error("Failed to encrypt credentials: " + error.message);
    }
  }

  // Decrypt cloud provider credentials
  decryptCredentials(encryptedCredentials) {
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(
        encryptedCredentials,
        this.encryptionKey
      );
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        throw new Error("Invalid encrypted data or wrong encryption key");
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error("Failed to decrypt credentials: " + error.message);
    }
  }

  // Generate secure API keys (for development/testing)
  generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  // Validate credential structure for different providers
  validateCredentialStructure(provider, credentials) {
    const requiredFields = {
      "aws-s3": ["accessKeyId", "secretAccessKey", "region", "bucketName"],
      "google-drive": ["clientId", "clientSecret", "refreshToken"],
      "azure-blob": ["connectionString", "containerName"],
      dropbox: ["accessToken"],
    };

    const required = requiredFields[provider];
    if (!required) {
      throw new Error(`Unsupported cloud provider: ${provider}`);
    }

    const missing = required.filter((field) => !credentials[field]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required fields for ${provider}: ${missing.join(", ")}`
      );
    }

    return true;
  }

  // Sanitize credentials for logging (remove sensitive data)
  sanitizeCredentialsForLogging(provider, credentials) {
    const sanitized = { ...credentials };

    // Remove or mask sensitive fields
    const sensitiveFields = [
      "secretAccessKey",
      "accessToken",
      "refreshToken",
      "clientSecret",
      "connectionString",
      "privateKey",
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "***REDACTED***";
      }
    });

    return sanitized;
  }
}

module.exports = new EncryptionService();
