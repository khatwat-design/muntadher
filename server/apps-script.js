// Google Apps Script Code - انسخ هذا الكود في Google Apps Script

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const path = e.pathInfo || '';
    const method = e.parameter.method || 'GET';
    
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    if (method === 'OPTIONS') {
      return ContentService.createTextOutput('')
        .setMimeType(ContentService.MimeType.TEXT)
        .setHeaders(headers);
    }
    
    let result;
    
    // Tasks endpoints
    if (path.startsWith('tasks')) {
      if (method === 'GET') {
        result = getTasks(sheet);
      } else if (method === 'POST') {
        result = addTask(sheet, JSON.parse(e.postData.contents));
      } else if (method === 'PUT') {
        const id = path.split('/')[1];
        result = updateTask(sheet, id, JSON.parse(e.postData.contents));
      } else if (method === 'DELETE') {
        const id = path.split('/')[1];
        result = deleteTask(sheet, id);
      }
    }
    
    // Finance endpoints
    else if (path.startsWith('finance')) {
      if (path === 'finance' && method === 'GET') {
        result = getFinanceData(sheet);
      } else if (path === 'finance/transactions' && method === 'POST') {
        result = addTransaction(sheet, JSON.parse(e.postData.contents));
      } else if (path.startsWith('finance/transactions/') && method === 'DELETE') {
        const id = path.split('/')[3];
        result = deleteTransaction(sheet, id);
      } else if (path === 'finance/budget' && method === 'PUT') {
        result = updateBudget(sheet, JSON.parse(e.postData.contents));
      } else if (path === 'finance/goals' && method === 'POST') {
        result = addGoal(sheet, JSON.parse(e.postData.contents));
      } else if (path.startsWith('finance/goals/') && method === 'PUT') {
        const id = path.split('/')[3];
        result = updateGoal(sheet, id, JSON.parse(e.postData.contents));
      } else if (path.startsWith('finance/goals/') && method === 'DELETE') {
        const id = path.split('/')[3];
        result = deleteGoal(sheet, id);
      } else if (path === 'finance/debts' && method === 'POST') {
        result = addDebt(sheet, JSON.parse(e.postData.contents));
      } else if (path.startsWith('finance/debts/') && method === 'PUT') {
        const id = path.split('/')[3];
        result = updateDebt(sheet, id, JSON.parse(e.postData.contents));
      } else if (path.startsWith('finance/debts/') && method === 'DELETE') {
        const id = path.split('/')[3];
        result = deleteDebt(sheet, id);
      } else if (path === 'finance/subscriptions' && method === 'POST') {
        result = addSubscription(sheet, JSON.parse(e.postData.contents));
      } else if (path.startsWith('finance/subscriptions/') && method === 'PUT') {
        const id = path.split('/')[3];
        result = updateSubscription(sheet, id, JSON.parse(e.postData.contents));
      } else if (path.startsWith('finance/subscriptions/') && method === 'DELETE') {
        const id = path.split('/')[3];
        result = deleteSubscription(sheet, id);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Tasks functions
function getTasks(sheet) {
  const tasksSheet = sheet.getSheetByName('Tasks') || createTasksSheet(sheet);
  const data = tasksSheet.getDataRange().getValues();
  const headers = data[0];
  
  return data.slice(1).map((row, index) => {
    const task = {};
    headers.forEach((header, i) => {
      let key = header.toLowerCase().replace(/\s+/g, '');
      if (key === 'createdat') key = 'createdAt';
      if (key === 'completedat') key = 'completedAt';
      if (key === 'timespent') key = 'timeSpent';
      if (key === 'nextdue') key = 'nextDue';
      task[key] = row[i];
    });
    task.completed = row[5] === 'TRUE';
    task.timeSpent = parseInt(row[8]) || 0;
    return task;
  });
}

function addTask(sheet, task) {
  const tasksSheet = sheet.getSheetByName('Tasks') || createTasksSheet(sheet);
  tasksSheet.appendRow([
    task.id,
    task.text,
    task.priority,
    task.category,
    task.repeat,
    task.completed ? 'TRUE' : 'FALSE',
    task.createdAt,
    task.completedAt || '',
    task.timeSpent || 0,
    task.nextDue || ''
  ]);
  return { id: task.id };
}

function updateTask(sheet, id, updates) {
  const tasksSheet = sheet.getSheetByName('Tasks');
  const data = tasksSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      if (updates.text !== undefined) data[i][1] = updates.text;
      if (updates.completed !== undefined) data[i][5] = updates.completed ? 'TRUE' : 'FALSE';
      if (updates.completedAt !== undefined) data[i][7] = updates.completedAt || '';
      if (updates.timeSpent !== undefined) data[i][8] = updates.timeSpent || 0;
      if (updates.nextDue !== undefined) data[i][9] = updates.nextDue || '';
      
      tasksSheet.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
      return { ok: true };
    }
  }
  return { error: 'Task not found' };
}

