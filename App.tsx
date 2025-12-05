
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Analytics from './pages/Analytics'; 
import Settings from './pages/Settings'; 
import UserProfile from './pages/UserProfile'; 
import Templates from './pages/Templates'; 
import Campaigns from './pages/Campaigns'; 
import Sidebar from './components/Sidebar';
import ComposeModal from './components/ComposeModal'; 
import { ApiService } from './services/apiService';
import { User, UserRole } from './types';
import { FeedbackProvider } from './components/ui/GlobalFeedback';
import { Menu, Rocket } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    // Responsive check
    if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
    }
  }, []);

  const checkAuth = async () => {
    try {
        const currentUser = await ApiService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }
    } catch (e) {
        console.log("Not logged in");
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.role === UserRole.ADMIN) {
        navigate('/admin/users');
    } else {
        navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setUser(null);
    navigate('/login');
  };

  if (isLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-indigo-600 gap-4 bg-slate-50">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="font-medium animate-pulse">Connecting...</p>
        </div>
    );
  }

  if (!user) {
    return (
        <FeedbackProvider>
            <Routes>
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </FeedbackProvider>
    );
  }

  // Calculate Main Margin based on sidebar state (Desktop only)
  const mainMarginClass = sidebarCollapsed ? 'lg:ml-[80px]' : 'lg:ml-64';

  return (
    <FeedbackProvider>
        <div className="flex bg-slate-50 min-h-screen font-sans">
          
          <Sidebar 
            user={user} 
            onLogout={handleLogout} 
            isCollapsed={sidebarCollapsed}
            toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            isMobileOpen={mobileSidebarOpen}
            closeMobile={() => setMobileSidebarOpen(false)}
          />

          <main className={`flex-1 ${mainMarginClass} transition-all duration-300 min-w-0 flex flex-col`}>
             {/* Mobile Header */}
             <div className="lg:hidden h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button onClick={() => setMobileSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                        <Menu size={24}/>
                    </button>
                    <div className="flex items-center gap-2 text-indigo-700 font-bold">
                        <Rocket size={18} className="fill-current"/> EmailShooter
                    </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-200">
                    {user.username.substring(0,2).toUpperCase()}
                </div>
             </div>

            <div className="fade-in-animation flex-1 p-4 lg:p-6">
                <Routes>
                    {/* Admin Routes */}
                    {user.role === UserRole.ADMIN ? (
                        <>
                            <Route path="/admin/users" element={<AdminDashboard />} />
                            <Route path="/admin/logs" element={<div className="text-center mt-10">Global Logs Placeholder</div>} />
                            <Route path="*" element={<Navigate to="/admin/users" />} />
                        </>
                    ) : (
                    /* User Routes */
                        <>
                            <Route path="/dashboard" element={<Analytics />} />
                            <Route path="/campaigns" element={<Campaigns user={user} />} />
                            <Route path="/templates" element={<Templates user={user} />} />
                            <Route path="/settings" element={<Settings user={user} onUpdateUser={setUser} />} />
                            <Route path="/profile" element={<UserProfile user={user} />} />
                            <Route path="*" element={<Navigate to="/dashboard" />} />
                        </>
                    )}
                </Routes>
            </div>
          </main>
          
          {/* Quick Access Compose Button */}
          {user.role !== UserRole.ADMIN && (
            <ComposeModal user={user} onNavigateSettings={() => navigate('/settings')} />
          )}

          <style>{`
            .fade-in-animation {
                animation: fadeIn 0.3s ease-in-out forwards;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: none; }
            }
            /* Custom Scrollbar for Sidebar */
            .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(156, 163, 175, 0.3);
                border-radius: 4px;
            }
            .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                background: rgba(156, 163, 175, 0.5);
            }
          `}</style>
        </div>
    </FeedbackProvider>
  );
};

export default App;
