import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

class GoogleAppsScriptDB {
  constructor() {
    this.scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    console.log('Google Apps Script URL:', this.scriptUrl);
  }

  async request(path, method = 'GET', data = null) {
    try {
      console.log('Requesting:', path, 'Method:', method, 'URL:', this.scriptUrl);
      const url = `${this.scriptUrl}${path}?method=${method}`;
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data && method !== 'GET') {
        options.method = 'POST';
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Apps Script request error:', error);
      throw error;
    }
  }

  // Tasks methods
  async getTasks() {
    return await this.request('tasks');
  }

  async addTask(task) {
    return await this.request('tasks', 'POST', task);
  }

  async updateTask(id, updates) {
    return await this.request(`tasks/${id}`, 'PUT', updates);
  }

  async deleteTask(id) {
    return await this.request(`tasks/${id}`, 'DELETE');
  }

  // Finance methods
  async getFinanceData() {
    return await this.request('finance');
  }

  async addTransaction(transaction) {
    return await this.request('finance/transactions', 'POST', transaction);
  }

  async deleteTransaction(id) {
    return await this.request(`finance/transactions/${id}`, 'DELETE');
  }

  async updateBudget(amount) {
    return await this.request('finance/budget', 'PUT', { amount });
  }

  async getBudget() {
    const finance = await this.getFinanceData();
    return finance.budget;
  }

  async getTransactions() {
    const finance = await this.getFinanceData();
    return finance.transactions;
  }

  async getGoals() {
    const finance = await this.getFinanceData();
    return finance.goals;
  }

  async addGoal(goal) {
    return await this.request('finance/goals', 'POST', goal);
  }

  async updateGoal(id, updates) {
    return await this.request(`finance/goals/${id}`, 'PUT', updates);
  }

  async deleteGoal(id) {
    return await this.request(`finance/goals/${id}`, 'DELETE');
  }

  async getDebts() {
    const finance = await this.getFinanceData();
    return finance.debts;
  }

  async addDebt(debt) {
    return await this.request('finance/debts', 'POST', debt);
  }

  async updateDebt(id, updates) {
    return await this.request(`finance/debts/${id}`, 'PUT', updates);
  }

  async deleteDebt(id) {
    return await this.request(`finance/debts/${id}`, 'DELETE');
  }

  async getSubscriptions() {
    const finance = await this.getFinanceData();
    return finance.subscriptions;
  }

  async addSubscription(subscription) {
    return await this.request('finance/subscriptions', 'POST', subscription);
  }

  async updateSubscription(id, updates) {
    return await this.request(`finance/subscriptions/${id}`, 'PUT', updates);
  }

  async deleteSubscription(id) {
    return await this.request(`finance/subscriptions/${id}`, 'DELETE');
  }
}

export const appsScriptDB = new GoogleAppsScriptDB();
