import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  CommandLineIcon,
  UserGroupIcon,
  UsersIcon,
  KeyIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const { user, logout, theme, toggleTheme } = useAuth();

  const navigation = [
    { name: 'Dashboard', to: '/', icon: HomeIcon, roles: ['Super Admin', 'Security Analyst', 'Privileged User'] },
    { name: 'Live Monitor', to: '/monitor', icon: CommandLineIcon, roles: ['Super Admin', 'Security Analyst'] },
    { name: 'User Behaviour', to: '/behaviour', icon: UserGroupIcon, roles: ['Super Admin', 'Security Analyst'] },
    { name: 'User Directory', to: '/directory', icon: UsersIcon, roles: ['Super Admin', 'Security Analyst'] },
    { name: 'Privileged Log', to: '/privileged', icon: KeyIcon, roles: ['Super Admin', 'Security Analyst', 'Privileged User'] },
    { name: 'AI Prediction', to: '/ai-predict', icon: CpuChipIcon, roles: ['Super Admin', 'Security Analyst'] },
    { name: 'Incidents', to: '/incidents', icon: ExclamationTriangleIcon, roles: ['Super Admin', 'Security Analyst'] },
    { name: 'Quantum Safe', to: '/quantum', icon: LockClosedIcon, roles: ['Super Admin', 'Security Analyst', 'Privileged User'] },
    { name: 'Settings', to: '/settings', icon: Cog6ToothIcon, roles: ['Super Admin', 'Security Analyst'] },
  ];

  const filteredNav = navigation.filter(item => user && item.roles.includes(user.role));

  const getRoleBadgeColor = (role) => {
    if (role === 'Super Admin') return 'bg-red-500/20 text-red-400 border border-red-500/30';
    if (role === 'Security Analyst') return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  };

  return (
    <aside className="w-64 h-screen fixed top-0 left-0 bg-slate-950/80 border-r border-white/10 backdrop-blur-xl flex flex-col justify-between py-4 z-30">
      <div className="flex flex-col flex-grow overflow-hidden">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 mb-5 flex-shrink-0">
          <div className="p-2 rounded-lg bg-white/5 text-white border border-white/10 shadow-glass">
            <ShieldCheckIcon className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              SentinelAI
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Bank SecOps</p>
          </div>
        </div>

        {/* Navigation Routes */}
        <nav className="space-y-1 px-3 overflow-y-auto flex-grow">
          {filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-gradient-to-r from-sky-500/10 to-indigo-500/10 text-cyan-400 border-l-2 border-cyan-400 shadow-[inset_4px_0_10px_rgba(56,189,248,0.05)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Session Info footer */}
      <div className="px-4 space-y-2.5 flex-shrink-0 mt-4">
        {user && (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Security Identity</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-green"></span>
            </div>
            <div className="font-mono text-sm font-bold text-slate-200 truncate">
              {user.username}
            </div>
            <div className={`text-[10px] uppercase font-bold py-0.5 px-2 rounded-md inline-block ${getRoleBadgeColor(user.role)}`}>
              {user.role}
            </div>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200 cursor-pointer"
        >
          {theme === 'light' ? (
            <>
              <MoonIcon className="h-5 w-5 text-slate-500" />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <SunIcon className="h-5 w-5 text-amber-400" />
              <span>Light Mode</span>
            </>
          )}
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span>Exit Session</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
