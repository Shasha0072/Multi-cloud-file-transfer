import api from "./api";
import { CloudAccount } from "../types";

class AccountService {
  // Get all user's cloud accounts
  async getAccounts(): Promise<CloudAccount[]> {
    try {
      const response = await api.get("/accounts");
      return response.data.accounts;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch accounts"
      );
    }
  }

  // Add new cloud account
  async addAccount(accountData: {
    provider: string;
    accountName: string;
    credentials: any;
  }): Promise<CloudAccount> {
    try {
      const response = await api.post("/accounts", accountData);
      return response.data.account;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to add account");
    }
  }

  // Test cloud account connection
  async testAccount(accountId: string): Promise<any> {
    try {
      const response = await api.post(`/accounts/${accountId}/test`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Connection test failed"
      );
    }
  }

  // Delete cloud account
  async deleteAccount(accountId: string): Promise<void> {
    try {
      await api.delete(`/accounts/${accountId}`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to delete account"
      );
    }
  }

  // Get files from cloud account
  async getAccountFiles(accountId: string, path: string = ""): Promise<any> {
    try {
      const response = await api.get(`/accounts/${accountId}/files`, {
        params: { path },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch files");
    }
  }
}

export default new AccountService();
