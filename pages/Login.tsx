import React, { useState } from 'react';
import { useApp } from '../App';
import { backend } from '../services/mockBackend';
import { Button, Input, Card, Modal } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { playSound } from '../constants';

const Login: React.FC = () => {
  const { loginUser, showToast } = useApp();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  
  // Forgot Password State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Password Strength State
  const [pwdStrength, setPwdStrength] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'password') {
        calculateStrength(value);
    }
  };

  const calculateStrength = (pwd: string) => {
      let score = 0;
      if (pwd.length > 8) score++;
      if (/[A-Z]/.test(pwd)) score++;
      if (/[0-9]/.test(pwd)) score++;
      setPwdStrength(score);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    playSound('click');
    
    try {
      if (isSignup) {
        if (formData.password !== formData.confirmPassword) throw new Error("Passwords do not match");
        if (pwdStrength < 2) throw new Error("Password too weak");

        // Use email for registration as per Firebase standard
        await backend.register({
            email: formData.email,
            username: formData.username
        }, formData.password);
        
        showToast("Account created!", 'success');
        playSound('success');
      } else {
        // Login with Email/Password (Firebase default)
        // If user entered username, this might fail unless we map it, 
        // but let's assume Email for simplicity in Firebase
        const loginEmail = formData.email || formData.username; // Fallback if they typed email in username field
        if (!loginEmail.includes('@')) {
            throw new Error("Please use Email to login");
        }
        
        await backend.login(loginEmail, formData.password);
        playSound('success');
        showToast("Welcome back!", 'success');
      }
      navigate('/'); 
      
    } catch (err: any) {
      playSound('error');
      // Firebase error mapping
      let msg = err.message;
      if (msg.includes('auth/invalid-email')) msg = "Invalid email address";
      if (msg.includes('auth/user-not-found')) msg = "User not found";
      if (msg.includes('auth/wrong-password')) msg = "Incorrect password";
      if (msg.includes('auth/email-already-in-use')) msg = "Email already registered";
      
      showToast(msg, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!forgotEmail) {
          showToast("Please enter your email", 'error');
          return;
      }
      try {
          await backend.resetPassword(forgotEmail);
          showToast("Password reset link sent!", 'success');
          setIsForgotOpen(false);
          setForgotEmail('');
      } catch (err: any) {
          showToast(err.message || "Failed to send reset email", 'error');
      }
  };

  // Render Strength Bar
  const renderStrengthBar = () => {
      const colors = ['bg-red-500', 'bg-yellow-500', 'bg-green-500'];
      const width = (pwdStrength / 3) * 100;
      const color = colors[Math.min(pwdStrength, 2)];
      
      return (
          <div className="mt-1">
              <div className="h-1 w-full bg-gray-700 rounded overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${Math.min(width, 100)}%` }}></div>
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-[float_6s_ease-in-out_infinite]">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 mb-2">
                GlassHabit
            </h1>
            <p className="text-gray-400">Powered by Firebase & Cloudflare</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* For Login, we prefer Email */}
          <Input 
            name={isSignup ? "username" : "username"} // Reusing name for state mapping logic
            placeholder={isSignup ? "Display Name" : "Email Address"} 
            value={formData.username} 
            onChange={handleChange} 
            required 
          />
          
          {isSignup && (
            <Input 
              name="email" 
              type="email" 
              placeholder="Email Address" 
              value={formData.email} 
              onChange={handleChange} 
              required 
            />
          )}

          <div>
            <Input 
                name="password" 
                type="password" 
                placeholder="Password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
            />
            {isSignup && renderStrengthBar()}
          </div>

          {isSignup && (
             <Input 
                name="confirmPassword" 
                type="password" 
                placeholder="Confirm Password" 
                value={formData.confirmPassword} 
                onChange={handleChange} 
                required 
            />
          )}

          <Button type="submit" className="w-full justify-center mt-6" disabled={isLoading}>
            {isLoading ? 'Processing...' : (isSignup ? 'Create Account' : 'Login')}
          </Button>

          <div className="flex justify-between items-center text-sm text-gray-400 mt-4">
             <button type="button" onClick={() => { setIsSignup(!isSignup); setFormData({username: '', email: '', password: '', confirmPassword: ''}); }} className="hover:text-white transition-colors">
                 {isSignup ? 'Already have an account? Login' : 'Create an account'}
             </button>
             {!isSignup && (
                 <button 
                    type="button" 
                    onClick={() => setIsForgotOpen(true)}
                    className="hover:text-white transition-colors"
                 >
                     Forgot Password?
                 </button>
             )}
          </div>
        </form>
      </Card>

      {/* Forgot Password Modal */}
      <Modal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} title="Reset Password">
          <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-gray-300">Enter your email address to receive a password reset link.</p>
              <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={forgotEmail} 
                  onChange={e => setForgotEmail(e.target.value)} 
                  required
              />
              <Button type="submit" className="w-full">Send Reset Link</Button>
          </form>
      </Modal>
    </div>
  );
};

export default Login;