# Cloud Transfer Application Code Documentation

## Main Files

### 1. /src/server.js
**Purpose:** Main server file that sets up the Fastify server and registers all routes.

**Key Components:**
- Fastify server configuration
- Database integration
- Authentication middleware
- Route registration
- Graceful shutdown handling

**Main Methods:**

1. **Health Check Endpoint** (`/health`)
   - **Purpose:** Checks server and database health
   - **Output:**
     ```json
     {
       status: "ok",
       database: {
         status: "connected",
         type: "SQLite"
       },
       features: {
         multiAuth: true,
         cloudProviders: ["aws", "google", "azure"]
       }
     }
     ```

2. **Root Endpoint** (`/`)
   - **Purpose:** Provides API documentation and endpoints
   - **Output:** Documentation of all available endpoints and supported providers

3. **Database Test Endpoint** (`/api/db-test`)
   - **Purpose:** Tests database connection (development only)
   - **Output:** Database test results

4. **Server Initialization** (`start()`)
   - **Purpose:** Starts the server and sets up listeners
   - **Parameters:** None
   - **Output:** Server startup information

### 2. /src/routes/

#### auth.js
**Purpose:** Handles user authentication and session management

**Key Methods:**

1. **POST /api/auth/register**
   - **Purpose:** User registration
   - **Input:**
     ```json
     {
       "email": "string",
       "password": "string",
       "firstName": "string",
       "lastName": "string"
     }
     ```
   - **Output:**
     ```json
     {
       "success": true,
       "user": {
         "id": "integer",
         "email": "string",
         "firstName": "string",
         "lastName": "string",
         "subscriptionTier": "string"
       },
       "token": "string"
     }
     ```
   - **Error Codes:** 409 (Email already exists), 500 (Registration failed)

2. **POST /api/auth/login**
   - **Purpose:** User login
   - **Input:**
     ```json
     {
       "email": "string",
       "password": "string"
     }
     ```
   - **Output:**
     ```json
     {
       "success": true,
       "user": {
         "id": "integer",
         "email": "string",
         "firstName": "string",
         "lastName": "string"
       },
       "token": "string"
     }
     ```
   - **Error Codes:** 401 (Invalid credentials), 403 (Account deactivated), 500 (Login failed)

3. **GET /api/auth/profile**
   - **Purpose:** Get user profile
   - **Authentication:** Required
   - **Output:** User profile information

4. **POST /api/auth/logout**
   - **Purpose:** User logout
   - **Authentication:** Required
   - **Output:** Success message

#### accounts.js
**Purpose:** Manages cloud account connections and configurations

**Key Methods:**

1. **GET /api/accounts**
   - **Purpose:** List all cloud accounts
   - **Authentication:** Required
   - **Output:**
     ```json
     {
       "success": true,
       "accounts": [
         {
           "id": "integer",
           "provider": "string",
           "accountName": "string",
           "connectionStatus": "string",
           "lastSync": "datetime"
         }
       ]
     }
     ```

2. **POST /api/accounts**
   - **Purpose:** Create new cloud account
   - **Input:**
     ```json
     {
       "provider": "aws-s3|google-drive|azure-blob|dropbox",
       "accountName": "string",
       "credentials": "object",
       "testConnection": "boolean"
     }
     ```
   - **Output:** New account details
   - **Error Codes:** 409 (Account name exists), 500 (Creation failed)

3. **GET /api/accounts/:id**
   - **Purpose:** Get specific account details
   - **Authentication:** Required
   - **Output:** Account details
   - **Error Codes:** 404 (Account not found)

4. **PUT /api/accounts/:id**
   - **Purpose:** Update account settings
   - **Input:**
     ```json
     {
       "accountName": "string",
       "credentials": "object"
     }
     ```
   - **Output:** Updated account details

#### transfers.js
**Purpose:** Manages file transfer operations between cloud providers

**Key Methods:**

1. **GET /api/transfers**
   - **Purpose:** List all transfers
   - **Authentication:** Required
   - **Output:** Transfer history

