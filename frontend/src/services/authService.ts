import api from "./api";
import { AuthResponse, User } from "../types";

class AuthService {
  private currentUser: User | null = null;

  // Register new user
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    try {
      const response = await api.post("/auth/register", userData);
      const { token, user } = response.data;

      this.setAuthToken(token);
      this.currentUser = user;

      return { success: true, token, user };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  }

  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data;

      this.setAuthToken(token);
      this.currentUser = user;

      return { success: true, token, user };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  }

  // Logout user
  logout(): void {
    localStorage.removeItem("authToken");
    this.currentUser = null;
    window.location.href = "/login";
  }

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    try {
      if (this.currentUser) {
        return this.currentUser;
      }

      const response = await api.get("/auth/profile");
      this.currentUser = response.data.user;
      
      if (!this.currentUser) {
        throw new Error('No user data received');
      }
      
      return this.currentUser;
    } catch (error: any) {
      this.logout();
      throw new Error("Failed to get user profile");
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem("authToken");
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem("authToken");
  }

  // Set auth token
  private setAuthToken(token: string): void {
    localStorage.setItem("authToken", token);
  }

  // Initialize auth state (call on app startup)
  async initializeAuth(): Promise<User | null> {
    if (this.isAuthenticated()) {
      try {
        return await this.getCurrentUser();
      } catch (error) {
        this.logout();
        return null;
      }
    }
    return null;
  }
}

export default new AuthService();
