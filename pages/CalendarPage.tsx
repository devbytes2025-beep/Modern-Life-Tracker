import React, { useState } from 'react';
import { useApp } from '../App';
import { Card, Button, Modal } from '../components/UI';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isFuture, isToday, subDays, addMonths, subMonths, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { playSound } from '../constants';

const CalendarPage: React.FC = () => {
  const { data } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getDayContent = (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const logs = data.logs.filter(l => l.date === dateStr && l.completed);
      const createdTasks = data.tasks.filter(t => t.createdAt.startsWith(dateStr));
      return { logs, createdTasks };
  };

  const isDateLocked = (date: Date) => {
    // Logic: Future locked. Past 3 days open.
    if (isFuture(date) && !isToday(date)) return true;
    const threeDaysAgo = subDays(new Date(), 3);
    // Allow if date is after or equal to three days ago
    // Simple lock for future only as per prompt strictly saying "future days are locked"
    // Prompt also says "user can only mark past 3 days", so older than 3 days also locked?
    // "user can only mark past 3 days and present days future days are locked"
    if (date < threeDaysAgo) return false; // Usually calendar shows history, lock marking not viewing.
    return false;
  };
  
  const handleDateClick = (date: Date) => {
      if (isFuture(date) && !isToday(date)) {
          alert("Future days are locked!");
          playSound('error');
          return;
      }
      setSelectedDate(date);
      playSound('click');
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
           <h2 className="text-3xl font-bold text-white">Calendar</h2>
           <div className="flex items-center gap-4">
               <Button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} variant="ghost"><ChevronLeft /></Button>
               <span className="text-xl font-medium min-w-[150px] text-center">{format(currentMonth, 'MMMM yyyy')}</span>
               <Button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} variant="ghost"><ChevronRight /></Button>
           </div>
       </div>

       <Card className="p-0 overflow-hidden">
          <div className="grid grid-cols-7 bg-white/5 border-b border-white/10">
              {weekDays.map(d => (
                  <div key={d} className="p-4 text-center font-bold text-gray-400">{d}</div>
              ))}
          </div>
          <div className="grid grid-cols-7">
              {/* Padding for start of month */}
              {Array.from({ length: getDay(daysInMonth[0]) }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[120px] bg-black/20 border border-white/5"></div>
              ))}
              
              {daysInMonth.map(date => {
                  const { logs } = getDayContent(date);
                  const locked = isFuture(date) && !isToday(date);
                  const isPastLimit = date < subDays(new Date(), 3);
                  
                  return (
                      <div 
                        key={date.toString()} 
                        onClick={() => handleDateClick(date)}
                        className={`
                            min-h-[120px] p-2 border border-white/5 relative transition-colors cursor-pointer group
                            ${isToday(date) ? 'bg-indigo-900/30' : 'hover:bg-white/5'}
                            ${locked ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                          <div className="flex justify-between items-start">
                              <span className={`text-sm font-medium ${isToday(date) ? 'text-indigo-400' : 'text-gray-400'}`}>
                                  {format(date, 'd')}
                              </span>
                              {locked && <Lock size={12} className="text-gray-600" />}
                          </div>
                          
                          <div className="mt-2 space-y-1">
                              {logs.slice(0, 3).map((log, idx) => (
                                  <div key={idx} className="h-1.5 w-full bg-green-500 rounded-full opacity-70"></div>
                              ))}
                              {logs.length > 3 && <div className="text-[10px] text-gray-500">+{logs.length - 3} more</div>}
                          </div>
                      </div>
                  );
              })}
          </div>
       </Card>
       
       {selectedDate && (
           <Card>
               <h3 className="text-xl font-bold mb-4">Summary for {format(selectedDate, 'MMM do, yyyy')}</h3>
               <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                       <h4 className="font-bold text-green-400 mb-2">Completed</h4>
                       <ul className="list-disc list-inside text-sm text-gray-300">
                           {getDayContent(selectedDate).logs.map((l, i) => {
                               const taskName = data.tasks.find(t => t.id === l.taskId)?.name || 'Unknown Task';
                               return <li key={i}>{taskName}</li>;
                           })}
                           {getDayContent(selectedDate).logs.length === 0 && <li>No tasks completed.</li>}
                       </ul>
                   </div>
                   <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                        <h4 className="font-bold text-red-400 mb-2">Pending (Task Count)</h4>
                        {/* Simplified logic: Total active tasks minus completed tasks count */}
                        <p className="text-2xl font-bold">
                            {Math.max(0, data.tasks.length - getDayContent(selectedDate).logs.length)}
                        </p>
                   </div>
               </div>
           </Card>
       )}
    </div>
  );
};

export default CalendarPage;
