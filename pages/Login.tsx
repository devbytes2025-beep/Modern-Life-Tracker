import React, { useState } from 'react';
import { useApp } from '../App';
import { backend } from '../services/mockBackend';
import { Button, Input, Card, Select } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { playSound, SECURITY_QUESTIONS } from '../constants';

const Login: React.FC = () => {
  const { loginUser } = useApp();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [securityMethod, setSecurityMethod] = useState<'key' | 'question'>('question');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    securityQuestion: SECURITY_QUESTIONS[0],
    secretKeyAnswer: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateUsername = (username: string) => {
      const regex = /^[a-zA-Z0-9_]{3,16}$/;
      return regex.test(username);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    playSound('click');
    
    try {
      if (isSignup) {
        if (!validateUsername(formData.username)) {
            throw new Error("Username must be 3-16 characters, alphanumeric or underscore only.");
        }
        if (formData.password !== formData.confirmPassword) throw new Error("Passwords do not match");
        if (!formData.secretKeyAnswer) throw new Error("Security answer required");
        
        const user = await backend.register({
            username: formData.username,
            email: formData.email,
            secretKeyAnswer: formData.secretKeyAnswer,
            securityQuestion: securityMethod === 'question' ? formData.securityQuestion : undefined
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
            placeholder="Username (Alphanumeric, 3-16 chars)" 
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
                
                <div className="pt-2">
                    <label className="text-sm text-gray-400 mb-1 block">Security Method</label>
                    <div className="flex gap-2 mb-2">
                        <Button 
                            type="button" 
                            variant={securityMethod === 'question' ? 'primary' : 'ghost'}
                            onClick={() => setSecurityMethod('question')}
                            className="flex-1 py-1 text-sm"
                        >
                            Question
                        </Button>
                        <Button 
                            type="button" 
                            variant={securityMethod === 'key' ? 'primary' : 'ghost'}
                            onClick={() => setSecurityMethod('key')}
                            className="flex-1 py-1 text-sm"
                        >
                            Secret Key
                        </Button>
                    </div>

                    {securityMethod === 'question' ? (
                        <Select 
                            name="securityQuestion"
                            value={formData.securityQuestion}
                            onChange={handleChange}
                            className="mb-2"
                        >
                            {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                        </Select>
                    ) : (
                        <div className="text-xs text-indigo-300 mb-2 p-2 bg-indigo-900/20 rounded">
                            Use a unique phrase only you know.
                        </div>
                    )}
                    
                    <Input 
                        name="secretKeyAnswer" 
                        placeholder="Your Answer" 
                        value={formData.secretKeyAnswer} 
                        onChange={handleChange} 
                        required 
                    />
                </div>
            </>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <Button type="submit" className="w-full justify-center mt-6">
            {isSignup ? 'Sign Up' : 'Login'}
          </Button>

          <div className="flex justify-between items-center text-sm text-gray-400 mt-4">
             <button type="button" onClick={() => setIsSignup(!isSignup)} className="hover:text-white transition-colors">
                 {isSignup ? 'Already have an account? Login' : 'Create an account'}
             </button>
             {!isSignup && <button type="button" className="hover:text-white transition-colors">Forgot Password?</button>}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Login;
