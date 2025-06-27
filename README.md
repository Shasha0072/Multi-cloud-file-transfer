# Multi-Cloud File Transfer Application

A Node.js-based application that enables seamless file transfer between different cloud storage providers. The application currently supports AWS S3 and Google Cloud Storage, with plans for additional cloud provider integrations.

## Overview

This application provides a secure and efficient way to manage and transfer files across multiple cloud storage platforms. It's designed for users and organizations that need to migrate or synchronize files between different cloud storage services.

## Current Features

### Core Functionality
- Secure file transfer between cloud providers
- Multi-cloud support (AWS S3 and Google Cloud Storage)
- File upload with 100MB size limit
- Single file transfer at a time

### Security
- JWT-based authentication system
- Session validation
- Environment variable configuration
- CORS support for cross-origin requests

### Technical Stack
- Backend Framework: Fastify
- Database: SQLite3
- Cloud Integration: AWS SDK and Google Cloud APIs
- Authentication: JWT
- File Handling: Multipart support

## Project Structure

```
cloud-transfer-app/
├── src/                 # Source code
│   ├── routes/          # API routes
│   ├── services/        # Service implementations
│   └── server.js        # Main application file
├── config/              # Configuration files
├── database/            # Database-related code
├── google-credentials/  # Google Cloud credentials
└── node_modules/        # Dependencies
```

## Current Status

### Implemented Features
- Basic authentication system
- File upload handling
- Cloud provider integration (AWS and Google)
- Session management
- Basic error handling
- Environment-based configuration

### In Progress
- File transfer progress tracking
- Error logging system
- Security enhancements
- Performance optimizations

### Planned Features
- Support for additional cloud providers (Azure, etc.)
- File chunking for large files
- File versioning
- File sharing capabilities
- Web interface
- CI/CD pipeline
- Docker configuration

## Getting Started

### Prerequisites
- Node.js (latest LTS version)
- npm or yarn
- Cloud provider credentials (AWS and Google)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your environment variables
4. Start the server:
   ```bash
   npm run dev
   ```

## Configuration

The application uses environment variables for configuration. See `.env.example` for required variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License
