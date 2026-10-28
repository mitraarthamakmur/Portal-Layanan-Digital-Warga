import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  LockKeyhole,
  Moon,
  Sun,
  UserRound
} from './MingcuteIcons';
import { appStore } from '../services/api';
import { ORG_SUBTITLE } from '../utils/format';
import {
  BrandLogo,
  CtaArrowBadge,
  SyncStatusHeaderBadge,
  useAppStore
} from './SharedUI';

export const LoginScreen: React.FC = () => {
  const { theme } = useAppStore();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  const orgName = appStore.getOrgName();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = appStore.authenticateByUsernamePin(username, pin);
    if (!res.ok) {
      setError(res.error ?? 'Username atau PIN tidak sesuai.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#login-main" className="skip-nav">
        Lewati ke formulir masuk
      </a>

      <header className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandLogo height={40} orgName={orgName} />
          <div className="text-xs text-muted font-medium hidden sm:block">{ORG_SUBTITLE}</div>
        </div>
        <div className="flex items-center gap-2.5">
          <SyncStatusHeaderBadge />
          <button
            type="button"
            onClick={() => appStore.toggleTheme()}
            className="top-action-ring"
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          >
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main
        id="login-main"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8"
      >
        <div className="max-w-md w-full space-y-6">
          <div className="surface-card p-6 sm:p-8 space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                Masuk ke Portal Paguyuban
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                Masukkan username dan PIN pribadi Anda untuk membuka layanan sesuai hak akses Anda.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="login-username" className="field-label flex items-center gap-1.5">
                  <UserRound size={15} aria-hidden="true" />
                  <span>Username Akun</span>
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  aria-label="Username Akun"
                  placeholder="Masukkan username pribadi Anda"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-pin-error' : undefined}
                  className="input"
                  required
                />
              </div>

              <div>
                <label htmlFor="login-pin" className="field-label flex items-center gap-1.5">
                  <LockKeyhole size={15} aria-hidden="true" />
                  <span>PIN Akses</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="login-pin"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={8}
                    autoComplete="current-password"
                    aria-label="PIN Akses"
                    placeholder="Masukkan 4 s.d. 8 digit PIN"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      if (error) setError('');
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'login-pin-error' : undefined}
                    className="input num pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((s) => !s)}
                    aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                    className="btn btn-ghost btn-compact"
                    style={{ position: 'absolute', right: '4px' }}
                  >
                    {showPin ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>

                {error && (
                  <p id="login-pin-error" role="alert" className="field-error flex items-center gap-1.5 mt-2">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{error}</span>
                  </p>
                )}
              </div>

              <div className="pt-1">
                <button type="submit" className="btn btn-primary btn-cta-wide w-full whitespace-nowrap">
                  <span>Masuk ke Portal</span>
                  <CtaArrowBadge />
                </button>
              </div>
            </form>

            <div className="soft-well p-3.5 text-xs text-muted text-center">
              Belum memiliki akun atau lupa PIN akses? Silakan hubungi <strong>Ketua Paguyuban / Pengurus Warga</strong> untuk pembuatan akun <strong>Anda</strong>.
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto px-4 sm:px-6 pb-6 pt-2 text-center text-xs text-muted">
        © 2026 Portal Layanan Digital Warga. All Rights Reserved.
      </footer>
    </div>
  );
};