2. **POST /api/transfers**
   - **Purpose:** Create new transfer
   - **Input:**
     ```json
     {
       "sourceAccountId": "integer",
       "destinationAccountId": "integer",
       "sourcePath": "string",
       "destinationPath": "string"
     }
     ```
   - **Output:** Transfer status

3. **GET /api/transfers/:id**
   - **Purpose:** Get transfer status
   - **Authentication:** Required
   - **Output:** Transfer progress and status

### 3. /src/services/

#### database.js
**Purpose:** Database operations and schema management

**Key Methods:**

1. **Database Class Methods**
   - `initializeDatabase()`
     - Initialize database connection and create tables
   - `createTables()`
     - Create all necessary database tables
   - `createUser()`
     - Create new user account
   - `createAuthProvider()`
     - Create or update authentication provider
   - `getUserByEmail()`
     - Find user by email
   - `getUserByProvider()`
     - Find user by provider ID
   - `getAuthProvider()`
     - Get authentication provider details
   - `createSession()`
     - Create new user session
   - `validateSession()`
     - Validate session token
   - `getUserById()`
     - Get user details by ID
   - `cleanupExpiredSessions()`
     - Remove expired sessions
   - `createCloudAccount()`
     - Create new cloud account
   - `getCloudAccountById()`
     - Get cloud account details
   - `updateCloudAccount()`
     - Update cloud account settings
   - `createTransfer()`
     - Create new file transfer
   - `updateTransfer()`
     - Update transfer status
   - `getTransfers()`
     - Get transfer history

#### encryption.js
**Purpose:** Handles data encryption and decryption

**Key Methods:**

1. **EncryptionService Class Methods**
   - `encryptCredentials()`
     - Encrypt cloud provider credentials
   - `decryptCredentials()`
     - Decrypt cloud provider credentials
   - `generateSecureKey()`
     - Generate secure encryption keys
   - `validateCredentialStructure()`
     - Validate provider-specific credentials
   - `sanitizeCredentialsForLogging()`
     - Remove sensitive data from credentials

#### cloud-providers/
**Purpose:** Integration with different cloud storage providers

**Supported Providers:**
1. AWS S3
2. Google Drive
3. Azure Blob
4. Dropbox

Each provider implements:
- Connection testing
- File operations
- Error handling
- Rate limiting

#### transfer-engine/
**Purpose:** Core file transfer logic and management

**Key Components:**
1. Transfer Queue Management
2. Progress Tracking
3. Error Recovery
4. Rate Limiting
5. Transfer Prioritization

## Key Features

1. **Authentication System**
   - JWT-based authentication
   - Session management
   - Multiple authentication providers
   - Email verification
   - Password hashing (bcrypt)

2. **Cloud Provider Support**
   - Multi-provider integration
   - Secure credential storage
   - Connection testing
   - Error handling

3. **File Transfer Capabilities**
   - Multi-cloud transfers
   - Progress tracking
   - Error recovery
   - Rate limiting
   - Transfer prioritization
   - Large file support (up to 5GB)

4. **Security Features**
   - JWT token validation
   - Session validation
   - Data encryption
   - Rate limiting
   - Input validation
   - SQL injection prevention
   - XSS protection

## Environment Configuration
- Uses `.env` file for configuration
- Supports different environments (development/production)
- Configurable port and host
- Database connection settings
- Cloud provider credentials
- JWT secret
- File size limits
- Transfer rate limits

## Error Handling
- Comprehensive error handling
- Graceful shutdown
- Session cleanup
- Database connection management
- Retry mechanisms for transfers
- Rate limiting protection
- Input validation errors
- Authentication errors
- Cloud provider errors

## Database Schema
- SQLite-based database
- Proper indexing for performance
- Foreign key constraints
- Timestamp tracking
- Usage tracking
- Transfer progress tracking
- Session management
- Authentication provider management

This documentation provides a comprehensive overview of the codebase. For more detailed information about specific components, please refer to the individual file documentation or source code.

