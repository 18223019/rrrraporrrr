/**
 * SidebarNav Component - Main Navigation Sidebar
 * With Lucide icons and active state highlighting
 */

import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Moon,
  BookOpen,
  Users,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  color: string;
}

const getNavItems = (userSlug: string): NavItem[] => [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: `/${userSlug}`,
    icon: <LayoutDashboard size={20} />,
    color: '#8b5cf6', // Purple
  },
  {
    id: 'ketakmiran',
    label: 'Ketakmiran',
    path: `/${userSlug}/ketakmiran`,
    icon: <Moon size={20} />,
    color: '#3b82f6', // Blue
  },
  {
    id: 'pembinaan',
    label: 'Pembinaan',
    path: `/${userSlug}/pembinaan`,
    icon: <BookOpen size={20} />,
    color: '#10b981', // Green
  },
  {
    id: 'aktualisasi',
    label: 'Aktualisasi Diri',
    path: `/${userSlug}/aktualisasi`,
    icon: <Sparkles size={20} />,
    color: '#8b5cf6', // Purple
  },
  {
    id: 'internal',
    label: 'Internal',
    path: `/${userSlug}/internal`,
    icon: <Users size={20} />,
    color: '#f59e0b', // Orange
  },
];

interface SidebarNavProps {
  collapsed?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  collapsed = false,
  onToggle,
  isMobile = false,
  isOpen = true,
  onClose,
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const previousPathname = useRef(location.pathname);
  
  // Get user slug from auth or URL params
  const userSlug = user?.uid || 'test';
  const navItems = getNavItems(userSlug);
  const isCollapsed = !isMobile && collapsed;

  useEffect(() => {
    const hasNavigated = previousPathname.current !== location.pathname;

    if (isMobile && isOpen && onClose && hasNavigated) {
      onClose();
    }

    previousPathname.current = location.pathname;
  }, [isMobile, isOpen, location.pathname, onClose]);

  const sidebarClasses = [
    'sidebar-nav',
    isCollapsed ? 'collapsed' : '',
    isMobile ? 'mobile' : '',
    isMobile && isOpen ? 'open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const toggleAriaLabel = isMobile
    ? isOpen
      ? 'Tutup navigasi'
      : 'Buka navigasi'
    : isCollapsed
    ? 'Perluas sidebar'
    : 'Sembunyikan sidebar';

  const toggleIcon = isMobile ? (isOpen ? <X size={20} /> : <Menu size={20} />) : isCollapsed ? <Menu size={20} /> : <X size={20} />;

  return (
    <motion.aside
      className={sidebarClasses}
      initial={false}
      {...(!isMobile
        ? {
            animate: { width: isCollapsed ? '80px' : '240px' },
            transition: { duration: 0.3, ease: 'easeInOut' },
          }
        : {
            style: { width: '240px' },
          })}
    >
      {/* Header */}
      <div className="sidebar-header">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sidebar-logo"
          >
            <h1 className="text-xl font-bold text-gradient">Rapor Asrama</h1>
            <p className="text-xs text-tertiary">2025/2026</p>
          </motion.div>
        )}
        <button onClick={onToggle} className="sidebar-toggle" aria-label={toggleAriaLabel}>
          {toggleIcon}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav-items">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              style={{
                '--item-color': item.color,
              } as React.CSSProperties}
              onClick={isMobile ? onClose : undefined}
            >
              <motion.div
                className="sidebar-nav-item-inner"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="sidebar-nav-icon" style={{ color: isActive ? item.color : undefined }}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <motion.span
                    className="sidebar-nav-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </motion.div>
              {isActive && (
                <motion.div
                  className="sidebar-nav-indicator"
                  layoutId="activeIndicator"
                  style={{ backgroundColor: item.color }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      
    </motion.aside>
  );
};

export default SidebarNav;
