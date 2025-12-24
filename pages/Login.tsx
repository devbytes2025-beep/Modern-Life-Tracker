import React, { useState } from 'react';
import { useApp } from '../App';
import { backend } from '../services/mockBackend';
import { Button, Input, Card } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { playSound } from '../constants';

const Login: React.FC = () => {
  const { loginUser } = useApp();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    secretKeyAnswer: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    playSound('click');
    
    try {
      if (isSignup) {
        if (formData.password !== formData.confirmPassword) throw new Error("Passwords do not match");
        if (!formData.secretKeyAnswer) throw new Error("Secret Answer required for recovery");
        
        const user = await backend.register({
            username: formData.username,
            email: formData.email,
            secretKeyAnswer: formData.secretKeyAnswer,
            // In real app password would be separate
        });
        loginUser(user);
      } else {
        const user = await backend.login(formData.username, formData.password);
        loginUser(user);
      }
      playSound('success');
      navigate('/');
    } catch (err: any) {
        playSound('error');
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-[float_6s_ease-in-out_infinite]">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 mb-2">
                GlassHabit
            </h1>
            <p className="text-gray-400">Master your life with AI & Aesthetics</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            name="username" 
            placeholder="Username" 
            value={formData.username} 
            onChange={handleChange} 
            required 
          />
          
          {isSignup && (
            <Input 
              name="email" 
              type="email" 
              placeholder="Email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
            />
          )}

          <Input 
            name="password" 
            type="password" 
            placeholder="Password" 
            value={formData.password} 
            onChange={handleChange} 
            required 
          />

          {isSignup && (
            <>
                <Input 
                    name="confirmPassword" 
                    type="password" 
                    placeholder="Confirm Password" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    required 
                />
                <Input 
                    name="secretKeyAnswer" 
                    placeholder="Secret Key (What is your pet's name?)" 
                    value={formData.secretKeyAnswer} 
                    onChange={handleChange} 
                    required 
                />
            </>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <Button type="submit" className="w-full justify-center">
            {isSignup ? 'Sign Up' : 'Login'}
          </Button>

          <div className="flex justify-between items-center text-sm text-gray-400 mt-4">
             <button type="button" onClick={() => setIsSignup(!isSignup)} className="hover:text-white transition-colors">
                 {isSignup ? 'Already have an account? Login' : 'Create an account'}
             </button>
             {!isSignup && <button type="button" className="hover:text-white transition-colors">Forgot Password?</button>}
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
             <Button type="button" variant="ghost" className="w-full text-sm">
                 Continue with Google (Simulated)
             </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Login;
