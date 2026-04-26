import fs from 'fs';
import path from 'path';

export type PaymentStatus = 'paid' | 'pending';

export interface Expense {
  id: string;
  name: string;
  type: string;
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  recipient: string;
  aliasCbu: string; // New field for Alias/CBU
  month: string;
  receiptUrl?: string; // For MP receipts
}

const DB_PATH = path.join(process.cwd(), 'data.json');

const initDb = () => {
  if (!fs.existsSync(DB_PATH)) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const initialData: Expense[] = [
      {
        id: '1',
        name: 'Alquiler Mensual',
        type: 'Dueño Directo',
        amount: 450000,
        status: 'pending',
        dueDate: '05 May, 2024',
        recipient: 'Juan Pérez',
        aliasCbu: 'juan.perez.alquiler',
        month: currentMonth
      },
      {
        id: '2',
        name: 'Expensas Edificio',
        type: 'Administración',
        amount: 85000,
        status: 'pending',
        dueDate: '10 May, 2024',
        recipient: 'Consorcio',
        aliasCbu: '0000003100012345678901',
        month: currentMonth
      }
    ];
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
};

export const getExpenses = (): Expense[] => {
  initDb();
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
};

export const saveExpenses = (expenses: Expense[]) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(expenses, null, 2));
};

export const updateExpenseStatus = (id: string, status: PaymentStatus) => {
  const expenses = getExpenses();
  const updated = expenses.map(e => e.id === id ? { ...e, status } : e);
  saveExpenses(updated);
};

export const addExpense = (expense: Expense) => {
  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);
};

export const deleteExpense = (id: string) => {
  const expenses = getExpenses();
  const filtered = expenses.filter(e => e.id !== id);
  saveExpenses(filtered);
};
