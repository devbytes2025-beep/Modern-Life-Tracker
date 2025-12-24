import React, { useState } from 'react';
import { useApp } from '../App';
import { backend } from '../services/mockBackend';
import { Card, Button, Input } from '../components/UI';
import { JournalEntry } from '../types';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { playSound } from '../constants';

const MOODS = ['😊', '😐', '😔', '😡', '🥳', '😴'];

const Journal: React.FC = () => {
  const { user, data, refreshData } = useApp();
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('😊');
  const [image, setImage] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = async () => {
    if (!user || !content) return;
    await backend.addItem(user.id, 'journal', {
      id: crypto.randomUUID(),
      userId: user.id,
      content,
      mood,
      image,
      date: format(new Date(), 'yyyy-MM-dd'),
      timestamp: Date.now()
    } as JournalEntry);
    playSound('success');
    setContent('');
    setImage('');
    refreshData();
    // Simulate fireworks here in a real app
  };

   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const filteredEntries = data.journal.filter(j => {
      const matchesSearch = j.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = filterMonth ? j.date.startsWith(filterMonth) : true;
      return matchesSearch && matchesDate;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Editor */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
           <h2 className="text-xl font-bold mb-4">Daily Journal</h2>
           <textarea 
             className="w-full h-40 glass-input p-4 rounded-xl resize-none mb-4" 
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

           <Input type="file" className="mb-4" accept="image/*" onChange={handleImageUpload} />
           {image && <img src={image} className="w-full h-32 object-cover rounded-xl mb-4" alt="preview" />}

           <Button onClick={handleSave} className="w-full">Save Entry</Button>
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
               <Card key={entry.id} className="flex gap-4">
                   <div className="text-4xl">{entry.mood}</div>
                   <div className="flex-1">
                       <div className="flex justify-between items-start">
                           <p className="text-gray-300 whitespace-pre-wrap">{entry.content}</p>
                           <span className="text-xs text-gray-500">{entry.date}</span>
                       </div>
                       {entry.image && (
                           <img src={entry.image} alt="Memory" className="mt-3 rounded-lg max-h-40 object-cover" />
                       )}
                   </div>
               </Card>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Journal;
