/**
 * MainLayout - Layout wrapper dengan Sidebar Navigation
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { SidebarNav } from '../components/navigation';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 900px)');

  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      document.body.style.overflow = '';
      return undefined;
    }

    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isSidebarOpen]);

  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen((prev) => !prev);
      return;
    }

    setSidebarCollapsed((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const layoutClassName = useMemo(() => {
    const classNames = ['main-layout'];

    if (isMobile) {
      classNames.push('is-mobile');
      if (isSidebarOpen) {
        classNames.push('sidebar-open');
      }
    } else if (sidebarCollapsed) {
      classNames.push('sidebar-collapsed');
    } else {
      classNames.push('sidebar-expanded');
    }

    return classNames.join(' ');
  }, [isMobile, isSidebarOpen, sidebarCollapsed]);

  return (
    <div className={layoutClassName}>
      <SidebarNav
        collapsed={!isMobile && sidebarCollapsed}
        isMobile={isMobile}
        isOpen={!isMobile || isSidebarOpen}
        onToggle={handleToggleSidebar}
        onClose={handleCloseSidebar}
      />

      {isMobile && (
        <button
          type="button"
          aria-label="Tutup navigasi"
          className={`sidebar-backdrop${isSidebarOpen ? ' visible' : ''}`}
          onClick={handleCloseSidebar}
        />
      )}

      <div className="main-layout__content-area">
        {isMobile && (
          <header className="mobile-topbar">
            <button
              type="button"
              className="mobile-topbar__menu"
              onClick={handleToggleSidebar}
              aria-label="Buka navigasi"
            >
              <Menu size={20} />
            </button>
            <span className="mobile-topbar__brand">Rapor Asrama</span>
          </header>
        )}

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
