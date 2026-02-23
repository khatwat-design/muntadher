import { api } from '../api/client.js';

// Data Manager for Smart Task Manager
export class DataManager {
    constructor() {
        this.tasks = [];
    }

    normalizeTaskId(taskId) {
        return String(taskId);
    }

    normalizeTask(task) {
        return {
            ...task,
            id: task.id,
            completed: task.completed === true || task.completed === 'true',
            completedAt: task.completedAt || null,
            createdAt: task.createdAt || new Date().toISOString(),
            timeSpent: Number.isFinite(task.timeSpent) ? task.timeSpent : 0,
            repeat: task.repeat || 'none',
            priority: task.priority || 'normal',
            category: task.category || 'personal'
        };
    }

    async init() {
        const data = await api.get('/tasks');
        this.tasks = Array.isArray(data) ? data.map(task => this.normalizeTask(task)) : [];
    }

    // Add new task
    async addTask(taskText, priority = 'normal', category = 'personal', repeat = 'none') {
        const text = String(taskText || '').trim();
        if (!text) return null;

        const now = new Date();
        const task = {
            id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
            text: text,
            priority: priority || 'normal',
            category: category || 'personal',
            repeat: repeat || 'none',
            completed: false,
            createdAt: now.toISOString(),
            completedAt: null,
            timeSpent: 0,
            nextDue: this.calculateNextDue(repeat || 'none')
        };

        await api.post('/tasks', {
            id: task.id,
            text: task.text,
            priority: task.priority,
            category: task.category,
            repeat: task.repeat,
            createdAt: task.createdAt,
            nextDue: task.nextDue
        });
        this.tasks.push(task);
        return task;
    }

    // Calculate next due date for recurring tasks
    calculateNextDue(repeat) {
        if (repeat === 'none') return null;
        
        const now = new Date();
        const next = new Date(now);
        
        switch (repeat) {
            case 'daily':
                next.setDate(next.getDate() + 1);
                break;
            case 'weekly':
                next.setDate(next.getDate() + 7);
                break;
            case 'monthly':
                next.setMonth(next.getMonth() + 1);
                break;
        }
        
        return next.toISOString();
    }

    // Complete recurring task
    async completeRecurringTask(taskId) {
        const normalizedId = this.normalizeTaskId(taskId);
        const task = this.tasks.find(t => this.normalizeTaskId(t.id) === normalizedId);
        if (task && task.repeat !== 'none') {
            await this.setTaskCompleted(taskId, true);

            // Create new instance of the task
            const newTask = {
                ...task,
                id: Date.now(),
                completed: false,
                completedAt: null,
                createdAt: new Date().toISOString(),
                nextDue: this.calculateNextDue(task.repeat)
            };

            return await this.addTask(newTask.text, newTask.priority, newTask.category, newTask.repeat);
        }
        return this.toggleTask(taskId);
    }

    // Toggle task completion
    async toggleTask(taskId) {
        const normalizedId = this.normalizeTaskId(taskId);
        const task = this.tasks.find(t => this.normalizeTaskId(t.id) === normalizedId);
        if (task) {
            await this.setTaskCompleted(taskId, !Boolean(task.completed));
        }
        return task;
    }

    // Set task completion state explicitly
    async setTaskCompleted(taskId, completed) {
        const normalizedId = this.normalizeTaskId(taskId);
        const task = this.tasks.find(t => this.normalizeTaskId(t.id) === normalizedId);
        if (!task) return null;

        const wasCompleted = Boolean(task.completed);
        const nextCompleted = Boolean(completed);
        if (wasCompleted === nextCompleted) return task;

        task.completed = nextCompleted;
        task.completedAt = nextCompleted ? new Date().toISOString() : null;
            await api.put(`/tasks/${task.id}`, {
            completed: task.completed,
            completedAt: task.completedAt
        });
        return task;
    }

    async updateTaskText(taskId, text) {
        const normalizedId = this.normalizeTaskId(taskId);
        const task = this.tasks.find(t => this.normalizeTaskId(t.id) === normalizedId);
        if (!task) return null;
        task.text = String(text || '').trim();
        await api.put(`/tasks/${task.id}`, { text: task.text });
        return task;
    }

