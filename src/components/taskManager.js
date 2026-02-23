// Task Manager Component for Smart Task Manager
export class TaskManager {
    constructor(dataManager, analytics, aiSuggestions) {
        this.dataManager = dataManager;
        this.analytics = analytics;
        this.aiSuggestions = aiSuggestions;
        this.currentFilter = 'all';
        this.currentCategory = 'all';
        this.searchQuery = '';
    }

    // Initialize task manager
    async init() {
        this.bindEvents();
        this.renderTasks();
        this.updateStats();
        this.analytics.initCharts();
        this.aiSuggestions.updateSuggestions();
        await this.checkRecurringTasks();
    }

    // Bind DOM events
    bindEvents() {
        // Add task button
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        
        // Enter key in task input
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderTasks();
        });

        // Clear search
        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            this.searchQuery = '';
            this.renderTasks();
        });

        // Filter buttons (tasks only)
        document.querySelectorAll('#tasksTab [data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Category buttons
        document.querySelectorAll('#tasksTab .category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setCategory(e.target.dataset.category);
            });
        });

        // Data actions
        const exportBtn = document.getElementById('exportTasksBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTasks());
        }

        const clearBtn = document.getElementById('clearTasksBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllTasks());
        }

        const importInput = document.getElementById('importTasksInput');
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    this.importTasks(file);
                }
                e.target.value = '';
            });
        }

        // Task list delegated events
        const tasksList = document.getElementById('tasksList');
        if (tasksList) {
            tasksList.addEventListener('change', (e) => {
                if (!e.target.classList.contains('task-checkbox')) return;
                const item = e.target.closest('.task-item');
                if (item) {
                    this.toggleTask(item.dataset.taskId, e.target.checked);
                }
            });

            tasksList.addEventListener('click', (e) => {
                const button = e.target.closest('.task-btn');
                if (!button) return;
                const item = button.closest('.task-item');
                if (!item) return;

                if (button.dataset.action === 'edit') {
                    this.editTask(item.dataset.taskId);
                } else if (button.dataset.action === 'delete') {
                    this.deleteTask(item.dataset.taskId);
                }
            });
        }
    }

    // Check for due recurring tasks
    async checkRecurringTasks() {
        const newTasks = await this.dataManager.checkDueRecurringTasks();
        if (newTasks.length > 0) {
            this.showNotification(`تم إنشاء ${newTasks.length} مهام متكررة جديدة`, 'info');
            this.renderTasks();
            this.updateStats();
        }
    }

    // Add new task
    async addTask() {
        const input = document.getElementById('taskInput');
        const prioritySelect = document.getElementById('prioritySelect');
        const categorySelect = document.getElementById('categorySelect');
        const repeatSelect = document.getElementById('repeatSelect');

        const taskText = input ? input.value : '';
        const priority = prioritySelect ? prioritySelect.value : 'normal';
        const category = categorySelect ? categorySelect.value : 'personal';
        const repeat = repeatSelect ? repeatSelect.value : 'none';

        const task = await this.dataManager.addTask(taskText, priority, category, repeat);
        if (!task) {
            this.showNotification('الرجاء إدخال نص المهمة', 'error');
            return;
        }

        if (input) input.value = '';
        if (prioritySelect) prioritySelect.value = 'normal';
        if (categorySelect) categorySelect.value = 'personal';
        if (repeatSelect) repeatSelect.value = 'none';

        this.renderTasks();
        this.updateStats();
        this.analytics.updateCharts();
        this.aiSuggestions.updateSuggestions();
        this.showNotification('تمت إضافة المهمة بنجاح', 'success');
    }

    // Toggle task completion
    async toggleTask(taskId, completed = null) {
        const normalizedId = String(taskId);
        const task = this.dataManager.getAllTasks().find(t => String(t.id) === normalizedId);
        if (!task) return;

        const nextCompleted = completed === null ? !Boolean(task.completed) : Boolean(completed);
        if (task.repeat !== 'none' && nextCompleted) {
            await this.dataManager.completeRecurringTask(normalizedId);
        } else {
            await this.dataManager.setTaskCompleted(normalizedId, nextCompleted);
        }
        this.renderTasks();
        this.updateStats();
        this.analytics.updateCharts();
        this.aiSuggestions.updateSuggestions();
    }

    // Delete task
    async deleteTask(taskId) {
        const normalizedId = String(taskId);
        if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
            await this.dataManager.deleteTask(normalizedId);
            this.renderTasks();
            this.updateStats();
            this.analytics.updateCharts();
            this.aiSuggestions.updateSuggestions();
            this.showNotification('تم حذف المهمة', 'info');
        }
    }

    // Edit task
    async editTask(taskId) {
        const normalizedId = String(taskId);
        const task = this.dataManager.getAllTasks().find(t => String(t.id) === normalizedId);
        if (!task) return;

        const newText = prompt('عدل نص المهمة:', task.text);
        if (newText === null) return;
        const trimmed = newText.trim();
        if (trimmed && trimmed !== task.text) {
            await this.dataManager.updateTaskText(task.id, trimmed);
            this.renderTasks();
            this.showNotification('تم تعديل المهمة', 'success');
            return;
        }
    }

    // Set filter
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.renderTasks();
    }

    // Set category
    setCategory(category) {
        this.currentCategory = category;
        
        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        this.renderTasks();
    }

    // Render tasks list
    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        let tasks = this.dataManager.getFilteredTasks(this.currentFilter, this.currentCategory);
        
        // Apply search filter
        if (this.searchQuery) {
            tasks = this.dataManager.searchTasks(this.searchQuery);
            // Apply category filter to search results
            if (this.currentCategory !== 'all') {
                tasks = tasks.filter(task => task.category === this.currentCategory);
            }
            // Apply status filter to search results
            if (this.currentFilter === 'completed') {
                tasks = tasks.filter(task => task.completed);
            } else if (this.currentFilter === 'pending') {
                tasks = tasks.filter(task => !task.completed);
            }
        }

        if (tasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-state">
                    <p style="text-align: center; color: #6b7280; padding: 40px;">
                        ${this.getEmptyMessage()}
                    </p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = tasks.map(task => this.createTaskHTML(task)).join('');
    }

    // Create task HTML
    createTaskHTML(task) {
        const priorityClass = `priority-${task.priority}`;
        const categoryClass = `category-${task.category}`;
        const completedClass = task.completed ? 'completed' : '';
        const priorityText = this.getPriorityText(task.priority);
        const categoryText = this.getCategoryText(task.category);
        const repeatText = this.getRepeatText(task.repeat);

        return `
            <div class="task-item ${completedClass}" data-task-id="${task.id}">
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    ${task.completed ? 'checked' : ''}
                    onchange="window.toggleTask && window.toggleTask('${task.id}', this.checked)"
                >
                <div class="task-text">${this.escapeHtml(task.text)}</div>
                <div class="task-meta">
                    <span class="task-category ${categoryClass}">${categoryText}</span>
                    <span class="task-priority ${priorityClass}">${priorityText}</span>
                    ${task.repeat !== 'none' ? `<span class="task-repeat">${repeatText}</span>` : ''}
                </div>
                <div class="task-actions">
                    <button class="task-btn edit" data-action="edit" onclick="window.editTask && window.editTask('${task.id}')">تعديل</button>
                    <button class="task-btn delete" data-action="delete" onclick="window.deleteTask && window.deleteTask('${task.id}')">حذف</button>
                </div>
            </div>
        `;
    }

    // Get priority text in Arabic
    getPriorityText(priority) {
        const priorityMap = {
            urgent: 'عاجل',
            important: 'مهم',
            normal: 'عادي'
        };
        return priorityMap[priority] || 'عادي';
    }

    // Get category text in Arabic
    getCategoryText(category) {
        const categoryMap = {
            work: 'العمل',
            personal: 'شخصي',
            study: 'دراسة'
        };
        return categoryMap[category] || 'شخصي';
    }

    // Get repeat text in Arabic
    getRepeatText(repeat) {
        const repeatMap = {
            daily: 'يومي',
            weekly: 'أسبوعي',
            monthly: 'شهري'
        };
        return repeatMap[repeat] || '';
    }

    // Get empty state message
    getEmptyMessage() {
        const messages = {
            all: 'لا توجد مهام حالياً. أضف مهمة جديدة للبدء!',
            pending: 'لا توجد مهام قيد التنفيذ. رائع!',
            completed: 'لا توجد مهام مكتملة. حاول إنجاز بعض المهام!'
        };
        return messages[this.currentFilter] || messages.all;
    }

    // Update statistics
    updateStats() {
        const stats = this.dataManager.getTaskStats();
        
        document.getElementById('totalTasks').textContent = stats.total;
        document.getElementById('completedTasks').textContent = stats.completed;
        document.getElementById('productivityRate').textContent = stats.productivityRate + '%';
        document.getElementById('urgentTasks').textContent = stats.urgent;
        document.getElementById('workTasks').textContent = stats.work;
        document.getElementById('personalTasks').textContent = stats.personal;
        document.getElementById('studyTasks').textContent = stats.study;
        document.getElementById('recurringTasks').textContent = stats.recurring;
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

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);

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

    // Export tasks
    exportTasks() {
        const data = this.dataManager.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('تم تصدير المهام بنجاح', 'success');
    }

    // Import tasks
    async importTasks(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.dataManager.importData(data).then((ok) => {
                    if (ok) {
                        this.renderTasks();
                        this.updateStats();
                        this.analytics.updateCharts();
                        this.aiSuggestions.updateSuggestions();
                        this.showNotification('تم استيراد المهام بنجاح', 'success');
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

    // Clear all tasks
    async clearAllTasks() {
        if (confirm('هل أنت متأكد من حذف جميع المهام؟ لا يمكن التراجع عن هذا الإجراء.')) {
            await this.dataManager.clearAllData();
            this.renderTasks();
            this.updateStats();
            this.analytics.updateCharts();
            this.aiSuggestions.updateSuggestions();
            this.showNotification('تم حذف جميع المهام', 'info');
        }
    }

    // Get task statistics for dashboard
    getDashboardStats() {
        return {
            ...this.dataManager.getTaskStats(),
            insights: this.analytics.getProductivityInsights(),
            suggestions: this.aiSuggestions.generateSuggestions()
        };
    }

    // Search tasks
    searchTasks(query) {
        const allTasks = this.dataManager.getAllTasks();
        const filteredTasks = allTasks.filter(task => 
            task.text.toLowerCase().includes(query.toLowerCase())
        );
        
        const tasksList = document.getElementById('tasksList');
        if (filteredTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-state">
                    <p style="text-align: center; color: #6b7280; padding: 40px;">
                        لا توجد نتائج لبحثك عن "${query}"
                    </p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
        this.bindTaskEvents();
    }

    // Sort tasks
    sortTasks(sortBy) {
        const tasks = this.dataManager.getFilteredTasks(this.currentFilter);
        let sortedTasks = [...tasks];

        switch (sortBy) {
            case 'priority':
                const priorityOrder = { urgent: 0, important: 1, normal: 2 };
                sortedTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
                break;
            case 'date':
                sortedTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'name':
                sortedTasks.sort((a, b) => a.text.localeCompare(b.text));
                break;
        }

        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = sortedTasks.map(task => this.createTaskHTML(task)).join('');
        this.bindTaskEvents();
    }
}
