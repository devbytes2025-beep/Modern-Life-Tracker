import React, { useState } from 'react';
import { useApp } from '../App';
import { backend } from '../services/mockBackend';
import { Card, Button, Input, Select } from '../components/UI';
import { EXPENSE_CATEGORIES, playSound } from '../constants';
import { Expense } from '../types';
import { Trash2, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

const Expenses: React.FC = () => {
  const { user, data, refreshData } = useApp();
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    amount: 0, category: 'Food', description: '', date: format(new Date(), 'yyyy-MM-dd')
  });
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM'));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await backend.addItem(user.id, 'expenses', {
        ...newExpense,
        id: crypto.randomUUID(),
        userId: user.id
      } as Expense);
      playSound('success');
      await refreshData();
      setNewExpense({ ...newExpense, amount: 0, description: '' });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await backend.deleteItem(user.id, 'expenses', id);
    playSound('click');
    refreshData();
  };

  const filteredExpenses = data.expenses.filter(e => e.date.startsWith(filterDate));
  const total = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Add Form */}
        <Card className="flex-1 h-fit">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
             <TrendingDown className="text-red-400" /> Add Expense
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input 
              type="number" placeholder="Amount (₹)" 
              value={newExpense.amount || ''} 
              onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} 
              required 
            />
            <Select 
              value={newExpense.category} 
              onChange={e => setNewExpense({...newExpense, category: e.target.value})}
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input 
              placeholder="Where? (Description)" 
              value={newExpense.description} 
              onChange={e => setNewExpense({...newExpense, description: e.target.value})} 
              required 
            />
            <Input 
              type="date" 
              value={newExpense.date} 
              onChange={e => setNewExpense({...newExpense, date: e.target.value})} 
              required 
            />
            <Button type="submit" className="w-full">Add Expense</Button>
          </form>
        </Card>

        {/* List & Filter */}
        <div className="flex-[2] space-y-6">
          <Card className="bg-gradient-to-r from-red-900/40 to-pink-900/40 border-red-500/20">
             <div className="flex justify-between items-center">
                 <div>
                     <h3 className="text-gray-300 text-sm">Total Spending ({format(new Date(filterDate), 'MMMM yyyy')})</h3>
                     <p className="text-3xl font-bold text-white">₹{total.toFixed(2)}</p>
                 </div>
                 <Input 
                   type="month" 
                   value={filterDate} 
                   onChange={e => setFilterDate(e.target.value)} 
                   className="w-auto"
                 />
             </div>
          </Card>

          <div className="space-y-3">
             {filteredExpenses.length === 0 && <p className="text-gray-500 text-center">No records for this month.</p>}
             {filteredExpenses.map(e => (
                 <div key={e.id} className="glass-panel p-4 rounded-xl flex justify-between items-center hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold">
                            ₹
                        </div>
                        <div>
                            <p className="font-bold">{e.description}</p>
                            <p className="text-xs text-gray-400">{e.category} • {e.date}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-red-300">-₹{e.amount}</span>
                        <button onClick={() => handleDelete(e.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 size={18} />
                        </button>
                    </div>
                 </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
