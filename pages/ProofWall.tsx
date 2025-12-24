import React, { useState } from 'react';
import { useApp } from '../App';
import { Card, Modal, Select } from '../components/UI';
import { TaskLog } from '../types';

const ProofWall: React.FC = () => {
  const { data } = useApp();
  const [selectedImage, setSelectedImage] = useState<TaskLog | null>(null);
  const [filterTask, setFilterTask] = useState('all');

  const logsWithImages = data.logs.filter(l => l.image && (filterTask === 'all' || l.taskId === filterTask));

  const getTaskName = (id: string) => data.tasks.find(t => t.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Proof Wall</h2>
        <div className="w-64">
           <Select value={filterTask} onChange={e => setFilterTask(e.target.value)}>
               <option value="all">All Habits</option>
               {data.tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
           </Select>
        </div>
      </div>

      <div className="columns-1 md:columns-3 lg:columns-4 gap-4 space-y-4">
         {logsWithImages.map(log => (
             <div 
               key={log.id} 
               onClick={() => setSelectedImage(log)}
               className="break-inside-avoid glass-panel rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
             >
                 <img src={log.image} alt="Proof" className="w-full object-cover" />
                 <div className="p-3">
                     <p className="font-bold text-sm truncate">{getTaskName(log.taskId)}</p>
                     <p className="text-xs text-gray-400">{log.date}</p>
                     {log.remark && <p className="text-xs text-gray-300 mt-1 line-clamp-2">"{log.remark}"</p>}
                 </div>
             </div>
         ))}
      </div>
      {logsWithImages.length === 0 && <p className="text-center text-gray-500">No photo proofs uploaded yet.</p>}

      <Modal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} title="Proof Detail">
          {selectedImage && (
              <div className="space-y-4">
                  <img src={selectedImage.image} alt="Full Proof" className="w-full rounded-xl" />
                  <div>
                      <h4 className="font-bold text-lg">{getTaskName(selectedImage.taskId)}</h4>
                      <p className="text-gray-400 text-sm">{selectedImage.date}</p>
                  </div>
                  <p className="bg-white/5 p-4 rounded-xl italic">"{selectedImage.remark}"</p>
              </div>
          )}
      </Modal>
    </div>
  );
};

export default ProofWall;