1. **Health Check Endpoint** (`/health`)
   - **Purpose:** Checks server and database health
   - **Output:**
     ```json
     {
       status: "ok",
       database: {
         status: "connected",
         type: "SQLite"
       },
       features: {
         multiAuth: true,
         cloudProviders: ["aws", "google", "azure"]
       }
     }
     ```

2. **Root Endpoint** (`/`)
   - **Purpose:** Provides API documentation and endpoints
   - **Output:** Documentation of all available endpoints and supported providers

3. **Database Test Endpoint** (`/api/db-test`)
   - **Purpose:** Tests database connection (development only)
   - **Output:** Database test results

4. **Server Initialization** (`start()`)
   - **Purpose:** Starts the server and sets up listeners
   - **Parameters:** None
   - **Output:** Server startup information

### 2. /src/routes/

#### auth.js
**Purpose:** Handles user authentication and session management

**Key Methods:**

1. **POST /api/auth/register**
   - **Purpose:** User registration
   - **Input:**
     ```json
     {
       "email": "string",
       "password": "string",
       "firstName": "string",
       "lastName": "string"
     }
     ```
   - **Output:**
     ```json
     {
       "success": true,
       "user": {
         "id": "integer",
         "email": "string",
         "firstName": "string",
         "lastName": "string",
         "subscriptionTier": "string"
       },
       "token": "string"
     }
     ```
   - **Error Codes:** 409 (Email already exists), 500 (Registration failed)

2. **POST /api/auth/login**
   - **Purpose:** User login
   - **Input:**
     ```json
     {
       "email": "string",
       "password": "string"
     }
     ```
   - **Output:**
     ```json
     {
       "success": true,
       "user": {
         "id": "integer",
         "email": "string",
         "firstName": "string",
         "lastName": "string"
       },
       "token": "string"
     }
     ```
   - **Error Codes:** 401 (Invalid credentials), 403 (Account deactivated), 500 (Login failed)

3. **GET /api/auth/profile**
   - **Purpose:** Get user profile
   - **Authentication:** Required
   - **Output:** User profile information

4. **POST /api/auth/logout**
   - **Purpose:** User logout
   - **Authentication:** Required
   - **Output:** Success message

#### accounts.js
**Purpose:** Manages cloud account connections and configurations

**Key Methods:**

1. **GET /api/accounts**
   - **Purpose:** List all cloud accounts
   - **Authentication:** Required
   - **Output:**
     ```json
     {
       "success": true,
       "accounts": [
         {
           "id": "integer",
           "provider": "string",
           "accountName": "string",
           "connectionStatus": "string",
           "lastSync": "datetime"
         }
       ]
     }
     ```

2. **POST /api/accounts**
   - **Purpose:** Create new cloud account
   - **Input:**
     ```json
     {
       "provider": "aws-s3|google-drive|azure-blob|dropbox",
       "accountName": "string",
       "credentials": "object",
       "testConnection": "boolean"
     }
     ```
   - **Output:** New account details
   - **Error Codes:** 409 (Account name exists), 500 (Creation failed)

3. **GET /api/accounts/:id**
   - **Purpose:** Get specific account details
   - **Authentication:** Required
   - **Output:** Account details
   - **Error Codes:** 404 (Account not found)

4. **PUT /api/accounts/:id**
   - **Purpose:** Update account settings
   - **Input:**
     ```json
     {
       "accountName": "string",
       "credentials": "object"
     }
     ```
   - **Output:** Updated account details

#### transfers.js
**Purpose:** Manages file transfer operations between cloud providers

**Key Methods:**

1. **GET /api/transfers**
   - **Purpose:** List all transfers
   - **Authentication:** Required
   - **Output:** Transfer history

2. **POST /api/transfers**
   - **Purpose:** Create new transfer
   - **Input:**
     ```json
     {
       "sourceAccountId": "integer",
       "destinationAccountId": "integer",
       "sourcePath": "string",
       "destinationPath": "string"
     }
     ```
   - **Output:** Transfer status

