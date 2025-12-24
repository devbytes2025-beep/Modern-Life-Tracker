import React from 'react';
import { useApp } from '../App';
import { Card, Button } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TaskType } from '../types';

const Analytics: React.FC = () => {
  const { data } = useApp();

  // Prepare data for Task Completion per Type (Pie)
  const typeCounts = data.tasks.reduce((acc, task) => {
      const logs = data.logs.filter(l => l.taskId === task.id).length;
      acc[task.type] = (acc[task.type] || 0) + logs;
      return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(typeCounts).map(key => ({ name: key, value: typeCounts[key] }));
  const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981'];

  // Prepare data for Daily Activity (Bar)
  // Simplified: Last 7 days
  const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
  });

  const activityData = last7Days.map(date => ({
      date: date.slice(5), // MM-DD
      completed: data.logs.filter(l => l.date === date && l.completed).length,
      expenses: data.expenses.filter(e => e.date === date).reduce((sum, e) => sum + Number(e.amount), 0)
  }));

  const handleExport = () => {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'glasshabit_analytics.json';
      link.click();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Analytics</h2>
          <Button onClick={handleExport} variant="ghost">Export Report (JSON)</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
              <h3 className="mb-4 font-bold">Habit Consistency (Last 7 Days)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData}>
                        <XAxis dataKey="date" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e1b4b', borderColor: '#4c1d95', color: '#fff' }} />
                        <Bar dataKey="completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </Card>

          <Card>
              <h3 className="mb-4 font-bold">Focus Areas (Distribution)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
              </div>
          </Card>

          <Card className="md:col-span-2">
              <h3 className="mb-4 font-bold">Spending Trend (Last 7 Days)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityData}>
                        <XAxis dataKey="date" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e1b4b', borderColor: '#4c1d95' }} />
                        <Line type="monotone" dataKey="expenses" stroke="#ec4899" strokeWidth={3} dot={{r: 4}} />
                    </LineChart>
                </ResponsiveContainer>
              </div>
          </Card>
      </div>
    </div>
  );
};

export default Analytics;
