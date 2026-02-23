// Finance UI Component for Personal Finance Management
export class FinanceUI {
    constructor(financeManager) {
        this.financeManager = financeManager;
        this.currentFilter = 'all';
    }

    // Initialize finance UI
    async init() {
        this.bindEvents();
        this.renderTransactions();
        this.updateFinanceStats();
        this.updateBudgetDisplay();
        this.renderGoals();
        this.renderDebts();
        this.renderSubscriptions();
    }

    // Bind DOM events
    bindEvents() {
        // Add transaction button
        document.getElementById('addTransactionBtn').addEventListener('click', () => this.addTransaction());
        
        // Enter key in amount input
        document.getElementById('amountInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTransaction();
            }
        });

        // Set budget button
        document.getElementById('setBudgetBtn').addEventListener('click', () => this.setBudget());

        // Add goal button
        document.getElementById('addGoalBtn').addEventListener('click', () => this.addGoal());

        // Add debt button
        document.getElementById('addDebtBtn').addEventListener('click', () => this.addDebt());

        // Add subscription button
        document.getElementById('addSubscriptionBtn').addEventListener('click', () => this.addSubscription());

        // Finance filter buttons
        document.querySelectorAll('[data-finance-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.financeFilter);
            });
        });

        // Data actions
        const exportBtn = document.getElementById('exportFinanceBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        const clearBtn = document.getElementById('clearFinanceBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllData());
        }

        const importInput = document.getElementById('importFinanceInput');
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    this.importData(file);
                }
                e.target.value = '';
            });
        }

        document.getElementById('financeTab')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action][data-id]');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            switch (btn.getAttribute('data-action')) {
                case 'delete-transaction':
                    this.deleteTransaction(id);
                    break;
                case 'delete-goal':
                    this.deleteGoal(id);
                    break;
                case 'update-goal':
                    this.updateGoalProgress(id);
                    break;
                case 'delete-debt':
                    this.deleteDebt(id);
                    break;
                case 'partial-payment-debt':
                    this.makePartialPayment(id);
                    break;
                case 'full-payment-debt':
                    this.makeFullPayment(id);
                    break;
                case 'delete-subscription':
                    this.deleteSubscription(id);
                    break;
            }
        });
    }

    // Add new transaction
    async addTransaction() {
        const amountInput = document.getElementById('amountInput');
        const typeSelect = document.getElementById('transactionType');
        const descriptionInput = document.getElementById('descriptionInput');
        const categorySelect = document.getElementById('categoryFinanceSelect');

        const amount = parseFloat(amountInput.value);
        const type = typeSelect.value;
        const description = descriptionInput.value.trim();
        const category = categorySelect.value;

        if (!amount || amount <= 0) {
            this.showNotification('الرجاء إدخال مبلغ صحيح', 'error');
            return;
        }

        if (!description) {
            this.showNotification('الرجاء إدخال وصف للمعاملة', 'error');
            return;
        }

        const transaction = await this.financeManager.addTransaction(amount, type, description, category);
        
        // Clear inputs
        amountInput.value = '';
        descriptionInput.value = '';
        typeSelect.value = 'expense';
        categorySelect.value = 'food';

        // Update UI
        this.renderTransactions();
        this.updateFinanceStats();
        this.updateBudgetDisplay();

        const message = type === 'income' ? 'تمت إضافة الدخل بنجاح' : 'تمت إضافة المصروف بنجاح';
        this.showNotification(message, 'success');
    }

    // Delete transaction
    async deleteTransaction(transactionId) {
        if (confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
            await this.financeManager.deleteTransaction(transactionId);
            this.renderTransactions();
            this.updateFinanceStats();
            this.updateBudgetDisplay();
            this.showNotification('تم حذف المعاملة', 'info');
        }
    }

    // Set monthly budget
    async setBudget() {
        const budgetInput = document.getElementById('monthlyBudget');
        const budget = parseFloat(budgetInput.value);

        if (!budget || budget <= 0) {
            this.showNotification('الرجاء إدخال ميزانية صحيحة', 'error');
            return;
        }

        await this.financeManager.setMonthlyBudget(budget);
        this.updateBudgetDisplay();
        budgetInput.value = '';
        this.showNotification('تم تحديد الميزانية الشهرية', 'success');
    }

    // Add financial goal
    async addGoal() {
        const nameInput = document.getElementById('goalNameInput');
        const amountInput = document.getElementById('goalAmountInput');
        const dateInput = document.getElementById('goalDateInput');

        const name = nameInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const date = dateInput.value;

        if (!name) {
            this.showNotification('الرجاء إدخال اسم الهدف', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            this.showNotification('الرجاء إدخال مبلغ مستهدف صحيح', 'error');
            return;
        }

        if (!date) {
            this.showNotification('الرجاء تحديد تاريخ الهدف', 'error');
            return;
        }

        const goal = await this.financeManager.addGoal(name, amount, date);
        
        // Clear inputs
        nameInput.value = '';
        amountInput.value = '';
        dateInput.value = '';

        // Update UI
        this.renderGoals();
        this.showNotification('تمت إضافة الهدف المالي', 'success');
    }

    // Delete goal
    async deleteGoal(goalId) {
        if (confirm('هل أنت متأكد من حذف هذا الهدف؟')) {
            await this.financeManager.deleteGoal(goalId);
            this.renderGoals();
            this.showNotification('تم حذف الهدف', 'info');
        }
    }

    // Add debt
    async addDebt() {
        const typeSelect = document.getElementById('debtTypeSelect');
        const nameInput = document.getElementById('debtNameInput');
        const amountInput = document.getElementById('debtAmountInput');
        const dateInput = document.getElementById('debtDueDateInput');

        const type = typeSelect.value; // 'creditor' or 'debtor'
        const name = nameInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const date = dateInput.value;

        if (!name) {
            this.showNotification('الرجاء إدخال اسم الشخص/الجهة', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            this.showNotification('الرجاء إدخال مبلغ الدين صحيح', 'error');
            return;
        }

        if (!date) {
            this.showNotification('الرجاء تحديد تاريخ الاستحقاق', 'error');
            return;
        }

        const debt = await this.financeManager.addDebt(type, name, amount, date);
        
        // Clear inputs
        typeSelect.value = 'creditor';
        nameInput.value = '';
        amountInput.value = '';
        dateInput.value = '';

        // Update UI
        this.renderDebts();
        this.updateFinanceStats();
        const typeText = type === 'creditor' ? 'دائن' : 'مدين';
        this.showNotification(`تمت إضافة ${typeText} جديد`, 'success');
    }

    // Delete debt
    async deleteDebt(debtId) {
        if (confirm('هل أنت متأكد من حذف هذا الدين؟')) {
            await this.financeManager.deleteDebt(debtId);
            this.renderDebts();
            this.updateFinanceStats();
            this.showNotification('تم حذف الدين', 'info');
        }
    }

    // Add subscription
    async addSubscription() {
        const nameInput = document.getElementById('subscriptionNameInput');
        const amountInput = document.getElementById('subscriptionAmountInput');
        const frequencySelect = document.getElementById('subscriptionFrequency');
        const dateInput = document.getElementById('subscriptionNextPayment');

        const name = nameInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const frequency = frequencySelect.value;
        const date = dateInput.value;

        if (!name) {
            this.showNotification('الرجاء إدخال اسم الاشتراك', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            this.showNotification('الرجاء إدخال مبلغ الاشتراك صحيح', 'error');
            return;
        }

        if (!date) {
            this.showNotification('الرجاء تحديد تاريخ الدفع التالي', 'error');
            return;
        }

        const subscription = await this.financeManager.addSubscription(name, amount, frequency, date);
        
        // Clear inputs
        nameInput.value = '';
        amountInput.value = '';
        frequencySelect.value = 'monthly';
        dateInput.value = '';

        // Update UI
        this.renderSubscriptions();
        this.updateFinanceStats();
        this.showNotification('تمت إضافة الاشتراك', 'success');
    }

    // Make partial payment
    async makePartialPayment(debtId) {
        const paymentInput = document.getElementById(`payment-${debtId}`);
        const amount = parseFloat(paymentInput.value);

        if (!amount || amount <= 0) {
            this.showNotification('الرجاء إدخال مبلغ صحيح للتسديد', 'error');
            return;
        }

        const debt = this.financeManager.debts.find(d => d.id === debtId);
        if (!debt) {
            this.showNotification('الدين غير موجود', 'error');
            return;
        }

        const remaining = debt.totalAmount - debt.paidAmount;
        if (amount > remaining) {
            this.showNotification('المبلغ يتجاوز المبلغ المتبقي', 'error');
            return;
        }

        await this.financeManager.updateDebtPayment(debtId, amount);
        paymentInput.value = '';
        this.renderDebts();
        this.updateFinanceStats();
        this.showNotification(`تم تسديد ${amount.toFixed(2)} ${this.financeManager.currency} بنجاح`, 'success');
    }

    // Make full payment
    async makeFullPayment(debtId) {
        const debt = this.financeManager.debts.find(d => d.id === debtId);
        if (!debt) {
            this.showNotification('الدين غير موجود', 'error');
            return;
        }

        const remaining = debt.totalAmount - debt.paidAmount;
        if (remaining <= 0) {
            this.showNotification('الدين مسدد بالكامل بالفعل', 'info');
            return;
        }

        if (confirm(`هل أنت متأكد من تسديد المبلغ المتبقي بالكامل: ${remaining.toFixed(2)} ${this.financeManager.currency}؟`)) {
            await this.financeManager.updateDebtPayment(debtId, remaining);
            this.renderDebts();
            this.updateFinanceStats();
            this.showNotification('تم تسديد الدين بالكامل بنجاح', 'success');
        }
    }

    // Delete subscription
    async deleteSubscription(subscriptionId) {
        if (confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) {
            await this.financeManager.deleteSubscription(subscriptionId);
            this.renderSubscriptions();
            this.updateFinanceStats();
            this.showNotification('تم حذف الاشتراك', 'info');
        }
    }

    // Set filter
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('[data-finance-filter]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-finance-filter="${filter}"]`).classList.add('active');
        
        this.renderTransactions();
    }

    // Render transactions list
    renderTransactions() {
        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) return;
        const transactions = this.financeManager.getFilteredTransactions(this.currentFilter);

        if (transactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="empty-state">
                    <p style="text-align: center; color: #6b7280; padding: 40px;">
                        لا توجد معاملات ${this.getFilterText(this.currentFilter)}
                    </p>
                </div>
            `;
            return;
        }

        transactionsList.innerHTML = transactions.map(transaction => this.createTransactionHTML(transaction)).join('');
    }

    // Create transaction HTML
    createTransactionHTML(transaction) {
        const amountClass = transaction.type === 'income' ? 'income' : 'expense';
        const amountSign = transaction.type === 'income' ? '+' : '-';
        const categoryText = this.getCategoryText(transaction.category || 'other');
        const dateVal = transaction.date || transaction.transDate || transaction.trans_date;
        const date = dateVal ? new Date(dateVal).toLocaleDateString('ar-SA', { dateStyle: 'short' }) : '—';
        const amount = Number(transaction.amount);
        const amountStr = isFinite(amount) ? amount.toFixed(2) : '0.00';

        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-description">${this.escapeHtml(transaction.description || '—')}</div>
                    <div class="transaction-meta">
                        <span class="transaction-category">${categoryText}</span>
                        <span class="transaction-date">${date}</span>
                    </div>
                </div>
                <div class="transaction-right">
                    <span class="transaction-amount ${amountClass}">${amountSign}${amountStr} ${this.financeManager.currency}</span>
                    <button type="button" class="task-btn delete" data-action="delete-transaction" data-id="${this.escapeHtml(String(transaction.id))}">حذف</button>
                </div>
            </div>
        `;
    }

    // Render goals list
    renderGoals() {
        const goalsList = document.getElementById('goalsList');
        const goals = this.financeManager.getAllGoals();

        if (goals.length === 0) {
            goalsList.innerHTML = `
                <div class="empty-state">
                    <p style="text-align: center; color: #6b7280; padding: 40px;">
                        لا توجد أهداف مالية حالياً. أضف هدفاً جديداً للبدء!
                    </p>
                </div>
            `;
            return;
        }

        goalsList.innerHTML = goals.map(goal => this.createGoalHTML(goal)).join('');
    }

    // Create goal HTML
    createGoalHTML(goal) {
        const progress = this.financeManager.getGoalProgress(goal);
        const targetDate = new Date(goal.targetDate).toLocaleDateString('ar-SA');
        const daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));

        return `
            <div class="goal-item">
                <div class="goal-header">
                    <div class="goal-name">${this.escapeHtml(goal.name)}</div>
                    <div class="goal-amount">${goal.targetAmount.toFixed(2)} ${this.financeManager.currency}</div>
                </div>
                <div class="goal-progress">
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="goal-info">
                    <span>المحقق: ${goal.currentAmount.toFixed(2)} ${this.financeManager.currency} (${progress.toFixed(1)}%)</span>
                    <span>متبقي ${daysLeft} يوم</span>
                </div>
                <div class="goal-actions">
                    <input type="number" id="goal-amount-${this.escapeHtml(String(goal.id))}" placeholder="تحديث المبلغ المحقق" class="goal-input" step="0.01" min="0" max="${goal.targetAmount}">
                    <button class="task-btn" data-action="update-goal" data-id="${this.escapeHtml(String(goal.id))}">تحديث</button>
                </div>
                <button class="task-btn delete" data-action="delete-goal" data-id="${this.escapeHtml(String(goal.id))}" style="margin-top: 10px;">حذف</button>
            </div>
        `;
    }

    // Update goal progress amount
    async updateGoalProgress(goalId) {
        const input = document.getElementById(`goal-amount-${goalId}`);
        if (!input) return;
        const amount = parseFloat(input.value);

        if (!amount || amount < 0) {
            this.showNotification('الرجاء إدخال مبلغ صحيح', 'error');
            return;
        }

        const goal = await this.financeManager.updateGoalProgress(goalId, amount);
        if (!goal) {
            this.showNotification('الهدف غير موجود', 'error');
            return;
        }

        input.value = '';
        this.renderGoals();
        this.showNotification('تم تحديث تقدم الهدف', 'success');
    }

    // Render debts list
    renderDebts() {
        const debtsList = document.getElementById('debtsList');
        const debts = this.financeManager.getAllDebts();

        if (debts.length === 0) {
            debtsList.innerHTML = `
                <div class="empty-state">
                    <p style="text-align: center; color: #6b7280; padding: 40px;">
                        لا توجد ديون حالياً. الحمد لله!
                    </p>
                </div>
            `;
            return;
        }

        debtsList.innerHTML = debts.map(debt => this.createDebtHTML(debt)).join('');
    }

    // Create debt HTML
    createDebtHTML(debt) {
        const progress = this.financeManager.getDebtProgress(debt);
        const remaining = debt.totalAmount - debt.paidAmount;
        const dueDate = new Date(debt.dueDate).toLocaleDateString('ar-SA');
        const daysLeft = Math.ceil((new Date(debt.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        
        const typeLabel = debt.type === 'creditor' ? 'دائن' : 'مدين';
        const typeColor = debt.type === 'creditor' ? '#ef4444' : '#3b82f6';
        const typeIcon = debt.type === 'creditor' ? '📤' : '📥';

        return `
            <div class="debt-item">
                <div class="debt-header">
                    <div class="debt-name">
                        <span style="color: ${typeColor}; font-weight: bold;">${typeIcon} ${typeLabel}:</span>
                        ${this.escapeHtml(debt.personName)}
                    </div>
                    <div class="debt-amount">${remaining.toFixed(2)} ${this.financeManager.currency}</div>
                </div>
                <div class="debt-info">
                    <span>الإجمالي: ${debt.totalAmount.toFixed(2)} ${this.financeManager.currency}</span>
                    <span>المدفوع: ${debt.paidAmount.toFixed(2)} ${this.financeManager.currency}</span>
                    <span>متبقي ${daysLeft} يوم</span>
                </div>
                <div class="debt-progress">
                    <div class="debt-progress-bar">
                        <div class="debt-progress-fill" style="width: ${progress}%; background: ${typeColor}"></div>
                    </div>
                </div>
                <div class="debt-payment-actions">
                    <input type="number" id="payment-${this.escapeHtml(String(debt.id))}" placeholder="مبلغ التسديد" class="debt-payment-input" step="0.01" min="0" max="${remaining}">
                    <button class="task-btn" data-action="partial-payment-debt" data-id="${this.escapeHtml(String(debt.id))}" style="background: #f59e0b;">تسديد جزئي</button>
                    <button class="task-btn" data-action="full-payment-debt" data-id="${this.escapeHtml(String(debt.id))}" style="background: #10b981;">تسديد كلي</button>
                </div>
                <button class="task-btn delete" data-action="delete-debt" data-id="${this.escapeHtml(String(debt.id))}" style="margin-top: 10px;">حذف</button>
            </div>
        `;
    }

    // Render subscriptions list
    renderSubscriptions() {
        const subscriptionsList = document.getElementById('subscriptionsList');
        const subscriptions = this.financeManager.getAllSubscriptions();

        if (subscriptions.length === 0) {
            subscriptionsList.innerHTML = `
                <div class="empty-state">
                    <p style="text-align: center; color: #6b7280; padding: 40px;">
                        لا توجد اشتراكات حالياً.
                    </p>
                </div>
            `;
            return;
        }

        subscriptionsList.innerHTML = subscriptions.map(subscription => this.createSubscriptionHTML(subscription)).join('');
    }

    // Create subscription HTML
    createSubscriptionHTML(subscription) {
        const status = this.financeManager.getSubscriptionStatus(subscription);
        const statusText = this.getSubscriptionStatusText(status);
        const nextPayment = new Date(subscription.nextPayment).toLocaleDateString('ar-SA');
        const frequencyText = this.getFrequencyText(subscription.frequency);

        return `
            <div class="subscription-item">
                <div class="subscription-header">
                    <div class="subscription-name">${this.escapeHtml(subscription.name)}</div>
                    <div class="subscription-amount">${subscription.amount.toFixed(2)} ${this.financeManager.currency}</div>
                </div>
                <div class="subscription-info">
                    <span>التكرار: ${frequencyText}</span>
                    <span>الدفعة التالية: ${nextPayment}</span>
                </div>
                <span class="subscription-status ${status}">${statusText}</span>
                <button class="task-btn delete" data-action="delete-subscription" data-id="${this.escapeHtml(String(subscription.id))}" style="margin-top: 10px;">حذف</button>
            </div>
        `;
    }

    // Update finance statistics
    updateFinanceStats() {
        const totalIncome = this.financeManager.getTotalIncome();
        const totalExpenses = this.financeManager.getTotalExpenses();
        const currentBalance = this.financeManager.getCurrentBalance();
        const totalSavings = this.financeManager.getSavings();

        document.getElementById('totalIncome').textContent = `${totalIncome.toFixed(2)} ${this.financeManager.currency}`;
        document.getElementById('totalExpenses').textContent = `${totalExpenses.toFixed(2)} ${this.financeManager.currency}`;
        document.getElementById('currentBalance').textContent = `${currentBalance.toFixed(2)} ${this.financeManager.currency}`;
        document.getElementById('totalSavings').textContent = `${totalSavings.toFixed(2)} ${this.financeManager.currency}`;
    }

    // Update budget display
    updateBudgetDisplay() {
        const budget = this.financeManager.getMonthlyBudget();
        const currentExpenses = this.financeManager.getCurrentMonthExpenses();
        const remaining = this.financeManager.getRemainingBudget();
        const progress = this.financeManager.getBudgetProgress();

        document.getElementById('currentExpenses').textContent = currentExpenses.toFixed(2);
        document.getElementById('remainingBudget').textContent = remaining.toFixed(2);
        document.getElementById('budgetProgressBar').style.width = `${progress}%`;

        // Change color based on progress
        const progressBar = document.getElementById('budgetProgressBar');
        if (progress > 90) {
            progressBar.style.background = 'linear-gradient(45deg, #ef4444, #f87171)';
        } else if (progress > 70) {
            progressBar.style.background = 'linear-gradient(45deg, #f59e0b, #fbbf24)';
        } else {
            progressBar.style.background = 'linear-gradient(45deg, #2563eb, #3b82f6)';
        }
    }

    // Get category text in Arabic
    getCategoryText(category) {
        const categoryMap = {
            food: 'طعام',
            transport: 'مواصلات',
            shopping: 'تسوق',
            bills: 'فواتير',
            entertainment: 'ترفيه',
            health: 'صحة',
            education: 'تعليم',
            subscriptions: 'اشتراكات',
            debt: 'ديون',
            rent: 'إيجار',
            utilities: 'خدمات',
            salary: 'راتب',
            investment: 'استثمار',
            other: 'أخرى'
        };
        return categoryMap[category] || category;
    }

    // Get filter text in Arabic
    getFilterText(filter) {
        const filterMap = {
            all: '',
            income: 'دخل',
            expense: 'مصروفات'
        };
        return filterMap[filter] || '';
    }

    // Get subscription status text in Arabic
    getSubscriptionStatusText(status) {
        const statusMap = {
            active: 'نشط',
            expired: 'منتهي',
            'due-soon': 'يستحق قريباً'
        };
        return statusMap[status] || status;
    }

    // Get frequency text in Arabic
    getFrequencyText(frequency) {
        const frequencyMap = {
            monthly: 'شهري',
            yearly: 'سنوي',
            weekly: 'أسبوعي'
        };
        return frequencyMap[frequency] || frequency;
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 25px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            z-index: 1000;
            font-family: 'Tajawal', sans-serif;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            animation: slideDown 0.3s ease;
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideDown 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Export financial data
    exportData() {
        const data = this.financeManager.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('تم تصدير البيانات المالية بنجاح', 'success');
    }

    // Import financial data
    async importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.financeManager.importData(data)
                    .then((ok) => {
                        if (ok) {
                            this.renderTransactions();
                            this.updateFinanceStats();
                            this.updateBudgetDisplay();
                            this.renderGoals();
                            this.renderDebts();
                            this.renderSubscriptions();
                            this.showNotification('تم استيراد البيانات المالية بنجاح', 'success');
                        } else {
                            this.showNotification('ملف غير صالح', 'error');
                        }
                    });
            } catch (error) {
                this.showNotification('خطأ في قراءة الملف', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Clear all financial data
    async clearAllData() {
        if (confirm('هل أنت متأكد من حذف جميع البيانات المالية؟ لا يمكن التراجع عن هذا الإجراء.')) {
            await this.financeManager.clearAllData();
            this.renderTransactions();
            this.updateFinanceStats();
            this.updateBudgetDisplay();
            this.renderGoals();
            this.renderDebts();
            this.renderSubscriptions();
            this.showNotification('تم حذف جميع البيانات المالية', 'info');
        }
    }
}
