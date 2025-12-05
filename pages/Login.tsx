

import React, { useState } from 'react';
import { ApiService } from '../services/apiService';
import { User } from '../types';
import { Mail, Loader2, AlertCircle, ShieldCheck, Zap, ArrowRight, UserPlus, CheckCircle } from 'lucide-react';
import { Card, CardContent, Input, Label, Button } from '../components/ui/ui-components';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      if (isRegistering) {
          const res = await ApiService.register(username, password);
          setSuccessMsg(res.msg);
          setIsRegistering(false); // Switch back to login
          setUsername('');
          setPassword('');
      } else {
          const { user } = await ApiService.login(username, password);
          onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-background font-sans">
      {/* Left Side - Visual & Branding */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900 p-12 text-white relative overflow-hidden">
         {/* Background Patterns */}
         <div className="absolute top-0 right-0 p-20 bg-indigo-500 rounded-full blur-[150px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
         <div className="absolute bottom-0 left-0 p-32 bg-fuchsia-600 rounded-full blur-[200px] opacity-20 transform -translate-x-1/3 translate-y-1/3"></div>
         <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
         
         <div className="z-10 flex items-center gap-3 text-xl font-bold">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20 shadow-lg">
                <Mail className="h-6 w-6 text-indigo-300" />
            </div>
            EmailShooter
         </div>

         <div className="z-10 max-w-xl">
            <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                Scale Your Outreach with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Precision</span>.
            </h1>
            <p className="text-indigo-100/80 text-lg mb-12 leading-relaxed font-light">
                The comprehensive platform for high-performance email campaigns. Manage contacts, analyze delivery rates, and automate your workflow securely.
            </p>
            
            <div className="grid grid-cols-2 gap-6 text-sm text-indigo-200/90">
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div className="bg-yellow-500/20 p-2 rounded-lg"><Zap className="h-4 w-4 text-yellow-300" /></div>
                    <span>High Throughput</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div className="bg-emerald-500/20 p-2 rounded-lg"><ShieldCheck className="h-4 w-4 text-emerald-300" /></div>
                    <span>Secure SMTP</span>
                </div>
            </div>
         </div>

         <div className="z-10 text-sm text-indigo-300/60 flex justify-between items-end">
            <span>© 2024 EmailShooter Inc.</span>
            <span className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
            </span>
         </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-8 bg-slate-50 relative">
        <div className="absolute top-0 right-0 p-8">
            <Button variant="ghost" className="text-slate-500">Need help?</Button>
        </div>

        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-2 text-center lg:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">{isRegistering ? 'Create Account' : 'Welcome back'}</h2>
                <p className="text-slate-500">
                    {isRegistering ? 'Register to get started with EmailShooter.' : 'Enter your credentials to access your dashboard.'}
                </p>
            </div>

            <Card className="border-0 shadow-xl shadow-slate-200/60 bg-white overflow-hidden ring-1 ring-slate-100">
                <CardContent className="pt-8 px-8 pb-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                <CheckCircle size={16} /> {successMsg}
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <Label htmlFor="username">Username (Email)</Label>
                            <Input
                                id="username"
                                placeholder="name@company.com"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (
                                isRegistering ? 
                                <span className="flex items-center">Register <UserPlus size={16} className="ml-2 opacity-80"/></span> :
                                <span className="flex items-center">Sign In <ArrowRight size={16} className="ml-2 opacity-80"/></span>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    {isRegistering ? (
                        <p className="text-sm text-slate-500">
                            Already have an account? 
                            <button onClick={() => setIsRegistering(false)} className="ml-1 font-semibold text-indigo-600 hover:underline">Sign In</button>
                        </p>
                    ) : (
                        <p className="text-sm text-slate-500">
                            Don't have an account? 
                            <button onClick={() => setIsRegistering(true)} className="ml-1 font-semibold text-indigo-600 hover:underline">Register now</button>
                        </p>
                    )}
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
