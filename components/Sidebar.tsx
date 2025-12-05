
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Users, LogOut, Settings, PieChart, User as UserIcon, LayoutTemplate, FolderOpen, Rocket, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { Button } from './ui/ui-components';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isMobileOpen: boolean;
  closeMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, isCollapsed, toggleCollapse, isMobileOpen, closeMobile }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Sidebar Width logic handled by Tailwind classes in return

  const NavItem = ({ path, icon: Icon, label }: { path: string; icon: any; label: string }) => (
    <button
      onClick={() => { navigate(path); closeMobile(); }}
      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group relative overflow-hidden ${
        isActive(path)
          ? 'bg-primary/10 text-primary shadow-sm'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      } ${isCollapsed ? 'justify-center px-0' : ''}`}
      title={isCollapsed ? label : ''}
    >
      {isActive(path) && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full`}></div>
      )}
      <Icon size={isCollapsed ? 22 : 18} className={`transition-colors shrink-0 ${isActive(path) ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  );

  const SectionLabel = ({ label }: { label: string }) => {
      if (isCollapsed) return <div className="h-px w-8 bg-slate-200 mx-auto my-4"></div>;
      return <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-4">{label}</div>;
  };

  const sidebarClasses = `
    fixed top-0 left-0 h-screen bg-white/95 backdrop-blur-xl border-r border-slate-200 z-[100]
    transition-all duration-300 ease-in-out flex flex-col
    ${isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0 shadow-none'}
    ${isCollapsed ? 'lg:w-[80px]' : 'lg:w-64'}
  `;

  return (
    <>
        {/* Mobile Backdrop */}
        {isMobileOpen && (
            <div className="fixed inset-0 bg-slate-900/50 z-[99] lg:hidden backdrop-blur-sm" onClick={closeMobile} />
        )}

        <div className={sidebarClasses}>
        {/* Header */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'} py-5 h-16`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200 shrink-0">
                    <Rocket size={20} className="fill-current" />
                </div>
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">EmailShooter</h1>
                    </div>
                )}
            </div>
            {!isCollapsed && (
                <button onClick={closeMobile} className="lg:hidden text-slate-400">
                    <ChevronLeft />
                </button>
            )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-3 space-y-1">
            {isAdmin ? (
            <div className="space-y-1">
                <SectionLabel label="Administration" />
                <NavItem path="/admin/users" icon={Users} label="User Management" />
                <NavItem path="/admin/logs" icon={PieChart} label="Global Logs" />
            </div>
            ) : (
            <>
                <div className="space-y-1">
                    <SectionLabel label="Reports" />
                    <NavItem path="/dashboard" icon={PieChart} label="Analytics" />
                </div>
                
                <div className="space-y-1">
                    <SectionLabel label="Campaigns" />
                    <NavItem path="/campaigns" icon={FolderOpen} label="All Campaigns" />
                    <NavItem path="/templates" icon={LayoutTemplate} label="Email Templates" />
                </div>
                
                <div className="space-y-1">
                    <SectionLabel label="Configuration" />
                    <NavItem path="/settings" icon={Settings} label="SMTP Settings" />
                    <NavItem path="/profile" icon={UserIcon} label="My Profile" />
                </div>
            </>
            )}
        </div>

        {/* Footer */}
        <div className="p-3 mt-auto border-t border-slate-100 bg-slate-50/50">
            {!isCollapsed ? (
                <div className="bg-white p-3 rounded-xl border border-slate-200 mb-3 flex items-center gap-3 shadow-sm">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {user.username.substring(0,2).toUpperCase()}
                    </div>
                    <div className="overflow-hidden min-w-0">
                        <p className="font-semibold text-xs text-slate-900 truncate">{user.username}</p>
                        <p className="text-[10px] text-slate-500 truncate capitalize">{user.role}</p>
                    </div>
                </div>
            ) : (
                 <div className="flex justify-center mb-3">
                     <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs cursor-default" title={user.username}>
                        {user.username.substring(0,2).toUpperCase()}
                    </div>
                 </div>
            )}
            
            <Button
                variant="ghost"
                onClick={onLogout}
                className={`w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
                title="Sign Out"
            >
                <LogOut size={18} className={isCollapsed ? '' : 'mr-2'} />
                {!isCollapsed && "Sign Out"}
            </Button>
            
            {/* Desktop Collapse Toggle */}
            <div className="hidden lg:flex justify-center mt-2 pt-2 border-t border-slate-200">
                <button 
                    onClick={toggleCollapse} 
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
                </button>
            </div>
        </div>
        </div>
    </>
  );
};

export default Sidebar;
