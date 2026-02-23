import Chart from 'chart.js/auto';

// Analytics Module for Smart Task Manager
export class Analytics {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.productivityChart = null;
        this.priorityChart = null;
    }

    // Initialize charts
    initCharts() {
        this.createProductivityChart();
        this.createPriorityChart();
    }

    // Create productivity chart
    createProductivityChart() {
        const canvas = document.getElementById('productivityChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const data = this.dataManager.getProductivityData(7);

        if (this.productivityChart) {
            this.productivityChart.destroy();
        }

        this.productivityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    label: 'مهام منشأة',
                    data: data.map(d => d.created),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'مهام مكتملة',
                    data: data.map(d => d.completed),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff',
                            font: {
                                family: 'Tajawal'
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'الإنتاجية الأسبوعية',
                        color: '#ffffff',
                        font: {
                            family: 'Tajawal',
                            size: 16
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#333'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    },
                    y: {
                        grid: {
                            color: '#333'
                        },
                        ticks: {
                            color: '#9ca3af'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Create priority distribution chart
    createPriorityChart() {
        const canvas = document.getElementById('priorityChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const data = this.dataManager.getPriorityDistribution();

        if (this.priorityChart) {
            this.priorityChart.destroy();
        }

        this.priorityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['عاجل', 'مهم', 'عادي'],
                datasets: [{
                    data: [data.urgent, data.important, data.normal],
                    backgroundColor: [
                        '#ef4444',
                        '#fb923c',
                        '#6b7280'
                    ],
                    borderColor: '#000000',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff',
                            font: {
                                family: 'Tajawal'
                            },
                            padding: 20
                        }
                    },
                    title: {
                        display: true,
                        text: 'توزيع الأولويات',
                        color: '#ffffff',
                        font: {
                            family: 'Tajawal',
                            size: 16
                        }
                    }
                }
            }
        });
    }

    // Update all charts
    updateCharts() {
        this.createProductivityChart();
        this.createPriorityChart();
    }

    // Calculate productivity insights
    getProductivityInsights() {
        const stats = this.dataManager.getTaskStats();
        const weeklyData = this.dataManager.getProductivityData(7);
        
        const totalCreatedThisWeek = weeklyData.reduce((sum, day) => sum + day.created, 0);
        const totalCompletedThisWeek = weeklyData.reduce((sum, day) => sum + day.completed, 0);
        
        const avgTasksPerDay = totalCreatedThisWeek / 7;
        const completionRate = totalCreatedThisWeek > 0 ? 
            Math.round((totalCompletedThisWeek / totalCreatedThisWeek) * 100) : 0;

        return {
            avgTasksPerDay: Math.round(avgTasksPerDay * 10) / 10,
            completionRate,
            totalCreatedThisWeek,
            totalCompletedThisWeek,
            mostProductiveDay: this.getMostProductiveDay(weeklyData),
            productivityTrend: this.getProductivityTrend(weeklyData)
        };
    }

    // Get most productive day
    getMostProductiveDay(weeklyData) {
        let maxCompleted = 0;
        let mostProductiveDay = '';

        weeklyData.forEach(day => {
            if (day.completed > maxCompleted) {
                maxCompleted = day.completed;
                mostProductiveDay = day.date;
            }
        });

        return mostProductiveDay;
    }

    // Get productivity trend
    getProductivityTrend(weeklyData) {
        if (weeklyData.length < 2) return 'stable';

        const recentDays = weeklyData.slice(-3);
        const olderDays = weeklyData.slice(-6, -3);

        const recentAvg = recentDays.reduce((sum, day) => sum + day.completed, 0) / recentDays.length;
        const olderAvg = olderDays.reduce((sum, day) => sum + day.completed, 0) / olderDays.length;

        if (recentAvg > olderAvg * 1.2) return 'increasing';
        if (recentAvg < olderAvg * 0.8) return 'decreasing';
        return 'stable';
    }

    // Generate time-based insights
    getTimeBasedInsights() {
        const tasks = this.dataManager.getAllTasks();
        const completedTasks = tasks.filter(task => task.completed && task.completedAt);

        if (completedTasks.length === 0) {
            return {
                bestCompletionHour: null,
                avgCompletionTime: null,
                fastestCompletion: null
            };
        }

        const completionHours = completedTasks.map(task => {
            const hour = new Date(task.completedAt).getHours();
            return hour;
        });

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
                return (completed - created) / (1000 * 60 * 60); // hours
            }
            return 0;
        }).filter(time => time > 0);

        const avgTime = completionTimes.length > 0 ? 
            completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length : 0;

        return {
            bestCompletionHour: parseInt(bestHour),
            avgCompletionTime: Math.round(avgTime * 10) / 10,
            fastestCompletion: Math.min(...completionTimes)
        };
    }

    // Export analytics data
    exportAnalytics() {
        return {
            insights: this.getProductivityInsights(),
            timeInsights: this.getTimeBasedInsights(),
            productivityData: this.dataManager.getProductivityData(30),
            priorityDistribution: this.dataManager.getPriorityDistribution(),
            exportedAt: new Date().toISOString()
        };
    }
}
