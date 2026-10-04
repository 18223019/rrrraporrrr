import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, getUserSlug, isCoach } from '../services/auth';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(username, password);
      
      // Redirect berdasarkan role
      const userIsCoach = await isCoach();
      const slug = getUserSlug();
      
      if (userIsCoach) {
        navigate('/coach/', { replace: true });
      } else {
        navigate(`/${slug}`, { replace: true });
      }
    } catch (err: any) {
      setError('Username atau password salah. Silakan coba lagi.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #eadcc8 0%, #b9825b 100%)',
      padding: '1rem',
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: '#fffaf3',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '2.5rem 2rem 2rem 2rem',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#4a2f22',
            margin: '0 0 0.5rem 0',
          }}>
            Rapor Anggota Asrama Salman
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#765743',
            margin: 0,
          }}>
            Virtue Wisdom 2026/2027
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '0 2rem 2.5rem 2rem' }}>
          {error && (
            <div style={{
              padding: '0.875rem 1rem',
              marginBottom: '1.5rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              color: '#dc2626',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="username" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#5f4030',
              marginBottom: '0.5rem',
            }}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.9375rem',
                border: '1px solid #c9a98d',
                borderRadius: '0.5rem',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#9a6845';
                e.target.style.boxShadow = '0 0 0 3px rgba(154, 104, 69, 0.16)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#c9a98d';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem',
            }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.9375rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                outline: 'none',
                transition: 'all 0.2s',
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
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem 1.5rem',
              fontSize: '0.9375rem',
              fontWeight: '600',
              color: '#ffffff',
              background: loading ? '#b8a79a' : 'linear-gradient(135deg, #8b5e3c 0%, #a9744f 100%)',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#70452d';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #8b5e3c 0%, #a9744f 100%)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          padding: '1rem 2rem 1.5rem 2rem',
          background: '#f3e7d8',
          borderTop: '1px solid #e3cdb7',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            margin: 0,
          }}>
       
          </p>
        </div>
      </div>
    </div>
  );
};
