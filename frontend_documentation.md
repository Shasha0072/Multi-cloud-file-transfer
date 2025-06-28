# Frontend Documentation

## Main Files

### 1. /src/App.tsx
**Purpose:** Main application component that handles routing and authentication

**Key Components:**

1. **PrivateRoute**
   - **Purpose:** Protects routes that require authentication
   - **Methods:**
     - `render()`
       - Checks authentication status
       - Redirects to login if not authenticated

2. **PublicRoute**
   - **Purpose:** Protects routes that should only be accessible to unauthenticated users
   - **Methods:**
     - `render()`
       - Checks authentication status
       - Redirects to dashboard if already logged in

**Routes:**
- Public Routes:
  - `/login` - Login page
  - `/register` - Registration page
- Private Routes:
  - `/dashboard` - Dashboard page
  - `/accounts` - Cloud accounts management
  - `/transfers` - File transfers management

### 2. /src/services/

#### authService.ts
**Purpose:** Handles user authentication and session management

**Key Methods:**

1. **register()**
   - **Purpose:** Register new user
   - **Parameters:**
     - email: string
     - password: string
     - firstName: string
     - lastName: string
   - **Returns:** AuthResponse
   - **Throws:** Error on registration failure

2. **login()**
   - **Purpose:** Authenticate user
   - **Parameters:**
     - email: string
     - password: string
   - **Returns:** AuthResponse
   - **Throws:** Error on login failure

3. **logout()**
   - **Purpose:** Clear authentication and redirect to login
   - **Parameters:** None
   - **Returns:** None

4. **getCurrentUser()**
   - **Purpose:** Get current authenticated user
   - **Parameters:** None
   - **Returns:** User
   - **Throws:** Error on profile fetch failure

5. **isAuthenticated()**
   - **Purpose:** Check authentication status
   - **Parameters:** None
   - **Returns:** boolean

6. **initializeAuth()**
   - **Purpose:** Initialize authentication state on app startup
   - **Parameters:** None
   - **Returns:** User | null

#### api.ts
**Purpose:** Provides API client with authentication and error handling

**Key Methods:**

1. **Request Interceptor**
   - **Purpose:** Adds authentication token to requests
   - **Parameters:** config
   - **Returns:** Modified config

2. **Response Interceptor**
   - **Purpose:** Handles API errors and unauthorized access
   - **Parameters:** error
   - **Returns:** Promise.reject(error)
   - **Side Effects:**
     - Clears auth token on 401 response
     - Redirects to login on 401 response

### 3. /src/components/

#### auth/
**Purpose:** Authentication-related UI components

**Components:**
1. **LoginForm**
   - **Purpose:** User login form
   - **Features:**
     - Email and password input
     - Remember me option
     - Error handling
     - Loading state

2. **RegisterForm**
   - **Purpose:** User registration form
   - **Features:**
     - Email, password, and name input
     - Form validation
     - Error handling
     - Loading state

#### accounts/
**Purpose:** Cloud account management UI

**Components:**
1. **AccountList**
   - **Purpose:** Displays list of cloud accounts
   - **Features:**
     - Provider icons
     - Connection status
     - Last sync time
     - Actions menu

2. **AccountForm**
   - **Purpose:** Form for creating/editing accounts
   - **Features:**
     - Provider selection
     - Credential input
     - Validation
     - Connection testing

#### transfers/
**Purpose:** File transfer management UI

**Components:**
1. **TransferList**
   - **Purpose:** Displays transfer history
   - **Features:**
     - Transfer status
     - Progress tracking
     - File details
     - Action buttons

2. **TransferForm**
   - **Purpose:** Form for creating new transfers
   - **Features:**
     - Source/destination account selection
     - File path selection
     - Priority settings
     - Validation

### 4. /src/pages/
**Purpose:** Main application pages

**Pages:**
1. **LoginPage**
   - **Purpose:** User login interface
   - **Components:** LoginForm

2. **RegisterPage**
   - **Purpose:** User registration interface
   - **Components:** RegisterForm

3. **DashboardPage**
   - **Purpose:** Main application dashboard
   - **Features:**
     - User profile
     - Quick actions
     - Statistics

4. **AccountsPage**
   - **Purpose:** Cloud account management
   - **Components:** AccountList, AccountForm

5. **TransfersPage**
   - **Purpose:** File transfer management
   - **Components:** TransferList, TransferForm

### 5. /src/types/
**Purpose:** TypeScript type definitions

**Types:**
1. **AuthResponse**
   - success: boolean
   - token: string
   - user: User

2. **User**
   - id: number
   - email: string
   - firstName: string
   - lastName: string
   - subscriptionTier: string

3. **Account**
   - id: number
   - provider: string
   - accountName: string
   - connectionStatus: string
   - lastSync: Date

4. **Transfer**
   - id: number
   - sourceAccountId: number
   - destinationAccountId: number
   - status: string
   - progress: number
   - transferredBytes: number
   - fileSize: number

### 6. /src/utils/
**Purpose:** Utility functions and helpers

**Features:**
- Date formatting
- Error handling
- Form validation
- File operations
- URL handling

### 7. /src/hooks/
**Purpose:** Custom React hooks

**Hooks:**
1. **useAuth**
   - Manages authentication state
   - Provides auth methods

2. **useApi**
   - Wraps API calls with loading/error states
   - Handles retries

3. **useFilePicker**
   - Handles file selection
   - Validates file types

### 8. Configuration Files

1. **package.json**
   - Project dependencies
   - Build scripts
   - Development tools

2. **tsconfig.json**
   - TypeScript configuration
   - Module resolution
   - Type checking

3. **tailwind.config.js**
   - Tailwind CSS configuration
   - Theme customization

4. **postcss.config.js**
   - PostCSS configuration
   - CSS processing

## Frontend Architecture

1. **State Management**
   - Authentication state
   - User session
   - Transfer queue
   - Account connections

2. **Routing**
   - Protected routes
   - Public routes
   - Navigation guards

3. **Error Handling**
   - API errors
   - Authentication errors
   - Form validation
   - User feedback

4. **Security**
   - Authentication tokens
   - Secure storage
   - Input validation
   - CSRF protection

5. **Performance**
   - Code splitting
   - Lazy loading
   - Caching
   - Optimization

This documentation provides a comprehensive overview of the frontend codebase. For more detailed information about specific components or features, please refer to the individual file documentation or source code.
