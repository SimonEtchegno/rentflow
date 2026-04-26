'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { 
  Wallet, 
  Home, 
  Building2, 
  Receipt, 
  ChevronRight, 
  Plus, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock,
  LayoutDashboard,
  History,
  Settings as SettingsIcon,
  Bell,
  X,
  Loader2,
  ShieldCheck,
  Pencil,
  Check,
  Trash2,
  Copy,
  ChevronLeft,
  ExternalLink,
  FileUp,
  FileText,
  MessageCircle,
  Users,
  TrendingUp
} from 'lucide-react';

type PaymentStatus = 'paid' | 'pending';

interface Expense {
  id: string;
  name: string;
  type: string;
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  recipient: string;
  aliasCbu: string;
  month: string;
  receiptUrl?: string;
}

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [selectedPayment, setSelectedPayment] = useState<Expense | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLiquidateModal, setShowLiquidateModal] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetch('/api/expenses').then(res => res.json()).then(data => setAllExpenses(data));
    }
  }, [activeTab]);

  const fetchExpenses = async (month: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/expenses?month=${month}`);
      const data = await res.json();
      setExpenses(data);
    } catch (e) {
      console.error('Failed to fetch expenses', e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchExpenses(currentMonth);
  }, [currentMonth]);

  const totalPending = expenses.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaid = expenses.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalMonth = totalPending + totalPaid;
  const roommateShare = totalMonth / 2;

  const sendWhatsApp = () => {
    const text = `Che, ya cerré los números de ${formatMonth(currentMonth)}.\nEn total de alquiler, expensas y servicios gastamos $${totalMonth.toLocaleString()}.\n*Tu mitad (50%) es: $${roommateShare.toLocaleString()}*.\nCuando puedas pasame!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Handlers
  const saveEditedExpense = async (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(p => p.id === updatedExpense.id ? updatedExpense : p));
    await fetch('/api/expenses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedExpense)
    });
    setExpenseToEdit(null);
  };

  const handleLiquidate = async (totalAlquiler: number, inmoFee: number, expensasTotal: number, ownerDeduction: number) => {
    const rentExp = expenses.find(e => e.name.toLowerCase().includes('alquiler') && e.recipient.toLowerCase().includes('dueño') || e.recipient.toLowerCase().includes('fornasier'));
    const inmoExp = expenses.find(e => e.name.toLowerCase().includes('inmobiliaria'));
    const consorcioExp = expenses.find(e => e.name.toLowerCase().includes('expensas'));

    const baseOwner = totalAlquiler - inmoFee;
    const finalRent = baseOwner - ownerDeduction;

    if (rentExp) {
      await saveEditedExpense({ ...rentExp, amount: finalRent });
    }
    if (inmoExp) {
      await saveEditedExpense({ ...inmoExp, amount: inmoFee });
    }
    if (consorcioExp) {
      await saveEditedExpense({ ...consorcioExp, amount: expensasTotal });
    }
    setShowLiquidateModal(false);
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    setExpenses(prev => prev.filter(e => e.id !== id));
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
  };

  const copyAndOpenMP = async () => {
    if (selectedPayment?.aliasCbu) {
      try {
        await navigator.clipboard.writeText(selectedPayment.aliasCbu);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        // Abrir la sección de transferencias directamente
        window.open('https://www.mercadopago.com.ar/money-transfer', '_blank');
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  const markAsPaid = async () => {
    if (selectedPayment) {
      setExpenses(prev => prev.map(p => p.id === selectedPayment.id ? { ...p, status: 'paid' } : p));
      await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedPayment, status: 'paid' })
      });
      setSelectedPayment(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, expenseId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expenseId', expenseId);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.receiptUrl) {
        setExpenses(prev => prev.map(p => p.id === expenseId ? { ...p, receiptUrl: data.receiptUrl } : p));
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('Error al subir el comprobante');
    }
    setIsLoading(false);
  };

  const formatMonth = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleString('es-AR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  const changeMonth = (delta: number) => {
    const [y, m] = currentMonth.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1 + delta);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  return (
    <div className="min-h-screen text-slate-50 relative overflow-hidden flex">
      <div className="bg-glow-effect"></div>
      
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-white/5 backdrop-blur-3xl hidden lg:flex flex-col p-6 z-40">
        <div className="flex items-center gap-3 mb-10 px-2 mt-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 ring-1 ring-white/10">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">RentFlow</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Panel Mensual" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<History size={20} />} label="Historial" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavItem icon={<Bell size={20} />} label="Alertas" />
          <NavItem icon={<SettingsIcon size={20} />} label="Configuración" />
        </nav>
      </aside>

      <main className="lg:pl-64 flex-1 min-h-screen relative z-10">
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-10 sticky top-0 bg-black/20 backdrop-blur-2xl z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
              {activeTab === 'dashboard' ? 'Resumen Mensual' : 'Estadísticas e Historial'}
            </h1>
            {activeTab === 'dashboard' && (
              <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10 shadow-inner ml-4">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-all"><ChevronLeft size={16} /></button>
                <span className="text-sm font-bold w-36 text-center capitalize tracking-wide">{formatMonth(currentMonth)}</span>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-lg transition-all"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="p-10 max-w-[1400px] mx-auto">
          {/* Summary Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-7 rounded-[32px]">
              <div className="absolute top-0 right-0 p-6 opacity-10"><Wallet size={100} className="text-white" /></div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Total del Mes</p>
              <h3 className="text-4xl font-black text-white tracking-tighter">${totalMonth.toLocaleString()}</h3>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span> Presupuesto Estimado
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-7 rounded-[32px] border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
              <div className="absolute top-0 right-0 p-6 opacity-10 text-blue-400"><Users size={100} /></div>
              <p className="text-blue-300 text-sm font-bold uppercase tracking-wider mb-2">A cobrar al Roomie</p>
              <h3 className="text-4xl font-black text-blue-400 tracking-tighter">${roommateShare.toLocaleString()}</h3>
              <button onClick={sendWhatsApp} className="mt-6 flex items-center justify-center gap-2 w-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 py-3 rounded-2xl text-sm font-bold transition-all border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                <MessageCircle size={16} /> Pedir Mitad por WhatsApp
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-7 rounded-[32px] border-red-500/20">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Falta Pagar</p>
              <h3 className="text-4xl font-black text-red-400 tracking-tighter">${totalPending.toLocaleString()}</h3>
              <div className="mt-4 flex items-center gap-2 text-xs text-red-400/80 font-bold bg-red-500/10 w-fit px-3 py-1.5 rounded-full border border-red-500/20">
                <Clock size={14} /><span>{totalPending > 0 ? 'Pagos Pendientes' : 'Todo al día'}</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-7 rounded-[32px] relative overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.5)]">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <p className="text-emerald-950/80 text-sm font-black uppercase tracking-wider mb-2 relative z-10">Ya Pagado</p>
              <h3 className="text-4xl font-black text-white tracking-tighter relative z-10 drop-shadow-md">${totalPaid.toLocaleString()}</h3>
              <div className="mt-4 flex items-center gap-2 text-xs text-white font-bold bg-black/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md relative z-10 border border-white/10">
                <CheckCircle2 size={14} /><span>Dinero Transferido</span>
              </div>
            </motion.div>
          </section>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 mt-8">
            <h2 className="text-2xl font-bold tracking-tight">Gastos Detallados</h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button onClick={() => setShowLiquidateModal(true)} className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-purple-500/20 w-full sm:w-auto">
                <Receipt size={18} /> Calcular Expensas
              </button>
              <button onClick={() => setShowCalcModal(true)} className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-orange-500/20 w-full sm:w-auto">
                <TrendingUp size={18} /> Proyectar Aumento
              </button>
              <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-5 py-3 rounded-2xl text-sm font-bold transition-all backdrop-blur-md w-full sm:w-auto">
                <Plus size={18} /> Gasto Manual
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-500" /></div>
              ) : expenses.length === 0 ? (
                <div className="text-center p-10 glass rounded-2xl border-dashed">
                  <p className="text-slate-400 mb-2">No hay gastos en este mes.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {expenses.map((expense) => (
                    <motion.div key={expense.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} 
                      className={`glass-card p-6 rounded-3xl flex items-center gap-4 group ${expense.status === 'paid' ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}
                    >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                        {expense.name.toLowerCase().includes('luz') || expense.name.toLowerCase().includes('gas') || expense.name.toLowerCase().includes('internet') ? <Home size={20} className="text-blue-400" /> : expense.name.toLowerCase().includes('expensas') ? <Building2 size={20} className="text-purple-400" /> : <Wallet size={20} className="text-emerald-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-white text-lg">{expense.name}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-white tracking-tight">${expense.amount.toLocaleString()}</span>
                            {expense.status === 'pending' && (
                              <button onClick={() => setExpenseToEdit(expense)} className="text-slate-500 hover:text-white transition-colors p-1.5 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100"><Pencil size={14} /></button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-400 font-medium">{expense.recipient} {expense.aliasCbu && <span className="font-mono text-xs ml-1 opacity-70">({expense.aliasCbu})</span>}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4 border-l border-white/5 pl-6">
                        <span className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full border ${expense.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]'}`}>
                          {expense.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                        {expense.status === 'pending' ? (
                          <div className="flex items-center gap-2 mt-1">
                            <button onClick={() => deleteExpense(expense.id)} className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18} /></button>
                            <button onClick={() => setSelectedPayment(expense)} className="text-sm font-bold bg-gradient-to-r from-blue-600 to-[#009EE3] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-[#009EE3]/30 transition-all hover:scale-105">
                              Pagar <ArrowUpRight size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            {expense.receiptUrl ? (
                              <button onClick={() => window.open(expense.receiptUrl, '_blank')} className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                                <FileText size={14} /> Ver Comprobante
                              </button>
                            ) : (
                              <label className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700">
                                <FileUp size={14} /> Subir MP
                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, expense.id)} />
                              </label>
                            )}
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
        ) : (
          <HistoryView allExpenses={allExpenses} />
        )}
      </main>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddExpenseModal 
            month={currentMonth}
            onClose={() => setShowAddModal(false)} 
            onAdd={(newExp) => {
              setExpenses(prev => [...prev, newExp]);
              setShowAddModal(false);
            }} 
          />
        )}
      </AnimatePresence>

      {/* Edit Expense Modal */}
      <AnimatePresence>
        {expenseToEdit && (
          <EditExpenseModal 
            expense={expenseToEdit}
            onClose={() => setExpenseToEdit(null)} 
            onSave={saveEditedExpense} 
          />
        )}
      </AnimatePresence>

      {/* Liquidate Modal */}
      <AnimatePresence>
        {showLiquidateModal && (
          <LiquidateModal
            expenses={expenses}
            onClose={() => setShowLiquidateModal(false)}
            onSave={handleLiquidate}
          />
        )}
      </AnimatePresence>

      {/* Increase Calculator Modal */}
      <AnimatePresence>
        {showCalcModal && (
          <IncreaseCalculatorModal
            expenses={expenses}
            onClose={() => setShowCalcModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Payment Assistant Modal */}
      <AnimatePresence>
        {selectedPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }} className="bg-white rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl">
              <div className="bg-[#009EE3] p-6 relative overflow-hidden text-center">
                <button onClick={() => setSelectedPayment(null)} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24} /></button>
                <div className="text-white relative z-10 mt-4">
                  <p className="text-[#009EE3] text-sm font-medium bg-white px-3 py-1 rounded-full inline-block mb-3 shadow-sm">Transferir a {selectedPayment.recipient}</p>
                  <h2 className="text-4xl font-bold mb-1">${selectedPayment.amount.toLocaleString()}</h2>
                </div>
              </div>
              <div className="p-6 bg-[#f5f5f5]">
                <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Alias / CBU de destino</p>
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="font-mono text-gray-900 font-bold">{selectedPayment.aliasCbu || 'No especificado'}</span>
                    <button onClick={() => { navigator.clipboard.writeText(selectedPayment.aliasCbu); setCopied(true); setTimeout(()=>setCopied(false), 2000); }} className="text-[#009EE3] hover:bg-blue-50 p-2 rounded-md transition-colors">
                      {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Copiá este Alias y abrilo en tu app de Mercado Pago para transferir directamente.</p>
                </div>

                <div className="space-y-3">
                  <button onClick={copyAndOpenMP} className="w-full bg-[#009EE3] hover:bg-[#0089c4] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg">
                    <ExternalLink size={18} /> {copied ? 'Copiado! Abriendo...' : 'Copiar Alias y abrir Mercado Pago'}
                  </button>
                  <button onClick={markAsPaid} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg">
                    <CheckCircle2 size={18} /> Marcar como Pagado
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${active ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      {icon}<span>{label}</span>
    </div>
  );
}

function AddExpenseModal({ onClose, onAdd, month }: { onClose: () => void, onAdd: (e: Expense) => void, month: string }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [aliasCbu, setAliasCbu] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newExp = { name, amount: parseFloat(amount), recipient, aliasCbu, type: 'Otro', month, dueDate: '', status: 'pending' as PaymentStatus };
    const res = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newExp) });
    const data = await res.json();
    onAdd(data);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass bg-[#1e293b] rounded-[24px] w-full max-w-md p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Agregar Gasto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1">Nombre</label><input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none" placeholder="Alquiler, Expensas..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-400 mb-1">Dueño/Destinatario</label><input required type="text" value={recipient} onChange={e => setRecipient(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none" placeholder="Ej: Juan" /></div>
            <div><label className="block text-sm text-slate-400 mb-1">Monto ($)</label><input required type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none no-spinners" placeholder="0.00" /></div>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1">Alias / CBU (Opcional)</label><input type="text" value={aliasCbu} onChange={e => setAliasCbu(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none font-mono text-sm" placeholder="alias.mp o 00000031..." /></div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors mt-6">Guardar</button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function EditExpenseModal({ expense, onClose, onSave }: { expense: Expense, onClose: () => void, onSave: (e: Expense) => void }) {
  const [name, setName] = useState(expense.name);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [recipient, setRecipient] = useState(expense.recipient);
  const [aliasCbu, setAliasCbu] = useState(expense.aliasCbu || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSave({ ...expense, name, amount: parseFloat(amount), recipient, aliasCbu });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass bg-[#1e293b] rounded-[24px] w-full max-w-md p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Editar Gasto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1">Nombre</label><input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-400 mb-1">Destinatario</label><input required type="text" value={recipient} onChange={e => setRecipient(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none" /></div>
            <div><label className="block text-sm text-slate-400 mb-1">Monto ($)</label><input required type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none no-spinners" /></div>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1">Alias / CBU (Opcional)</label><input type="text" value={aliasCbu} onChange={e => setAliasCbu(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none font-mono text-sm" /></div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition-colors mt-6">Guardar Cambios</button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function LiquidateModal({ expenses, onClose, onSave }: { expenses: Expense[], onClose: () => void, onSave: (t: number, i: number, e: number, d: number) => void }) {
  const inmoExp = expenses.find(e => e.name.toLowerCase().includes('inmobiliaria'));
  const rentExp = expenses.find(e => e.name.toLowerCase().includes('alquiler') && e.recipient.toLowerCase().includes('dueño') || e.recipient.toLowerCase().includes('fornasier'));
  const consorcioExp = expenses.find(e => e.name.toLowerCase().includes('expensas'));

  // Calculate the current assumed "Total Alquiler" from existing DB values if we have them
  const currentInmo = inmoExp ? inmoExp.amount : 63384.48;
  const currentOwnerBase = rentExp ? (rentExp.amount > 100000 ? rentExp.amount : 801415.52) : 801415.52; // Fallback if already deducted
  const estimatedTotal = currentInmo + 801415.52; // Hardcoding the known base for simplicity from Excel

  const [totalAlquiler, setTotalAlquiler] = useState(estimatedTotal.toString());
  const [inmoFee, setInmoFee] = useState(currentInmo.toString());
  const [expensasTotal, setExpensasTotal] = useState(consorcioExp ? consorcioExp.amount.toString() : '0');
  const [ownerDeduction, setOwnerDeduction] = useState('0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(parseFloat(totalAlquiler), parseFloat(inmoFee), parseFloat(expensasTotal), parseFloat(ownerDeduction));
  };

  const ownerBase = parseFloat(totalAlquiler || '0') - parseFloat(inmoFee || '0');
  const finalRent = ownerBase - parseFloat(ownerDeduction || '0');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass bg-[#1e293b] rounded-[24px] w-full max-w-md p-6 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-purple-400">
            <Receipt size={24} />
            <h2 className="text-xl font-bold text-white">Liquidación de Alquiler</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Total Alquiler (Completo)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                <input required type="number" value={totalAlquiler} onChange={e => setTotalAlquiler(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white outline-none no-spinners" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Honorarios Inmobiliaria</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">- $</span>
                <input required type="number" value={inmoFee} onChange={e => setInmoFee(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white outline-none no-spinners" />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-700/50">
              <p className="text-xs text-slate-400">Le corresponde al Dueño: <span className="font-bold text-white">${ownerBase.toLocaleString()}</span></p>
            </div>
          </div>
          
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Total Expensas (Para el consorcio)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                <input required type="number" value={expensasTotal} onChange={e => setExpensasTotal(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white outline-none no-spinners" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-purple-300 font-bold mb-1">Gastos Dueño (Extraordinarias a descontar)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-purple-400 font-bold">- $</span>
                <input required type="number" value={ownerDeduction} onChange={e => setOwnerDeduction(e.target.value)} className="w-full bg-purple-900/20 border border-purple-500/50 rounded-lg pl-10 pr-4 py-2 text-purple-100 font-bold outline-none no-spinners" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700 mt-2">
            <div className="flex justify-between items-center text-sm mb-1 text-slate-300">
              <span>Transferencia final al dueño:</span>
              <span className="font-bold text-emerald-400 text-xl">${finalRent > 0 ? finalRent.toLocaleString() : '0'}</span>
            </div>
          </div>

          <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20">Guardar Liquidación</button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function HistoryView({ allExpenses }: { allExpenses: Expense[] }) {
  const chartData = useMemo(() => {
    const monthlyTotals: Record<string, number> = {};
    const categoryTotals: Record<string, number> = {};

    allExpenses.filter(e => e.status === 'paid').forEach(exp => {
      // Monthly Total
      monthlyTotals[exp.month] = (monthlyTotals[exp.month] || 0) + exp.amount;
      
      // Category Total
      categoryTotals[exp.type] = (categoryTotals[exp.type] || 0) + exp.amount;
    });

    const monthlyArray = Object.keys(monthlyTotals).sort().map(month => ({
      name: month,
      Total: monthlyTotals[month]
    }));

    const COLORS = ['#009EE3', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#64748b'];
    const categoryArray = Object.keys(categoryTotals).map((type, idx) => ({
      name: type,
      value: categoryTotals[type],
      color: COLORS[idx % COLORS.length]
    })).sort((a, b) => b.value - a.value);

    return { monthlyArray, categoryArray };
  }, [allExpenses]);

  if (allExpenses.length === 0) return <div className="p-10 text-center text-slate-400">Cargando datos...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Evolución Mensual */}
        <div className="glass p-6 rounded-3xl">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <History className="text-blue-400" /> Evolución de Gastos (Pagados)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.monthlyArray}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <RechartsTooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value: any) => [`$${value.toLocaleString()}`, 'Total']} />
                <Bar dataKey="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución por Rubro */}
        <div className="glass p-6 rounded-3xl">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <PieChart className="text-emerald-400" /> Distribución por Rubro
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between h-[300px]">
            <div className="h-full w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.categoryArray} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {chartData.categoryArray.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value: any) => [`$${value.toLocaleString()}`, 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3 mt-4 md:mt-0">
              {chartData.categoryArray.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-sm text-slate-300">{cat.name}</span>
                  </div>
                  <span className="text-sm font-bold text-white">${cat.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function IncreaseCalculatorModal({ expenses, onClose }: { expenses: Expense[], onClose: () => void }) {
  const rentExp = expenses.find(e => e.name.toLowerCase().includes('alquiler'));
  const currentRent = rentExp ? rentExp.amount : 0;
  
  const [baseRent, setBaseRent] = useState(currentRent.toString());
  const [indexType, setIndexType] = useState('ICL');
  const [indexStart, setIndexStart] = useState('');
  const [indexEnd, setIndexEnd] = useState('');

  const parsedRent = parseFloat(baseRent || '0');
  const parsedStart = parseFloat(indexStart || '1'); // Evitar division por 0
  const parsedEnd = parseFloat(indexEnd || '1');
  
  // Fórmula Ley de Alquileres: Alquiler * (Indice Fin / Indice Inicio)
  const multiplier = (parsedStart > 0 && parsedEnd > 0) ? (parsedEnd / parsedStart) : 1;
  const newRent = parsedRent * multiplier;
  const increaseAmount = newRent - parsedRent;
  const newRoommateShare = newRent / 2;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass bg-[#1e293b] rounded-[24px] w-full max-w-md p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-orange-400">
            <TrendingUp size={24} />
            <h2 className="text-xl font-bold text-white">Calculadora de Aumentos</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Alquiler Actual ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                <input type="number" value={baseRent} onChange={e => setBaseRent(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white outline-none no-spinners" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/50">
              <label className="block text-xs font-bold text-orange-400 mb-2 uppercase tracking-wider">Cálculo por Ley de Alquileres</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setIndexType('ICL')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${indexType === 'ICL' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>ICL (BCRA)</button>
                <button onClick={() => setIndexType('IPC')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${indexType === 'IPC' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>IPC (Indec)</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Índice Inicial (Firma)</label>
                  <input type="number" value={indexStart} onChange={e => setIndexStart(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none no-spinners text-sm" placeholder="Ej: 3.54" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Índice Actual (Hoy)</label>
                  <input type="number" value={indexEnd} onChange={e => setIndexEnd(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none no-spinners text-sm font-bold text-orange-400" placeholder="Ej: 12.80" />
                </div>
              </div>
              <div className="mt-2 text-right">
                <a href="https://bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp" target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline">Ver valores oficiales en BCRA ↗</a>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-500/10 p-5 rounded-xl border border-orange-500/20 mt-4 space-y-3">
            <div className="flex justify-between items-center text-sm text-orange-200/70">
              <span>Aumento estimado:</span>
              <span>+${increaseAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-orange-200/70">
              <span>Nueva cuota Roommate (50%):</span>
              <span>${newRoommateShare.toLocaleString()}</span>
            </div>
            <div className="pt-3 border-t border-orange-500/20">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-orange-200">NUEVO ALQUILER:</span>
                <span className="font-black text-orange-400 text-2xl">${newRent > 0 ? newRent.toLocaleString() : '0'}</span>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors mt-4">Cerrar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
