import { NextResponse } from 'next/server';
import { getExpenses, saveExpenses, addExpense, deleteExpense, Expense } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  
  let expenses = getExpenses();
  if (month) {
    let monthExpenses = expenses.filter(e => e.month === month);
    
    // Auto-generate fixed expenses for the new month if it's empty
    if (monthExpenses.length === 0) {
      const pastExpenses = expenses.filter(e => e.month < month).sort((a, b) => b.month.localeCompare(a.month));
      if (pastExpenses.length > 0) {
        const mostRecentMonth = pastExpenses[0].month;
        const templateExpenses = pastExpenses.filter(e => e.month === mostRecentMonth);
        
        const newExpenses = templateExpenses.map((e, idx) => ({
          ...e,
          id: `${month}-auto-${idx}-${Date.now()}`,
          month: month,
          status: 'pending' as const,
          receiptUrl: undefined
        }));
        
        newExpenses.forEach(exp => addExpense(exp));
        monthExpenses = newExpenses;
      }
    }
    return NextResponse.json(monthExpenses);
  }
  
  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newExpense: Expense = {
    ...body,
    id: Date.now().toString(),
    status: 'pending'
  };
  addExpense(newExpense);
  return NextResponse.json(newExpense);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const expenses = getExpenses();
  const updated = expenses.map(e => e.id === body.id ? { ...e, ...body } : e);
  saveExpenses(updated);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (id) {
    deleteExpense(id);
  }
  return NextResponse.json({ success: true });
}
