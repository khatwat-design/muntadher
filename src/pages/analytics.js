import '../styles/main.css';
import Chart from 'chart.js/auto';
import { requireAuth, logout } from '../auth/guard.js';
import { DataManager } from '../utils/dataManager.js';
import { FinanceManager } from '../utils/financeManager.js';
import { Analytics } from '../utils/analytics.js';

const getCategoryText = (category) => {
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
};

const createIncomeExpenseChart = (financeManager) => {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return null;

    const monthlyData = financeManager.getMonthlyData(6);
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthlyData.map(d => d.month),
            datasets: [{
                label: 'الدخل',
                data: monthlyData.map(d => d.income),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: '#10b981',
                borderWidth: 2
            }, {
                label: 'المصروفات',
                data: monthlyData.map(d => d.expenses),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderColor: '#ef4444',
                borderWidth: 2
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
                    text: 'الدخل والمصروفات الشهرية',
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
};

const createCategoryChart = (financeManager) => {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return null;

    const categoryBreakdown = financeManager.getCategoryBreakdown();
    const labels = Object.keys(categoryBreakdown).map(cat => getCategoryText(cat));
    const data = Object.values(categoryBreakdown);

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#3b82f6',
                    '#ef4444',
                    '#f59e0b',
                    '#10b981',
                    '#8b5cf6',
                    '#ec4899',
                    '#06b6d4',
                    '#84cc16',
                    '#f97316'
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
                    text: 'توزيع المصروفات حسب الفئة',
                    color: '#ffffff',
                    font: {
                        family: 'Tajawal',
                        size: 16
                    }
                }
            }
        }
    });
};

const createTrendChart = (financeManager) => {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return null;

    const monthlyData = financeManager.getMonthlyData(12);
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.map(d => d.month),
            datasets: [{
                label: 'الدخل',
                data: monthlyData.map(d => d.income),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                tension: 0.4,
                fill: true
            }, {
                label: 'المصروفات',
                data: monthlyData.map(d => d.expenses),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
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
                    text: 'اتجاه الدخل والمصروفات',
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
};

const updateAIInsights = (analytics, financeManager) => {
    const container = document.getElementById('aiInsights');
    if (!container) return;

    const productivity = analytics.getProductivityInsights();
    const finance = financeManager.getFinancialInsights();
    const trendLabel = productivity.productivityTrend === 'increasing'
        ? 'تصاعدي'
        : productivity.productivityTrend === 'decreasing'
            ? 'تنازلي'
            : 'مستقر';

    const topCategory = finance.topCategory ? getCategoryText(finance.topCategory) : 'غير محددة';
    const insights = [
        {
            type: 'productivity',
            title: 'إنتاجيتك الأسبوعية',
            description: `أكملت ${productivity.totalCompletedThisWeek} من أصل ${productivity.totalCreatedThisWeek} مهمة. معدل الإنجاز ${productivity.completionRate}%، والاتجاه ${trendLabel}.`
        },
        {
            type: 'finance',
            title: 'الادخار والميزانية',
            description: `معدل الادخار ${finance.savingsRate}%، ونسبة استخدام الميزانية ${Math.round(finance.budgetUtilization)}%.`
        },
        {
            type: finance.totalDebt > 0 ? 'warning' : 'success',
            title: 'الديون والاشتراكات',
            description: `إجمالي الديون ${finance.totalDebt.toFixed(2)} ${financeManager.currency}، والاشتراكات الشهرية ${finance.monthlySubscriptions.toFixed(2)} ${financeManager.currency}.`
        },
        {
            type: 'finance',
            title: 'أعلى فئة إنفاق',
            description: `أكثر فئة إنفاق هذا الشهر: ${topCategory}.`
        }
    ];

    container.innerHTML = insights.map(insight => `
        <div class="insight-card ${insight.type}">
            <div class="insight-title">${insight.title}</div>
            <div class="insight-description">${insight.description}</div>
        </div>
    `).join('');
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!(await requireAuth())) return;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const dataManager = new DataManager();
    const financeManager = new FinanceManager();
    await dataManager.init();
    await financeManager.init();
    const analytics = new Analytics(dataManager);

    analytics.updateCharts();
    createIncomeExpenseChart(financeManager);
    createCategoryChart(financeManager);
    createTrendChart(financeManager);
    updateAIInsights(analytics, financeManager);
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}
