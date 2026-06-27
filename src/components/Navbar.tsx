import { motion } from 'framer-motion';
import clsx from 'clsx';

interface NavbarProps {
  username: string;
  role: 'coach' | 'member';
  onThemeToggle?: () => void;
  isDarkMode?: boolean;
}

export default function Navbar({
  username,
  role,
  onThemeToggle,
  isDarkMode = false,
}: NavbarProps) {

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-gray-500">
                {role === 'coach' ? 'Dashboard Coach' : 'Personal Dashboard'}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Role Badge */}
            <div
              className={clsx(
                'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
                role === 'coach'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              )}
            >
              <span
                className={clsx(
                  'w-2 h-2 rounded-full',
                  role === 'coach' ? 'bg-purple-500' : 'bg-blue-500'
                )}
                aria-hidden="true"
              />
              <span>{role === 'coach' ? 'Coach' : 'Member'}</span>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white font-semibold text-sm shadow-sm">
                {username.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Theme Toggle (optional) */}
            {onThemeToggle && (
              <button
                onClick={onThemeToggle}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label={isDarkMode ? 'Light mode' : 'Dark mode'}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            )}

            {/* Logout Button */}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
