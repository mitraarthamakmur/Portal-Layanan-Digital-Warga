import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  Boxes,
  ClipboardList,
  Clock,
  FileSignature,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  X
} from './components/MingcuteIcons';
import type { LucideIcon } from './components/MingcuteIcons';
import { SanitationHandShieldIcon } from './components/CustomIcons';
import {
  appStore,
  canAccessModule,
  getActiveNightShiftDate,
  ROLE_DEFINITIONS
} from './services/api';
import type { ModuleId } from './types';
import { formatRupiah, ORG_SUBTITLE } from './utils/format';
import {
  BrandLogo,
  SyncStatusHeaderBadge,
  ToastProvider,
  useAppStore,
  UserAvatarBadge
} from './components/SharedUI';
import { LoginScreen } from './components/LoginScreen';
import {
  AccessDeniedView,
  DashboardView,
  DemographicsView,
  MyDataView,
  ResidentsView,
  SecuritySelfProfileModal,
  WargaSecurityManagementView
} from './modules/CoreViews';
import {
  ComplaintsView,
  GuestbookView,
  LettersView,
  SanitationView,
  SecurityPatrolView,
  SocialFundView
} from './modules/ServiceViews';
import {
  AccountsManagementView,
  AssetsView,
  AuditLogView,
  CashflowView,
  SettingsView
} from './modules/FinanceAndSystemViews';

interface NavItemDef {
  id: ModuleId;
  label: string;
  shortLabel: string;
  group: 'Ikhtisar & Warga' | 'Layanan & Lingkungan' | 'Keuangan & Sistem';
  icon: LucideIcon;
}

const ALL_NAV_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Beranda Utama', shortLabel: 'Beranda', group: 'Ikhtisar & Warga', icon: LayoutDashboard },
  { id: 'data_saya', label: 'Profil Saya', shortLabel: 'Profil', group: 'Ikhtisar & Warga', icon: UserCheck },
  { id: 'warga', label: 'Data Warga', shortLabel: 'Warga', group: 'Ikhtisar & Warga', icon: Users },
  { id: 'warga_security', label: 'Manajemen Warga & Security', shortLabel: 'Warga & Security', group: 'Ikhtisar & Warga', icon: UserPlus },
  { id: 'demografi', label: 'Demografi Otomatis', shortLabel: 'Demografi', group: 'Ikhtisar & Warga', icon: BarChart3 },
  { id: 'surat', label: 'Layanan E-Letter', shortLabel: 'E-Letter', group: 'Layanan & Lingkungan', icon: FileSignature },
  { id: 'patroli', label: 'Check-In Patroli', shortLabel: 'Check-In', group: 'Layanan & Lingkungan', icon: Clock },
  { id: 'tamu', label: 'Buku Tamu', shortLabel: 'Buku Tamu', group: 'Layanan & Lingkungan', icon: BookOpenCheck },
  { id: 'keluhan', label: 'Keluhan Warga', shortLabel: 'Keluhan', group: 'Layanan & Lingkungan', icon: MessageSquareWarning },
  { id: 'sanitasi', label: 'Sanitasi & Fogging', shortLabel: 'Sanitasi', group: 'Layanan & Lingkungan', icon: SanitationHandShieldIcon },
  { id: 'sosial', label: 'Dana Sosial', shortLabel: 'Sosial', group: 'Layanan & Lingkungan', icon: HeartHandshake },
  { id: 'kas', label: 'Kas & Iuran Live', shortLabel: 'Kas', group: 'Keuangan & Sistem', icon: Wallet },
  { id: 'aset', label: 'Aset & Booking', shortLabel: 'Aset', group: 'Keuangan & Sistem', icon: Boxes },
  { id: 'akun', label: 'Manajemen Akun', shortLabel: 'Akun', group: 'Keuangan & Sistem', icon: UserCog },
  { id: 'log_aktivitas', label: 'Log Aktivitas', shortLabel: 'Audit Log', group: 'Keuangan & Sistem', icon: ClipboardList },
  { id: 'pengaturan', label: 'Pengaturan & API', shortLabel: 'Sistem', group: 'Keuangan & Sistem', icon: Settings }
];

