'use client'

import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'

interface HeaderProps {
  variant?: 'landing' | 'app'
}

export default function Header({ variant = 'landing' }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()

  if (variant === 'app') {
    return (
      <header className="flex items-center justify-between whitespace-nowrap border-b border-border-light dark:border-border-dark px-6 lg:px-10 py-3 bg-white dark:bg-card-dark sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-4 text-primary">
            <div className="w-6 h-6">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" fill="currentColor" />
              </svg>
            </div>
            <h2 className="text-text-primary dark:text-white text-lg font-bold leading-tight tracking-tight">SisterCare</h2>
          </Link>
          <nav className="hidden md:flex items-center gap-9">
            <Link href="/dashboard" className="text-primary text-sm font-semibold leading-normal">Dashboard</Link>
            <Link href="/chat" className="text-text-primary dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors">Support Chat</Link>
            <Link href="/library" className="text-text-primary dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors">Library</Link>
            <Link href="/settings" className="text-text-primary dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors">Settings</Link>
          </nav>
        </div>
        <div className="flex flex-1 justify-end gap-4 items-center">
          <label className="hidden md:flex flex-col min-w-40 h-10 max-w-64">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full overflow-hidden">
              <div className="text-text-secondary flex border-none bg-border-light dark:bg-border-dark items-center justify-center pl-4">
                <span className="material-symbols-outlined text-xl">search</span>
              </div>
              <input 
                className="form-input flex w-full min-w-0 flex-1 border-none bg-border-light dark:bg-border-dark text-text-primary dark:text-white focus:ring-0 h-full placeholder:text-text-secondary px-4 pl-2 text-sm" 
                placeholder="Search resources..." 
              />
            </div>
          </label>
          <div className="flex gap-2">
            <button 
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-lg size-10 bg-border-light dark:bg-border-dark text-text-primary dark:text-white hover:bg-primary hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
            <button className="flex items-center justify-center rounded-lg size-10 bg-border-light dark:bg-border-dark text-text-primary dark:text-white">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20"
              style={{ backgroundImage: `url('${user?.photoURL || 'https://ui-avatars.com/api/?name=User&background=8c30e8&color=fff'}')` }}
            />
            {user && (
              <button 
                onClick={signOut}
                className="text-sm text-text-secondary hover:text-primary transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
    )
  }

  // Landing page header
  return (
    <header className="flex items-center justify-between border-b border-border-light dark:border-border-dark px-6 lg:px-40 py-4 sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md z-50">
      <div className="flex items-center gap-3">
        <div className="text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">female</span>
        </div>
        <h2 className="text-lg font-bold leading-tight tracking-tight">SisterCare</h2>
      </div>
      <div className="flex flex-1 justify-end gap-8 items-center">
        <nav className="hidden md:flex items-center gap-8">
          <a className="text-sm font-medium hover:text-primary transition-colors" href="#mission">Our Mission</a>
          <a className="text-sm font-medium hover:text-primary transition-colors" href="#features">Features</a>
          <a className="text-sm font-medium hover:text-primary transition-colors" href="#privacy">Privacy</a>
        </nav>
        <div className="flex gap-3">
          <button 
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-lg size-10 bg-border-light dark:bg-border-dark text-text-primary dark:text-white hover:bg-primary hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>
          <Link 
            href="/auth/signup"
            className="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold transition-opacity hover:opacity-90"
          >
            Sign Up
          </Link>
          <Link 
            href="/auth/login"
            className="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 bg-border-light dark:bg-border-dark text-text-primary dark:text-white text-sm font-bold transition-colors hover:bg-opacity-80"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  )
}