function deleteTask(sheet, id) {
  const tasksSheet = sheet.getSheetByName('Tasks');
  const data = tasksSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      tasksSheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'Task not found' };
}

// Finance functions
function getFinanceData(sheet) {
  const transactions = getTransactions(sheet);
  const goals = getGoals(sheet);
  const debts = getDebts(sheet);
  const subscriptions = getSubscriptions(sheet);
  const budget = getBudget(sheet);
  
  return { transactions, goals, debts, subscriptions, budget, currency: 'د.ع' };
}

function getTransactions(sheet) {
  const transSheet = sheet.getSheetByName('Transactions') || createTransactionsSheet(sheet);
  const data = transSheet.getDataRange().getValues();
  
  return data.slice(1).map((row, index) => ({
    id: row[0] || `trans_${index}`,
    amount: parseFloat(row[1]) || 0,
    type: row[2] || 'expense',
    description: row[3] || '',
    category: row[4] || 'general',
    date: row[5] || new Date().toISOString(),
    month: parseInt(row[6]) || new Date().getMonth() + 1,
    year: parseInt(row[7]) || new Date().getFullYear()
  }));
}

function addTransaction(sheet, transaction) {
  const transSheet = sheet.getSheetByName('Transactions') || createTransactionsSheet(sheet);
  transSheet.appendRow([
    transaction.id,
    transaction.amount,
    transaction.type,
    transaction.description,
    transaction.category,
    transaction.date,
    transaction.month,
    transaction.year
  ]);
  return { id: transaction.id };
}

function deleteTransaction(sheet, id) {
  const transSheet = sheet.getSheetByName('Transactions');
  const data = transSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      transSheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'Transaction not found' };
}

function getBudget(sheet) {
  const budgetSheet = sheet.getSheetByName('Budget') || createBudgetSheet(sheet);
  const value = budgetSheet.getRange('A2').getValue();
  return parseFloat(value) || 0;
}

function updateBudget(sheet, data) {
  const budgetSheet = sheet.getSheetByName('Budget') || createBudgetSheet(sheet);
  budgetSheet.getRange('A2').setValue(data.amount);
  return { ok: true };
}

function getGoals(sheet) {
  const goalsSheet = sheet.getSheetByName('Goals') || createGoalsSheet(sheet);
  const data = goalsSheet.getDataRange().getValues();
  
  return data.slice(1).map((row, index) => ({
    id: row[0] || `goal_${index}`,
    name: row[1] || '',
    targetAmount: parseFloat(row[2]) || 0,
    currentAmount: parseFloat(row[3]) || 0,
    targetDate: row[4] || new Date().toISOString().split('T')[0],
    createdAt: row[5] || new Date().toISOString(),
    completed: row[6] === 'TRUE'
  }));
}

function addGoal(sheet, goal) {
  const goalsSheet = sheet.getSheetByName('Goals') || createGoalsSheet(sheet);
  goalsSheet.appendRow([
    goal.id,
    goal.name,
    goal.targetAmount,
    goal.currentAmount || 0,
    goal.targetDate,
    goal.createdAt,
    goal.completed ? 'TRUE' : 'FALSE'
  ]);
  return { id: goal.id };
}

function updateGoal(sheet, id, updates) {
  const goalsSheet = sheet.getSheetByName('Goals');
  const data = goalsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      if (updates.currentAmount !== undefined) data[i][3] = updates.currentAmount;
      if (updates.completed !== undefined) data[i][6] = updates.completed ? 'TRUE' : 'FALSE';
      
      goalsSheet.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
      return { ok: true };
    }
  }
  return { error: 'Goal not found' };
}

function deleteGoal(sheet, id) {
  const goalsSheet = sheet.getSheetByName('Goals');
  const data = goalsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      goalsSheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'Goal not found' };
}

