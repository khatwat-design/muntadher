import { api } from '../api/client.js';

// Finance Manager for Personal Finance Management
export class FinanceManager {
    constructor() {
        this.transactions = [];
        this.budget = 0;
        this.goals = [];
        this.debts = [];
        this.subscriptions = [];
        this.currentFilter = 'all';
        this.currency = 'د.ع'; // Iraqi Dinar
    }

    async init() {
        const data = await api.get('/finance');
        this.transactions = data.transactions || [];
        this.goals = data.goals || [];
        this.debts = data.debts || [];
        this.subscriptions = data.subscriptions || [];
        this.budget = data.budget || 0;
        this.currency = data.currency || this.currency;
    }

    // Add new transaction
    async addTransaction(amount, type, description, category) {
        const now = new Date();
        const transaction = {
            id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
            amount: parseFloat(amount),
            type: type,
            description: description,
            category: category,
            date: now.toISOString(),
            month: now.getMonth(),
            year: now.getFullYear()
        };

        await api.post('/finance/transactions', transaction);
        this.transactions.push(transaction);
        return transaction;
    }

    // Delete transaction
    async deleteTransaction(transactionId) {
        const index = this.transactions.findIndex(t => t.id === transactionId);
        if (index !== -1) {
            await api.del(`/finance/transactions/${transactionId}`);
            this.transactions.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get all transactions
    getAllTransactions() {
        return this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Get filtered transactions
    getFilteredTransactions(filter = 'all') {
        let filtered;
        switch (filter) {
            case 'income':
                filtered = this.transactions.filter(t => t.type === 'income');
                break;
            case 'expense':
                filtered = this.transactions.filter(t => t.type === 'expense');
                break;
            default:
                filtered = this.transactions;
                break;
        }
        return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Get current month transactions
    getCurrentMonthTransactions() {
        const now = new Date();
        return this.transactions.filter(t =>
            t.month === now.getMonth() && t.year === now.getFullYear()
        );
    }

    // Calculate total income
    getTotalIncome(transactions = null) {
        const trans = transactions || this.transactions;
        return trans
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
    }

    // Calculate total expenses
    getTotalExpenses(transactions = null) {
        const trans = transactions || this.transactions;
        return trans
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
    }

    // Calculate current balance
    getCurrentBalance() {
        return this.getTotalIncome() - this.getTotalExpenses();
    }

    // Calculate savings
    getSavings() {
        const income = this.getTotalIncome();
        const expenses = this.getTotalExpenses();
        return Math.max(0, income - expenses);
    }

    // Set monthly budget
    async setMonthlyBudget(amount) {
        this.budget = parseFloat(amount);
        await api.put('/finance/budget', { amount: this.budget });
    }

    // Get monthly budget
    getMonthlyBudget() {
        return this.budget;
    }

    // Get current month expenses
    getCurrentMonthExpenses() {
        const currentMonthTrans = this.getCurrentMonthTransactions();
        return this.getTotalExpenses(currentMonthTrans);
    }

    // Get remaining budget
    getRemainingBudget() {
        const currentExpenses = this.getCurrentMonthExpenses();
        return Math.max(0, this.budget - currentExpenses);
    }

    // Get budget progress percentage
    getBudgetProgress() {
        if (this.budget === 0) return 0;
        const currentExpenses = this.getCurrentMonthExpenses();
        return Math.min(100, (currentExpenses / this.budget) * 100);
    }

    // Add financial goal
    async addGoal(name, targetAmount, targetDate) {
        const goal = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: name,
            targetAmount: parseFloat(targetAmount),
            currentAmount: 0,
            targetDate: targetDate,
            createdAt: new Date().toISOString(),
            completed: false
        };

        await api.post('/finance/goals', goal);
        this.goals.push(goal);
        return goal;
    }

    // Update goal progress
    async updateGoalProgress(goalId, amount) {
        const goal = this.goals.find(g => g.id === goalId);
        if (goal) {
            goal.currentAmount = parseFloat(amount);
            goal.completed = goal.currentAmount >= goal.targetAmount;
            await api.put(`/finance/goals/${goalId}`, {
                currentAmount: goal.currentAmount,
                completed: goal.completed
            });
            return goal;
        }
        return null;
    }

    // Delete goal
    async deleteGoal(goalId) {
        const index = this.goals.findIndex(g => g.id === goalId);
        if (index !== -1) {
            await api.del(`/finance/goals/${goalId}`);
            this.goals.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get all goals
    getAllGoals() {
        return this.goals.sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
    }

    // Get goal progress percentage
    getGoalProgress(goal) {
        if (goal.targetAmount === 0) return 0;
        return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
    }

    // Add debt
    async addDebt(type, name, amount, dueDate) {
        const debt = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: type, // 'creditor' or 'debtor'
            personName: name,
            totalAmount: parseFloat(amount),
            paidAmount: 0,
            dueDate: dueDate,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        await api.post('/finance/debts', debt);
        this.debts.push(debt);
        return debt;
    }

    // Update debt payment
    async updateDebtPayment(debtId, paymentAmount) {
        const debt = this.debts.find(d => d.id === debtId);
        if (debt) {
            debt.paidAmount += parseFloat(paymentAmount);
            debt.status = debt.paidAmount >= debt.totalAmount ? 'completed' : 'active';
            await api.put(`/finance/debts/${debtId}`, {
                paidAmount: debt.paidAmount,
                status: debt.status
            });
            return debt;
        }
        return null;
    }

    // Delete debt
    async deleteDebt(debtId) {
        const index = this.debts.findIndex(d => d.id === debtId);
        if (index !== -1) {
            await api.del(`/finance/debts/${debtId}`);
            this.debts.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get all debts
    getAllDebts() {
        return this.debts.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    // Calculate total debt
    getTotalDebt() {
        return this.debts
            .filter(d => d.status === 'active')
            .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
    }

    // Get debt progress percentage
    getDebtProgress(debt) {
        if (debt.totalAmount === 0) return 0;
        return Math.min(100, (debt.paidAmount / debt.totalAmount) * 100);
    }

    // Add subscription
    async addSubscription(name, amount, frequency, nextPayment) {
        const subscription = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: name,
            amount: parseFloat(amount),
            frequency: frequency,
            nextPayment: nextPayment,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        await api.post('/finance/subscriptions', subscription);
        this.subscriptions.push(subscription);
        return subscription;
    }

    // Update subscription
    async updateSubscription(subscriptionId, updates) {
        const subscription = this.subscriptions.find(s => s.id === subscriptionId);
        if (subscription) {
            Object.assign(subscription, updates);
            await api.put(`/finance/subscriptions/${subscriptionId}`, {
                nextPayment: subscription.nextPayment,
                status: subscription.status
            });
            return subscription;
        }
        return null;
    }

    // Delete subscription
    async deleteSubscription(subscriptionId) {
        const index = this.subscriptions.findIndex(s => s.id === subscriptionId);
        if (index !== -1) {
            await api.del(`/finance/subscriptions/${subscriptionId}`);
            this.subscriptions.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get all subscriptions
    getAllSubscriptions() {
        return this.subscriptions.sort((a, b) => new Date(a.nextPayment) - new Date(b.nextPayment));
    }

    // Calculate monthly subscription cost
    getMonthlySubscriptionCost() {
        return this.subscriptions
            .filter(s => s.status === 'active')
            .reduce((sum, s) => {
                switch (s.frequency) {
                    case 'monthly':
                        return sum + s.amount;
                    case 'yearly':
                        return sum + (s.amount / 12);
                    case 'weekly':
                        return sum + (s.amount * 4.33); // Average weeks per month
                    default:
                        return sum;
                }
            }, 0);
    }

    // Get subscription status
    getSubscriptionStatus(subscription) {
        const now = new Date();
        const nextPayment = new Date(subscription.nextPayment);
        const daysUntilPayment = Math.ceil((nextPayment - now) / (1000 * 60 * 60 * 24));

        if (daysUntilPayment < 0) {
            return 'expired';
        } else if (daysUntilPayment <= 7) {
            return 'due-soon';
        } else {
            return 'active';
        }
    }

    // Get category breakdown
    getCategoryBreakdown(transactions = null) {
        const trans = transactions || this.getFilteredTransactions('expense');
        const categories = {};

        trans.forEach(t => {
            if (t.type === 'expense') {
                categories[t.category] = (categories[t.category] || 0) + t.amount;
            }
        });

        return categories;
    }

    // Get monthly data for charts
    getMonthlyData(months = 6) {
        const data = [];
        const now = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthTransactions = this.transactions.filter(t =>
                t.month === date.getMonth() && t.year === date.getFullYear()
            );

            const income = this.getTotalIncome(monthTransactions);
            const expenses = this.getTotalExpenses(monthTransactions);

            data.push({
                month: date.toLocaleDateString('ar-SA', { month: 'short' }),
                income: income,
                expenses: expenses,
                net: income - expenses
            });
        }

        return data;
    }

    // Get financial insights
    getFinancialInsights() {
        const currentMonthTrans = this.getCurrentMonthTransactions();
        const currentMonthExpenses = this.getTotalExpenses(currentMonthTrans);
        const currentMonthIncome = this.getTotalIncome(currentMonthTrans);

        const avgMonthlyExpenses = this.getAverageMonthlyExpenses();
        const topCategory = this.getTopSpendingCategory();
        const savingsRate = this.getSavingsRate();
        const totalDebt = this.getTotalDebt();
        const monthlySubscriptions = this.getMonthlySubscriptionCost();

        return {
            currentMonthExpenses,
            currentMonthIncome,
            avgMonthlyExpenses,
            topCategory,
            savingsRate,
            budgetUtilization: this.getBudgetProgress(),
            totalDebt,
            monthlySubscriptions,
            goalsProgress: this.goals.map(g => ({
                name: g.name,
                progress: this.getGoalProgress(g),
                completed: g.completed
            })),
            activeDebts: this.debts.filter(d => d.status === 'active').length,
            activeSubscriptions: this.subscriptions.filter(s => s.status === 'active').length
        };
    }

    // Get average monthly expenses
    getAverageMonthlyExpenses() {
        const monthlyData = this.getMonthlyData(12);
        const totalExpenses = monthlyData.reduce((sum, month) => sum + month.expenses, 0);
        return totalExpenses / monthlyData.length;
    }

    // Get top spending category
    getTopSpendingCategory() {
        const categories = this.getCategoryBreakdown();
        let topCategory = null;
        let maxAmount = 0;

        Object.keys(categories).forEach(category => {
            if (categories[category] > maxAmount) {
                maxAmount = categories[category];
                topCategory = category;
            }
        });

        return topCategory;
    }

    // Get savings rate
    getSavingsRate() {
        const totalIncome = this.getTotalIncome();
        const totalExpenses = this.getTotalExpenses();

        if (totalIncome === 0) return 0;
        return Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
    }

    // Export financial data
    exportData() {
        return {
            transactions: this.transactions,
            budget: this.budget,
            goals: this.goals,
            debts: this.debts,
            subscriptions: this.subscriptions,
            insights: this.getFinancialInsights(),
            currency: this.currency,
            exportedAt: new Date().toISOString()
        };
    }

    // Import financial data
    async importData(data) {
        if (data.transactions && data.budget !== undefined && data.goals && data.debts && data.subscriptions) {
            await this.clearAllData();
            for (const t of data.transactions) {
                await this.addTransaction(t.amount, t.type, t.description, t.category);
            }
            await this.setMonthlyBudget(data.budget);
            for (const g of data.goals) {
                await this.addGoal(g.name, g.targetAmount, g.targetDate);
            }
            for (const d of data.debts) {
                await this.addDebt(d.type, d.personName, d.totalAmount, d.dueDate);
            }
            for (const s of data.subscriptions) {
                await this.addSubscription(s.name, s.amount, s.frequency, s.nextPayment);
            }
            return true;
        }
        return false;
    }

    // Clear all financial data
    async clearAllData() {
        const deletions = [
            ...this.transactions.map(t => api.del(`/finance/transactions/${t.id}`)),
            ...this.goals.map(g => api.del(`/finance/goals/${g.id}`)),
            ...this.debts.map(d => api.del(`/finance/debts/${d.id}`)),
            ...this.subscriptions.map(s => api.del(`/finance/subscriptions/${s.id}`))
        ];
        await Promise.all(deletions);
        this.transactions = [];
        this.goals = [];
        this.debts = [];
        this.subscriptions = [];
        this.budget = 0;
        await api.put('/finance/budget', { amount: 0 });
    }
}
