import React, { useState } from 'react';
import { useApp } from '../App';
import { backend } from '../services/mockBackend';
import { Card, Button, Input, Modal, Select, Badge, SparkleEffect } from '../components/UI';
import { Plus, Check, Target, Zap } from 'lucide-react';
import { Task, TaskType, TaskLog } from '../types';
import { format, isFuture, isToday, subDays, parseISO } from 'date-fns';
import { playSound } from '../constants';

const Tasks: React.FC = () => {
  const { user, data, refreshData } = useApp();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isMarkModalOpen, setMarkModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSparkle, setShowSparkle] = useState(false);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    name: '', reason: '', type: TaskType.PERSONAL, category: 'habit', penalty: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: ''
  });

  const [markData, setMarkData] = useState({ remark: '', image: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
        await backend.addItem(user.id, 'tasks', {
            ...newTask,
            id: crypto.randomUUID(),
            userId: user.id,
            createdAt: new Date().toISOString()
        } as Task);
        await refreshData();
        setCreateModalOpen(false);
        playSound('success');
    } catch (e) { console.error(e); }
  };

  const handleMarkClick = (task: Task) => {
      setSelectedTask(task);
      setMarkModalOpen(true);
      setMarkData({ remark: '', image: '' });
  };

  const handleMarkSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !selectedTask) return;
      
      try {
          // Check date restrictions
          const today = new Date();
          const logDate = format(today, 'yyyy-MM-dd');
          
          await backend.addItem(user.id, 'logs', {
              id: crypto.randomUUID(),
              taskId: selectedTask.id,
              date: logDate,
              remark: markData.remark,
              image: markData.image,
              completed: true,
              timestamp: Date.now()
          } as TaskLog);

          await refreshData();
          setMarkModalOpen(false);
          playSound('success');
          setShowSparkle(true);
          setTimeout(() => setShowSparkle(false), 1500);
      } catch (e) { console.error(e); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setMarkData({ ...markData, image: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  // Helper to check if task is done today
  const isDoneToday = (taskId: string) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return data.logs.some(l => l.taskId === taskId && l.date === today && l.completed);
  };

  return (
    <div className="space-y-6">
      <SparkleEffect active={showSparkle} />
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Tasks & Habits</h2>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus size={18} /> New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.tasks.map(task => (
            <Card key={task.id} className="relative group hover:border-indigo-500/50 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <Badge color={task.category === 'habit' ? 'bg-green-500/20 text-green-200' : 'bg-blue-500/20 text-blue-200'}>
                        {task.category.toUpperCase()}
                    </Badge>
                    <Badge>{task.type}</Badge>
                </div>
                <h3 className="text-xl font-bold mb-1">{task.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{task.reason}</p>
                
                <div className="text-xs text-red-300 bg-red-500/10 p-2 rounded-lg mb-4">
                    Penalty: {task.penalty || 'None'}
                </div>

                <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
                    <div className="text-xs text-gray-500">Since: {format(parseISO(task.createdAt), 'MMM d')}</div>
                    {isDoneToday(task.id) ? (
                         <span className="text-green-400 flex items-center gap-1 text-sm font-bold">
                             <Check size={16} /> Done Today
                         </span>
                    ) : (
                        <Button 
                            className="py-1 px-3 text-sm" 
                            onClick={() => handleMarkClick(task)}
                        >
                            Mark Done
                        </Button>
                    )}
                </div>
            </Card>
        ))}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Task">
          <form onSubmit={handleCreate} className="space-y-4">
              <Input placeholder="Task Name" value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} required />
              <Input placeholder="Why do you want this?" value={newTask.reason} onChange={e => setNewTask({...newTask, reason: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <Select value={newTask.category} onChange={e => setNewTask({...newTask, category: e.target.value as any})}>
                    <option value="habit">Habit</option>
                    <option value="goal">Goal</option>
                </Select>
                <Select value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value as any})}>
                    {Object.values(TaskType).map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <Input placeholder="Penalty if missed" value={newTask.penalty} onChange={e => setNewTask({...newTask, penalty: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})} required />
                <Input type="date" value={newTask.endDate} onChange={e => setNewTask({...newTask, endDate: e.target.value})} />
              </div>
              <Button type="submit" className="w-full">Create</Button>
          </form>
      </Modal>

      {/* Mark Done Modal */}
      <Modal isOpen={isMarkModalOpen} onClose={() => setMarkModalOpen(false)} title={`Mark "${selectedTask?.name}" Done`}>
          <form onSubmit={handleMarkSubmit} className="space-y-4">
              <textarea 
                 className="w-full glass-input px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
                 placeholder="How did it go? (Remark)"
                 value={markData.remark}
                 onChange={e => setMarkData({...markData, remark: e.target.value})}
                 required
              />
              <div>
                  <label className="block text-sm text-gray-400 mb-2">Proof Image (Optional)</label>
                  <Input type="file" accept="image/*" onChange={handleImageUpload} />
              </div>
              {markData.image && (
                  <img src={markData.image} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
              )}
              <Button type="submit" className="w-full">Confirm Completion</Button>
          </form>
      </Modal>
    </div>
  );
};

export default Tasks;
