/**
 * Minimal Test Page - To isolate rendering issues
 */

import React from 'react';

export const MinimalTest: React.FC = () => {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#8b5cf6', fontSize: '2rem', marginBottom: '1rem' }}>
        🎨 Paket 1 - Test Page
      </h1>
      <p style={{ fontSize: '1rem', marginBottom: '1rem' }}>
        If you can see this, React is working! ✅
      </p>
      
      <div style={{ 
        padding: '1.5rem', 
        background: '#f3f4f6', 
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Design System Colors:</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            background: '#3b82f6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            Ketakmiran
          </div>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            background: '#10b981',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            Pembinaan
          </div>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            background: '#8b5cf6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            Aktualisasi
          </div>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            background: '#f59e0b',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            Internal
          </div>
        </div>
      </div>

      <div style={{ 
        padding: '1rem', 
        background: '#fef3c7', 
        borderRadius: '8px',
        border: '2px solid #f59e0b'
      }}>
        <p style={{ margin: 0 }}>
          <strong>Next:</strong> Try accessing <code>/test-with-components</code> to test actual Bento components
        </p>
      </div>
    </div>
  );
};

export default MinimalTest;
