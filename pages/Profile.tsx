import React from 'react';
import { useApp } from '../App';
import { Card } from '../components/UI';
import { User as UserIcon } from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useApp();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="text-center py-12">
        <div className="w-32 h-32 bg-gradient-to-tr from-pink-500 to-violet-500 rounded-full mx-auto flex items-center justify-center text-4xl font-bold shadow-2xl mb-6">
            {user.username.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-3xl font-bold">{user.username}</h2>
        <p className="text-gray-400">{user.email}</p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
            <h3 className="text-gray-400 text-sm mb-1">User ID</h3>
            <p className="font-mono text-xs">{user.id}</p>
        </Card>
        <Card>
            <h3 className="text-gray-400 text-sm mb-1">Status</h3>
            <p className="text-green-400 font-bold">Active Pro</p>
        </Card>
        <Card className="col-span-2">
            <h3 className="text-gray-400 text-sm mb-1">Bio</h3>
            <p className="italic text-gray-200">{user.bio || "No bio set yet. Go to settings to update."}</p>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