function getDebts(sheet) {
  const debtsSheet = sheet.getSheetByName('Debts') || createDebtsSheet(sheet);
  const data = debtsSheet.getDataRange().getValues();
  
  return data.slice(1).map((row, index) => ({
    id: row[0] || `debt_${index}`,
    type: row[1] || 'owed',
    personName: row[2] || '',
    totalAmount: parseFloat(row[3]) || 0,
    paidAmount: parseFloat(row[4]) || 0,
    dueDate: row[5] || new Date().toISOString().split('T')[0],
    createdAt: row[6] || new Date().toISOString(),
    status: row[7] || 'active'
  }));
}

function addDebt(sheet, debt) {
  const debtsSheet = sheet.getSheetByName('Debts') || createDebtsSheet(sheet);
  debtsSheet.appendRow([
    debt.id,
    debt.type,
    debt.personName,
    debt.totalAmount,
    debt.paidAmount || 0,
    debt.dueDate,
    debt.createdAt,
    debt.status || 'active'
  ]);
  return { id: debt.id };
}

function updateDebt(sheet, id, updates) {
  const debtsSheet = sheet.getSheetByName('Debts');
  const data = debtsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      if (updates.paidAmount !== undefined) data[i][4] = updates.paidAmount;
      if (updates.status !== undefined) data[i][7] = updates.status;
      
      debtsSheet.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
      return { ok: true };
    }
  }
  return { error: 'Debt not found' };
}

function deleteDebt(sheet, id) {
  const debtsSheet = sheet.getSheetByName('Debts');
  const data = debtsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      debtsSheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'Debt not found' };
}

function getSubscriptions(sheet) {
  const subsSheet = sheet.getSheetByName('Subscriptions') || createSubscriptionsSheet(sheet);
  const data = subsSheet.getDataRange().getValues();
  
  return data.slice(1).map((row, index) => ({
    id: row[0] || `sub_${index}`,
    name: row[1] || '',
    amount: parseFloat(row[2]) || 0,
    frequency: row[3] || 'monthly',
    nextPayment: row[4] || new Date().toISOString().split('T')[0],
    createdAt: row[5] || new Date().toISOString(),
    status: row[6] || 'active'
  }));
}

function addSubscription(sheet, subscription) {
  const subsSheet = sheet.getSheetByName('Subscriptions') || createSubscriptionsSheet(sheet);
  subsSheet.appendRow([
    subscription.id,
    subscription.name,
    subscription.amount,
    subscription.frequency,
    subscription.nextPayment,
    subscription.createdAt,
    subscription.status || 'active'
  ]);
  return { id: subscription.id };
}

function updateSubscription(sheet, id, updates) {
  const subsSheet = sheet.getSheetByName('Subscriptions');
  const data = subsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      if (updates.nextPayment !== undefined) data[i][4] = updates.nextPayment;
      if (updates.status !== undefined) data[i][6] = updates.status;
      
      subsSheet.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
      return { ok: true };
    }
  }
  return { error: 'Subscription not found' };
}

function deleteSubscription(sheet, id) {
  const subsSheet = sheet.getSheetByName('Subscriptions');
  const data = subsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      subsSheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'Subscription not found' };
}

// Sheet creation functions
function createTasksSheet(sheet) {
  const newSheet = sheet.insertSheet('Tasks');
  newSheet.appendRow(['ID', 'Text', 'Priority', 'Category', 'Repeat', 'Completed', 'Created At', 'Completed At', 'Time Spent', 'Next Due']);
  return newSheet;
}

function createTransactionsSheet(sheet) {
  const newSheet = sheet.insertSheet('Transactions');
  newSheet.appendRow(['ID', 'Amount', 'Type', 'Description', 'Category', 'Date', 'Month', 'Year']);
  return newSheet;
}

function createBudgetSheet(sheet) {
  const newSheet = sheet.insertSheet('Budget');
  newSheet.appendRow(['Amount']);
  newSheet.getRange('A2').setValue(0);
  return newSheet;
}

function createGoalsSheet(sheet) {
  const newSheet = sheet.insertSheet('Goals');
  newSheet.appendRow(['ID', 'Name', 'Target Amount', 'Current Amount', 'Target Date', 'Created At', 'Completed']);
  return newSheet;
}

function createDebtsSheet(sheet) {
  const newSheet = sheet.insertSheet('Debts');
  newSheet.appendRow(['ID', 'Type', 'Person Name', 'Total Amount', 'Paid Amount', 'Due Date', 'Created At', 'Status']);
  return newSheet;
}

function createSubscriptionsSheet(sheet) {
  const newSheet = sheet.insertSheet('Subscriptions');
  newSheet.appendRow(['ID', 'Name', 'Amount', 'Frequency', 'Next Payment', 'Created At', 'Status']);
  return newSheet;
}
