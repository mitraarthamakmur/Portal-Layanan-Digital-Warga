import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import Chart, { type ChartConfiguration } from 'chart.js/auto';
import { ArrowRight, CheckCircle2, Cloud, CloudOff, HardDrive, RefreshCw, X } from './MingcuteIcons';
import { appStore, type StoreSnapshot } from '../services/api';
import { LOGO_URL, ORG_SUBTITLE } from '../utils/format';

export function useAppStore(): StoreSnapshot {
  return useSyncExternalStore(appStore.subscribe, appStore.getSnapshot, appStore.getSnapshot);
}

export const BrandLogo: React.FC<{ height?: number; orgName: string; compact?: boolean }> = ({
  height = 36,
  orgName,
  compact = false
}) => {
  const { theme } = useAppStore();
  const [failed, setFailed] = useState(!LOGO_URL);
  if (failed || !LOGO_URL) {
    return (
      <span className="logo-fallback" aria-hidden="true">PW</span>
    );
  }
  const activeLogoSrc = compact
    ? theme === 'dark'
      ? '/icon-portal-dark.svg'
      : '/icon-portal.svg'
    : theme === 'dark'
      ? '/logo-portal-dark.svg'
      : LOGO_URL;
  return (
    <img
      src={activeLogoSrc}
      alt={`Logo ${orgName}`}
      className="shrink-0 object-contain"
      style={
        compact
          ? { height: `${height}px`, width: `${height}px` }
          : { height: `${height}px`, width: 'auto' }
      }
      onError={() => setFailed(true)}
    />
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const label = String(status || '-').trim();
  const variantMap: Record<string, string> = {
    Menunggu: 'badge-amber',
    'Menunggu Verifikasi': 'badge-amber',
    Pending: 'badge-amber',
    Terjadwal: 'badge-amber',
    'Perlu Perbaikan': 'badge-amber',
    Terlambat: 'badge-amber',
    Terverifikasi: 'badge-blue',
    Diproses: 'badge-blue',
    Mendesak: 'badge-red',
    Normal: 'badge-slate',
    Disetujui: 'badge-green',
    Lunas: 'badge-green',
    Aktif: 'badge-green',
    Ya: 'badge-green',
    Tetap: 'badge-green',
    Terkumpul: 'badge-green',
    Tersinkron: 'badge-green',
    Baik: 'badge-green',
    'Tepat Waktu': 'badge-green',
    Ditolak: 'badge-red',
    Dibatalkan: 'badge-red',
    Tidak: 'badge-red',
    Gagal: 'badge-red',
    Kedaluwarsa: 'badge-red',
    'Belum Bayar': 'badge-red',
    Terlewat: 'badge-red',
    Booked: 'badge-blue',
    Menyinkronkan: 'badge-blue',
    Disalurkan: 'badge-blue',
    Kontrak: 'badge-blue',
    Lokal: 'badge-slate',
    Selesai: 'badge-slate'
  };
  const cls = variantMap[label] ?? 'badge-slate';
  return <span className={`status-badge ${cls}`}>{label}</span>;
};

export const AccessibleModal: React.FC<{
  open: boolean;
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, title, wide = false, onClose, children }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const focusable = panel.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]'
      );
      if (focusable.length > 1) {
        focusable[1].focus();
      } else if (focusable.length === 1) {
        focusable[0].focus();
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === 'Tab' && panelRef.current) {
        const nodes = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
          )
        ).filter((el) => el.offsetParent !== null);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`modal-panel ${wide ? 'modal-panel-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="px-6 py-4 rule-b flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            onClick={onClose}
            aria-label="Tutup jendela dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'amber' | 'red';
}

interface ToastContextValue {
  notify: (message: string, tone?: 'info' | 'amber' | 'red') => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, tone: 'info' | 'amber' | 'red' = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {items.map((item) => (
          <div key={item.id} className="toast-card" role="status">
            <span
              className={`status-badge ${
                item.tone === 'red' ? 'badge-red' : item.tone === 'amber' ? 'badge-amber' : 'badge-green'
              }`}
            >
              {item.tone === 'red' ? 'Perhatian' : item.tone === 'amber' ? 'Catatan' : 'Berhasil'}
            </span>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const SyncStatusHeaderBadge: React.FC = () => {
  const { sync } = useAppStore();

  const iconMap = {
    Lokal: <HardDrive size={14} aria-hidden="true" />,
    Menyinkronkan: <RefreshCw size={14} className="animate-spin" aria-hidden="true" />,
    Tersinkron: <Cloud size={14} aria-hidden="true" />,
    Gagal: <CloudOff size={14} aria-hidden="true" />
  };

  const badgeToneMap = {
    Lokal: 'badge-slate',
    Menyinkronkan: 'badge-blue',
    Tersinkron: 'badge-green',
    Gagal: 'badge-red'
  };

  return (
    <span
      role="status"
      aria-live="polite"
      className={`status-badge ${badgeToneMap[sync.status]} select-none`}
      aria-label={`Status sinkronisasi: ${sync.status}`}
    >
      {iconMap[sync.status]}
      <span>{sync.status}</span>
    </span>
  );
};

export function useChartThemePalette(theme: 'light' | 'dark') {
  const dark = theme === 'dark';
  return {
    petrol: dark ? '#5cdba0' : '#169c6c',
    olive: dark ? '#82b8ff' : '#3b7be0',
    amber: dark ? '#f5bd42' : '#d98a12',
    coral: dark ? '#b89eff' : '#6e52d9',
    slate: dark ? '#9cb5ad' : '#58736a',
    ink: dark ? '#cde0da' : '#2c423b',
    grid: dark ? 'rgba(205, 224, 218, 0.12)' : 'rgba(17, 31, 27, 0.07)'
  };
}

export const CtaArrowBadge: React.FC = () => (
  <span className="arrow-glyph" aria-hidden="true">
    <ArrowRight size={16} />
  </span>
);

export const SegmentedPills = <T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}): React.ReactElement => (
  <div className="segmented-pills" role="group" aria-label={label}>
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          className="seg-pill"
          aria-pressed={active}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

export const ChartCanvas: React.FC<{
  ariaLabel: string;
  configBuilder: () => ChartConfiguration;
  deps: unknown[];
  height?: number;
}> = ({ ariaLabel, configBuilder, deps, height = 244 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const chart = new Chart(el, configBuilder());
    return () => {
      chart.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div className="chart-box" style={{ height: `${height}px` }}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
    </div>
  );
};

export function printOfficialDocument(params: {
  orgName: string;
  kopSubtitle: string;
  bodyHtml: string;
}): void {
  const printRoot = document.getElementById('print-root');
  if (!printRoot) return;
  const escapedOrg = params.orgName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedSub = params.kopSubtitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const logoHtml = LOGO_URL
    ? `<img src="${LOGO_URL}" alt="Logo ${escapedOrg}" style="height:44px;width:auto;" />`
    : `<span class="logo-fallback">PW</span>`;

  printRoot.innerHTML = `
    <div class="print-kop">
      ${logoHtml}
      <div>
        <div class="serif-kop" style="font-size:16pt;font-weight:700;">${escapedOrg}</div>
        <div style="font-size:10pt;">Sekretariat Pengurus Warga ${ORG_SUBTITLE} | Lingkungan Hunian Warga</div>
        <div style="font-size:9.5pt;">${escapedSub}</div>
      </div>
    </div>
    ${params.bodyHtml}
  `;
  window.print();
}

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ open, title, message, confirmLabel = 'Ya, Lanjutkan', danger = false, onCancel, onConfirm }) => (
  <AccessibleModal open={open} title={title} onClose={onCancel}>
    <p className="text-sm leading-relaxed mb-6">{message}</p>
    <div className="flex justify-end gap-2">
      <button type="button" className="btn btn-secondary" onClick={onCancel}>
        Batal
      </button>
      <button
        type="button"
        className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
        onClick={() => {
          onConfirm();
          onCancel();
        }}
      >
        {confirmLabel}
      </button>
    </div>
  </AccessibleModal>
);

export const EmptyStateRow: React.FC<{ colSpan: number; text: string }> = ({ colSpan, text }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-8 text-muted">
      {text}
    </td>
  </tr>
);

export const UserAvatarBadge: React.FC<{
  avatarUrl?: string;
  name: string;
  size?: number;
  className?: string;
}> = ({ avatarUrl, name, size = 40, className = '' }) => {
  const initials = (name || 'WS')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Avatar ${name}`}
        width={size}
        height={size}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: 'var(--radius-pill)',
          objectFit: 'cover'
        }}
        className={`shrink-0 ${className}`.trim()}
      />
    );
  }

  return (
    <span
      className={`squircle-avatar shrink-0 ${className}`.trim()}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: 'var(--radius-pill)'
      }}
      aria-hidden="true"
    >
      {initials || 'WS'}
    </span>
  );
};

export const CheckBadgeIcon = CheckCircle2;
