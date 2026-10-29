import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LogOut,
  User as UserIcon,
  Sparkles,
  LayoutDashboard,
  FileText,
  Moon,
  Contrast,
  Sun,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  if (!user) return null;

  const isDemo = user.email.includes('demo');

  const navLinks = [
    { to: '/board', label: 'Job Board', icon: LayoutDashboard },
    { to: '/resumes', label: 'Resume Vault', icon: FileText },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/board" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                HireTrack AI
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1.5 pl-4 border-l border-slate-800">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* User Profile Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
            <UserIcon className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium text-slate-200 max-w-[120px] sm:max-w-none truncate">
              {user.name}
            </span>
            {isDemo && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                DEMO
              </span>
            )}
          </div>

          {/* 3-Way Theme Switcher: Dark, Middle-Gray, Light */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-800/80 border border-slate-700/60 gap-0.5">
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-slate-900 text-blue-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Midnight Dark"
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dark</span>
            </button>

            <button
              onClick={() => setTheme('gray')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                theme === 'gray'
                  ? 'bg-[#414D65] text-[#F4F6FC] shadow-sm border border-[#596780]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Muted Navy Theme (#343F56)"
            >
              <Contrast className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden md:inline">Navy</span>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Crisp Light Mode"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Light</span>
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 p-2 sm:px-3 sm:py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Log out of account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
