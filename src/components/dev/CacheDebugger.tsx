/**
 * CacheDebugger Component - Show cache stats for development
 * Press Ctrl+Shift+C to toggle
 */

import React, { useState, useEffect } from 'react';
import { getCacheStats, clearCache } from '../../services/api';

export const CacheDebugger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<{ size: number; keys: string[] }>({ size: 0, keys: [] });

  const updateStats = () => {
    setStats(getCacheStats());
  };

  useEffect(() => {
    // Update stats every second when open
    if (isOpen) {
      updateStats();
      const interval = setInterval(updateStats, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    // Keyboard shortcut: Ctrl+Shift+C
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClearCache = () => {
    clearCache();
    updateStats();
    console.log('Cache cleared manually');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#1f2937',
      color: '#f3f4f6',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      zIndex: 9999,
      minWidth: '300px',
      maxWidth: '500px',
      maxHeight: '400px',
      overflow: 'auto',
      fontFamily: 'monospace',
      fontSize: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
          💾 API Cache Stats
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #374151' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#9ca3af' }}>Cached Entries:</span>
          <strong>{stats.size}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#9ca3af' }}>TTL:</span>
          <strong>5 minutes</strong>
        </div>
        <button
          onClick={handleClearCache}
          style={{
            width: '100%',
            padding: '6px 12px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            marginTop: '8px',
          }}
        >
          🗑️ Clear All Cache
        </button>
      </div>

      <div>
        <div style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '11px' }}>
          Cached Keys:
        </div>
        {stats.keys.length === 0 ? (
          <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
            No cached entries
          </div>
        ) : (
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {stats.keys.map((key, index) => (
              <div
                key={index}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#374151',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  wordBreak: 'break-all',
                }}
              >
                {key}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #374151',
        fontSize: '10px',
        color: '#6b7280',
      }}>
        Press <kbd style={{ 
          backgroundColor: '#374151', 
          padding: '2px 6px', 
          borderRadius: '3px',
          color: '#f3f4f6',
        }}>Ctrl+Shift+C</kbd> to toggle
      </div>
    </div>
  );
};
