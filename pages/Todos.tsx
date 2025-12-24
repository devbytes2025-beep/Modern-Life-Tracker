import React, { useState } from 'react';
import { useApp } from '../App';
import { backend } from '../services/mockBackend';
import { Card, Button, Input } from '../components/UI';
import { Todo } from '../types';
import { Trash2, Square, CheckSquare } from 'lucide-react';
import { playSound } from '../constants';

const Todos: React.FC = () => {
  const { user, data, refreshData } = useApp();
  const [newTodo, setNewTodo] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTodo) return;
    await backend.addItem(user.id, 'todos', {
      id: crypto.randomUUID(),
      userId: user.id,
      text: newTodo,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      completed: false
    } as Todo);
    playSound('success');
    setNewTodo('');
    setDueDate('');
    refreshData();
  };

  const toggleTodo = async (todo: Todo) => {
    if (!user) return;
    await backend.updateItem(user.id, 'todos', { ...todo, completed: !todo.completed });
    playSound('click');
    refreshData();
  };

  const deleteTodo = async (id: string) => {
    if (!user) return;
    await backend.deleteItem(user.id, 'todos', id);
    refreshData();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <h2 className="text-2xl font-bold mb-4">To-Do List</h2>
        <form onSubmit={handleAdd} className="flex gap-4">
          <Input 
             className="flex-1"
             placeholder="What needs to be done?" 
             value={newTodo} 
             onChange={e => setNewTodo(e.target.value)} 
          />
          <Input 
             type="date" 
             className="w-40"
             value={dueDate}
             onChange={e => setDueDate(e.target.value)}
          />
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {data.todos.map(todo => (
          <div 
             key={todo.id} 
             className={`glass-panel p-4 rounded-xl flex items-center justify-between transition-all ${todo.completed ? 'opacity-50' : ''}`}
          >
             <div className="flex items-center gap-4">
               <button onClick={() => toggleTodo(todo)} className="text-indigo-400 hover:text-indigo-300">
                 {todo.completed ? <CheckSquare size={24} /> : <Square size={24} />}
               </button>
               <div>
                  <p className={`font-medium ${todo.completed ? 'line-through text-gray-500' : 'text-white'}`}>{todo.text}</p>
                  <p className="text-xs text-gray-500">Due: {todo.dueDate}</p>
               </div>
             </div>
             <button onClick={() => deleteTodo(todo.id)} className="text-gray-600 hover:text-red-400">
               <Trash2 size={18} />
             </button>
          </div>
        ))}
        {data.todos.length === 0 && <p className="text-center text-gray-500 mt-8">Nothing to do yet. Relax!</p>}
      </div>
    </div>
  );
};

export default Todos;
