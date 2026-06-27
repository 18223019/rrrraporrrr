/**
 * PasswordGate Component
 * Full-page overlay dengan password protection (hardcoded)
 * Tidak butuh Firebase Auth, hanya pattern matching di frontend
 */

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordGateProps {
  children: React.ReactNode;
  correctPassword?: string;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ 
  children, 
  correctPassword = 'ciecoachcak' 
}) => {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === correctPassword) {
      setIsUnlocked(true);
      setError('');
    } else {
      setError('Password salah! Coba lagi.');
      setPassword('');
      
      // Shake animation effect
      const input = document.getElementById('password-input');
      if (input) {
        input.classList.add('animate-shake');
        setTimeout(() => input.classList.remove('animate-shake'), 500);
      }
    }
  };

  // Jika sudah unlocked, render children
  if (isUnlocked) {
    return <>{children}</>;
  }

  // Render password gate overlay
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 'clamp(1rem, 6vw, 3rem)',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: 'min(420px, 100%)',
        background: '#ffffff',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{
          padding: '2rem clamp(1.5rem, 6vw, 2.75rem) 1.25rem',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '0.5rem',
          }}>
            Dashboard Coach
          </h1>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '0 clamp(1.5rem, 6vw, 2.75rem) clamp(2.25rem, 7vw, 3rem)',
            display: 'grid',
            rowGap: '1.5rem',
            justifyItems: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'grid',
              rowGap: '0.75rem',
            }}
          >
            <label
              style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                textAlign: 'center',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Masukkan password..."
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  paddingRight: '3rem',
                  fontSize: '1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                autoFocus
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: '0.25rem',
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                color: '#991b1b',
                fontSize: '0.875rem',
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '600',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }}
          >
            Buka Dashboard
          </button>

          {/* Hint */}
          <p
            style={{
              marginTop: '0.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #e5e7eb',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#6b7280',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            Lupa password? Cek deskripsi grup coach
          </p>
        </form>
      </div>
    </div>
  );
};