const VALID_MODULE_IDS = new Set<string>(ALL_NAV_ITEMS.map((item) => item.id));

const NAV_GROUPS: Array<NavItemDef['group']> = [
  'Ikhtisar & Warga',
  'Layanan & Lingkungan',
  'Keuangan & Sistem'
];

function parseModuleFromHash(rawHash: string): ModuleId | null {
  if (!rawHash || !rawHash.startsWith('#/')) return null;
  const clean = rawHash.slice(2).split('?')[0].trim().toLowerCase();
  if (clean === 'beranda') return 'dashboard';
  if (VALID_MODULE_IDS.has(clean)) return clean as ModuleId;
  return null;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 19) return 'Selamat Sore';
  return 'Selamat Malam';
}

const AuthenticatedShell: React.FC = () => {
  const { session, theme } = useAppStore();
  const role = session!.role;
  const roleDef = ROLE_DEFINITIONS[role];

  const allowedNavItems = useMemo(
    () => ALL_NAV_ITEMS.filter((item) => canAccessModule(role, item.id)),
    [role]
  );

  const defaultHomeModule: ModuleId = allowedNavItems[0]?.id ?? roleDef.defaultModule;

  const [activeModule, setActiveModule] = useState<ModuleId>(() => {
    const fromHash = parseModuleFromHash(window.location.hash || '');
    return fromHash ?? defaultHomeModule;
  });

  const [autoOpenGuestModal, setAutoOpenGuestModal] = useState<boolean>(() =>
    (window.location.hash || '').includes('lapor=1')
  );
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [secProfileOpen, setSecProfileOpen] = useState(false);

  const mobileDockRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onHash = () => {
      const raw = window.location.hash || '';
      const parsed = parseModuleFromHash(raw);
      if (parsed) {
        setActiveModule(parsed);
        if (parsed === 'tamu' && raw.includes('lapor=1')) {
          setAutoOpenGuestModal(true);
        }
      }
    };
    window.addEventListener('hashchange', onHash);
    const timer = window.setInterval(() => {
      appStore.refreshGuestExpirations(false);
      appStore.refreshMissedPatrolSlots(getActiveNightShiftDate(), 'Petugas Shift Malam', true);
    }, 30000);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const dockEl = mobileDockRef.current;
    if (!dockEl) return;
    const activeBtn = dockEl.querySelector<HTMLElement>('[aria-current="page"]');
    if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeModule]);

  const orgName = appStore.getOrgName();
  useEffect(() => {
    document.title = `${orgName} - ${ORG_SUBTITLE}`;
  }, [orgName]);

  const navigateTo = (mod: ModuleId) => {
    setActiveModule(mod);
    setMobileSidebarOpen(false);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/${mod}`);
  };

  const openMyProfile = () => {
    setMobileSidebarOpen(false);
    if (role === 'security') {
      setSecProfileOpen(true);
    } else {
      navigateTo('data_saya');
    }
  };

  const handleLogout = () => {
    setMobileSidebarOpen(false);
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    appStore.logout();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = Math.abs(t.clientY - start.y);
    if (dy > 52) return;
    if (!mobileSidebarOpen && start.x <= 44 && dx >= 56) {
      setMobileSidebarOpen(true);
    } else if (mobileSidebarOpen && dx <= -50) {
      setMobileSidebarOpen(false);
    }
  };

  const isRoutePermitted = canAccessModule(role, activeModule);

  const scopedLetters = appStore.getScopedLetters();
  const scopedGuests = appStore.getScopedGuestbook();
  const scopedComplaints = appStore.getScopedComplaints();
  const scopedFin = appStore.getScopedFinancialSummary();

  const pendingLettersCount = scopedLetters.filter(
    (l) => l.status === 'Menunggu Verifikasi' || l.status === 'Terverifikasi'
  ).length;
  const activeGuestsCount = scopedGuests.filter((g) => g.status === 'Aktif').length;
  const openComplaintsCount = scopedComplaints.filter(
    (c) => c.status === 'Menunggu' || c.status === 'Diproses'
  ).length;

  const getBadgeCount = (mod: ModuleId): number => {
    if (mod === 'surat') return pendingLettersCount;
    if (mod === 'tamu') return activeGuestsCount;
    if (mod === 'keluhan') return openComplaintsCount;
    if (mod === 'kas') {
      return role === 'bendahara' || role === 'admin'
        ? scopedFin.waitingVerificationCount
        : scopedFin.unpaidCellCount;
    }
    return 0;
  };

  const currentNavMeta = ALL_NAV_ITEMS.find((n) => n.id === activeModule) ?? allowedNavItems[0];
  const residentInfo = session?.residentId
    ? appStore.getLimitedResidentLookup(session.residentId)
    : null;
  const displayUserName = session?.displayName || residentInfo?.nama || roleDef.label;
  const headerUserLabel = displayUserName.toLowerCase().includes(roleDef.label.toLowerCase())
    ? displayUserName
    : `${displayUserName} (${roleDef.label})`;

  const renderGroupedNavList = (compactMode: boolean) => (
    <nav aria-label="Menu modul paguyuban" className="space-y-4">
      {NAV_GROUPS.map((groupName) => {
        const items = allowedNavItems.filter((i) => i.group === groupName);
        if (items.length === 0) return null;
        return (
          <div key={groupName}>
            <div className="rail-section-label">
              {role === 'security' ? 'Tugas Security' : groupName}
            </div>
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                const count = getBadgeCount(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={compactMode ? item.label : undefined}
                    title={compactMode ? item.label : undefined}
                    className="rail-pill-item"
                  >
                    <Icon size={18} filled={isActive} aria-hidden="true" />
                    <span className="rail-label-text flex-1 truncate">{item.label}</span>
                    {count > 0 && !compactMode && (
                      <span className="rail-label-text status-badge badge-slate num">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div
      className="app-stage"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <a href="#main-content" className="skip-nav">
        Lewati ke konten utama
      </a>

      {/* Off-Canvas Mobile Left Sidebar Drawer ("Bilah Navigasi Kiri" di HP) */}
      <div
        className={`mobile-rail-backdrop ${mobileSidebarOpen ? 'is-open' : ''}`}
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setMobileSidebarOpen(false);
        }}
      >
        <aside
          className="mobile-rail-panel"
          aria-label="Bilah navigasi kiri seluler"
          aria-hidden={!mobileSidebarOpen}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-3 min-w-0">
                <BrandLogo height={32} orgName={orgName} />
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="top-action-ring shrink-0"
                aria-label="Tutup bilah navigasi kiri"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {renderGroupedNavList(false)}
          </div>

          <div className="soft-well p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <UserAvatarBadge
                avatarUrl={appStore.getCurrentUserAvatar()}
                name={displayUserName}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">{roleDef.label}</div>
                <div className="text-xs text-muted truncate">
                  {residentInfo
                    ? `${residentInfo.no_rumah} - ${session?.username}`
                    : session?.shiftLabel || session?.username}
                </div>
              </div>
            </div>
            {role === 'security' && (
              <button
                type="button"
                onClick={openMyProfile}
                aria-label="Edit profil saya"
                className="btn btn-secondary w-full btn-compact whitespace-nowrap"
              >
                <UserCheck size={15} aria-hidden="true" />
                <span>Profil Saya</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Keluar dari akun"
              className="btn btn-secondary w-full btn-compact whitespace-nowrap"
            >
              <LogOut size={15} aria-hidden="true" />
              <span>Keluar Akun</span>
            </button>
          </div>
        </aside>
      </div>

      <div className={`split-shell ${railCollapsed ? 'rail-collapsed' : ''}`}>
        {/* Desktop Left Sidebar Rail */}
        <aside className="rail-sidebar" aria-label="Bilah navigasi paguyuban">
          <div className="space-y-6">
            {railCollapsed ? (
              <div className="flex flex-col items-center gap-3">
                <BrandLogo height={38} orgName={orgName} compact />
                <button
                  type="button"
                  onClick={() => setRailCollapsed(false)}
                  className="top-action-ring"
                  aria-label="Perluas bilah navigasi kiri"
                  aria-expanded={false}
                  title="Perluas navigasi"
                >
                  <PanelLeftOpen size={17} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-3 min-w-0">
                  <BrandLogo height={32} orgName={orgName} />
                  <div className="rail-brand-copy min-w-0">
                    <div className="text-xs font-bold" style={{ color: 'var(--color-rail-accent)' }}>
                      {ORG_SUBTITLE}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRailCollapsed(true)}
                  className="top-action-ring shrink-0"
                  aria-label="Ringkas bilah navigasi kiri"
                  aria-expanded={true}
                  title="Ringkas navigasi"
                >
                  <PanelLeftClose size={17} aria-hidden="true" />
                </button>
              </div>
            )}

            {renderGroupedNavList(railCollapsed)}
          </div>

          <div className="soft-well p-3 space-y-2.5">
            {!railCollapsed && (
              <div className="flex items-center gap-2.5">
                <UserAvatarBadge
                  avatarUrl={appStore.getCurrentUserAvatar()}
                  name={displayUserName}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{roleDef.label}</div>
                  <div className="text-xs text-muted truncate">
                    {residentInfo
                      ? `${residentInfo.no_rumah} - ${session?.username}`
                      : session?.shiftLabel || session?.username}
                  </div>
                </div>
              </div>
            )}
            {role === 'security' && (
              <button
                type="button"
                onClick={openMyProfile}
                aria-label="Edit profil saya"
                className="btn btn-secondary w-full btn-compact whitespace-nowrap"
              >
                <UserCheck size={15} aria-hidden="true" />
                <span className="rail-label-text">Profil Saya</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Keluar dari akun"
              className="btn btn-secondary w-full btn-compact whitespace-nowrap"
            >
              <LogOut size={15} aria-hidden="true" />
              <span className="rail-label-text">Keluar Akun</span>
            </button>
          </div>
        </aside>

        <div className="workspace-canvas">
          <header className="utility-topbar">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="top-action-ring lg:hidden"
                aria-label="Buka bilah navigasi kiri"
                aria-expanded={mobileSidebarOpen}
                title="Buka Menu Bilah Kiri"
              >
                <Menu size={19} aria-hidden="true" />
              </button>
              <div className="lg:hidden">
                <BrandLogo height={30} orgName={orgName} compact />
              </div>
              <button
                type="button"
                onClick={openMyProfile}
                aria-label="Buka Profil Saya"
                title="Klik untuk membuka & mengedit Profil Saya"
                className="flex items-center gap-2.5 min-w-0 text-left rounded-full pr-2 py-0.5 cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                <UserAvatarBadge
                  avatarUrl={appStore.getCurrentUserAvatar()}
                  name={displayUserName}
                  size={40}
                  className="hidden sm:inline-flex"
                />
                <div className="min-w-0">
                  <div className="text-xs text-muted truncate">
                    {getTimeGreeting()} · {currentNavMeta?.label ?? 'Modul'}
                  </div>
                  <div className="text-sm font-bold truncate">{headerUserLabel}</div>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <SyncStatusHeaderBadge />

              {canAccessModule(role, 'sanitasi') && (
                <button
                  type="button"
                  onClick={() => navigateTo('sanitasi')}
                  className="top-action-ring hidden sm:inline-flex"
                  aria-label="Lihat jadwal sanitasi dan pengumuman"
                  title="Jadwal Sanitasi & Pengumuman"
                >
                  <Bell size={18} aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                onClick={() => appStore.toggleTheme()}
                className="top-action-ring"
                aria-pressed={theme === 'dark'}
                aria-label={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
                title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              >
                {theme === 'dark' ? (
                  <Sun size={18} aria-hidden="true" />
                ) : (
                  <Moon size={18} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="top-action-ring lg:hidden"
                aria-label="Keluar sesi"
              >
                <LogOut size={17} aria-hidden="true" />
              </button>
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="workspace-body max-w-7xl w-full mx-auto">
            {!isRoutePermitted ? (
              <AccessDeniedView
                attemptedRoute={currentNavMeta?.label ?? activeModule}
                onReturnHome={() => navigateTo(defaultHomeModule)}
              />
            ) : (
              <>
                {activeModule === 'dashboard' && <DashboardView onNavigate={navigateTo} />}
                {activeModule === 'data_saya' && <MyDataView />}
                {activeModule === 'warga' && <ResidentsView />}
                {activeModule === 'warga_security' && <WargaSecurityManagementView />}
                {activeModule === 'demografi' && <DemographicsView />}
                {activeModule === 'surat' && <LettersView />}
                {activeModule === 'patroli' && <SecurityPatrolView onNavigate={navigateTo} />}
                {activeModule === 'tamu' && (
                  <GuestbookView
                    autoOpenForm={autoOpenGuestModal}
                    onConsumedAutoOpen={() => setAutoOpenGuestModal(false)}
                    onNavigate={navigateTo}
                  />
                )}
                {activeModule === 'keluhan' && <ComplaintsView onNavigate={navigateTo} />}
                {activeModule === 'sanitasi' && <SanitationView />}
                {activeModule === 'sosial' && <SocialFundView />}
                {activeModule === 'kas' && <CashflowView />}
                {activeModule === 'aset' && <AssetsView />}
                {activeModule === 'akun' && <AccountsManagementView />}
                {activeModule === 'log_aktivitas' && <AuditLogView />}
                {activeModule === 'pengaturan' && <SettingsView />}
              </>
            )}
          </main>

          <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 pb-24 lg:pb-16 pt-2 text-center text-xs text-muted">
            © 2026 Portal Layanan Digital Warga. All Rights Reserved.
          </footer>
        </div>
      </div>

      {role === 'security' && (
        <SecuritySelfProfileModal
          open={secProfileOpen}
          onClose={() => setSecProfileOpen(false)}
        />
      )}

      <aside className="floating-status-dock" aria-label="Ringkasan cepat status paguyuban">
        <div className="flex items-center gap-3 min-w-0">
          <span className="status-badge badge-green">{roleDef.label}</span>
          <div className="text-xs truncate">
            <span className="font-bold">{orgName}</span>
            <span className="mx-2 text-muted">·</span>
            <span className="text-muted">
              Tamu aktif:{' '}
              <strong className="num" style={{ color: 'var(--color-ink)' }}>
                {activeGuestsCount}
              </strong>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {canAccessModule(role, 'kas') && (
            <span className="text-xs font-bold num">
              Saldo Kas: {formatRupiah(scopedFin.saldoKas)}
            </span>
          )}
          {role === 'security' ? (
            <button
              type="button"
              onClick={() => navigateTo('patroli')}
              className="btn btn-secondary btn-compact whitespace-nowrap"
            >
              <span>Check-In Jaga</span>
            </button>
          ) : (
            canAccessModule(role, 'tamu') && (
              <button
                type="button"
                onClick={() => navigateTo('tamu')}
                className="btn btn-secondary btn-compact whitespace-nowrap"
              >
                <span>Buku Tamu</span>
              </button>
            )
          )}
        </div>
      </aside>

      {/* Horizontally Swipeable / Scrollable Mobile Bottom Bar */}
      <nav
        ref={mobileDockRef}
        className={`mobile-nav-bar ${allowedNavItems.length <= 4 ? 'dock-few' : ''}`}
        aria-label="Navigasi seluler geser kiri kanan"
      >
        {allowedNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className="dock-nav-item"
              style={{
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-ink)' : 'var(--color-muted)'
              }}
            >
              <span className="nav-active-mark">
                <Icon size={18} filled={isActive} aria-hidden="true" />
              </span>
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export const App: React.FC = () => {
  const { session } = useAppStore();

  return (
    <ToastProvider>
      {session ? <AuthenticatedShell /> : <LoginScreen />}
    </ToastProvider>
  );
};

export default App;