3. **GET /api/transfers/:id**
   - **Purpose:** Get transfer status
   - **Authentication:** Required
   - **Output:** Transfer progress and status

### 3. /src/services/

#### database.js
**Purpose:** Database operations and schema management

**Key Tables:**

1. **users**
   - **Columns:**
     - id (PK)
     - email (UNIQUE)
     - first_name
     - last_name
     - display_name
     - subscription_tier
     - usage_quota
     - usage_current
     - email_verified
     - is_active
     - last_login
     - created_at
     - updated_at

2. **user_auth_providers**
   - **Columns:**
     - id (PK)
     - user_id (FK)
     - provider_type
     - provider_id
     - provider_email
     - provider_data
     - access_token
     - refresh_token
     - token_expires_at
     - password_hash
     - is_primary
     - is_verified
     - created_at
     - updated_at

3. **user_sessions**
   - **Columns:**
     - id (PK)
     - user_id (FK)
     - session_token
     - provider_type
     - device_info
     - ip_address
     - user_agent
     - expires_at
     - last_activity
     - is_active
     - created_at

4. **cloud_accounts**
   - **Columns:**
     - id (PK)
     - user_id (FK)
     - provider
     - account_name
     - encrypted_credentials
     - connection_status
     - last_sync
     - error_message
     - created_at

5. **transfers**
   - **Columns:**
     - id (PK)
     - user_id (FK)
     - source_account_id (FK)
     - destination_account_id (FK)
     - source_path
     - destination_path
     - file_name
     - file_size
     - status
     - progress
     - transferred_bytes
     - transfer_speed
     - error_message
     - retry_count
     - max_retries
     - priority
     - scheduled_at
     - started_at
     - completed_at
     - created_at

#### encryption.js
**Purpose:** Handles data encryption and decryption

**Key Methods:**
1. **encryptCredentials**
   - **Input:** Credentials object
   - **Output:** Encrypted credentials string

2. **decryptCredentials**
   - **Input:** Encrypted credentials string
   - **Output:** Decrypted credentials object

3. **validateCredentialStructure**
   - **Input:** Provider type, credentials object
   - **Output:** Validation result

#### cloud-providers/
**Purpose:** Integration with different cloud storage providers

**Supported Providers:**
1. AWS S3
2. Google Drive
3. Azure Blob
4. Dropbox

Each provider implements:
- Connection testing
- File operations
- Error handling
- Rate limiting

#### transfer-engine/
**Purpose:** Core file transfer logic and management

**Key Components:**
1. Transfer Queue Management
2. Progress Tracking
3. Error Recovery
4. Rate Limiting
5. Transfer Prioritization

## Key Features

1. **Authentication System**
   - JWT-based authentication
   - Session management
   - Multiple authentication providers
   - Email verification
   - Password hashing (bcrypt)

2. **Cloud Provider Support**
   - Multi-provider integration
   - Secure credential storage
   - Connection testing
   - Error handling

3. **File Transfer Capabilities**
   - Multi-cloud transfers
   - Progress tracking
   - Error recovery
   - Rate limiting
   - Transfer prioritization
   - Large file support (up to 5GB)

4. **Security Features**
   - JWT token validation
   - Session validation
   - Data encryption
   - Rate limiting
   - Input validation
   - SQL injection prevention
   - XSS protection

## Environment Configuration
- Uses `.env` file for configuration
- Supports different environments (development/production)
- Configurable port and host
- Database connection settings
- Cloud provider credentials
- JWT secret
- File size limits
- Transfer rate limits

## Error Handling
- Comprehensive error handling
- Graceful shutdown
- Session cleanup
- Database connection management
- Retry mechanisms for transfers
- Rate limiting protection
- Input validation errors
- Authentication errors
- Cloud provider errors

## Database Schema
- SQLite-based database
- Proper indexing for performance
- Foreign key constraints
- Timestamp tracking
- Usage tracking
- Transfer progress tracking
- Session management
- Authentication provider management

This documentation provides a comprehensive overview of the codebase. For more detailed information about specific components, please refer to the individual file documentation or source code.
