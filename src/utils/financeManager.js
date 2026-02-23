import { api } from '../api/client.js';

const PERSONAL_WID = 'personal';

/**
 * المالية الشخصية عبر مساحة personal في الخادم (بدون Apps Script).
 */
export class FinanceManager {
  constructor() {
    this.transactions = [];
    this.budget = 0;
    this.goals = [];
    this.debts = [];
    this.subscriptions = [];
    this.currentFilter = 'all';
    this.currency = 'د.ع';
  }

  async init() {
    try {
      const data = await api.get(`/workspaces/${PERSONAL_WID}/finance`);
      const raw = data.transactions || [];
      this.transactions = raw.map((t) => {
        const dateVal = t.date || t.transDate || t.trans_date;
        const d = dateVal ? new Date(dateVal) : new Date();
        return {
          ...t,
          id: t.id,
          amount: Number(t.amount) || 0,
          type: t.type || 'expense',
          description: t.description || '',
          category: t.category || 'other',
          date: dateVal || d.toISOString(),
          month: t.month ?? d.getMonth(),
          year: t.year ?? d.getFullYear(),
        };
      });
      this.budget = Number(data.budget) || 0;
      this.goals = data.goals || [];
      this.debts = data.debts || [];
      this.subscriptions = data.subscriptions || [];
      if (data.currency) this.currency = data.currency;
    } catch (e) {
      console.error('FinanceManager init', e);
      this.transactions = [];
      this.goals = [];
      this.debts = [];
      this.subscriptions = [];
    }
  }

  async addTransaction(amount, type, description, category) {
    const now = new Date();
    const transaction = {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      amount: parseFloat(amount),
      type,
      description: description || '',
      category: category || 'other',
      date: now.toISOString(),
      month: now.getMonth(),
      year: now.getFullYear(),
    };
    const created = await api.post(`/workspaces/${PERSONAL_WID}/finance/transactions`, transaction);
    const dateVal = created && (created.transDate || created.date || created.trans_date || transaction.date);
    this.transactions.unshift({
      ...transaction,
      ...created,
      id: created?.id || transaction.id,
      date: dateVal || transaction.date,
      amount: Number(created?.amount ?? transaction.amount) || 0,
    });
    return transaction;
  }

  async deleteTransaction(transactionId) {
    await api.del(`/workspaces/${PERSONAL_WID}/finance/transactions/${transactionId}`);
    this.transactions = this.transactions.filter((t) => t.id !== transactionId);
    return true;
  }