    // Delete task
    async deleteTask(taskId) {
        const normalizedId = this.normalizeTaskId(taskId);
        const taskIndex = this.tasks.findIndex(t => this.normalizeTaskId(t.id) === normalizedId);
        if (taskIndex !== -1) {
            const task = this.tasks[taskIndex];
            await api.del(`/tasks/${task.id}`);
            this.tasks.splice(taskIndex, 1);
        }
    }

    // Update task time spent
    async updateTaskTime(taskId, timeSpent) {
        const normalizedId = this.normalizeTaskId(taskId);
        const task = this.tasks.find(t => this.normalizeTaskId(t.id) === normalizedId);
        if (task) {
            task.timeSpent = timeSpent;
            await api.put(`/tasks/${task.id}`, { timeSpent });
        }
    }

    // Get all tasks
    getAllTasks() {
        return this.tasks;
    }

    // Get tasks by category
    getTasksByCategory(category) {
        return this.tasks.filter(task => task.category === category && !task.completed);
    }

    // Get filtered tasks with category support
    getFilteredTasks(filter = 'all', category = 'all') {
        let filtered = this.tasks;
        
        // Apply status filter
        switch (filter) {
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
            case 'pending':
                filtered = filtered.filter(task => !task.completed);
                break;
        }
        
        // Apply category filter
        if (category !== 'all') {
            filtered = filtered.filter(task => task.category === category);
        }
        
        return filtered;
    }

    // Search tasks
    searchTasks(query) {
        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) return this.tasks;
        
        return this.tasks.filter(task => 
            task.text.toLowerCase().includes(searchTerm) ||
            task.category.toLowerCase().includes(searchTerm) ||
            task.priority.toLowerCase().includes(searchTerm) ||
            task.repeat.toLowerCase().includes(searchTerm)
        );
    }

    // Get recurring tasks
    getRecurringTasks() {
        return this.tasks.filter(task => task.repeat !== 'none' && !task.completed);
    }

    // Check and create due recurring tasks
    async checkDueRecurringTasks() {
        const now = new Date();
        const recurringTasks = this.getRecurringTasks();
        const newTasks = [];

        for (const task of recurringTasks) {
            if (task.nextDue && new Date(task.nextDue) <= now) {
                const created = await this.addTask(task.text, task.priority, task.category, task.repeat);
                if (created) {
                    newTasks.push(created);
                }
            }
        }

        return newTasks;
    }

    // Get task statistics
    getTaskStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;
        const urgent = this.getTasksByPriority('urgent').length;
        const important = this.getTasksByPriority('important').length;
        const normal = this.getTasksByPriority('normal').length;
        
        // Category stats
        const work = this.getTasksByCategory('work').length;
        const personal = this.getTasksByCategory('personal').length;
        const study = this.getTasksByCategory('study').length;
        
        // Recurring tasks
        const recurring = this.getRecurringTasks().length;

        return {
            total,
            completed,
            pending,
            urgent,
            important,
            normal,
            work,
            personal,
            study,
            recurring,
            productivityRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    // Get tasks by priority (fixed to use existing tasks)
    getTasksByPriority(priority) {
        return this.tasks.filter(task => task.priority === priority && !task.completed);
    }

    // Get productivity data for charts
    getProductivityData(days = 7) {
        const data = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const created = this.tasks.filter(t => t.createdAt && t.createdAt.startsWith(dateStr)).length;
            const completed = this.tasks.filter(t => t.completedAt && t.completedAt.startsWith(dateStr)).length;

            data.push({
                date: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
                created,
                completed
            });
        }

        return data;
    }

    // Get priority distribution
    getPriorityDistribution() {
        const stats = this.getTaskStats();
        return {
            urgent: stats.urgent,
            important: stats.important,
            normal: stats.normal
        };
    }

    // Clear all data
    async clearAllData() {
        const deletions = this.tasks.map(t => api.del(`/tasks/${t.id}`));
        await Promise.all(deletions);
        this.tasks = [];
    }

    // Export data
    exportData() {
        return {
            tasks: this.tasks,
            exportedAt: new Date().toISOString()
        };
    }

    // Import data
    async importData(data) {
        if (data.tasks) {
            await this.clearAllData();
            for (const task of data.tasks) {
                await this.addTask(task.text, task.priority, task.category, task.repeat);
            }
            return true;
        }
        return false;
    }
}

