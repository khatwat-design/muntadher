// AI Suggestions Module for Smart Task Manager
export class AISuggestions {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.suggestions = [];
    }

    // Generate AI suggestions based on user data
    generateSuggestions() {
        const stats = this.dataManager.getTaskStats();
        const insights = this.getProductivityInsights();
        const timeInsights = this.getTimeBasedInsights();
        const categoryInsights = this.getCategoryInsights();
        const recurringInsights = this.getRecurringInsights();
        
        this.suggestions = [];

        // Productivity suggestions
        if (stats.productivityRate < 50) {
            this.suggestions.push({
                type: 'productivity',
                text: 'معدل إنجازك أقل من 50%. حاول تقسيم المهام الكبيرة إلى مهام أصغر وأكثر قابلية للإدارة.',
                priority: 'high',
                icon: '📈'
            });
        }

        // Category-based suggestions
        if (categoryInsights.work > 10) {
            this.suggestions.push({
                type: 'balance',
                text: `لديك ${categoryInsights.work} مهام عمل. فكر في الموازنة بين العمل والحياة الشخصية.`,
                priority: 'medium',
                icon: '⚖️'
            });
        }

        if (categoryInsights.study === 0 && stats.total > 5) {
            this.suggestions.push({
                type: 'learning',
                text: 'لا توجد مهام دراسية. خصص وقتاً للتعلم والتطوير المهاري.',
                priority: 'low',
                icon: '📚'
            });
        }

        // Urgent tasks suggestions
        if (stats.urgent > 3) {
            this.suggestions.push({
                type: 'priority',
                text: `لديك ${stats.urgent} مهام عاجلة. ركز على إنجاز المهام الأكثر أهمية أولاً.`,
                priority: 'high',
                icon: '⚡'
            });
        }

        // Recurring tasks suggestions
        if (recurringInsights.daily > 5) {
            this.suggestions.push({
                type: 'routine',
                text: 'لديك العديد من المهام اليومية المتكررة. تأكد من أنها فعالة ومفيدة.',
                priority: 'medium',
                icon: '🔄'
            });
        }

        if (stats.recurring === 0 && stats.total > 10) {
            this.suggestions.push({
                type: 'automation',
                text: 'لا توجد مهام متكررة. فكر في أتمتة المهام اليومية الروتينية.',
                priority: 'low',
                icon: '🤖'
            });
        }

        // Time-based suggestions
        if (timeInsights.bestCompletionHour !== null) {
            const hour = timeInsights.bestCompletionHour;
            const period = hour < 12 ? 'صباحاً' : 'مساءً';
            this.suggestions.push({
                type: 'timing',
                text: `أكثر وقت إنتاجية لك هو الساعة ${hour} ${period}. خطط لأهم مهامك في هذا الوقت.`,
                priority: 'medium',
                icon: '⏰'
            });
        }

        // Task completion time suggestions
        if (timeInsights.avgCompletionTime > 24) {
            this.suggestions.push({
                type: 'efficiency',
                text: 'متوسط وقت إنجاز المهام طويل. حاول وضع مهام ذات مدد زمنية محددة وأهداف واضحة.',
                priority: 'medium',
                icon: '⚡'
            });
        }

        // Category productivity analysis
        if (categoryInsights.mostProductiveCategory) {
            this.suggestions.push({
                type: 'strength',
                text: `أنت أكثر إنتاجية في مهام ${categoryInsights.mostProductiveCategory}. استغل هذه القوة!`,
                priority: 'low',
                icon: '💪'
            });
        }

        // Motivational suggestions
        if (stats.completed > 0) {
            this.suggestions.push({
                type: 'motivation',
                text: `أحسنت! لقد أكملت ${stats.completed} مهام بنجاح. استمر في هذا الأداء الممتاز!`,
                priority: 'low',
                icon: '🎯'
            });
        }

        // Workload suggestions
        if (stats.pending > 10) {
            this.suggestions.push({
                type: 'workload',
                text: `لديك ${stats.pending} مهام قيد التنفيذ. فكر في تفويض بعض المهام أو إعادة جدولة الأولويات.`,
                priority: 'medium',
                icon: '📋'
            });
        }

        // Break suggestions
        const recentTasks = this.getRecentCompletedTasks();
        if (recentTasks.length > 5) {
            this.suggestions.push({
                type: 'wellness',
                text: 'لقد أنجزت الكثير من المهام مؤخراً. خذ استراحة قصيرة لإعادة شحن طاقتك.',
                priority: 'low',
                icon: '☕'
            });
        }

        // Weekly goal suggestions
        const weeklyProgress = this.getWeeklyProgress();
        if (weeklyProgress < 30) {
            this.suggestions.push({
                type: 'goal',
                text: 'أنت متأخر في أهدافك الأسبوعية. حاول زيادة تركيزك في الأيام القادمة.',
                priority: 'medium',
                icon: '🎯'
            });
        }

        return this.suggestions;
    }

    // Get category insights
    getCategoryInsights() {
        const tasks = this.dataManager.getAllTasks();
        const completedTasks = tasks.filter(task => task.completed);
        
        const categoryStats = {
            work: { total: 0, completed: 0 },
            personal: { total: 0, completed: 0 },
            study: { total: 0, completed: 0 }
        };

        tasks.forEach(task => {
            if (categoryStats[task.category]) {
                categoryStats[task.category].total++;
                if (task.completed) {
                    categoryStats[task.category].completed++;
                }
            }
        });

        // Find most productive category
        let mostProductiveCategory = null;
        let highestRate = 0;

        Object.keys(categoryStats).forEach(category => {
            const rate = categoryStats[category].total > 0 ? 
                categoryStats[category].completed / categoryStats[category].total : 0;
            if (rate > highestRate) {
                highestRate = rate;
                mostProductiveCategory = this.getCategoryName(category);
            }
        });

        return {
            work: categoryStats.work.total,
            personal: categoryStats.personal.total,
            study: categoryStats.study.total,
            mostProductiveCategory
        };
    }

    // Get recurring insights
    getRecurringInsights() {
        const tasks = this.dataManager.getAllTasks();
        const recurringTasks = tasks.filter(task => task.repeat !== 'none');
        
        const recurringStats = {
            daily: 0,
            weekly: 0,
            monthly: 0
        };

        recurringTasks.forEach(task => {
            if (recurringStats[task.repeat] !== undefined) {
                recurringStats[task.repeat]++;
            }
        });

        return recurringStats;
    }

    // Get category name in Arabic
    getCategoryName(category) {
        const names = {
            work: 'العمل',
            personal: 'الشخصي',
            study: 'الدراسة'
        };
        return names[category] || category;
    }

    // Get productivity insights
    getProductivityInsights() {
        const weeklyData = this.dataManager.getProductivityData(7);
        const totalCompleted = weeklyData.reduce((sum, day) => sum + day.completed, 0);
        const totalCreated = weeklyData.reduce((sum, day) => sum + day.created, 0);
        
        return {
            weeklyCompleted: totalCompleted,
            weeklyCreated: totalCreated,
            completionRate: totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0
        };
    }

    // Get time-based insights
    getTimeBasedInsights() {
        const tasks = this.dataManager.getAllTasks();
        const completedTasks = tasks.filter(task => task.completed && task.completedAt);

        if (completedTasks.length === 0) {
            return { bestCompletionHour: null, avgCompletionTime: null };
        }

        const completionHours = completedTasks.map(task => 
            new Date(task.completedAt).getHours()
        );

        const hourCounts = {};
        completionHours.forEach(hour => {
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const bestHour = Object.keys(hourCounts).reduce((a, b) => 
            hourCounts[a] > hourCounts[b] ? a : b
        );

        const completionTimes = completedTasks.map(task => {
            if (task.createdAt && task.completedAt) {
                const created = new Date(task.createdAt);
                const completed = new Date(task.completedAt);
                return (completed - created) / (1000 * 60 * 60);
            }
            return 0;
        }).filter(time => time > 0);

        const avgTime = completionTimes.length > 0 ? 
            completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length : 0;

        return {
            bestCompletionHour: parseInt(bestHour),
            avgCompletionTime: Math.round(avgTime * 10) / 10
        };
    }

    // Get recent completed tasks
    getRecentCompletedTasks() {
        const tasks = this.dataManager.getAllTasks();
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        return tasks.filter(task => 
            task.completed && 
            task.completedAt && 
            new Date(task.completedAt) > twoDaysAgo
        );
    }

    // Get weekly progress
    getWeeklyProgress() {
        const weeklyData = this.dataManager.getProductivityData(7);
        const totalCompleted = weeklyData.reduce((sum, day) => sum + day.completed, 0);
        const totalCreated = weeklyData.reduce((sum, day) => sum + day.created, 0);
        
        return totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
    }

    // Get smart task suggestions
    getSmartTaskSuggestions() {
        const stats = this.dataManager.getTaskStats();
        const suggestions = [];

        // Suggest breaking down large tasks
        const pendingTasks = this.dataManager.getFilteredTasks('pending');
        const longTasks = pendingTasks.filter(task => task.text.length > 50);
        
        if (longTasks.length > 0) {
            suggestions.push({
                type: 'task_breakdown',
                text: 'فكر في تقسيم المهام الطويلة إلى مهام أصغر وأكثر قابلية للإدارة.',
                example: 'مثال: "إعداد التقرير الشهري" يمكن تقسيمه إلى "جمع البيانات"، "تحليل النتائج"، "كتابة الملخص"'
            });
        }

        // Suggest prioritization
        if (stats.urgent === 0 && stats.pending > 5) {
            suggestions.push({
                type: 'prioritization',
                text: 'لا توجد مهام عاجلة حالياً. رتب مهامك حسب الأهمية لتحقيق أفضل نتائج.',
                example: 'استخدم مصفوفة Eisenhowr: عاجل/مهم، مهم/غير عاجل، عاجل/غير مهم، غير عاجل/غير مهم'
            });
        }

        return suggestions;
    }

    // Render suggestions in the UI
    renderSuggestions() {
        const suggestions = this.generateSuggestions();
        const container = document.getElementById('aiSuggestions');
        if (!container) return;
        
        if (suggestions.length === 0) {
            container.innerHTML = `
                <div class="suggestion-item">
                    <p class="suggestion-text">استمر في العمل! سيظهر لك اقتراحات ذكية عند توفر بيانات كافية.</p>
                    <p class="suggestion-time">أكمل بعض المهام للحصول على تحليلات أفضل</p>
                </div>
            `;
            return;
        }

        container.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item priority-${suggestion.priority}">
                <p class="suggestion-text">
                    <span style="margin-left: 10px;">${suggestion.icon}</span>
                    ${suggestion.text}
                </p>
                <p class="suggestion-time">اقتراح ذكي • الآن</p>
            </div>
        `).join('');
    }

    // Update suggestions
    updateSuggestions() {
        this.renderSuggestions();
    }

    // Get personalized recommendations
    getPersonalizedRecommendations() {
        const stats = this.dataManager.getTaskStats();
        const timeInsights = this.getTimeBasedInsights();
        
        const recommendations = [];

        // Time-based recommendations
        if (timeInsights.bestCompletionHour !== null) {
            const hour = timeInsights.bestCompletionHour;
            recommendations.push({
                category: 'time_management',
                title: 'إدارة الوقت المثلى',
                description: `اعمل على أهم مهامك في الساعة ${hour} حيث تكون إنتاجيتك في الذروة`,
                action: 'اضبط منبهاً لبدء العمل في هذا الوقت'
            });
        }

        // Productivity recommendations
        if (stats.productivityRate < 70) {
            recommendations.push({
                category: 'productivity',
                title: 'تحسين الإنتاجية',
                description: 'جرب تقنية Pomodoro: 25 دقيقة عمل، 5 دقائق راحة',
                action: 'استخدم مؤقتاً لتطبيق هذه التقنية'
            });
        }

        return recommendations;
    }
}