  getAllTransactions() {
    return [...this.transactions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  getFilteredTransactions(filter = 'all') {
    let list = this.transactions;
    if (filter === 'income') list = list.filter((t) => t.type === 'income');
    else if (filter === 'expense') list = list.filter((t) => t.type === 'expense');
    return [...list].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  getCurrentMonthTransactions() {
    const now = new Date();
    return this.transactions.filter((t) => t.month === now.getMonth() && t.year === now.getFullYear());
  }

  getTotalIncome(transactions = null) {
    const trans = transactions || this.transactions;
    return trans.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  }

  getTotalExpenses(transactions = null) {
    const trans = transactions || this.transactions;
    return trans.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  }

  getCurrentBalance() {
    return this.getTotalIncome() - this.getTotalExpenses();
  }

  getSavings() {
    return Math.max(0, this.getTotalIncome() - this.getTotalExpenses());
  }

  async setMonthlyBudget(amount) {
    this.budget = parseFloat(amount);
    await api.put(`/workspaces/${PERSONAL_WID}/finance/budget`, { amount: this.budget });
  }

  getMonthlyBudget() {
    return this.budget;
  }

  getCurrentMonthExpenses() {
    return this.getTotalExpenses(this.getCurrentMonthTransactions());
  }

  getRemainingBudget() {
    return Math.max(0, this.budget - this.getCurrentMonthExpenses());
  }

  getBudgetProgress() {
    if (this.budget === 0) return 0;
    return Math.min(100, (this.getCurrentMonthExpenses() / this.budget) * 100);
  }

  async addGoal(name, targetAmount, targetDate) {
    const goal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      targetDate,
      createdAt: new Date().toISOString(),
      completed: false,
    };
    const created = await api.post(`/workspaces/${PERSONAL_WID}/finance/goals`, goal);
    this.goals.push(created || goal);
    return goal;
  }

  async updateGoalProgress(goalId, amount) {
    const goal = this.goals.find((g) => g.id === goalId);
    if (!goal) return null;
    goal.currentAmount = parseFloat(amount);
    goal.completed = goal.currentAmount >= goal.targetAmount;
    await api.put(`/workspaces/${PERSONAL_WID}/finance/goals/${goalId}`, {
      currentAmount: goal.currentAmount,
      completed: goal.completed,
    });
    return goal;
  }

  async deleteGoal(goalId) {
    await api.del(`/workspaces/${PERSONAL_WID}/finance/goals/${goalId}`);
    this.goals = this.goals.filter((g) => g.id !== goalId);
    return true;
  }

  getAllGoals() {
    return [...this.goals].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
  }

  getGoalProgress(goal) {
    if (!goal || goal.targetAmount === 0) return 0;
    return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  }

  async addDebt(type, name, amount, dueDate) {
    const debt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      personName: name,
      totalAmount: parseFloat(amount),
      paidAmount: 0,
      dueDate,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    const created = await api.post(`/workspaces/${PERSONAL_WID}/finance/debts`, debt);
    this.debts.push(created || debt);
    return debt;
  }

  async updateDebtPayment(debtId, paymentAmount) {
    const debt = this.debts.find((d) => d.id === debtId);
    if (!debt) return null;
    debt.paidAmount = (debt.paidAmount || 0) + parseFloat(paymentAmount);
    debt.status = debt.paidAmount >= debt.totalAmount ? 'completed' : 'active';
    await api.put(`/workspaces/${PERSONAL_WID}/finance/debts/${debtId}`, {
      paidAmount: debt.paidAmount,
      status: debt.status,
    });
    return debt;
  }

  async deleteDebt(debtId) {
    await api.del(`/workspaces/${PERSONAL_WID}/finance/debts/${debtId}`);
    this.debts = this.debts.filter((d) => d.id !== debtId);
    return true;
  }

  getAllDebts() {
    return [...this.debts].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }

  getTotalDebt() {
    return this.debts
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + (d.totalAmount - (d.paidAmount || 0)), 0);
  }

  getDebtProgress(debt) {
    if (!debt || debt.totalAmount === 0) return 0;
    return Math.min(100, ((debt.paidAmount || 0) / debt.totalAmount) * 100);
  }

  async addSubscription(name, amount, frequency, nextPayment) {
    const subscription = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      amount: parseFloat(amount),
      frequency,
      nextPayment,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    const created = await api.post(`/workspaces/${PERSONAL_WID}/finance/subscriptions`, subscription);
    this.subscriptions.push(created || subscription);
    return subscription;
  }

  async updateSubscription(subscriptionId, updates) {
    const sub = this.subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) return null;
    Object.assign(sub, updates);
    await api.put(`/workspaces/${PERSONAL_WID}/finance/subscriptions/${subscriptionId}`, {
      nextPayment: sub.nextPayment,
      status: sub.status,
    });
    return sub;
  }

  async deleteSubscription(subscriptionId) {
    await api.del(`/workspaces/${PERSONAL_WID}/finance/subscriptions/${subscriptionId}`);
    this.subscriptions = this.subscriptions.filter((s) => s.id !== subscriptionId);
    return true;
  }

  getAllSubscriptions() {
    return [...this.subscriptions].sort((a, b) => new Date(a.nextPayment) - new Date(b.nextPayment));
  }

