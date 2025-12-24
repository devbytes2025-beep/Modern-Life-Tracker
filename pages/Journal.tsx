import React, { useState } from 'react';
import { useApp } from '../App';
import { backend } from '../services/mockBackend';
import { Card, Button, Input, FireworksEffect, SparkleEffect } from '../components/UI';
import { JournalEntry } from '../types';
import { format } from 'date-fns';
import { Search, Edit2, Trash2 } from 'lucide-react';
import { playSound } from '../constants';

const MOODS = ['😊', '😐', '😔', '😡', '🥳', '😴'];

const Journal: React.FC = () => {
  const { user, data, refreshData } = useApp();
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('😊');
  const [images, setImages] = useState<string[]>([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFireworks, setShowFireworks] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);

  const handleSave = async () => {
    if (!user || !content) return;
    try {
        if (editingId) {
             const existing = data.journal.find(j => j.id === editingId);
             if (existing) {
                 await backend.updateItem(user.id, 'journal', {
                     ...existing,
                     content,
                     mood,
                     images
                 });
             }
             setEditingId(null);
        } else {
             await backend.addItem(user.id, 'journal', {
              id: crypto.randomUUID(),
              userId: user.id,
              content,
              mood,
              images, // array
              date: format(new Date(), 'yyyy-MM-dd'),
              timestamp: Date.now()
            } as JournalEntry);
            
            // Animations for new entry
            setShowFireworks(true);
            setTimeout(() => setShowFireworks(false), 2000);
        }

        playSound('success');
        setShowSparkle(true);
        setTimeout(() => setShowSparkle(false), 1500);

        setContent('');
        setImages([]);
        refreshData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (entry: JournalEntry) => {
      setContent(entry.content);
      setMood(entry.mood);
      setImages(entry.images || []);
      setEditingId(entry.id);
  };

  const handleDelete = async (id: string) => {
      if (!user) return;
      if (!window.confirm("Are you sure you want to delete this memory?")) return;
      try {
          await backend.deleteItem(user.id, 'journal', id);
          playSound('click');
          refreshData();
      } catch (e) { console.error(e); }
  };

   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
           Array.from(files).forEach(file => {
             const reader = new FileReader();
             reader.onloadend = () => {
                 if (reader.result) {
                     setImages(prev => [...prev, reader.result as string]);
                 }
             };
             reader.readAsDataURL(file as Blob);
          });
      }
  };

  const filteredEntries = data.journal.filter(j => {
      const matchesSearch = j.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = filterMonth ? j.date.startsWith(filterMonth) : true;
      return matchesSearch && matchesDate;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      <FireworksEffect active={showFireworks} />
      <SparkleEffect active={showSparkle} />
      
      {/* Editor */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
           <h2 className="text-xl font-bold mb-4">{editingId ? "Edit Entry" : "Daily Journal"}</h2>
           <textarea 
             className="w-full h-40 glass-input p-4 rounded-xl resize-none mb-4 text-white" 
             placeholder="How was your day?"
             value={content}
             onChange={e => setContent(e.target.value)}
           ></textarea>
           
           <div className="mb-4">
             <label className="text-sm text-gray-400 block mb-2">Mood</label>
             <div className="flex justify-between bg-white/5 p-2 rounded-xl">
               {MOODS.map(m => (
                 <button 
                   key={m} 
                   onClick={() => setMood(m)}
                   className={`text-2xl p-2 rounded-lg transition-all ${mood === m ? 'bg-white/20 scale-110' : 'hover:bg-white/10'}`}
                 >
                   {m}
                 </button>
               ))}
             </div>
           </div>

           <Input type="file" className="mb-4" accept="image/*" multiple onChange={handleImageUpload} />
           
           {images.length > 0 && (
               <div className="grid grid-cols-3 gap-2 mb-4">
                   {images.map((img, idx) => (
                       <img key={idx} src={img} className="w-full h-20 object-cover rounded-lg" alt="preview" />
                   ))}
               </div>
           )}

           <Button onClick={handleSave} className="w-full">{editingId ? "Update Entry" : "Save Entry"}</Button>
           {editingId && <Button onClick={() => {setEditingId(null); setContent(''); setImages([]);}} variant="ghost" className="w-full mt-2">Cancel</Button>}
        </Card>
      </div>

      {/* List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <Input 
                    placeholder="Search memories..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <Input 
                type="month" 
                className="w-40" 
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
            />
        </div>

        <div className="grid gap-4">
           {filteredEntries.map(entry => (
               <Card key={entry.id} className="relative group hover:border-white/20 transition-all">
                   <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                            onClick={() => handleEdit(entry)} 
                            className="text-gray-400 hover:text-white p-1"
                            title="Edit"
                       >
                           <Edit2 size={18} />
                       </button>
                       <button 
                            onClick={() => handleDelete(entry.id)} 
                            className="text-gray-400 hover:text-red-400 p-1"
                            title="Delete"
                       >
                           <Trash2 size={18} />
                       </button>
                   </div>
                   
                   <div className="flex gap-4">
                       <div className="text-4xl">{entry.mood}</div>
                       <div className="flex-1">
                           <div className="flex justify-between items-start mr-16">
                               <p className="text-gray-300 whitespace-pre-wrap">{entry.content}</p>
                               <span className="text-xs text-gray-500 min-w-[80px] text-right">{entry.date}</span>
                           </div>
                           {entry.images && entry.images.length > 0 && (
                               <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-thin">
                                   {entry.images.map((img, i) => (
                                       <img key={i} src={img} alt="Memory" className="rounded-lg h-32 w-auto object-cover border border-white/5" />
                                   ))}
                               </div>
                           )}
                       </div>
                   </div>
               </Card>
           ))}
           {filteredEntries.length === 0 && <p className="text-gray-500 text-center py-8">No journal entries found.</p>}
        </div>
      </div>
    </div>
  );
};

export default Journal;
