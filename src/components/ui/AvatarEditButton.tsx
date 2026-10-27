/**
 * Tombol kecil "Ganti foto" di kartu profil.
 * Diberi data-html2canvas-ignore supaya tidak ikut ke PDF rapor.
 */

import React from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { removeAvatar, uploadAvatar } from '../../services/avatar';

export const AvatarEditButton: React.FC = () => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const run = async (action: () => Promise<unknown>, successMessage: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui foto');
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      void run(() => uploadAvatar(file), 'Foto profil diperbarui ✨');
    }
  };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.35rem 0.75rem',
    borderRadius: '999px',
    border: '1px solid rgba(118, 87, 67, 0.35)',
    background: 'rgba(255, 251, 244, 0.9)',
    color: '#765743',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: busy ? 'wait' : 'pointer',
  };

  return (
    <div data-html2canvas-ignore="true" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      <button type="button" style={buttonStyle} disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        Ganti foto
      </button>
      <button
        type="button"
        style={{ ...buttonStyle, padding: '0.35rem 0.55rem' }}
        disabled={busy}
        aria-label="Hapus foto profil"
        title="Hapus foto (kembali ke inisial)"
        onClick={() => {
          if (window.confirm('Hapus foto profil dan kembali ke inisial?')) {
            void run(removeAvatar, 'Foto profil dihapus');
          }
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};