  getMonthlySubscriptionCost() {
    return this.subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        switch (s.frequency) {
          case 'monthly':
            return sum + s.amount;
          case 'yearly':
            return sum + s.amount / 12;
          case 'weekly':
            return sum + s.amount * 4.33;
          default:
            return sum;
        }
      }, 0);
  }

  getSubscriptionStatus(subscription) {
    const next = new Date(subscription.nextPayment);
    const days = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'expired';
    if (days <= 7) return 'due-soon';
    return 'active';
  }

  getCategoryBreakdown(transactions = null) {
    const trans = transactions || this.transactions.filter((t) => t.type === 'expense');
    const categories = {};
    trans.forEach((t) => {
      if (t.type === 'expense') categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
    });
    return categories;
  }

  getMonthlyData(months = 6) {
    const data = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTrans = this.transactions.filter(
        (t) => (t.month === d.getMonth() && t.year === d.getFullYear()) || (t.date && new Date(t.date).getMonth() === d.getMonth() && new Date(t.date).getFullYear() === d.getFullYear())
      );
      data.push({
        month: d.toLocaleDateString('ar-SA', { month: 'short' }),
        income: this.getTotalIncome(monthTrans),
        expenses: this.getTotalExpenses(monthTrans),
        net: this.getTotalIncome(monthTrans) - this.getTotalExpenses(monthTrans),
      });
    }
    return data;
  }

  getFinancialInsights() {
    const currentMonthTrans = this.getCurrentMonthTransactions();
    return {
      currentMonthExpenses: this.getTotalExpenses(currentMonthTrans),
      currentMonthIncome: this.getTotalIncome(currentMonthTrans),
      avgMonthlyExpenses: this.getMonthlyData(12).reduce((s, m) => s + m.expenses, 0) / 12,
      topCategory: Object.entries(this.getCategoryBreakdown()).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      savingsRate: this.getTotalIncome() ? Math.round(((this.getTotalIncome() - this.getTotalExpenses()) / this.getTotalIncome()) * 100) : 0,
      budgetUtilization: this.getBudgetProgress(),
      totalDebt: this.getTotalDebt(),
      monthlySubscriptions: this.getMonthlySubscriptionCost(),
      goalsProgress: this.goals.map((g) => ({ name: g.name, progress: this.getGoalProgress(g), completed: g.completed })),
      activeDebts: this.debts.filter((d) => d.status === 'active').length,
      activeSubscriptions: this.subscriptions.filter((s) => s.status === 'active').length,
    };
  }

  getAverageMonthlyExpenses() {
    const data = this.getMonthlyData(12);
    return data.length ? data.reduce((s, m) => s + m.expenses, 0) / data.length : 0;
  }

  getTopSpendingCategory() {
    const cat = this.getCategoryBreakdown();
    let top = null;
    let max = 0;
    Object.entries(cat).forEach(([k, v]) => {
      if (v > max) {
        max = v;
        top = k;
      }
    });
    return top;
  }

  getSavingsRate() {
    const income = this.getTotalIncome();
    if (income === 0) return 0;
    return Math.round(((income - this.getTotalExpenses()) / income) * 100);
  }

  exportData() {
    return {
      transactions: this.transactions,
      budget: this.budget,
      goals: this.goals,
      debts: this.debts,
      subscriptions: this.subscriptions,
      insights: this.getFinancialInsights(),
      currency: this.currency,
      exportedAt: new Date().toISOString(),
    };
  }

  async importData(data) {
    if (!data || !data.transactions || data.budget === undefined) return false;
    await this.clearAllData();
    for (const t of data.transactions) {
      await this.addTransaction(t.amount, t.type, t.description || '', t.category || 'other');
    }
    await this.setMonthlyBudget(data.budget);
    for (const g of data.goals || []) {
      await this.addGoal(g.name, g.targetAmount, g.targetDate);
    }
    for (const d of data.debts || []) {
      await this.addDebt(d.type, d.personName, d.totalAmount, d.dueDate);
    }
    for (const s of data.subscriptions || []) {
      await this.addSubscription(s.name, s.amount, s.frequency, s.nextPayment);
    }
    return true;
  }

  async clearAllData() {
    const del = (id) => api.del(`/workspaces/${PERSONAL_WID}/finance/transactions/${id}`);
    await Promise.all(this.transactions.map((t) => del(t.id)));
    for (const g of this.goals) await api.del(`/workspaces/${PERSONAL_WID}/finance/goals/${g.id}`);
    for (const d of this.debts) await api.del(`/workspaces/${PERSONAL_WID}/finance/debts/${d.id}`);
    for (const s of this.subscriptions) await api.del(`/workspaces/${PERSONAL_WID}/finance/subscriptions/${s.id}`);
    this.transactions = [];
    this.goals = [];
    this.debts = [];
    this.subscriptions = [];
    this.budget = 0;
    await api.put(`/workspaces/${PERSONAL_WID}/finance/budget`, { amount: 0 });
  }
}
