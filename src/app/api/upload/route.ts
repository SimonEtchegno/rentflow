import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getExpenses, saveExpenses } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const expenseId = formData.get('expenseId') as string | null;

    if (!file || !expenseId) {
      return NextResponse.json({ error: 'Falta el archivo o el ID del gasto' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create unique filename
    const ext = path.extname(file.name) || '.pdf';
    const filename = `${expenseId}-${Date.now()}${ext}`;
    
    // Save to public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadDir, filename);
    
    // Ensure dir exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);

    // Update DB
    const receiptUrl = `/uploads/${filename}`;
    const expenses = getExpenses();
    const updated = expenses.map(e => e.id === expenseId ? { ...e, receiptUrl } : e);
    saveExpenses(updated);

    return NextResponse.json({ success: true, receiptUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 });
  }
}
