import type {
  AllSheetsData,
  ApiAction,
  ApiResponse,
  AppSettings,
  AuditLogEntry,
  BookingEntry,
  CashflowEntry,
  ComplaintCategory,
  ComplaintEntry,
  ComplaintStatus,
  GuestbookEntry,
  Letter,
  LimitedResidentInfo,
  MinimalHouseInfo,
  ModuleId,
  PatrolLivePhoto,
  PatrolLivePhotoInput,
  PatrolSlotLabel,
  PendingSyncItem,
  PermissionAction,
  PermissionMatrix,
  Resident,
  RoleDefinition,
  RoleId,
  SanitationSchedule,
  SecurityPatrolEntry,
  SheetName,
  SheetRecordMap,
  SocialFundEntry,
  SyncState,
  SyncStatus,
  UserAccount,
  UserSession
} from '../src/types';
import { PATROL_SLOTS } from '../src/types';
import { buildSeedSheets } from '../src/data/seed';
import {
  calcAge,
  datesOverlap,
  daysInclusive,
  generateNextId,
  generateNextLetterNumber,
  isHeadOfHouseholdStatus,
  isValidOptionalIndonesianPhone,
  normalizeFamilyStatus,
  normalizeHouseAndBlok,
  ORG_NAME_DEFAULT,
  todayISO
} from '../src/utils/format';
import type { MissingHouseDraft, ParsedKasRowDraft } from '../src/utils/csvKasImporter';

export const STORAGE_KEYS = {
  SHEETS: 'pldw_sheets_v4',
  SETTINGS: 'pldw_settings_v2',
  QUEUE: 'pldw_sync_queue_v4',
  SYNC_META: 'pldw_sync_meta_v4',
  SESSION: 'pldw_session_v4',
  THEME: 'pldw_theme_v2',
  SIDEBAR: 'pldw_sidebar_v2'
} as const;

export const SHEET_SCHEMAS: Record<SheetName, string[]> = {
  Residents: [
    'id', 'nik', 'nama', 'no_kk', 'hubungan_keluarga',
    'tgl_lahir', 'blok', 'no_rumah', 'no_hp', 'status', 'created_at'
  ],
  Users: [
    'id', 'username', 'pin', 'role', 'nama_tampilan',
    'resident_id', 'shift_label', 'aktif', 'created_at'
  ],
  Letters: [
    'id', 'no_surat', 'resident_id', 'nama', 'jenis', 'keperluan',
    'tgl_pengajuan', 'status', 'diverifikasi_oleh', 'tgl_diverifikasi',
    'disetujui_oleh', 'tgl_disetujui'
  ],
  Guestbook: [
    'id', 'nama_tamu', 'no_identitas', 'tujuan_blok', 'no_rumah',
    'resident_id', 'keperluan', 'tgl_masuk', 'jam_masuk', 'expired_at', 'status'
  ],
  SecurityPatrol: [
    'id', 'tanggal_shift', 'slot_jadwal', 'waktu_target', 'waktu_checkin',
    'selisih_menit', 'nama_security', 'area_patroli', 'status', 'catatan'
  ],
  Complaints: [
    'id', 'resident_id', 'no_rumah', 'blok', 'nama_pelapor',
    'kategori', 'judul', 'deskripsi', 'prioritas', 'tgl_lapor',
    'status', 'ditindaklanjuti_oleh', 'catatan_tindak_lanjut', 'tgl_update'
  ],
  Sanitation: ['id', 'jenis', 'tgl_jadwal', 'lokasi', 'petugas', 'status', 'catatan'],
  SocialFund: ['id', 'tipe', 'nama_terkait', 'deskripsi', 'nominal', 'tanggal', 'status'],
  Cashflow: [
    'id', 'tanggal', 'tipe', 'kategori', 'resident_id', 'periode',
    'nominal', 'metode', 'status', 'bukti', 'keterangan',
    'diverifikasi_oleh', 'tgl_verifikasi'
  ],
  Assets: ['id', 'nama', 'kategori', 'stok', 'kondisi', 'tarif_sewa', 'deposit'],
  Bookings: [
    'id', 'asset_id', 'resident_id', 'qty', 'tgl_mulai', 'tgl_selesai',
    'status', 'total_biaya', 'stok_diverifikasi_oleh', 'disetujui_oleh',
    'tgl_disetujui', 'biaya_dicatat_oleh', 'cashflow_id'
  ],
  AuditLog: [
    'id', 'timestamp', 'actor_user_id', 'actor_username', 'actor_name',
    'actor_role', 'on_behalf_note', 'action', 'module', 'record_id', 'summary'
  ]
};

const NUMERIC_FIELDS: Partial<Record<SheetName, string[]>> = {
  SecurityPatrol: ['selisih_menit'],
  SocialFund: ['nominal'],
  Cashflow: ['nominal'],
  Assets: ['stok', 'tarif_sewa', 'deposit'],
  Bookings: ['qty', 'total_biaya']
};

/**
 * Single authoritative RBAC Permission Matrix:
 * role -> module -> allowed actions ['read', 'create', 'update', 'delete', 'approve']
 * Enforced in BOTH route guards AND data-layer selectors/mutations.
 */
export const PERMISSIONS: PermissionMatrix = {
  admin: {
    dashboard: ['read'],
    data_saya: ['read', 'update'],
    warga: ['read', 'create', 'update', 'delete'],
    warga_security: ['read', 'create', 'update', 'delete'],
    demografi: ['read'],
    surat: ['read', 'create', 'update', 'delete', 'approve'],
    patroli: ['read', 'create', 'update', 'delete'],
    tamu: ['read', 'create', 'update', 'delete'],
    keluhan: ['read', 'create', 'update', 'delete'],
    sanitasi: ['read', 'create', 'update', 'delete'],
    sosial: ['read', 'create', 'update', 'delete'],
    kas: ['read', 'create', 'update', 'delete', 'approve'],
    aset: ['read', 'create', 'update', 'delete', 'approve'],
    akun: ['read', 'create', 'update', 'delete'],
    pengaturan: ['read', 'update'],
    log_aktivitas: ['read']
  },
  ketua: {
    dashboard: ['read'],
    data_saya: ['read', 'update'],
    warga: ['read', 'create', 'update', 'delete'],
    warga_security: ['read', 'create', 'update', 'delete'],
    demografi: ['read'],
    surat: ['read', 'approve'],
    patroli: ['read'],
    tamu: ['read'],
    keluhan: ['read', 'create', 'update'],
    sanitasi: ['read'],
    sosial: ['read'],
    kas: ['read'],
    aset: ['read', 'create', 'update', 'delete', 'approve'],
    akun: [],
    pengaturan: [],
    log_aktivitas: []
  },
  wakil_ketua: {
    dashboard: ['read'],
    data_saya: ['read', 'update'],
    warga: ['read', 'create', 'update', 'delete'],
    warga_security: ['read', 'create', 'update', 'delete'],
    demografi: ['read'],
    surat: ['read', 'approve'],
    patroli: ['read'],
    tamu: ['read'],
    keluhan: ['read', 'create', 'update'],
    sanitasi: ['read'],
    sosial: ['read'],
    kas: ['read'],
    aset: ['read', 'create', 'update', 'delete', 'approve'],
    akun: [],
    pengaturan: [],
    log_aktivitas: []
  },
  sekretaris: {
    dashboard: ['read'],
    data_saya: ['read', 'update'],
    warga: ['read', 'create', 'update', 'delete'],
    warga_security: ['read', 'create', 'update', 'delete'],
    demografi: ['read'],
    surat: ['read', 'update'],
    patroli: ['read'],
    tamu: ['read'],
    keluhan: ['read', 'create', 'update'],
    sanitasi: ['read', 'create', 'update', 'delete'],
    sosial: ['read'],
    kas: ['read'],
    aset: ['read', 'create', 'update', 'delete'],
    akun: [],
    pengaturan: [],
    log_aktivitas: []
  },
  bendahara: {
    dashboard: ['read'],
    data_saya: ['read', 'update'],
    warga: ['read'],
    warga_security: [],
    demografi: [],
    surat: [],
    patroli: [],
    tamu: [],
    keluhan: ['read', 'create'],
    sanitasi: ['read'],
    sosial: ['read', 'create', 'update', 'delete'],
    kas: ['read', 'create', 'update', 'delete', 'approve'],
    aset: ['read', 'update'],
    akun: [],
    pengaturan: [],
    log_aktivitas: []
  },
  security: {
    dashboard: [],
    data_saya: [],
    warga: [],
    warga_security: [],
    demografi: [],
    surat: [],
    patroli: ['read', 'create'],
    tamu: ['read', 'create', 'update'],
    keluhan: ['read', 'update'],
    sanitasi: [],
    sosial: [],
    kas: [],
    aset: [],
    akun: [],
    pengaturan: [],
    log_aktivitas: []
  },
  warga: {
    dashboard: ['read'],
    data_saya: ['read', 'update'],
    warga: [],
    warga_security: [],
    demografi: [],
    surat: ['read', 'create'],
    patroli: [],
    tamu: ['read', 'create'],
    keluhan: ['read', 'create'],
    sanitasi: ['read'],
    sosial: ['read'],
    kas: ['read', 'create'],
    aset: ['read', 'create'],
    akun: [],
    pengaturan: [],
    log_aktivitas: []
  }
};

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  admin: {
    id: 'admin',
    label: 'Admin',
    demoUsername: 'admin',
    demoPin: '1111',
    defaultModule: 'dashboard',
    badgeNote: 'Semua modul, Akun & Log Aktivitas',
    summary: 'Akses penuh seluruh modul, manajemen akun pengguna, dan audit Log Aktivitas (tindakan mewakili pengurus ditandai "oleh Admin").'
  },
  ketua: {
    id: 'ketua',
    label: 'Ketua',
    demoUsername: 'ketua',
    demoPin: '1212',
    defaultModule: 'dashboard',
    badgeNote: 'Persetujuan Surat & Booking, Input Warga/Pengurus/Security',
    summary: 'Baca seluruh modul operasional (NIK penuh), input manual Warga, Pengurus & Security, serta persetujuan akhir E-Letter dan Booking Aset.'
  },
  wakil_ketua: {
    id: 'wakil_ketua',
    label: 'Wakil Ketua',
    demoUsername: 'wakil',
    demoPin: '1313',
    defaultModule: 'dashboard',
    badgeNote: 'Baca semua modul, Setujui Surat & Booking',
    summary: 'Baca seluruh modul dan menyetujui pengajuan E-Letter maupun Booking Aset sebagai pengganti Ketua.'
  },
  sekretaris: {
    id: 'sekretaris',
    label: 'Sekretaris',
    demoUsername: 'sekretaris',
    demoPin: '1414',
    defaultModule: 'warga',
    badgeNote: 'Warga, Demografi, Verifikasi Surat & Stok, Sanitasi',
    summary: 'CRUD penuh Warga (NIK penuh), Demografi, verifikasi E-Letter, CRUD Sanitasi & Aset, serta verifikasi stok Booking.'
  },
  bendahara: {
    id: 'bendahara',
    label: 'Bendahara',
    demoUsername: 'bendahara',
    demoPin: '2222',
    defaultModule: 'kas',
    badgeNote: 'Verifikasi Iuran, Kas, Dana Sosial, Biaya Booking',
    summary: 'CRUD Kas & verifikasi bukti iuran, CRUD Dana Sosial, baca tarif Aset, catat biaya sewa Booking, dan daftar Warga terbatas.'
  },
  security: {
    id: 'security',
    label: 'Security',
    demoUsername: 'security',
    demoPin: '3333',
    defaultModule: 'patroli',
    badgeNote: 'Check-In Patroli, Buku Tamu & Keluhan Warga',
    summary: 'Hanya 3 tab operasional: Check-In Patroli malam (21.00 s.d. 05.00), Buku Tamu aktif hari ini, dan tindak lanjut Keluhan Warga.'
  },
  warga: {
    id: 'warga',
    label: 'Warga',
    demoUsername: 'warga',
    demoPin: '4444',
    defaultModule: 'data_saya',
    badgeNote: 'Profil Saya, E-Letter, Iuran, Booking, Tamu KK',
    summary: 'Kelola Profil Saya & kontak keluarga, ajukan E-Letter, unggah bukti bayar iuran, booking aset, lapor tamu, dan baca pengumuman.'
  }
};

export const PRESET_AVATAR_URLS: readonly string[] = [
  '/avatars/avatar-01.png',
  '/avatars/avatar-02.png',
  '/avatars/avatar-03.png',
  '/avatars/avatar-04.png',
  '/avatars/avatar-05.png',
  '/avatars/avatar-06.png',
  '/avatars/avatar-07.png',
  '/avatars/avatar-08.png',
  '/avatars/avatar-09.png'
];

const AVATAR_TOKEN = '||AVATAR:';
const AVATAR_ONLY_PREFIX = 'AVATAR:';

export function extractShiftAndAvatar(rawShiftLabel: string | undefined): {
  shiftText: string;
  avatarUrl: string;
} {
  const raw = String(rawShiftLabel || '').trim();
  if (!raw) return { shiftText: '', avatarUrl: '' };
  if (raw.startsWith(AVATAR_ONLY_PREFIX)) {
    return { shiftText: '', avatarUrl: raw.slice(AVATAR_ONLY_PREFIX.length).trim() };
  }
  const idx = raw.indexOf(AVATAR_TOKEN);
  if (idx === -1) {
    return { shiftText: raw, avatarUrl: '' };
  }
  return {
    shiftText: raw.slice(0, idx).trim(),
    avatarUrl: raw.slice(idx + AVATAR_TOKEN.length).trim()
  };
}

export function packShiftAndAvatar(shiftText: string, avatarUrl: string): string {
  const cleanShift = shiftText.trim();
  const cleanAvatar = avatarUrl.trim();
  if (!cleanAvatar) return cleanShift;
  if (!cleanShift) return `${AVATAR_ONLY_PREFIX}${cleanAvatar}`;
  return `${cleanShift}${AVATAR_TOKEN}${cleanAvatar}`;
}

export function hasPermission(
  role: RoleId | undefined,
  moduleId: ModuleId,
  action: PermissionAction
): boolean {
  if (!role || !PERMISSIONS[role]) return false;
  return PERMISSIONS[role][moduleId]?.includes(action) ?? false;
}

export function canAccessModule(role: RoleId | undefined, moduleId: ModuleId): boolean {
  return hasPermission(role, moduleId, 'read');
}

/**
 * Mask NIK as 3171********1234 for EVERYONE except Sekretaris and Ketua.
 */
export function maskNik(nik: string, role: RoleId | undefined): string {
  const clean = String(nik || '').trim();
  if (!clean) return '-';
  if (role === 'sekretaris' || role === 'ketua') {
    return clean;
  }
  if (clean.length >= 8) {
    return `${clean.slice(0, 4)}********${clean.slice(-4)}`;
  }
  return '********';
}

export const PATROL_EARLY_OPEN_MINUTES = 5;
export const PATROL_ONTIME_TOLERANCE_MINUTES = 15;
export const PATROL_MISSED_THRESHOLD_MINUTES = 60;
export const MAX_SHIFT_PATROL_PHOTOS = 15;

export function isPatrolPhotoRow(row: Pick<SecurityPatrolEntry, 'id' | 'waktu_target'>): boolean {
  return row.waktu_target === 'FOTO_LIVE' || String(row.id).startsWith('PHT-');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatLocalDateISO(dt: Date): string {
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

export function formatLocalDateTimeMinute(dt: Date): string {
  return `${formatLocalDateISO(dt)} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

export function formatLocalDateTimeSecond(dt: Date): string {
  return `${formatLocalDateTimeMinute(dt)}:${pad2(dt.getSeconds())}`;
}

export function getActiveNightShiftDate(now: Date = new Date()): string {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (now.getHours() < 8) {
    base.setDate(base.getDate() - 1);
  }
  return formatLocalDateISO(base);
}

export function getPatrolSlotTargetDate(shiftDateISO: string, slot: PatrolSlotLabel): Date {
  const [yStr, mStr, dStr] = shiftDateISO.split('-');
  const y = Number(yStr) || new Date().getFullYear();
  const m = (Number(mStr) || 1) - 1;
  const d = Number(dStr) || 1;

  const slotHourMap: Record<PatrolSlotLabel, { dayOffset: number; hour: number }> = {
    '21.00': { dayOffset: 0, hour: 21 },
    '23.00': { dayOffset: 0, hour: 23 },
    '01.00': { dayOffset: 1, hour: 1 },
    '03.00': { dayOffset: 1, hour: 3 },
    '05.00': { dayOffset: 1, hour: 5 }
  };

  const spec = slotHourMap[slot];
  return new Date(y, m, d + spec.dayOffset, spec.hour, 0, 0, 0);
}

export interface PatrolSlotWindowEvaluation {
  targetDate: Date;
  targetFormatted: string;
  opensAtFormatted: string;
  toleranceUntilFormatted: string;
  diffMinutes: number;
  canCheckIn: boolean;
  isLateWindow: boolean;
  isMissedWindow: boolean;
}

export function evaluatePatrolSlotWindow(
  shiftDateISO: string,
  slot: PatrolSlotLabel,
  now: Date = new Date()
): PatrolSlotWindowEvaluation {
  const targetDate = getPatrolSlotTargetDate(shiftDateISO, slot);
  const opensDate = new Date(targetDate.getTime() - PATROL_EARLY_OPEN_MINUTES * 60_000);
  const toleranceDate = new Date(targetDate.getTime() + PATROL_ONTIME_TOLERANCE_MINUTES * 60_000);
  const deltaMs = now.getTime() - targetDate.getTime();
  const diffMinutes = deltaMs < 0 ? Math.ceil(deltaMs / 60_000) : Math.floor(deltaMs / 60_000);

  return {
    targetDate,
    targetFormatted: formatLocalDateTimeMinute(targetDate),
    opensAtFormatted: `${pad2(opensDate.getHours())}:${pad2(opensDate.getMinutes())}`,
    toleranceUntilFormatted: `${pad2(toleranceDate.getHours())}:${pad2(toleranceDate.getMinutes())}`,
    diffMinutes,
    canCheckIn: deltaMs >= -PATROL_EARLY_OPEN_MINUTES * 60_000,
    isLateWindow: deltaMs > PATROL_ONTIME_TOLERANCE_MINUTES * 60_000,
    isMissedWindow: deltaMs > PATROL_MISSED_THRESHOLD_MINUTES * 60_000
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  appsScriptUrl:
    '',
  apiToken: '',
  monthlyDues: 50000,
  orgName: ORG_NAME_DEFAULT,
  ketuaName: 'Ir. Hendra Wijaya, M.T.'
};

export class GoogleSheetsApiError extends Error {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'GoogleSheetsApiError';
    this.statusCode = statusCode;
  }
}

class SafeStorage {
  private memory = new Map<string, string>();
  private fallbackActive = false;

  public isUsingMemoryFallback(): boolean {
    return this.fallbackActive;
  }

  public getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.fallbackActive = true;
        return this.memory.get(key) ?? null;
      }
      const val = window.localStorage.getItem(key);
      if (val !== null) {
        this.memory.set(key, val);
      }
      return val;
    } catch {
      this.fallbackActive = true;
      return this.memory.get(key) ?? null;
    }
  }

  public setItem(key: string, value: string): void {
    this.memory.set(key, value);
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.fallbackActive = true;
        return;
      }
      window.localStorage.setItem(key, value);
    } catch {
      this.fallbackActive = true;
    }
  }

  public removeItem(key: string): void {
    this.memory.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      this.fallbackActive = true;
    }
  }

  public getJSON<T>(key: string, fallback: T): T {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  public setJSON(key: string, value: unknown): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch {
      this.fallbackActive = true;
    }
  }
}

export const safeStorage = new SafeStorage();

function normalizeRowForSheet<K extends SheetName>(
  sheet: K,
  raw: Record<string, unknown>
): SheetRecordMap[K] {
  const cols = SHEET_SCHEMAS[sheet];
  const numericCols: readonly string[] = NUMERIC_FIELDS[sheet] ?? [];
  const normalized: Record<string, unknown> = {};

  for (const col of cols) {
    const val = raw[col];
    if (numericCols.includes(col)) {
      normalized[col] = Number(val ?? 0) || 0;
    } else if (
      sheet === 'Residents' &&
      col === 'hubungan_keluarga' &&
      String(val ?? '').trim().toLowerCase() === 'suami'
    ) {
      normalized[col] = 'Kepala Keluarga';
    } else {
      normalized[col] = val === undefined || val === null ? '' : String(val);
    }
  }
  return normalized as unknown as SheetRecordMap[K];
}

export async function postToGoogleSheets<T = unknown>(params: {
  action: ApiAction;
  sheet: SheetName;
  id?: string;
  data?: Record<string, unknown>;
  settings: AppSettings;
}): Promise<T> {
  const endpoint = params.settings.appsScriptUrl.trim();
  if (!endpoint) {
    throw new GoogleSheetsApiError('URL Google Apps Script belum dikonfigurasi.');
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        token: params.settings.apiToken.trim(),
        action: params.action,
        sheet: params.sheet,
        id: params.id ?? '',
        data: params.data ?? {}
      })
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Koneksi jaringan terputus';
    throw new GoogleSheetsApiError(`Gagal menghubungi Google Apps Script: ${detail}`);
  }

  if (!response.ok) {
    throw new GoogleSheetsApiError(
      `Server Google Apps Script merespons HTTP ${response.status}.`,
      response.status
    );
  }

  let parsed: ApiResponse<T>;
  try {
    parsed = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new GoogleSheetsApiError(
      'Respons Apps Script bukan JSON valid. Pastikan Web App di-deploy dengan akses Anyone.'
    );
  }

  if (!parsed || parsed.ok !== true) {
    const errMsg = parsed && 'error' in parsed ? parsed.error : 'Permintaan ditolak oleh Apps Script.';
    throw new GoogleSheetsApiError(errMsg);
  }

  return (parsed.rows ?? parsed.data) as T;
}

export async function getSheetRowsFromGoogleSheets<K extends SheetName>(
  sheet: K,
  settings: AppSettings
): Promise<SheetRecordMap[K][]> {
  const endpoint = settings.appsScriptUrl.trim();
  if (!endpoint) {
    throw new GoogleSheetsApiError('URL Google Apps Script belum dikonfigurasi.');
  }

  const url = new URL(endpoint);
  url.searchParams.set('action', 'list');
  url.searchParams.set('sheet', sheet);
  if (settings.apiToken.trim()) {
    url.searchParams.set('token', settings.apiToken.trim());
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Koneksi jaringan gagal';
    throw new GoogleSheetsApiError(`Gagal mengunduh sheet ${sheet}: ${detail}`);
  }

  if (!response.ok) {
    throw new GoogleSheetsApiError(`Gagal membaca sheet ${sheet} (HTTP ${response.status}).`, response.status);
  }

  let parsed: ApiResponse<Array<Record<string, unknown>>>;
  try {
    parsed = (await response.json()) as ApiResponse<Array<Record<string, unknown>>>;
  } catch {
    throw new GoogleSheetsApiError(`Respons GET sheet ${sheet} bukan JSON valid.`);
  }

  if (!parsed || parsed.ok !== true) {
    const errMsg = parsed && 'error' in parsed ? parsed.error : `Gagal memuat sheet ${sheet}.`;
    throw new GoogleSheetsApiError(errMsg);
  }

  const rawRows = parsed.rows ?? parsed.data ?? [];
  return rawRows.map((row) => normalizeRowForSheet(sheet, row));
}

export interface StoreSnapshot {
  sheets: AllSheetsData;
  settings: AppSettings;
  sync: SyncState;
  session: UserSession | null;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
}

class PaguyubanLocalFirstStore {
  private sheets: AllSheetsData;
  private settings: AppSettings;
  private sync: SyncState;
  private session: UserSession | null;
  private theme: 'light' | 'dark';
  private sidebarCollapsed: boolean;
  private listeners = new Set<() => void>();
  private snapshotCache: StoreSnapshot;
  private isFlushing = false;

  constructor() {
    const storedSettings = safeStorage.getJSON<Partial<AppSettings>>(STORAGE_KEYS.SETTINGS, {});
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...storedSettings,
      appsScriptUrl:
        (storedSettings.appsScriptUrl ?? '').trim() || DEFAULT_SETTINGS.appsScriptUrl,
      monthlyDues: Number(storedSettings.monthlyDues ?? DEFAULT_SETTINGS.monthlyDues) || 50000
    };

    const seedSheets = buildSeedSheets();
    const storedSheets = safeStorage.getJSON<Partial<AllSheetsData> | null>(STORAGE_KEYS.SHEETS, null);
    if (storedSheets && Array.isArray(storedSheets.Residents) && Array.isArray(storedSheets.Users)) {
      let migratedHubungan = false;
      const upgradedResidents = storedSheets.Residents.map((r) => {
        if (String(r.hubungan_keluarga ?? '').trim().toLowerCase() === 'suami') {
          migratedHubungan = true;
          return { ...r, hubungan_keluarga: 'Kepala Keluarga' };
        }
        return r;
      });
      this.sheets = {
        Residents: upgradedResidents,
        Users: storedSheets.Users,
        Letters: Array.isArray(storedSheets.Letters) ? storedSheets.Letters : seedSheets.Letters,
        Guestbook: Array.isArray(storedSheets.Guestbook) ? storedSheets.Guestbook : seedSheets.Guestbook,
        SecurityPatrol: Array.isArray(storedSheets.SecurityPatrol) ? storedSheets.SecurityPatrol : seedSheets.SecurityPatrol,
        Complaints: Array.isArray(storedSheets.Complaints) ? storedSheets.Complaints : seedSheets.Complaints,
        Sanitation: Array.isArray(storedSheets.Sanitation) ? storedSheets.Sanitation : seedSheets.Sanitation,
        SocialFund: Array.isArray(storedSheets.SocialFund) ? storedSheets.SocialFund : seedSheets.SocialFund,
        Cashflow: Array.isArray(storedSheets.Cashflow) ? storedSheets.Cashflow : seedSheets.Cashflow,
        Assets: Array.isArray(storedSheets.Assets) ? storedSheets.Assets : seedSheets.Assets,
        Bookings: Array.isArray(storedSheets.Bookings) ? storedSheets.Bookings : seedSheets.Bookings,
        AuditLog: Array.isArray(storedSheets.AuditLog) ? storedSheets.AuditLog : seedSheets.AuditLog
      };
      if (migratedHubungan) {
        safeStorage.setJSON(STORAGE_KEYS.SHEETS, this.sheets);
      }
    } else {
      this.sheets = seedSheets;
      safeStorage.setJSON(STORAGE_KEYS.SHEETS, this.sheets);
    }

    const storedQueue = safeStorage.getJSON<PendingSyncItem[]>(STORAGE_KEYS.QUEUE, []);
    const storedMeta = safeStorage.getJSON<{ status?: SyncStatus; lastSyncAt?: string; lastError?: string }>(
      STORAGE_KEYS.SYNC_META,
      {}
    );

    const hasUrl = Boolean(this.settings.appsScriptUrl.trim());
    const initialStatus: SyncStatus = !hasUrl
      ? 'Lokal'
      : storedQueue.length > 0 && storedMeta.status === 'Gagal'
        ? 'Gagal'
        : storedMeta.status === 'Tersinkron'
          ? 'Tersinkron'
          : 'Lokal';

    this.sync = {
      status: initialStatus,
      queue: storedQueue,
      lastSyncAt: storedMeta.lastSyncAt ?? '',
      lastError: storedMeta.lastError ?? '',
      usingMemoryFallback: safeStorage.isUsingMemoryFallback()
    };

    const rawSession = safeStorage.getJSON<Partial<UserSession> | null>(STORAGE_KEYS.SESSION, null);
    if (rawSession && rawSession.role && rawSession.userId) {
      const migratedRole: RoleId =
        (rawSession.role as string) === 'satpam'
          ? 'security'
          : rawSession.role in ROLE_DEFINITIONS
            ? rawSession.role
            : 'warga';
      const activeAccount = this.sheets.Users.find((u) => u.id === rawSession.userId && u.aktif === 'Ya');
      if (activeAccount) {
        this.session = {
          userId: activeAccount.id,
          username: activeAccount.username,
          displayName: activeAccount.nama_tampilan,
          role: migratedRole,
          residentId: activeAccount.resident_id,
          shiftLabel: extractShiftAndAvatar(activeAccount.shift_label).shiftText,
          loginAt: rawSession.loginAt ?? new Date().toISOString()
        };
      } else {
        this.session = null;
      }
    } else {
      this.session = null;
    }

    const savedTheme = safeStorage.getItem(STORAGE_KEYS.THEME);
    this.theme = savedTheme === 'dark' ? 'dark' : 'light';
    this.sidebarCollapsed = safeStorage.getItem(STORAGE_KEYS.SIDEBAR) === '1';

    this.refreshGuestExpirations(false);
    this.refreshMissedPatrolSlots(getActiveNightShiftDate(), 'Petugas Shift Malam', false);
    this.applyThemeAttribute();

    this.snapshotCache = this.buildSnapshot();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.isCloudConfigured() && this.sync.queue.length > 0) {
          void this.flushPendingQueue();
        }
      });

      if (this.isCloudConfigured()) {
        window.setTimeout(() => {
          void this.syncFromCloudPublic();
        }, 50);
      }
    }
  }

  private buildSnapshot(): StoreSnapshot {
    return {
      sheets: this.sheets,
      settings: this.settings,
      sync: {
        ...this.sync,
        usingMemoryFallback: safeStorage.isUsingMemoryFallback()
      },
      session: this.session,
      theme: this.theme,
      sidebarCollapsed: this.sidebarCollapsed
    };
  }

  private emit(): void {
    this.snapshotCache = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getSnapshot = (): StoreSnapshot => {
    return this.snapshotCache;
  };

  private persistSheets(): void {
    safeStorage.setJSON(STORAGE_KEYS.SHEETS, this.sheets);
  }

  private persistSync(): void {
    safeStorage.setJSON(STORAGE_KEYS.QUEUE, this.sync.queue);
    safeStorage.setJSON(STORAGE_KEYS.SYNC_META, {
      status: this.sync.status,
      lastSyncAt: this.sync.lastSyncAt,
      lastError: this.sync.lastError
    });
  }

  private applyThemeAttribute(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.theme);
    }
  }

  public setTheme(next: 'light' | 'dark'): void {
    this.theme = next;
    safeStorage.setItem(STORAGE_KEYS.THEME, next);
    this.applyThemeAttribute();
    this.emit();
  }

  public toggleTheme(): void {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  public setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
    safeStorage.setItem(STORAGE_KEYS.SIDEBAR, collapsed ? '1' : '0');
    this.emit();
  }

  public isCloudConfigured(): boolean {
    return Boolean(this.settings.appsScriptUrl.trim());
  }

  public getOrgName(): string {
    return this.settings.orgName.trim() || ORG_NAME_DEFAULT;
  }

  public authenticateByUsernamePin(
    username: string,
    pin: string
  ): { ok: boolean; error?: string } {
    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin.trim();
    if (!cleanUser) {
      return { ok: false, error: 'Masukkan username akun Anda terlebih dahulu.' };
    }
    if (!cleanPin) {
      return { ok: false, error: 'Masukkan PIN akses Anda terlebih dahulu.' };
    }

    const account = this.sheets.Users.find(
      (u) => u.username.trim().toLowerCase() === cleanUser
    );
    if (!account) {
      return {
        ok: false,
        error: 'Username atau PIN tidak sesuai. Hubungi Ketua Paguyuban / Pengurus Warga jika belum memiliki akun.'
      };
    }
    if (account.aktif !== 'Ya') {
      return {
        ok: false,
        error: 'Akun ini sedang dinonaktifkan. Silakan hubungi Ketua Paguyuban / Pengurus Warga.'
      };
    }
    if (account.pin !== cleanPin) {
      return {
        ok: false,
        error: 'Username atau PIN tidak sesuai. Periksa kembali kredensial pribadi Anda.'
      };
    }

    this.session = {
      userId: account.id,
      username: account.username,
      displayName: account.nama_tampilan,
      role: account.role,
      residentId: account.resident_id,
      shiftLabel: extractShiftAndAvatar(account.shift_label).shiftText,
      loginAt: new Date().toISOString()
    };
    safeStorage.setJSON(STORAGE_KEYS.SESSION, this.session);
    this.emit();
    return { ok: true };
  }

  public getUserAvatarById(userId: string | undefined): string {
    if (!userId) return '';
    const u = this.sheets.Users.find((acc) => acc.id === userId);
    if (!u) return '';
    return extractShiftAndAvatar(u.shift_label).avatarUrl;
  }

  public getCurrentUserAvatar(): string {
    return this.getUserAvatarById(this.session?.userId);
  }

  public updateMyProfileAvatar(avatarUrl: string): void {
    if (!this.session) {
      throw new Error('Silakan masuk terlebih dahulu untuk mengubah foto profil.');
    }
    const existing = this.getRawById('Users', this.session.userId);
    if (!existing) {
      throw new Error('Akun pengguna tidak ditemukan.');
    }
    const { shiftText } = extractShiftAndAvatar(existing.shift_label);
    const nextPacked = packShiftAndAvatar(
      existing.role === 'security' ? shiftText || 'Shift Pos Utama' : '',
      avatarUrl
    );
    this.internalUpdateRecord('Users', existing.id, { shift_label: nextPacked });
    this.recordAudit({
      action: 'update',
      module: 'data_saya',
      recordId: existing.id,
      summary: avatarUrl
        ? `Memperbarui foto profil / avatar pada Profil Saya ("${existing.username}").`
        : `Mengembalikan avatar Profil Saya ("${existing.username}") ke inisial nama.`,
      isAdminOwnModule: this.session.role === 'admin'
    });
    this.emit();
  }

  public updateMyOwnPin(currentPin: string, nextPin: string): void {
    if (!this.session) {
      throw new Error('Silakan masuk terlebih dahulu.');
    }
    const existing = this.getRawById('Users', this.session.userId);
    if (!existing) {
      throw new Error('Akun pengguna tidak ditemukan.');
    }
    if (existing.pin !== currentPin.trim()) {
      throw new Error('PIN saat ini tidak sesuai.');
    }
    const cleanNext = nextPin.trim();
    if (!/^\d{4,8}$/.test(cleanNext)) {
      throw new Error('PIN baru wajib terdiri dari 4 sampai 8 digit angka.');
    }
    this.internalUpdateRecord('Users', existing.id, { pin: cleanNext });
    this.recordAudit({
      action: 'update',
      module: 'data_saya',
      recordId: existing.id,
      summary: `Mengganti PIN pribadi melalui Profil Saya ("${existing.username}").`,
      isAdminOwnModule: this.session.role === 'admin'
    });
    this.emit();
  }

  /**
   * Self-service Profile Edit for ALL logged-in users:
   * Updates own Nama, No. Rumah, Blok (or Shift for Security), Username, Status Keluarga & No. HP,
   * and synchronizes two-way with Residents + Users (Manajemen Akun database) + Google Sheets.
   */
  public updateMyOwnProfile(params: {
    nama: string;
    no_rumah?: string;
    blok?: 'G' | 'F';
    hubungan_keluarga?: string;
    no_hp?: string;
    shift_label?: string;
    username?: string;
  }): { user: UserAccount; resident?: Resident } {
    if (!this.session) {
      throw new Error('Silakan masuk terlebih dahulu untuk mengedit profil.');
    }
    const existingUser = this.getRawById('Users', this.session.userId);
    if (!existingUser) {
      throw new Error('Data akun pengguna tidak ditemukan.');
    }

    const cleanNama = String(params.nama || '').trim();
    if (!cleanNama) {
      throw new Error('Nama lengkap wajib diisi.');
    }

    const cleanUsername = params.username
      ? params.username.trim().toLowerCase()
      : existingUser.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(cleanUsername)) {
      throw new Error('Username wajib 3-24 karakter (huruf kecil, angka, titik, atau garis bawah).');
    }
    if (existingUser.role !== 'admin' && cleanUsername === 'admin') {
      throw new Error('Username "admin" hanya diperuntukkan bagi Admin sistem.');
    }
    if (
      this.sheets.Users.some(
        (u) => u.id !== existingUser.id && u.username.toLowerCase() === cleanUsername
      )
    ) {
      throw new Error(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
    }

    const prevAvatar = extractShiftAndAvatar(existingUser.shift_label).avatarUrl;

    if (existingUser.role === 'security') {
      const prevShift = extractShiftAndAvatar(existingUser.shift_label).shiftText;
      const nextShift = (params.shift_label ?? prevShift ?? 'Shift Malam Pos Gerbang Utama').trim() || 'Shift Malam Pos Gerbang Utama';
      const updatedSec = this.internalUpdateRecord('Users', existingUser.id, {
        username: cleanUsername,
        nama_tampilan: cleanNama,
        shift_label: packShiftAndAvatar(nextShift, prevAvatar)
      });
      if (!updatedSec) throw new Error('Gagal memperbarui profil Security.');

      this.session = {
        ...this.session,
        username: updatedSec.username,
        displayName: updatedSec.nama_tampilan,
        shiftLabel: nextShift
      };
      safeStorage.setJSON(STORAGE_KEYS.SESSION, this.session);
      this.recordAudit({
        action: 'update',
        module: 'data_saya',
        recordId: existingUser.id,
        summary: `Memperbarui profil pribadi Security "${updatedSec.nama_tampilan}" (${nextShift}).`,
        isAdminOwnModule: false
      });
      this.emit();
      return { user: updatedSec };
    }

    if (params.no_hp !== undefined && !isValidOptionalIndonesianPhone(params.no_hp)) {
      throw new Error('Format Nomor HP tidak valid (kosongkan bila tidak ada).');
    }

    const existingRes = existingUser.resident_id
      ? this.getRawById('Residents', existingUser.resident_id)
      : undefined;

    const { no_rumah, blok } = normalizeHouseAndBlok(
      params.no_rumah ?? existingRes?.no_rumah ?? 'G-01',
      params.blok ?? existingRes?.blok ?? 'G'
    );
    const cleanHub = normalizeFamilyStatus(
      params.hubungan_keluarga ?? existingRes?.hubungan_keluarga ?? 'Kepala Keluarga'
    );
    const cleanHp =
      params.no_hp !== undefined ? params.no_hp.trim() : (existingRes?.no_hp ?? '');

    let savedRes: Resident;
    if (existingRes) {
      const oldName = existingRes.nama;
      const oldRumah = existingRes.no_rumah;
      const updatedRes = this.internalUpdateRecord('Residents', existingRes.id, {
        nama: cleanNama,
        no_rumah,
        blok,
        hubungan_keluarga: cleanHub,
        no_hp: cleanHp
      });
      if (!updatedRes) throw new Error('Gagal memperbarui data warga pada profil.');
      savedRes = updatedRes;

      if (oldRumah !== no_rumah || existingRes.blok !== blok) {
        this.sheets.Residents.forEach((member) => {
          if (
            member.id !== existingRes.id &&
            existingRes.no_kk &&
            member.no_kk === existingRes.no_kk &&
            member.no_rumah === oldRumah
          ) {
            this.internalUpdateRecord('Residents', member.id, {
              no_rumah,
              blok
            });
          }
        });
      }

      this.propagateResidentNameChange(existingRes.id, oldName, cleanNama, no_rumah, blok);
    } else {
      const sameHouse = this.sheets.Residents.find(
        (r) => r.no_rumah.toUpperCase() === no_rumah && r.no_kk
      );
      savedRes = this.internalCreateRecord('Residents', {
        id: generateNextId('RES', this.sheets.Residents),
        nik: '',
        nama: cleanNama,
        no_kk: sameHouse?.no_kk || `KK-${no_rumah}`,
        hubungan_keluarga: cleanHub,
        tgl_lahir: '',
        blok,
        no_rumah,
        no_hp: cleanHp,
        status: 'Tetap',
        created_at: new Date().toISOString()
      });
    }

    const nextDisplayName =
      existingUser.role === 'admin'
        ? `${cleanNama} (Admin)`
        : `${cleanNama} (${no_rumah})`;

    const updatedUser = this.internalUpdateRecord('Users', existingUser.id, {
      username: cleanUsername,
      nama_tampilan: nextDisplayName,
      resident_id: savedRes.id,
      shift_label: packShiftAndAvatar('', prevAvatar)
    });
    if (!updatedUser) throw new Error('Gagal menyinkronkan profil ke Manajemen Akun.');

    this.session = {
      ...this.session,
      username: updatedUser.username,
      displayName: updatedUser.nama_tampilan,
      residentId: savedRes.id
    };
    safeStorage.setJSON(STORAGE_KEYS.SESSION, this.session);

    if (existingUser.role === 'ketua') {
      this.settings = { ...this.settings, ketuaName: cleanNama };
      safeStorage.setJSON(STORAGE_KEYS.SETTINGS, this.settings);
    }

    this.recordAudit({
      action: 'update',
      module: 'data_saya',
      recordId: updatedUser.id,
      summary: `Memperbarui profil sendiri & menyinkronkan ke Manajemen Akun: ${cleanNama} (${no_rumah}, Blok ${blok}).`,
      isAdminOwnModule: existingUser.role === 'admin'
    });
    this.emit();
    return {
      user: updatedUser,
      resident: { ...savedRes, nik: maskNik(savedRes.nik, existingUser.role) }
    };
  }

  public authenticateWithCredentials(
    role: RoleId,
    username: string,
    pin: string
  ): { ok: boolean; error?: string } {
    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin.trim();
    if (!cleanUser) {
      return { ok: false, error: 'Masukkan nama pengguna (username) terlebih dahulu.' };
    }
    if (!cleanPin) {
      return { ok: false, error: 'Masukkan PIN keamanan terlebih dahulu.' };
    }

    const account = this.sheets.Users.find(
      (u) => u.role === role && u.username.trim().toLowerCase() === cleanUser
    );
    if (!account) {
      return {
        ok: false,
        error: `Akun "${username.trim()}" untuk peran ${ROLE_DEFINITIONS[role].label} tidak ditemukan.`
      };
    }
    if (account.aktif !== 'Ya') {
      return {
        ok: false,
        error: 'Akun ini telah dinonaktifkan. Hubungi pengurus paguyuban.'
      };
    }
    if (account.pin !== cleanPin) {
      return {
        ok: false,
        error: `PIN tidak sesuai untuk pengguna "${account.username}".`
      };
    }

    this.session = {
      userId: account.id,
      username: account.username,
      displayName: account.nama_tampilan,
      role: account.role,
      residentId: account.resident_id,
      shiftLabel: extractShiftAndAvatar(account.shift_label).shiftText,
      loginAt: new Date().toISOString()
    };
    safeStorage.setJSON(STORAGE_KEYS.SESSION, this.session);
    this.emit();
    return { ok: true };
  }

  public logout(): void {
    this.session = null;
    safeStorage.removeItem(STORAGE_KEYS.SESSION);
    this.emit();
  }

  public canAccessModule(role: RoleId | undefined, moduleId: ModuleId): boolean {
    return canAccessModule(role, moduleId);
  }

  public hasPermission(moduleId: ModuleId, action: PermissionAction): boolean {
    return hasPermission(this.session?.role, moduleId, action);
  }

  private requirePermission(moduleId: ModuleId, action: PermissionAction): UserSession {
    if (!this.session) {
      throw new Error('Sesi belum aktif. Silakan masuk terlebih dahulu.');
    }
    if (!hasPermission(this.session.role, moduleId, action)) {
      throw new Error(
        `Akses ditolak: peran ${ROLE_DEFINITIONS[this.session.role].label} tidak memiliki izin "${action}" pada modul ini.`
      );
    }
    return this.session;
  }

  /**
   * Formats actor attribution and marks "oleh Admin" whenever Admin executes an
   * action on behalf of another pengurus/warga role.
   */
  private getActorAttribution(isAdminOwnModule = false): {
    signature: string;
    onBehalfNote: string;
  } {
    const sess = this.session;
    if (!sess) {
      return { signature: 'Sistem Otomatis', onBehalfNote: '' };
    }
    if (sess.role === 'admin' && !isAdminOwnModule) {
      return {
        signature: `${sess.displayName} (oleh Admin)`,
        onBehalfNote: 'oleh Admin'
      };
    }
    return {
      signature: `${sess.displayName} (${ROLE_DEFINITIONS[sess.role].label})`,
      onBehalfNote: ''
    };
  }

  private recordAudit(params: {
    action: PermissionAction;
    module: ModuleId;
    recordId: string;
    summary: string;
    isAdminOwnModule?: boolean;
  }): AuditLogEntry {
    const sess = this.session;
    const { onBehalfNote } = this.getActorAttribution(Boolean(params.isAdminOwnModule));
    const finalSummary =
      onBehalfNote && !params.summary.includes('oleh Admin')
        ? `${params.summary} (${onBehalfNote})`
        : params.summary;

    const entry: AuditLogEntry = {
      id: generateNextId('LOG', this.sheets.AuditLog),
      timestamp: new Date().toISOString(),
      actor_user_id: sess?.userId ?? 'SYSTEM',
      actor_username: sess?.username ?? 'system',
      actor_name: sess?.displayName ?? 'Sistem Otomatis',
      actor_role: sess?.role ?? 'admin',
      on_behalf_note: onBehalfNote,
      action: params.action,
      module: params.module,
      record_id: params.recordId,
      summary: finalSummary
    };

    this.sheets = {
      ...this.sheets,
      AuditLog: [entry, ...this.sheets.AuditLog]
    };
    this.persistSheets();
    this.enqueueSyncOperation('create', 'AuditLog', entry.id, entry as unknown as Record<string, unknown>);
    return entry;
  }

  public saveSettings(partial: Partial<AppSettings>): void {
    this.requirePermission('pengaturan', 'update');
    this.settings = {
      ...this.settings,
      ...partial,
      monthlyDues: Number(partial.monthlyDues ?? this.settings.monthlyDues) || 50000
    };
    safeStorage.setJSON(STORAGE_KEYS.SETTINGS, this.settings);

    if (!this.isCloudConfigured()) {
      this.sync = { ...this.sync, status: 'Lokal', lastError: '' };
      this.persistSync();
    } else if (this.sync.queue.length > 0) {
      void this.flushPendingQueue();
    } else {
      this.sync = { ...this.sync, status: 'Tersinkron', lastError: '' };
      this.persistSync();
    }
    this.recordAudit({
      action: 'update',
      module: 'pengaturan',
      recordId: 'SETTINGS',
      summary: 'Memperbarui parameter organisasi & endpoint Google Apps Script.',
      isAdminOwnModule: true
    });
    this.emit();
  }

  private getRawById<K extends SheetName>(sheet: K, id: string): SheetRecordMap[K] | undefined {
    return this.sheets[sheet].find((row) => String(row.id) === String(id));
  }

  /**
   * Returns caller's own household no_kk and member IDs (used for strict data-layer scoping).
   */
  public getCallerHouseholdScope(): {
    selfResident: Resident | null;
    no_kk: string;
    memberIds: string[];
    no_rumah: string;
  } {
    const sess = this.session;
    if (!sess || !sess.residentId) {
      return { selfResident: null, no_kk: '', memberIds: [], no_rumah: '' };
    }
    const selfRes = this.getRawById('Residents', sess.residentId) ?? null;
    if (!selfRes) {
      return { selfResident: null, no_kk: '', memberIds: [sess.residentId], no_rumah: '' };
    }
    const members = this.sheets.Residents.filter(
      (r) => (selfRes.no_kk && r.no_kk === selfRes.no_kk) || r.id === selfRes.id
    );
    return {
      selfResident: selfRes,
      no_kk: selfRes.no_kk,
      memberIds: members.map((m) => m.id),
      no_rumah: selfRes.no_rumah
    };
  }

  // ============================================================================
  // DATA-LAYER SCOPING SELECTORS (Never rely on hiding menus alone)
  // ============================================================================

  /**
   * "Data Saya": returns ONLY own profile and family members in same no_kk, with NIK masked
   * per role (only Sekretaris and Ketua see full NIK).
   */
  public getMyHouseholdMembers(): Resident[] {
    if (!this.session || !hasPermission(this.session.role, 'data_saya', 'read')) {
      return [];
    }
    const scope = this.getCallerHouseholdScope();
    if (!scope.selfResident) return [];
    const role = this.session.role;
    return this.sheets.Residents.filter((r) => scope.memberIds.includes(r.id)).map((r) => ({
      ...r,
      nik: maskNik(r.nik, role)
    }));
  }

  /**
   * "Profil Saya" family member update / create:
   * Only Nama & Status (Suami | Istri | Anak | Keluarga) are required; Nomor HP is completely optional.
   */
  public saveMyFamilyMember(params: {
    residentId?: string;
    nama: string;
    hubungan_keluarga: string;
    no_hp?: string;
  }): Resident {
    const sess = this.requirePermission('data_saya', 'update');
    const scope = this.getCallerHouseholdScope();
    const cleanNama = String(params.nama || '').trim();
    if (!cleanNama) {
      throw new Error('Nama anggota keluarga wajib diisi.');
    }
    const cleanPhone = String(params.no_hp || '').trim();
    if (!isValidOptionalIndonesianPhone(cleanPhone)) {
      throw new Error('Format Nomor HP tidak valid (kosongkan jika tidak ada, atau isi contoh: 081234567890).');
    }
    const cleanStatus = normalizeFamilyStatus(params.hubungan_keluarga);

    if (params.residentId) {
      if (sess.role !== 'admin' && !scope.memberIds.includes(params.residentId)) {
        throw new Error('Akses ditolak: Anda hanya dapat mengubah data anggota KK sendiri.');
      }
      const target = this.getRawById('Residents', params.residentId);
      if (!target) {
        throw new Error('Data anggota keluarga tidak ditemukan.');
      }
      const updated = this.internalUpdateRecord('Residents', params.residentId, {
        nama: cleanNama,
        hubungan_keluarga: cleanStatus,
        no_hp: cleanPhone
      });
      if (!updated) throw new Error('Gagal memperbarui profil anggota keluarga.');

      if (cleanNama !== target.nama) {
        this.propagateResidentNameChange(params.residentId, target.nama, updated.nama, updated.no_rumah);
      }

      this.recordAudit({
        action: 'update',
        module: 'data_saya',
        recordId: params.residentId,
        summary: `Memperbarui profil anggota KK (${updated.nama} - ${updated.hubungan_keluarga}, ${updated.no_rumah}).`,
        isAdminOwnModule: sess.role === 'admin'
      });
      this.emit();
      return { ...updated, nik: maskNik(updated.nik, sess.role) };
    }

    if (!scope.selfResident) {
      throw new Error('Akun ini belum tertaut ke rumah warga aktif.');
    }
    const baseHouse = scope.selfResident;
    const created = this.internalCreateRecord('Residents', {
      id: generateNextId('RES', this.sheets.Residents),
      nik: '',
      nama: cleanNama,
      no_kk: baseHouse.no_kk,
      hubungan_keluarga: cleanStatus,
      tgl_lahir: '',
      blok: baseHouse.blok,
      no_rumah: baseHouse.no_rumah,
      no_hp: cleanPhone,
      status: baseHouse.status,
      created_at: new Date().toISOString()
    });

    this.recordAudit({
      action: 'create',
      module: 'data_saya',
      recordId: created.id,
      summary: `Menambahkan anggota keluarga (${created.nama} - ${created.hubungan_keluarga}) di rumah ${created.no_rumah}.`,
      isAdminOwnModule: sess.role === 'admin'
    });
    this.emit();
    return { ...created, nik: maskNik(created.nik, sess.role) };
  }

  public updateMyFamilyContact(
    residentId: string,
    newPhone: string,
    newName?: string,
    newHubungan?: string
  ): Resident {
    const existing = this.getRawById('Residents', residentId);
    return this.saveMyFamilyMember({
      residentId,
      nama: (newName && newName.trim()) || existing?.nama || '',
      hubungan_keluarga: newHubungan || existing?.hubungan_keluarga || 'Keluarga',
      no_hp: newPhone
    });
  }

  private propagateResidentNameChange(
    residentId: string,
    oldName: string,
    newName: string,
    noRumah: string,
    blok?: 'G' | 'F'
  ): void {
    const cleanNew = newName.trim();
    if (!cleanNew) return;
    const cleanRumah = noRumah.trim().toUpperCase();

    this.sheets.Users.forEach((u) => {
      if (u.resident_id === residentId) {
        const nextDisplay =
          u.role === 'admin' ? `${cleanNew} (Admin)` : `${cleanNew} (${cleanRumah})`;
        if (nextDisplay !== u.nama_tampilan) {
          this.internalUpdateRecord('Users', u.id, { nama_tampilan: nextDisplay });
        }
        if (this.session && this.session.userId === u.id) {
          this.session = { ...this.session, displayName: nextDisplay };
          safeStorage.setJSON(STORAGE_KEYS.SESSION, this.session);
        }
        if (u.role === 'ketua') {
          this.settings = { ...this.settings, ketuaName: cleanNew };
          safeStorage.setJSON(STORAGE_KEYS.SETTINGS, this.settings);
        }
      }
    });

    this.sheets.Letters.forEach((ltr) => {
      if (ltr.resident_id === residentId && ltr.nama !== cleanNew) {
        this.internalUpdateRecord('Letters', ltr.id, { nama: cleanNew });
      }
    });

    (this.sheets.Complaints ?? []).forEach((cmp) => {
      if (cmp.resident_id === residentId) {
        const patch: Partial<ComplaintEntry> = {};
        if (cmp.nama_pelapor !== cleanNew) patch.nama_pelapor = cleanNew;
        if (cleanRumah && cmp.no_rumah !== cleanRumah) patch.no_rumah = cleanRumah;
        if (blok && cmp.blok !== blok) patch.blok = blok;
        if (Object.keys(patch).length > 0) {
          this.internalUpdateRecord('Complaints', cmp.id, patch);
        }
      }
    });
    this.emit();
  }

  /**
   * Scoped Residents selector:
   * - Warga & Security: [] (forbidden; must use Data Saya / getMinimalHouseDirectory)
   * - Bendahara: ONLY limited fields (id, nama, blok, no_rumah) — NIK, KK, HP, DOB stripped!
   * - Sekretaris & Ketua: full Resident fields including full NIK
   * - Admin & Wakil Ketua: Resident fields with NIK masked (3171********1234)
   */
  public getScopedResidents(): Resident[] {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'warga', 'read')) {
      return [];
    }
    if (role === 'bendahara') {
      return this.sheets.Residents.map((r) => ({
        id: r.id,
        nik: '',
        nama: r.nama,
        no_kk: '',
        hubungan_keluarga: '',
        tgl_lahir: '',
        blok: r.blok,
        no_rumah: r.no_rumah,
        no_hp: '',
        status: r.status,
        created_at: ''
      }));
    }
    return this.sheets.Residents.map((r) => ({
      ...r,
      nik: maskNik(r.nik, role)
    }));
  }

  public getLimitedResidentLookup(residentId: string): LimitedResidentInfo | null {
    const r = this.getRawById('Residents', residentId);
    if (!r) return null;
    return {
      id: r.id,
      nama: r.nama,
      blok: r.blok,
      no_rumah: r.no_rumah
    };
  }

  /**
   * Minimal house directory for Security (and guest/booking selectors):
   * exposes ONLY { resident_id, blok, no_rumah, nama_kepala } — zero NIK, no_kk, no_hp, or finances!
   */
  public getMinimalHouseDirectory(): MinimalHouseInfo[] {
    if (!this.session) return [];
    const role = this.session.role;
    const households = this.computeRawActiveHouseholds();

    if (role === 'warga') {
      const scope = this.getCallerHouseholdScope();
      return households
        .filter((hh) => hh.no_kk === scope.no_kk || scope.memberIds.includes(hh.kepala.id))
        .map((hh) => ({
          resident_id: hh.kepala.id,
          blok: hh.blok,
          no_rumah: hh.no_rumah,
          nama_kepala: hh.kepala.nama
        }));
    }

    return households.map((hh) => ({
      resident_id: hh.kepala.id,
      blok: hh.blok,
      no_rumah: hh.no_rumah,
      nama_kepala: hh.kepala.nama
    }));
  }

  /**
   * For Sekretaris/Admin editing a resident record in full CRUD mode.
   */
  public getEditableResidentById(id: string): Resident | null {
    const sess = this.requirePermission('warga', 'update');
    const raw = this.getRawById('Residents', id);
    if (!raw) return null;
    return {
      ...raw,
      nik: sess.role === 'sekretaris' || sess.role === 'ketua' ? raw.nik : maskNik(raw.nik, sess.role)
    };
  }

  public createResidentRecord(payload: Omit<Resident, 'id' | 'created_at'>): Resident {
    this.requirePermission('warga', 'create');
    const cleanNama = (payload.nama || '').trim();
    if (!cleanNama) throw new Error('Nama warga wajib diisi.');
    if (!(payload.no_rumah || '').trim()) {
      throw new Error('Nomor Rumah wajib diisi (contoh: G-02 atau F-04).');
    }
    const houseNorm = normalizeHouseAndBlok(payload.no_rumah, payload.blok);
    const existingSameHouse = this.sheets.Residents.find(
      (r) => r.no_rumah.toUpperCase() === houseNorm.no_rumah && r.no_kk
    );
    const resolvedKk =
      (payload.no_kk || '').trim() || existingSameHouse?.no_kk || `KK-${houseNorm.no_rumah}`;
    const created = this.internalCreateRecord('Residents', {
      ...payload,
      nama: cleanNama,
      hubungan_keluarga: normalizeFamilyStatus(payload.hubungan_keluarga || 'Kepala Keluarga'),
      nik: (payload.nik || '').trim(),
      no_kk: resolvedKk,
      tgl_lahir: (payload.tgl_lahir || '').trim(),
      no_hp: (payload.no_hp || '').trim(),
      blok: houseNorm.blok,
      no_rumah: houseNorm.no_rumah,
      status: payload.status || 'Tetap',
      id: generateNextId('RES', this.sheets.Residents),
      created_at: new Date().toISOString()
    });
    this.recordAudit({
      action: 'create',
      module: 'warga',
      recordId: created.id,
      summary: `Menambahkan data warga baru ${created.nama} (${created.no_rumah}, Blok ${created.blok}).`
    });
    return created;
  }

  public updateResidentRecord(id: string, partial: Partial<Resident>): Resident {
    this.requirePermission('warga', 'update');
    const existing = this.getRawById('Residents', id);
    if (!existing) throw new Error('Data warga tidak ditemukan.');

    const safeNik =
      partial.nik && partial.nik.includes('*') ? existing.nik : (partial.nik ?? existing.nik);
    const normalizedHouse =
      partial.no_rumah !== undefined || partial.blok !== undefined
        ? normalizeHouseAndBlok(
            partial.no_rumah ?? existing.no_rumah,
            partial.blok ?? existing.blok
          )
        : { no_rumah: existing.no_rumah, blok: existing.blok };

    const updated = this.internalUpdateRecord('Residents', id, {
      ...partial,
      nik: safeNik,
      no_rumah: normalizedHouse.no_rumah,
      blok: normalizedHouse.blok
    });
    if (!updated) throw new Error('Gagal memperbarui data warga.');

    if (
      existing.nama !== updated.nama ||
      existing.no_rumah !== updated.no_rumah ||
      existing.blok !== updated.blok
    ) {
      this.propagateResidentNameChange(
        id,
        existing.nama,
        updated.nama,
        updated.no_rumah,
        updated.blok
      );
    }

    this.recordAudit({
      action: 'update',
      module: 'warga',
      recordId: id,
      summary: `Memperbarui data warga ${updated.nama} (${updated.no_rumah}, Blok ${updated.blok}).`
    });
    return updated;
  }

  public deleteResidentRecord(id: string): void {
    this.requirePermission('warga', 'delete');
    const existing = this.getRawById('Residents', id);
    if (!existing) throw new Error('Data warga tidak ditemukan.');
    this.internalDeleteRecord('Residents', id);
    this.recordAudit({
      action: 'delete',
      module: 'warga',
      recordId: id,
      summary: `Menghapus data warga ${existing.nama} (${existing.no_rumah}).`
    });
  }

  // ============================================================================
  // 1. SURAT (E-LETTER): Warga ajukan -> Sekretaris verifikasi -> Ketua/Wakil setujui -> Nomor terbit otomatis
  // ============================================================================

  public getScopedLetters(): Letter[] {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'surat', 'read')) return [];
    if (role === 'warga') {
      const scope = this.getCallerHouseholdScope();
      return this.sheets.Letters.filter((l) => scope.memberIds.includes(l.resident_id));
    }
    return this.sheets.Letters;
  }

  public getLetterApplicantChoices(): Array<{ id: string; nama: string; no_rumah: string; nik_masked: string }> {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'surat', 'read')) return [];
    const active = this.sheets.Residents.filter((r) => r.status === 'Tetap' || r.status === 'Kontrak');
    const pool =
      role === 'warga'
        ? active.filter((r) => this.getCallerHouseholdScope().memberIds.includes(r.id))
        : active;
    return pool.map((r) => ({
      id: r.id,
      nama: r.nama,
      no_rumah: r.no_rumah,
      nik_masked: maskNik(r.nik, role)
    }));
  }

  public getPrintableLetterResident(residentId: string): Resident | null {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'surat', 'read')) return null;
    if (role === 'warga' && !this.getCallerHouseholdScope().memberIds.includes(residentId)) {
      return null;
    }
    const raw = this.getRawById('Residents', residentId);
    if (!raw) return null;
    return {
      ...raw,
      nik: maskNik(raw.nik, role)
    };
  }

  public submitLetterRequest(params: {
    resident_id: string;
    jenis: Letter['jenis'];
    keperluan: string;
  }): Letter {
    const sess = this.requirePermission('surat', 'create');
    if (sess.role === 'warga') {
      const scope = this.getCallerHouseholdScope();
      if (!scope.memberIds.includes(params.resident_id)) {
        throw new Error('Akses ditolak: Warga hanya dapat mengajukan surat untuk anggota KK sendiri.');
      }
    }
    const applicant = this.getRawById('Residents', params.resident_id);
    if (!applicant) throw new Error('Pemohon tidak ditemukan dalam data warga.');

    const created = this.internalCreateRecord('Letters', {
      id: generateNextId('LTR', this.sheets.Letters),
      no_surat: '',
      resident_id: applicant.id,
      nama: applicant.nama,
      jenis: params.jenis,
      keperluan: params.keperluan.trim(),
      tgl_pengajuan: todayISO(),
      status: 'Menunggu Verifikasi',
      diverifikasi_oleh: '',
      tgl_diverifikasi: '',
      disetujui_oleh: '',
      tgl_disetujui: ''
    });

    this.recordAudit({
      action: 'create',
      module: 'surat',
      recordId: created.id,
      summary: `Mengajukan ${created.jenis} untuk ${created.nama} (${applicant.no_rumah}).`,
      isAdminOwnModule: false
    });
    return created;
  }

  public verifyLetterBySekretaris(
    letterId: string,
    decision: 'Terverifikasi' | 'Ditolak' = 'Terverifikasi'
  ): Letter {
    const sess = this.requirePermission('surat', 'update');
    if (sess.role !== 'sekretaris' && sess.role !== 'admin') {
      throw new Error('Hanya Sekretaris (atau Admin) yang berwenang memverifikasi data pengajuan surat.');
    }
    const existing = this.getRawById('Letters', letterId);
    if (!existing) throw new Error('Data surat tidak ditemukan.');
    if (existing.status !== 'Menunggu Verifikasi') {
      throw new Error('Surat ini sudah melewati tahap verifikasi Sekretaris.');
    }

    const { signature } = this.getActorAttribution(false);
    const updated = this.internalUpdateRecord('Letters', letterId, {
      status: decision,
      no_surat: '',
      diverifikasi_oleh: signature,
      tgl_diverifikasi: todayISO()
    });
    if (!updated) throw new Error('Gagal memverifikasi surat.');

    this.recordAudit({
      action: 'update',
      module: 'surat',
      recordId: letterId,
      summary:
        decision === 'Terverifikasi'
          ? `Memverifikasi data kelengkapan E-Letter ${existing.jenis} a.n. ${existing.nama} -> Terverifikasi.`
          : `Menolak verifikasi E-Letter ${existing.jenis} a.n. ${existing.nama}.`
    });
    return updated;
  }

  public approveLetterByKetuaOrWakil(
    letterId: string,
    decision: 'Disetujui' | 'Ditolak'
  ): Letter {
    const sess = this.requirePermission('surat', 'approve');
    if (sess.role !== 'ketua' && sess.role !== 'wakil_ketua' && sess.role !== 'admin') {
      throw new Error('Hanya Ketua atau Wakil Ketua (atau Admin) yang dapat menyetujui E-Letter.');
    }
    const existing = this.getRawById('Letters', letterId);
    if (!existing) throw new Error('Data surat tidak ditemukan.');
    if (existing.status !== 'Terverifikasi') {
      throw new Error('E-Letter wajib diverifikasi oleh Sekretaris terlebih dahulu sebelum disetujui.');
    }

    const { signature } = this.getActorAttribution(false);
    const generatedNo =
      decision === 'Disetujui'
        ? existing.no_surat || generateNextLetterNumber(this.sheets.Letters)
        : '';

    const updated = this.internalUpdateRecord('Letters', letterId, {
      status: decision,
      no_surat: generatedNo,
      disetujui_oleh: signature,
      tgl_disetujui: todayISO()
    });
    if (!updated) throw new Error('Gagal memproses persetujuan surat.');

    this.recordAudit({
      action: 'approve',
      module: 'surat',
      recordId: letterId,
      summary:
        decision === 'Disetujui'
          ? `Menyetujui E-Letter ${existing.jenis} a.n. ${existing.nama} dengan nomor otomatis ${generatedNo}.`
          : `Menolak persetujuan E-Letter ${existing.jenis} a.n. ${existing.nama}.`
    });
    return updated;
  }

  // ============================================================================
  // 2. BUKU TAMU & SECURITY PATROLI MALAM
  //    - Security hanya melihat tamu Aktif yang masuk hari ini + daftar rumah minimal
  //    - Warga hanya melihat & melaporkan tamu KK sendiri
  // ============================================================================

  public getScopedGuestbook(): GuestbookEntry[] {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'tamu', 'read')) return [];
    this.refreshGuestExpirations(false);

    const today = todayISO();
    if (role === 'security') {
      return this.sheets.Guestbook.filter(
        (g) => g.status === 'Aktif' && g.tgl_masuk === today
      );
    }
    if (role === 'warga') {
      const scope = this.getCallerHouseholdScope();
      return this.sheets.Guestbook.filter(
        (g) => scope.memberIds.includes(g.resident_id) || (scope.no_rumah && g.no_rumah === scope.no_rumah)
      );
    }
    return this.sheets.Guestbook;
  }

  public getScopedSecurityPatrol(): SecurityPatrolEntry[] {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'patroli', 'read')) return [];
    return (this.sheets.SecurityPatrol ?? []).filter((r) => !isPatrolPhotoRow(r));
  }

  public getScopedPatrolPhotos(shiftDateISO?: string): PatrolLivePhoto[] {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'patroli', 'read')) return [];
    const rawPhotos = (this.sheets.SecurityPatrol ?? []).filter((r) => {
      if (!isPatrolPhotoRow(r)) return false;
      if (shiftDateISO && r.tanggal_shift !== shiftDateISO) return false;
      return Boolean(r.catatan && r.catatan.startsWith('data:image/'));
    });

    return rawPhotos
      .map((r) => {
        const parts = String(r.area_patroli || '').split('||');
        const titik = (parts[0] ?? 'Area Patroli Lingkungan').trim();
        const gps = (parts[1] ?? 'GPS Tercatat').trim();
        return {
          id: r.id,
          tanggal_shift: r.tanggal_shift,
          slot_jadwal: r.slot_jadwal,
          waktu_foto: r.waktu_checkin,
          urutan: Number(r.selisih_menit) || 1,
          nama_security: r.nama_security,
          titik_lokasi: titik,
          koordinat_gps: gps,
          data_url: r.catatan
        };
      })
      .sort((a, b) => a.urutan - b.urutan || a.waktu_foto.localeCompare(b.waktu_foto));
  }

  public updateGuestEntryByAdmin(
    guestId: string,
    patch: { nama_tamu: string; keperluan: string; status: GuestbookEntry['status'] }
  ): GuestbookEntry {
    const sess = this.requirePermission('tamu', 'update');
    if (sess.role !== 'admin') {
      throw new Error('Hanya Admin yang dapat mengubah nama dan detail tamu.');
    }
    const existing = this.getRawById('Guestbook', guestId);
    if (!existing) throw new Error('Data tamu tidak ditemukan.');
    const updated = this.internalUpdateRecord('Guestbook', guestId, {
      nama_tamu: patch.nama_tamu.trim() || existing.nama_tamu,
      keperluan: patch.keperluan.trim() || existing.keperluan,
      status: patch.status
    });
    if (!updated) throw new Error('Gagal memperbarui data buku tamu.');
    this.recordAudit({
      action: 'update',
      module: 'tamu',
      recordId: guestId,
      summary: `Admin memperbarui data buku tamu: ${updated.nama_tamu} (${updated.no_rumah}).`,
      isAdminOwnModule: true
    });
    return updated;
  }

  public updatePatrolOfficerNameByAdmin(patrolId: string, newOfficerName: string): SecurityPatrolEntry {
    const sess = this.requirePermission('patroli', 'update');
    if (sess.role !== 'admin') {
      throw new Error('Data check-in patroli terkunci permanen. Hanya Admin yang memiliki otoritas koreksi nama.');
    }
    const cleanName = newOfficerName.trim();
    if (!cleanName) throw new Error('Nama petugas tidak boleh kosong.');
    const existing = this.getRawById('SecurityPatrol', patrolId);
    if (!existing) throw new Error('Data rekaman patroli tidak ditemukan.');

    const updated = this.internalUpdateRecord('SecurityPatrol', patrolId, {
      nama_security: cleanName
    });
    if (!updated) throw new Error('Gagal memperbarui nama petugas pada log patroli.');

    // Also sync companion photo rows for the same shift & slot
    (this.sheets.SecurityPatrol ?? []).forEach((row) => {
      if (
        isPatrolPhotoRow(row) &&
        row.tanggal_shift === existing.tanggal_shift &&
        row.slot_jadwal === existing.slot_jadwal
      ) {
        this.internalUpdateRecord('SecurityPatrol', row.id, { nama_security: cleanName });
      }
    });

    this.recordAudit({
      action: 'update',
      module: 'patroli',
      recordId: patrolId,
      summary: `Admin memperbarui nama petugas log patroli ${existing.slot_jadwal} (${existing.tanggal_shift}) menjadi ${cleanName}.`,
      isAdminOwnModule: true
    });
    return updated;
  }

  public getScopedComplaints(): ComplaintEntry[] {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'keluhan', 'read')) return [];
    const list = this.sheets.Complaints ?? [];
    if (role === 'warga') {
      const scope = this.getCallerHouseholdScope();
      return list.filter(
        (c) =>
          scope.memberIds.includes(c.resident_id) ||
          (scope.no_rumah && c.no_rumah === scope.no_rumah)
      );
    }
    return list;
  }

  public createComplaint(params: {
    resident_id: string;
    kategori: ComplaintCategory;
    judul: string;
    deskripsi: string;
    prioritas: 'Normal' | 'Mendesak';
  }): ComplaintEntry {
    const sess = this.requirePermission('keluhan', 'create');
    if (sess.role === 'warga') {
      const scope = this.getCallerHouseholdScope();
      if (!scope.memberIds.includes(params.resident_id)) {
        throw new Error('Akses ditolak: Warga hanya dapat mengirim keluhan untuk rumah KK sendiri.');
      }
    }
    const reporter = this.getRawById('Residents', params.resident_id);
    if (!reporter) throw new Error('Data pelapor tidak ditemukan.');
    if (!params.judul.trim() || !params.deskripsi.trim()) {
      throw new Error('Judul dan deskripsi keluhan wajib diisi.');
    }

    const today = todayISO();
    const created = this.internalCreateRecord('Complaints', {
      id: generateNextId('CMP', this.sheets.Complaints ?? []),
      resident_id: reporter.id,
      no_rumah: reporter.no_rumah,
      blok: reporter.blok,
      nama_pelapor: reporter.nama,
      kategori: params.kategori,
      judul: params.judul.trim(),
      deskripsi: params.deskripsi.trim(),
      prioritas: params.prioritas,
      tgl_lapor: today,
      status: 'Menunggu',
      ditindaklanjuti_oleh: '',
      catatan_tindak_lanjut: '',
      tgl_update: today
    });

    this.recordAudit({
      action: 'create',
      module: 'keluhan',
      recordId: created.id,
      summary: `Melaporkan keluhan warga (${created.kategori}) rumah ${created.no_rumah}: ${created.judul}.`
    });
    return created;
  }

  public respondComplaintStatus(params: {
    complaintId: string;
    status: ComplaintStatus;
    catatan_tindak_lanjut: string;
    petugasNama?: string;
  }): ComplaintEntry {
    const sess = this.requirePermission('keluhan', 'update');
    const existing = this.getRawById('Complaints', params.complaintId);
    if (!existing) throw new Error('Data keluhan warga tidak ditemukan.');

    const { signature } = this.getActorAttribution(false);
    const handlerLabel = params.petugasNama?.trim()
      ? sess.role === 'admin'
        ? `${params.petugasNama.trim()} (oleh Admin)`
        : `${params.petugasNama.trim()} (${ROLE_DEFINITIONS[sess.role].label})`
      : signature;

    const updated = this.internalUpdateRecord('Complaints', params.complaintId, {
      status: params.status,
      ditindaklanjuti_oleh: handlerLabel,
      catatan_tindak_lanjut: params.catatan_tindak_lanjut.trim(),
      tgl_update: todayISO()
    });
    if (!updated) throw new Error('Gagal memperbarui status keluhan warga.');

    this.recordAudit({
      action: 'update',
      module: 'keluhan',
      recordId: params.complaintId,
      summary: `Menindaklanjuti keluhan ${existing.no_rumah} (${existing.judul}) -> status ${params.status}.`
    });
    return updated;
  }

  public createGuestEntry(params: {
    nama_tamu: string;
    no_identitas: string;
    resident_id: string;
    tgl_masuk: string;
    jam_masuk: string;
    keperluan: string;
  }): GuestbookEntry {
    const sess = this.requirePermission('tamu', 'create');
    if (sess.role === 'warga') {
      const scope = this.getCallerHouseholdScope();
      if (!scope.memberIds.includes(params.resident_id)) {
        throw new Error('Akses ditolak: Warga hanya dapat melaporkan tamu untuk rumah KK sendiri.');
      }
    }

    const host = this.getRawById('Residents', params.resident_id);
    if (!host) throw new Error('Rumah warga tujuan tidak ditemukan.');

    const checkInDate = new Date(`${params.tgl_masuk}T${params.jam_masuk || '08:00'}:00`);
    const expMs = (Number.isNaN(checkInDate.getTime()) ? Date.now() : checkInDate.getTime()) + 86_400_000;

    const created = this.internalCreateRecord('Guestbook', {
      id: generateNextId('GST', this.sheets.Guestbook),
      nama_tamu: params.nama_tamu.trim(),
      no_identitas: maskNik(params.no_identitas.trim(), 'sekretaris'),
      tujuan_blok: host.blok,
      no_rumah: host.no_rumah,
      resident_id: host.id,
      keperluan: params.keperluan.trim(),
      tgl_masuk: params.tgl_masuk,
      jam_masuk: params.jam_masuk,
      expired_at: new Date(expMs).toISOString(),
      status: expMs <= Date.now() ? 'Kedaluwarsa' : 'Aktif'
    });

    this.recordAudit({
      action: 'create',
      module: 'tamu',
      recordId: created.id,
      summary: `Mencatat tamu wajib lapor 1x24 jam: ${created.nama_tamu} tujuan ${created.no_rumah}.`
    });
    return created;
  }

  public checkoutGuestEntry(guestId: string): GuestbookEntry {
    this.requirePermission('tamu', 'update');
    const existing = this.getRawById('Guestbook', guestId);
    if (!existing) throw new Error('Data buku tamu tidak ditemukan.');
    const updated = this.internalUpdateRecord('Guestbook', guestId, { status: 'Selesai' });
    if (!updated) throw new Error('Gagal memperbarui status keluar tamu.');

    this.recordAudit({
      action: 'update',
      module: 'tamu',
      recordId: guestId,
      summary: `Menandai kunjungan tamu ${existing.nama_tamu} (${existing.no_rumah}) sebagai Selesai.`
    });
    return updated;
  }

  // ============================================================================
  // 3. SANITASI & FOGGING (Sekretaris buat jadwal -> Pengumuman baca saja untuk semua)
  // ============================================================================

  public getScopedSanitation(): SanitationSchedule[] {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'sanitasi', 'read')) return [];
    return this.sheets.Sanitation;
  }

  public saveSanitationSchedule(
    payload: Omit<SanitationSchedule, 'id'>,
    editingId?: string
  ): SanitationSchedule {
    if (editingId) {
      this.requirePermission('sanitasi', 'update');
      const updated = this.internalUpdateRecord('Sanitation', editingId, payload);
      if (!updated) throw new Error('Jadwal sanitasi tidak ditemukan.');
      this.recordAudit({
        action: 'update',
        module: 'sanitasi',
        recordId: editingId,
        summary: `Memperbarui pengumuman jadwal ${updated.jenis} (${updated.lokasi}).`
      });
      return updated;
    }
    this.requirePermission('sanitasi', 'create');
    const created = this.internalCreateRecord('Sanitation', {
      id: generateNextId('SAN', this.sheets.Sanitation),
      ...payload
    });
    this.recordAudit({
      action: 'create',
      module: 'sanitasi',
      recordId: created.id,
      summary: `Membuat pengumuman jadwal ${created.jenis} pada ${created.tgl_jadwal} (${created.lokasi}).`
    });
    return created;
  }

  public deleteSanitationSchedule(id: string): void {
    this.requirePermission('sanitasi', 'delete');
    const existing = this.getRawById('Sanitation', id);
    if (!existing) throw new Error('Jadwal sanitasi tidak ditemukan.');
    this.internalDeleteRecord('Sanitation', id);
    this.recordAudit({
      action: 'delete',
      module: 'sanitasi',
      recordId: id,
      summary: `Menghapus jadwal sanitasi ${existing.jenis} (${existing.tgl_jadwal}).`
    });
  }

  // ============================================================================
  // 4. DANA SOSIAL (Bendahara catat -> Ringkasan total baca saja untuk semua)
  // ============================================================================

  public getScopedSocialFund(): {
    totalMasuk: number;
    totalSalur: number;
    saldoSosial: number;
    menungguCount: number;
    entries: SocialFundEntry[];
  } {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'sosial', 'read')) {
      return { totalMasuk: 0, totalSalur: 0, saldoSosial: 0, menungguCount: 0, entries: [] };
    }
    const rows = this.sheets.SocialFund;
    const totalMasuk = rows
      .filter((s) => s.tipe === 'Donasi Masuk' && s.status === 'Terkumpul')
      .reduce((acc, cur) => acc + (Number(cur.nominal) || 0), 0);
    const totalSalur = rows
      .filter((s) => s.tipe !== 'Donasi Masuk' && s.status === 'Disalurkan')
      .reduce((acc, cur) => acc + (Number(cur.nominal) || 0), 0);
    const menungguCount = rows.filter((s) => s.status === 'Menunggu').length;

    return {
      totalMasuk,
      totalSalur,
      saldoSosial: totalMasuk - totalSalur,
      menungguCount,
      entries: rows
    };
  }

  public saveSocialFundRecord(
    payload: Omit<SocialFundEntry, 'id'>,
    editingId?: string
  ): SocialFundEntry {
    if (editingId) {
      this.requirePermission('sosial', 'update');
      const updated = this.internalUpdateRecord('SocialFund', editingId, payload);
      if (!updated) throw new Error('Data dana sosial tidak ditemukan.');
      this.recordAudit({
        action: 'update',
        module: 'sosial',
        recordId: editingId,
        summary: `Memperbarui catatan Dana Sosial (${updated.tipe} - ${updated.nama_terkait}).`
      });
      return updated;
    }
    this.requirePermission('sosial', 'create');
    const created = this.internalCreateRecord('SocialFund', {
      id: generateNextId('SOC', this.sheets.SocialFund),
      ...payload
    });
    this.recordAudit({
      action: 'create',
      module: 'sosial',
      recordId: created.id,
      summary: `Mencatat Dana Sosial ${created.tipe}: ${created.nama_terkait} sebesar Rp ${created.nominal}.`
    });
    return created;
  }

  public deleteSocialFundRecord(id: string): void {
    this.requirePermission('sosial', 'delete');
    const existing = this.getRawById('SocialFund', id);
    if (!existing) throw new Error('Data dana sosial tidak ditemukan.');
    this.internalDeleteRecord('SocialFund', id);
    this.recordAudit({
      action: 'delete',
      module: 'sosial',
      recordId: id,
      summary: `Menghapus catatan Dana Sosial ${existing.tipe} (${existing.nama_terkait}).`
    });
  }

  // ============================================================================
  // 5. KAS & IURAN: Warga bayar + upload bukti -> Menunggu Verifikasi -> Bendahara verifikasi -> Lunas
  // ============================================================================

  public getScopedFinancialSummary() {
    const role = this.session?.role;
    const duesAmount = Number(this.settings.monthlyDues) || 50000;
    if (!role || !hasPermission(role, 'kas', 'read')) {
      return {
        duesAmount,
        periods: [] as string[],
        pemasukanLunas: 0,
        pengeluaranLunas: 0,
        saldoKas: 0,
        iuranTerkumpul: 0,
        totalTunggakan: 0,
        unpaidCellCount: 0,
        waitingVerificationCount: 0,
        arrearsMatrix: [] as Array<{
          household: { no_kk: string; kepala: LimitedResidentInfo; blok: 'G' | 'F'; no_rumah: string };
          cells: Array<{
            periode: string;
            status: 'Lunas' | 'Menunggu Verifikasi' | 'Belum Bayar';
            nominal: number;
            recordId: string;
            bukti: string;
          }>;
          rowUnpaidMonths: number;
          rowArrears: number;
        }>,
        transactions: [] as CashflowEntry[]
      };
    }

    const cfs = this.sheets.Cashflow;
    const rawHouseholds = this.computeRawActiveHouseholds();
    const periods = ['2026-07', '2026-08', '2026-09', '2026-10'];

    cfs.forEach((c) => {
      if (c.kategori === 'Iuran Bulanan' && /^\d{4}-\d{2}$/.test(c.periode) && !periods.includes(c.periode)) {
        periods.push(c.periode);
      }
    });
    periods.sort();

    let pemasukanLunas = 0;
    let pengeluaranLunas = 0;
    let iuranTerkumpul = 0;

    cfs.forEach((c) => {
      const nom = Number(c.nominal) || 0;
      if (c.status === 'Lunas') {
        if (c.tipe === 'Pemasukan') {
          pemasukanLunas += nom;
          if (c.kategori === 'Iuran Bulanan') iuranTerkumpul += nom;
        } else {
          pengeluaranLunas += nom;
        }
      }
    });

    const callerScope = this.getCallerHouseholdScope();
    const scopedHouseholds =
      role === 'warga'
        ? rawHouseholds.filter(
            (hh) => hh.no_kk === callerScope.no_kk || callerScope.memberIds.includes(hh.kepala.id)
          )
        : rawHouseholds;

    let totalTunggakan = 0;
    let unpaidCellCount = 0;

    const arrearsMatrix = scopedHouseholds.map((hh) => {
      const memberIds = hh.members.map((m) => m.id);
      let rowUnpaidMonths = 0;
      let rowArrears = 0;

      const cells = periods.map((periode) => {
        const matches = cfs.filter(
          (c) =>
            c.tipe === 'Pemasukan' &&
            c.kategori === 'Iuran Bulanan' &&
            c.periode === periode &&
            memberIds.includes(c.resident_id)
        );
        const lunasRec = matches.find((m) => m.status === 'Lunas');
        const waitRec = matches.find((m) => m.status === 'Menunggu Verifikasi');

        if (lunasRec) {
          return {
            periode,
            status: 'Lunas' as const,
            nominal: Number(lunasRec.nominal) || duesAmount,
            recordId: lunasRec.id,
            bukti: lunasRec.bukti
          };
        }

        rowUnpaidMonths += 1;
        rowArrears += duesAmount;
        totalTunggakan += duesAmount;
        unpaidCellCount += 1;
        return {
          periode,
          status: waitRec ? ('Menunggu Verifikasi' as const) : ('Belum Bayar' as const),
          nominal: duesAmount,
          recordId: waitRec ? waitRec.id : '',
          bukti: waitRec ? waitRec.bukti : ''
        };
      });

      return {
        household: {
          no_kk: role === 'bendahara' || role === 'warga' ? '' : hh.no_kk,
          kepala: {
            id: hh.kepala.id,
            nama: hh.kepala.nama,
            blok: hh.blok,
            no_rumah: hh.no_rumah
          },
          blok: hh.blok,
          no_rumah: hh.no_rumah
        },
        cells,
        rowUnpaidMonths,
        rowArrears
      };
    });

    const scopedTransactions =
      role === 'warga'
        ? cfs.filter((c) => callerScope.memberIds.includes(c.resident_id))
        : cfs;

    const waitingVerificationCount = scopedTransactions.filter(
      (c) => c.status === 'Menunggu Verifikasi'
    ).length;

    return {
      duesAmount,
      periods,
      pemasukanLunas,
      pengeluaranLunas,
      saldoKas: pemasukanLunas - pengeluaranLunas,
      iuranTerkumpul,
      totalTunggakan,
      unpaidCellCount,
      waitingVerificationCount,
      arrearsMatrix,
      transactions: scopedTransactions
    };
  }

  public submitDuesPaymentProof(params: {
    resident_id: string;
    periode: string;
    nominal: number;
    metode: CashflowEntry['metode'];
    bukti: string;
    keterangan?: string;
  }): CashflowEntry {
    const sess = this.requirePermission('kas', 'create');
    if (!params.bukti.trim()) {
      throw new Error('Mohon unggah berkas bukti pembayaran atau isi referensi bukti transfer.');
    }

    if (sess.role === 'warga') {
      const scope = this.getCallerHouseholdScope();
      if (!scope.memberIds.includes(params.resident_id)) {
        throw new Error('Akses ditolak: Warga hanya dapat mengunggah bukti iuran untuk KK sendiri.');
      }
    }

    const res = this.getRawById('Residents', params.resident_id);
    if (!res) throw new Error('Data rumah/warga tidak ditemukan.');

    // Check if there is already a Menunggu Verifikasi entry for this household & period
    const existingPending = this.sheets.Cashflow.find(
      (c) =>
        c.tipe === 'Pemasukan' &&
        c.kategori === 'Iuran Bulanan' &&
        c.periode === params.periode &&
        c.resident_id === params.resident_id &&
        c.status === 'Menunggu Verifikasi'
    );

    if (existingPending) {
      const updated = this.internalUpdateRecord('Cashflow', existingPending.id, {
        tanggal: todayISO(),
        nominal: Number(params.nominal) || this.settings.monthlyDues,
        metode: params.metode,
        bukti: params.bukti.trim(),
        keterangan:
          params.keterangan?.trim() || `Bukti bayar iuran ${params.periode} Blok ${res.no_rumah}`
      });
      if (!updated) throw new Error('Gagal memperbarui bukti pembayaran.');
      this.recordAudit({
        action: 'update',
        module: 'kas',
        recordId: updated.id,
        summary: `Memperbarui unggahan bukti iuran periode ${params.periode} (${res.no_rumah}).`
      });
      return updated;
    }

    const created = this.internalCreateRecord('Cashflow', {
      id: generateNextId('CSH', this.sheets.Cashflow),
      tanggal: todayISO(),
      tipe: 'Pemasukan',
      kategori: 'Iuran Bulanan',
      resident_id: res.id,
      periode: params.periode,
      nominal: Number(params.nominal) || this.settings.monthlyDues,
      metode: params.metode,
      status: 'Menunggu Verifikasi',
      bukti: params.bukti.trim(),
      keterangan:
        params.keterangan?.trim() || `Pembayaran iuran ${params.periode} Blok ${res.no_rumah} menunggu verifikasi`,
      diverifikasi_oleh: '',
      tgl_verifikasi: ''
    });

    this.recordAudit({
      action: 'create',
      module: 'kas',
      recordId: created.id,
      summary: `Mengunggah pembayaran & bukti iuran ${params.periode} Blok ${res.no_rumah} -> Menunggu Verifikasi.`
    });
    return created;
  }

  public verifyDuesPaymentByBendahara(cashflowId: string): CashflowEntry {
    const sess = this.requirePermission('kas', 'approve');
    if (sess.role !== 'bendahara' && sess.role !== 'admin') {
      throw new Error('Hanya Bendahara (atau Admin) yang dapat memverifikasi pembayaran iuran menjadi Lunas.');
    }
    const existing = this.getRawById('Cashflow', cashflowId);
    if (!existing) throw new Error('Transaksi iuran tidak ditemukan.');

    const { signature } = this.getActorAttribution(false);
    const updated = this.internalUpdateRecord('Cashflow', cashflowId, {
      status: 'Lunas',
      diverifikasi_oleh: signature,
      tgl_verifikasi: todayISO()
    });
    if (!updated) throw new Error('Gagal memverifikasi pembayaran iuran.');

    this.recordAudit({
      action: 'approve',
      module: 'kas',
      recordId: cashflowId,
      summary: `Memverifikasi bukti iuran (${existing.periode}) sebesar Rp ${existing.nominal} -> Lunas.`
    });
    return updated;
  }

  public saveCashflowByBendahara(
    payload: Omit<CashflowEntry, 'id' | 'diverifikasi_oleh' | 'tgl_verifikasi'>,
    editingId?: string
  ): CashflowEntry {
    const sess = this.requirePermission('kas', editingId ? 'update' : 'create');
    if (sess.role !== 'bendahara' && sess.role !== 'admin') {
      throw new Error('Hanya Bendahara (atau Admin) yang dapat mencatat mutasi buku kas umum.');
    }
    const { signature } = this.getActorAttribution(false);
    const verifBy = payload.status === 'Lunas' ? signature : '';
    const verifDate = payload.status === 'Lunas' ? todayISO() : '';
    const safeKategori =
      (payload.kategori || '').trim() ||
      (payload.tipe === 'Pengeluaran' ? 'Pengeluaran Operasional' : 'Pemasukan Kas');
    const normalizedPayload = {
      ...payload,
      kategori: safeKategori
    };

    if (editingId) {
      const updated = this.internalUpdateRecord('Cashflow', editingId, {
        ...normalizedPayload,
        diverifikasi_oleh: verifBy,
        tgl_verifikasi: verifDate
      });
      if (!updated) throw new Error('Transaksi kas tidak ditemukan.');
      this.recordAudit({
        action: 'update',
        module: 'kas',
        recordId: editingId,
        summary: `Memperbarui transaksi kas ${updated.tipe} Rp ${updated.nominal}.`
      });
      return updated;
    }

    const created = this.internalCreateRecord('Cashflow', {
      id: generateNextId('CSH', this.sheets.Cashflow),
      ...normalizedPayload,
      diverifikasi_oleh: verifBy,
      tgl_verifikasi: verifDate
    });
    this.recordAudit({
      action: 'create',
      module: 'kas',
      recordId: created.id,
      summary: `Mencatat mutasi kas ${created.tipe} sebesar Rp ${created.nominal}.`
    });
    return created;
  }

  public deleteCashflowByBendahara(id: string): void {
    const sess = this.requirePermission('kas', 'delete');
    if (sess.role !== 'bendahara' && sess.role !== 'admin') {
      throw new Error('Hanya Bendahara (atau Admin) yang dapat menghapus transaksi kas.');
    }
    const existing = this.getRawById('Cashflow', id);
    if (!existing) throw new Error('Transaksi kas tidak ditemukan.');
    this.internalDeleteRecord('Cashflow', id);
    this.recordAudit({
      action: 'delete',
      module: 'kas',
      recordId: id,
      summary: `Menghapus transaksi kas ${existing.kategori} (${existing.tanggal}) Rp ${existing.nominal}.`
    });
  }

  public getCashflowCsvResidentPool(): LimitedResidentInfo[] {
    const role = this.session?.role;
    if (role !== 'bendahara' && role !== 'admin') return [];
    return this.sheets.Residents.map((r) => ({
      id: r.id,
      nama: r.nama,
      blok: r.blok,
      no_rumah: r.no_rumah
    }));
  }

  public importCashflowFromCsv(params: {
    rows: ParsedKasRowDraft[];
    missingHouses: MissingHouseDraft[];
    autoCreateMissingHouses: boolean;
    mode: 'replace' | 'append';
  }): { importedCount: number; createdHousesCount: number } {
    const sess = this.requirePermission('kas', 'create');
    if (sess.role !== 'bendahara' && sess.role !== 'admin') {
      throw new Error('Hanya Bendahara (atau Admin) yang dapat mengimpor CSV data awal kas & iuran.');
    }
    if (params.rows.length === 0) {
      throw new Error('Tidak ada baris data kas atau iuran yang siap diimpor.');
    }

    const { signature } = this.getActorAttribution(false);
    const houseToResidentId = new Map<string, string>();
    this.sheets.Residents.forEach((r) => {
      if (!houseToResidentId.has(r.no_rumah.toUpperCase())) {
        houseToResidentId.set(r.no_rumah.toUpperCase(), r.id);
      }
    });

    let createdHousesCount = 0;
    if (params.autoCreateMissingHouses && params.missingHouses.length > 0) {
      params.missingHouses.forEach((mh, idx) => {
        const key = mh.no_rumah.toUpperCase();
        if (houseToResidentId.has(key)) return;
        const syntheticSeq = String(Date.now() + idx).slice(-10).padStart(10, '0');
        const createdRes = this.internalCreateRecord('Residents', {
          id: generateNextId('RES', this.sheets.Residents),
          nik: `351500${syntheticSeq}`,
          nama: mh.nama.trim() || `Warga ${mh.no_rumah}`,
          no_kk: `351599${syntheticSeq}`,
          hubungan_keluarga: 'Kepala Keluarga',
          tgl_lahir: '1985-01-01',
          blok: mh.blok,
          no_rumah: mh.no_rumah,
          no_hp: '081200000000',
          status: 'Tetap',
          created_at: new Date().toISOString()
        });
        houseToResidentId.set(key, createdRes.id);
        createdHousesCount += 1;
      });
    }

    if (params.mode === 'replace') {
      const previousIds = this.sheets.Cashflow.map((c) => c.id);
      previousIds.forEach((oldId) => {
        this.internalDeleteRecord('Cashflow', oldId);
      });
    }

    let importedCount = 0;
    for (const draft of params.rows) {
      const resolvedResidentId =
        draft.resident_id ||
        (draft.no_rumah_csv ? (houseToResidentId.get(draft.no_rumah_csv.toUpperCase()) ?? '') : '');

      this.internalCreateRecord('Cashflow', {
        id: generateNextId('CSH', this.sheets.Cashflow),
        tanggal: draft.tanggal,
        tipe: draft.tipe,
        kategori: draft.kategori,
        resident_id: resolvedResidentId,
        periode: draft.periode,
        nominal: Math.max(0, Math.round(Number(draft.nominal) || 0)),
        metode: draft.metode,
        status: draft.status,
        bukti: draft.bukti || 'IMPOR-CSV-BENDAHARA',
        keterangan: draft.keterangan,
        diverifikasi_oleh: draft.status === 'Lunas' ? signature : '',
        tgl_verifikasi: draft.status === 'Lunas' ? todayISO() : ''
      });
      importedCount += 1;
    }

    this.recordAudit({
      action: 'create',
      module: 'kas',
      recordId: 'CSV-IMPORT',
      summary: `Mengimpor ${importedCount} baris CSV Kas & Iuran (${params.mode === 'replace' ? 'Ganti Data Awal' : 'Gabung Data'})${createdHousesCount > 0 ? ` serta menambahkan ${createdHousesCount} rumah warga baru` : ''}.`
    });

    return { importedCount, createdHousesCount };
  }

  // ============================================================================
  // 6. ASET & BOOKING:
  //    Warga ajukan (Menunggu) -> Sekretaris cek stok/bentrok -> Ketua/Wakil setujui (Disetujui)
  //    -> Bendahara catat biaya (Aktif) -> Selesai
  // ============================================================================

  public getScopedAssets() {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'aset', 'read')) return [];
    return this.sheets.Assets;
  }

  public getScopedBookings(): BookingEntry[] {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'aset', 'read')) return [];
    if (role === 'warga') {
      const scope = this.getCallerHouseholdScope();
      return this.sheets.Bookings.filter((b) => scope.memberIds.includes(b.resident_id));
    }
    return this.sheets.Bookings;
  }

  public saveAssetCatalogItem(
    payload: {
      nama: string;
      stok: number;
      kondisi: SheetRecordMap['Assets']['kondisi'];
      kategori?: string;
      tarif_sewa?: number;
      deposit?: number;
    },
    editingId?: string
  ) {
    const sess = this.requirePermission('aset', editingId ? 'update' : 'create');
    if (!['ketua', 'wakil_ketua', 'sekretaris', 'admin'].includes(sess.role)) {
      throw new Error('Hanya Ketua, Wakil Ketua, Sekretaris, atau Admin yang berwenang mengelola inventaris Aset.');
    }
    const cleanPayload: Omit<SheetRecordMap['Assets'], 'id'> = {
      nama: payload.nama.trim(),
      kategori: (payload.kategori || 'Inventaris Paguyuban').trim() || 'Inventaris Paguyuban',
      stok: Math.max(0, Math.round(Number(payload.stok) || 0)),
      kondisi: payload.kondisi || 'Baik',
      tarif_sewa: 0,
      deposit: 0
    };
    if (editingId) {
      const updated = this.internalUpdateRecord('Assets', editingId, cleanPayload);
      if (!updated) throw new Error('Data aset tidak ditemukan.');
      this.recordAudit({
        action: 'update',
        module: 'aset',
        recordId: editingId,
        summary: `Memperbarui inventaris aset ${updated.nama} (stok ${updated.stok} unit).`
      });
      return updated;
    }
    const created = this.internalCreateRecord('Assets', {
      id: generateNextId('AST', this.sheets.Assets),
      ...cleanPayload
    });
    this.recordAudit({
      action: 'create',
      module: 'aset',
      recordId: created.id,
      summary: `Menambahkan inventaris aset baru: ${created.nama} (${created.stok} unit).`
    });
    return created;
  }

  public deleteAssetCatalogItem(assetId: string): void {
    const sess = this.requirePermission('aset', 'delete');
    if (!['ketua', 'wakil_ketua', 'sekretaris', 'admin'].includes(sess.role)) {
      throw new Error('Hanya Ketua, Wakil Ketua, Sekretaris, atau Admin yang dapat menghapus inventaris aset.');
    }
    const existing = this.getRawById('Assets', assetId);
    if (!existing) throw new Error('Data aset tidak ditemukan.');
    this.internalDeleteRecord('Assets', assetId);
    this.recordAudit({
      action: 'delete',
      module: 'aset',
      recordId: assetId,
      summary: `Menghapus inventaris aset ${existing.nama}.`
    });
  }

  public getAvailableAssetStock(
    assetId: string,
    startISO: string,
    endISO: string,
    excludeBookingId?: string
  ): number {
    const asset = this.getRawById('Assets', assetId);
    if (!asset) return 0;
    const activeStatuses: BookingEntry['status'][] = ['Menunggu', 'Disetujui', 'Aktif'];
    const reserved = this.sheets.Bookings.reduce((sum, b) => {
      if (excludeBookingId && String(b.id) === String(excludeBookingId)) return sum;
      if (String(b.asset_id) !== String(assetId)) return sum;
      if (!activeStatuses.includes(b.status)) return sum;
      return datesOverlap(startISO, endISO, b.tgl_mulai, b.tgl_selesai) ? sum + (Number(b.qty) || 0) : sum;
    }, 0);
    return Math.max(0, (Number(asset.stok) || 0) - reserved);
  }

  public submitAssetBooking(params: {
    asset_id: string;
    resident_id: string;
    qty: number;
    tgl_mulai: string;
    tgl_selesai: string;
  }): BookingEntry {
    const sess = this.requirePermission('aset', 'create');
    if (sess.role === 'warga') {
      const scope = this.getCallerHouseholdScope();
      if (!scope.memberIds.includes(params.resident_id)) {
        throw new Error('Akses ditolak: Warga hanya dapat mengajukan booking untuk KK sendiri.');
      }
    }
    const asset = this.getRawById('Assets', params.asset_id);
    if (!asset) throw new Error('Aset tidak ditemukan.');
    const days = daysInclusive(params.tgl_mulai, params.tgl_selesai);
    if (days <= 0) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    const avail = this.getAvailableAssetStock(asset.id, params.tgl_mulai, params.tgl_selesai);
    if (params.qty < 1 || params.qty > avail) {
      throw new Error(`Stok tersedia pada rentang tanggal tersebut hanya ${avail} unit.`);
    }

    const created = this.internalCreateRecord('Bookings', {
      id: generateNextId('BKG', this.sheets.Bookings),
      asset_id: asset.id,
      resident_id: params.resident_id,
      qty: params.qty,
      tgl_mulai: params.tgl_mulai,
      tgl_selesai: params.tgl_selesai,
      status: 'Menunggu',
      total_biaya: 0,
      stok_diverifikasi_oleh: '',
      disetujui_oleh: '',
      tgl_disetujui: '',
      biaya_dicatat_oleh: '',
      cashflow_id: ''
    });

    this.recordAudit({
      action: 'create',
      module: 'aset',
      recordId: created.id,
      summary: `Mengajukan booking aset ${asset.nama} (${params.qty} unit, ${params.tgl_mulai} s.d. ${params.tgl_selesai}).`
    });
    return created;
  }

  public verifyBookingStockBySekretaris(
    bookingId: string,
    decision: 'Aman' | 'Dibatalkan'
  ): BookingEntry {
    const sess = this.requirePermission('aset', 'update');
    if (!['ketua', 'wakil_ketua', 'sekretaris', 'admin'].includes(sess.role)) {
      throw new Error('Hanya Ketua, Wakil Ketua, Sekretaris, atau Admin yang berwenang memverifikasi stok & jadwal.');
    }
    const existing = this.getRawById('Bookings', bookingId);
    if (!existing) throw new Error('Data booking tidak ditemukan.');
    if (existing.status !== 'Menunggu') {
      throw new Error('Booking ini tidak lagi berada pada status Menunggu.');
    }

    const { signature } = this.getActorAttribution(false);
    if (decision === 'Dibatalkan') {
      const cancelled = this.internalUpdateRecord('Bookings', bookingId, {
        status: 'Dibatalkan',
        stok_diverifikasi_oleh: `Dibatalkan: ${signature}`
      });
      if (!cancelled) throw new Error('Gagal membatalkan booking.');
      this.recordAudit({
        action: 'update',
        module: 'aset',
        recordId: bookingId,
        summary: `Membatalkan booking ${bookingId} karena kendala stok atau bentrok jadwal.`
      });
      return cancelled;
    }

    const avail = this.getAvailableAssetStock(
      existing.asset_id,
      existing.tgl_mulai,
      existing.tgl_selesai,
      existing.id
    );
    if (existing.qty > avail) {
      throw new Error(`Stok bentrok pada tanggal tersebut (tersisa ${avail} unit).`);
    }

    const updated = this.internalUpdateRecord('Bookings', bookingId, {
      stok_diverifikasi_oleh: signature
    });
    if (!updated) throw new Error('Gagal memverifikasi stok booking.');

    this.recordAudit({
      action: 'update',
      module: 'aset',
      recordId: bookingId,
      summary: `Memverifikasi ketersediaan stok & jadwal booking ${bookingId} (bebas bentrok).`
    });
    return updated;
  }

  public approveBookingByKetuaOrWakil(
    bookingId: string,
    decision: 'Disetujui' | 'Dibatalkan'
  ): BookingEntry {
    const sess = this.requirePermission('aset', 'approve');
    if (sess.role !== 'ketua' && sess.role !== 'wakil_ketua' && sess.role !== 'admin') {
      throw new Error('Hanya Ketua atau Wakil Ketua (atau Admin) yang dapat menyetujui booking aset.');
    }
    const existing = this.getRawById('Bookings', bookingId);
    if (!existing) throw new Error('Data booking tidak ditemukan.');
    if (existing.status !== 'Menunggu') {
      throw new Error('Hanya booking berstatus Menunggu yang dapat diproses persetujuannya.');
    }
    if (decision === 'Disetujui') {
      const avail = this.getAvailableAssetStock(
        existing.asset_id,
        existing.tgl_mulai,
        existing.tgl_selesai,
        existing.id
      );
      if (existing.qty > avail) {
        throw new Error(`Stok bentrok pada tanggal tersebut (tersisa ${avail} unit).`);
      }
    }

    const { signature } = this.getActorAttribution(false);
    const nextStatus: BookingEntry['status'] =
      decision === 'Disetujui' ? 'Aktif' : 'Dibatalkan';
    const updated = this.internalUpdateRecord('Bookings', bookingId, {
      status: nextStatus,
      stok_diverifikasi_oleh: existing.stok_diverifikasi_oleh || signature,
      disetujui_oleh: signature,
      tgl_disetujui: todayISO()
    });
    if (!updated) throw new Error('Gagal memperbarui persetujuan booking.');

    this.recordAudit({
      action: 'approve',
      module: 'aset',
      recordId: bookingId,
      summary:
        decision === 'Disetujui'
          ? `Menyetujui peminjaman aset ${bookingId} -> Aktif (sedang dipinjam).`
          : `Membatalkan/menolak pengajuan peminjaman aset ${bookingId}.`
    });
    return updated;
  }

  public recordBookingFeeByBendahara(
    bookingId: string,
    metode: CashflowEntry['metode'] = 'Transfer'
  ): BookingEntry {
    const sess = this.requirePermission('aset', 'update');
    if (sess.role !== 'bendahara' && sess.role !== 'admin') {
      throw new Error('Hanya Bendahara (atau Admin) yang dapat mencatat biaya sewa dan mengaktifkan booking.');
    }
    const existing = this.getRawById('Bookings', bookingId);
    if (!existing) throw new Error('Data booking tidak ditemukan.');
    if (existing.status !== 'Disetujui') {
      throw new Error('Booking harus disetujui Ketua/Wakil terlebih dahulu sebelum dicatat biayanya.');
    }

    const asset = this.getRawById('Assets', existing.asset_id);
    const res = this.getRawById('Residents', existing.resident_id);
    const { signature } = this.getActorAttribution(false);

    let cashflowId = existing.cashflow_id;
    if (existing.total_biaya > 0) {
      const cf = this.internalCreateRecord('Cashflow', {
        id: generateNextId('CSH', this.sheets.Cashflow),
        tanggal: todayISO(),
        tipe: 'Pemasukan',
        kategori: 'Sewa Aset',
        resident_id: existing.resident_id,
        periode: todayISO().slice(0, 7),
        nominal: existing.total_biaya,
        metode,
        status: 'Lunas',
        bukti: `SEWA-${existing.id}`,
        keterangan: `Biaya sewa & deposit ${asset?.nama ?? existing.asset_id} (${res?.no_rumah ?? existing.resident_id})`,
        diverifikasi_oleh: signature,
        tgl_verifikasi: todayISO()
      });
      cashflowId = cf.id;
    }

    const updated = this.internalUpdateRecord('Bookings', bookingId, {
      status: 'Aktif',
      biaya_dicatat_oleh: signature,
      cashflow_id: cashflowId
    });
    if (!updated) throw new Error('Gagal mengaktifkan booking aset.');

    this.recordAudit({
      action: 'update',
      module: 'aset',
      recordId: bookingId,
      summary: `Mencatat pembayaran sewa aset Rp ${existing.total_biaya} & mengaktifkan peminjaman (${bookingId} -> Aktif).`
    });
    return updated;
  }

  public completeActiveBooking(bookingId: string): BookingEntry {
    const sess = this.requirePermission('aset', 'update');
    if (!['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'admin'].includes(sess.role)) {
      throw new Error('Hanya Ketua, Wakil Ketua, Sekretaris, Bendahara, atau Admin yang dapat menyelesaikan pengembalian aset.');
    }
    const existing = this.getRawById('Bookings', bookingId);
    if (!existing) throw new Error('Data booking tidak ditemukan.');
    if (existing.status !== 'Aktif' && existing.status !== 'Disetujui') {
      throw new Error('Hanya peminjaman berstatus Aktif atau Disetujui yang dapat ditandai Selesai.');
    }
    const updated = this.internalUpdateRecord('Bookings', bookingId, { status: 'Selesai' });
    if (!updated) throw new Error('Gagal menyelesaikan peminjaman aset.');

    this.recordAudit({
      action: 'update',
      module: 'aset',
      recordId: bookingId,
      summary: `Menandai pengembalian peminjaman aset ${bookingId} sebagai Selesai.`
    });
    return updated;
  }

  // ============================================================================
  // 7. ACCOUNT MANAGEMENT (Strictly Admin ONLY; >= 1 Active Admin Invariant)
  // ============================================================================

  public getScopedUsers(): UserAccount[] {
    const role = this.session?.role;
    if (role !== 'admin' || !hasPermission(role, 'akun', 'read')) return [];
    return this.sheets.Users;
  }

  public getResidentsForAccountLinking(): LimitedResidentInfo[] {
    const role = this.session?.role;
    if (
      !role ||
      !(
        hasPermission(role, 'akun', 'read') ||
        hasPermission(role, 'warga_security', 'read') ||
        role === 'admin'
      )
    ) {
      return [];
    }
    return this.sheets.Residents.filter((r) => r.status === 'Tetap' || r.status === 'Kontrak').map(
      (r) => ({
        id: r.id,
        nama: r.nama,
        blok: r.blok,
        no_rumah: r.no_rumah
      })
    );
  }

  /**
   * Scoped selector for "Manajemen Warga & Security":
   * Strictly hides any Admin account / username "admin" unless caller is Admin.
   */
  public getManagedWargaAndSecurityUsers(): UserAccount[] {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'warga_security', 'read')) return [];
    return this.sheets.Users.filter((u) => {
      if (u.role === 'admin' || u.username.trim().toLowerCase() === 'admin') {
        return false;
      }
      if (role === 'sekretaris') {
        return u.role === 'warga' || u.role === 'security';
      }
      return true;
    });
  }

  public updateManagedWargaOrSecurityAccount(
    userId: string,
    params: {
      username: string;
      nama_tampilan: string;
      resident_id?: string;
      shift_label?: string;
      nama_warga_tertaut?: string;
      no_rumah?: string;
      blok?: 'G' | 'F';
      hubungan_keluarga?: string;
      no_hp?: string;
    }
  ): UserAccount {
    const sess = this.requirePermission('warga_security', 'update');
    const existing = this.getRawById('Users', userId);
    if (!existing) throw new Error('Akun tidak ditemukan.');
    if (
      sess.role !== 'admin' &&
      (existing.role === 'admin' || existing.username.trim().toLowerCase() === 'admin')
    ) {
      throw new Error('Akses Ditolak: Akun Admin hanya dapat dikelola oleh Admin.');
    }
    if (sess.role === 'sekretaris' && existing.role !== 'warga' && existing.role !== 'security') {
      throw new Error('Sekretaris hanya dapat mengedit data & akses Warga serta Security.');
    }

    const cleanUsername = params.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(cleanUsername)) {
      throw new Error('Username wajib 3-24 karakter (huruf kecil, angka, titik, atau garis bawah).');
    }
    if (sess.role !== 'admin' && cleanUsername === 'admin') {
      throw new Error('Username "admin" hanya diperuntukkan bagi Admin sistem.');
    }
    if (
      this.sheets.Users.some(
        (u) => u.id !== userId && u.username.toLowerCase() === cleanUsername
      )
    ) {
      throw new Error(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
    }

    if (params.no_hp !== undefined && !isValidOptionalIndonesianPhone(params.no_hp)) {
      throw new Error('Format Nomor HP tidak valid (kosongkan bila tidak ada).');
    }

    let nextDisplay = params.nama_tampilan.trim() || existing.nama_tampilan;
    const targetResId =
      existing.role === 'security' ? '' : (params.resident_id || existing.resident_id);

    if (existing.role !== 'security' && targetResId) {
      const targetRes = this.getRawById('Residents', targetResId);
      if (targetRes) {
        const cleanResName = (params.nama_warga_tertaut || '').trim() || targetRes.nama;
        const houseNorm = normalizeHouseAndBlok(
          params.no_rumah ?? targetRes.no_rumah,
          params.blok ?? targetRes.blok
        );
        const cleanHub = params.hubungan_keluarga
          ? normalizeFamilyStatus(params.hubungan_keluarga)
          : targetRes.hubungan_keluarga;
        const cleanHp =
          params.no_hp !== undefined ? params.no_hp.trim() : targetRes.no_hp;
        const oldName = targetRes.nama;
        this.internalUpdateRecord('Residents', targetResId, {
          nama: cleanResName,
          no_rumah: houseNorm.no_rumah,
          blok: houseNorm.blok,
          hubungan_keluarga: cleanHub,
          no_hp: cleanHp
        });
        this.propagateResidentNameChange(
          targetResId,
          oldName,
          cleanResName,
          houseNorm.no_rumah,
          houseNorm.blok
        );
        nextDisplay = `${cleanResName} (${houseNorm.no_rumah})`;
      }
    }

    const prevAvatar = extractShiftAndAvatar(existing.shift_label).avatarUrl;
    const nextShiftText =
      existing.role === 'security'
        ? (params.shift_label || 'Shift Malam Pos Gerbang Utama').trim()
        : '';

    const updated = this.internalUpdateRecord('Users', userId, {
      username: cleanUsername,
      nama_tampilan: nextDisplay,
      resident_id: targetResId,
      shift_label: packShiftAndAvatar(nextShiftText, prevAvatar)
    });
    if (!updated) throw new Error('Gagal memperbarui data akun.');

    this.recordAudit({
      action: 'update',
      module: 'warga_security',
      recordId: userId,
      summary: `Memperbarui akun ${ROLE_DEFINITIONS[existing.role].label} "${updated.username}" (${updated.nama_tampilan}).`,
      isAdminOwnModule: sess.role === 'admin'
    });
    this.emit();
    return updated;
  }

  public resetManagedAccountPin(userId: string, newPin: string): UserAccount {
    const sess = this.requirePermission('warga_security', 'update');
    const existing = this.getRawById('Users', userId);
    if (!existing) throw new Error('Akun tidak ditemukan.');
    if (
      sess.role !== 'admin' &&
      (existing.role === 'admin' || existing.username.trim().toLowerCase() === 'admin')
    ) {
      throw new Error('Akses Ditolak.');
    }
    if (sess.role === 'sekretaris' && existing.role !== 'warga' && existing.role !== 'security') {
      throw new Error('Sekretaris hanya dapat mereset PIN Warga atau Security.');
    }
    const cleanPin = newPin.trim();
    if (!/^\d{4,8}$/.test(cleanPin)) {
      throw new Error('PIN baru wajib terdiri dari 4 sampai 8 digit angka.');
    }
    const updated = this.internalUpdateRecord('Users', userId, { pin: cleanPin });
    if (!updated) throw new Error('Gagal mereset PIN.');

    this.recordAudit({
      action: 'update',
      module: 'warga_security',
      recordId: userId,
      summary: `Mereset PIN akses untuk "${existing.username}" (${ROLE_DEFINITIONS[existing.role].label}).`,
      isAdminOwnModule: sess.role === 'admin'
    });
    this.emit();
    return updated;
  }

  public toggleManagedAccountActive(userId: string, aktif: 'Ya' | 'Tidak'): UserAccount {
    const sess = this.requirePermission('warga_security', 'update');
    const existing = this.getRawById('Users', userId);
    if (!existing) throw new Error('Akun tidak ditemukan.');
    if (
      existing.role === 'admin' ||
      existing.username.trim().toLowerCase() === 'admin' ||
      existing.role === 'ketua'
    ) {
      throw new Error('Akun Admin atau Ketua tidak dapat dinonaktifkan dari menu ini.');
    }
    if (sess.role === 'sekretaris' && existing.role !== 'warga' && existing.role !== 'security') {
      throw new Error('Sekretaris hanya dapat mengubah status aktif Warga atau Security.');
    }
    const updated = this.internalUpdateRecord('Users', userId, { aktif });
    if (!updated) throw new Error('Gagal mengubah status akun.');

    this.recordAudit({
      action: 'update',
      module: 'warga_security',
      recordId: userId,
      summary: `Mengubah status aktif akun "${existing.username}" menjadi ${aktif}.`,
      isAdminOwnModule: sess.role === 'admin'
    });
    this.emit();
    return updated;
  }

  /**
   * Manual Registration for Ketua, Wakil Ketua, Sekretaris, and Admin:
   * Allows manual input of Warga, Security, and (for Ketua/Wakil/Admin) Pengurus.
   * Nomor HP, NIK, and Nomor KK are optional (validated only when provided).
   */
  public registerManualPersonelByKetuaOrAdmin(params: {
    kategori: 'warga' | 'pengurus' | 'security';
    jabatanPengurus?: 'wakil_ketua' | 'sekretaris' | 'bendahara';
    useExistingResidentId?: string;
    nama: string;
    nik?: string;
    no_kk?: string;
    hubungan_keluarga?: string;
    tgl_lahir?: string;
    blok?: 'G' | 'F';
    no_rumah?: string;
    no_hp?: string;
    status_warga?: Resident['status'];
    shift_label?: string;
    buatAkunLogin: boolean;
    username?: string;
    pin?: string;
  }): {
    resident?: Resident;
    createdAccount?: {
      username: string;
      pin: string;
      roleLabel: string;
      displayName: string;
    };
  } {
    const sess = this.requirePermission('warga_security', 'create');
    if (!['ketua', 'wakil_ketua', 'sekretaris', 'admin'].includes(sess.role)) {
      throw new Error('Akses Ditolak.');
    }
    if (sess.role === 'sekretaris' && params.kategori === 'pengurus') {
      throw new Error('Penambahan akun Pengurus hanya dapat dilakukan oleh Ketua, Wakil Ketua, atau Admin.');
    }

    if (params.kategori === 'security') {
      const cleanName = params.nama.trim();
      if (!cleanName) throw new Error('Nama lengkap petugas Security wajib diisi.');
      const cleanUser = (params.username || '').trim().toLowerCase();
      const cleanPin = (params.pin || '').trim();
      if (!/^[a-z0-9._-]{3,24}$/.test(cleanUser)) {
        throw new Error('Username Security wajib 3-24 karakter (huruf kecil, angka, titik, atau garis bawah).');
      }
      if (sess.role !== 'admin' && cleanUser === 'admin') {
        throw new Error('Username "admin" tidak dapat digunakan.');
      }
      if (!/^\d{4,8}$/.test(cleanPin)) {
        throw new Error('PIN akses Security wajib terdiri dari 4 sampai 8 digit angka.');
      }
      if (this.sheets.Users.some((u) => u.username.toLowerCase() === cleanUser)) {
        throw new Error(`Username "${cleanUser}" sudah digunakan. Pilih username lain.`);
      }

      const shiftClean = (params.shift_label || 'Shift Malam Pos Gerbang Utama').trim();
      const createdUser = this.internalCreateRecord('Users', {
        id: generateNextId('USR', this.sheets.Users),
        username: cleanUser,
        pin: cleanPin,
        role: 'security',
        nama_tampilan: cleanName,
        resident_id: '',
        shift_label: shiftClean,
        aktif: 'Ya',
        created_at: new Date().toISOString()
      });

      this.recordAudit({
        action: 'create',
        module: 'warga_security',
        recordId: createdUser.id,
        summary: `Menambahkan personel Security baru "${cleanName}" (${shiftClean}, username: ${cleanUser}).`,
        isAdminOwnModule: sess.role === 'admin'
      });

      return {
        createdAccount: {
          username: createdUser.username,
          pin: createdUser.pin,
          roleLabel: 'Security',
          displayName: createdUser.nama_tampilan
        }
      };
    }

    // Kategori: warga | pengurus
    const targetRole: RoleId =
      params.kategori === 'pengurus'
        ? params.jabatanPengurus || 'sekretaris'
        : 'warga';

    if ((targetRole as RoleId) === 'admin' || (targetRole as RoleId) === 'ketua') {
      throw new Error('Pembuatan akun Admin atau Ketua tidak diizinkan melalui formulir ini.');
    }

    let linkedResident: Resident | undefined;
    if (params.useExistingResidentId) {
      linkedResident = this.getRawById('Residents', params.useExistingResidentId);
      if (!linkedResident) throw new Error('Data warga yang dipilih tidak ditemukan.');
    } else {
      const cleanNama = params.nama.trim();
      const cleanNik = (params.nik || '').trim();
      const cleanKkInput = (params.no_kk || '').trim();
      const cleanHp = (params.no_hp || '').trim();
      const rawRumah = (params.no_rumah || '').trim();
      if (!cleanNama) throw new Error('Nama lengkap wajib diisi.');
      if (!rawRumah) throw new Error('Nomor rumah wajib diisi (contoh: G-02 atau F-04).');
      if (!isValidOptionalIndonesianPhone(cleanHp)) {
        throw new Error('Format Nomor HP tidak valid (kosongkan jika tidak ada).');
      }

      const houseNorm = normalizeHouseAndBlok(rawRumah, params.blok);
      const existingSameHouse = this.sheets.Residents.find(
        (r) => r.no_rumah.toUpperCase() === houseNorm.no_rumah && r.no_kk
      );
      const resolvedNoKk = cleanKkInput || existingSameHouse?.no_kk || `KK-${houseNorm.no_rumah}`;

      linkedResident = this.internalCreateRecord('Residents', {
        id: generateNextId('RES', this.sheets.Residents),
        nama: cleanNama,
        nik: cleanNik,
        no_kk: resolvedNoKk,
        hubungan_keluarga: normalizeFamilyStatus(params.hubungan_keluarga || 'Kepala Keluarga'),
        tgl_lahir: params.tgl_lahir || '',
        blok: houseNorm.blok,
        no_rumah: houseNorm.no_rumah,
        no_hp: cleanHp,
        status: params.status_warga || 'Tetap',
        created_at: new Date().toISOString()
      });

      this.recordAudit({
        action: 'create',
        module: 'warga_security',
        recordId: linkedResident.id,
        summary: `Menambahkan data warga ${linkedResident.nama} (${linkedResident.hubungan_keluarga}, ${linkedResident.no_rumah}).`,
        isAdminOwnModule: sess.role === 'admin'
      });
    }

    const shouldCreateLogin = params.kategori === 'pengurus' ? true : params.buatAkunLogin;
    if (!shouldCreateLogin) {
      return { resident: linkedResident };
    }

    const cleanUser = (params.username || '').trim().toLowerCase();
    const cleanPin = (params.pin || '').trim();
    if (!/^[a-z0-9._-]{3,24}$/.test(cleanUser)) {
      throw new Error('Username wajib 3-24 karakter (huruf kecil, angka, titik, atau garis bawah).');
    }
    if (sess.role !== 'admin' && cleanUser === 'admin') {
      throw new Error('Username "admin" tidak dapat digunakan.');
    }
    if (!/^\d{4,8}$/.test(cleanPin)) {
      throw new Error('PIN akses wajib terdiri dari 4 sampai 8 digit angka.');
    }
    if (this.sheets.Users.some((u) => u.username.toLowerCase() === cleanUser)) {
      throw new Error(`Username "${cleanUser}" sudah digunakan. Pilih username lain.`);
    }

    const displayLabel = `${linkedResident.nama} (${linkedResident.no_rumah})`;
    const createdAcc = this.internalCreateRecord('Users', {
      id: generateNextId('USR', this.sheets.Users),
      username: cleanUser,
      pin: cleanPin,
      role: targetRole,
      nama_tampilan: displayLabel,
      resident_id: linkedResident.id,
      shift_label: '',
      aktif: 'Ya',
      created_at: new Date().toISOString()
    });

    this.recordAudit({
      action: 'create',
      module: 'warga_security',
      recordId: createdAcc.id,
      summary: `Menambahkan akses ${ROLE_DEFINITIONS[targetRole].label} untuk ${displayLabel} (username: ${cleanUser}).`,
      isAdminOwnModule: sess.role === 'admin'
    });

    return {
      resident: linkedResident,
      createdAccount: {
        username: createdAcc.username,
        pin: createdAcc.pin,
        roleLabel: ROLE_DEFINITIONS[targetRole].label,
        displayName: displayLabel
      }
    };
  }

  public clearPendingQueue(): void {
    this.sync = {
      ...this.sync,
      queue: [],
      status: this.isCloudConfigured() ? 'Tersinkron' : 'Lokal',
      lastError: ''
    };
    this.persistSync();
    this.emit();
  }

  public createUserAccount(params: {
    username: string;
    pin: string;
    role: RoleId;
    nama_tampilan: string;
    resident_id: string;
    shift_label: string;
    nama_warga_baru?: string;
    no_rumah?: string;
    blok?: 'G' | 'F';
  }): UserAccount {
    const sess = this.requirePermission('akun', 'create');
    const cleanUsername = params.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(cleanUsername)) {
      throw new Error('Username wajib 3-24 karakter (huruf kecil, angka, titik, atau garis bawah).');
    }
    if (!/^\d{4,8}$/.test(params.pin.trim())) {
      throw new Error('PIN wajib berupa 4 sampai 8 digit angka.');
    }
    if (this.sheets.Users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Username "${cleanUsername}" sudah terdaftar.`);
    }

    let resolvedResidentId = params.role === 'security' ? '' : params.resident_id;
    let resolvedDisplay = params.nama_tampilan.trim();

    if (params.role !== 'security' && params.resident_id === '__NEW__') {
      const cleanNamaBaru = (params.nama_warga_baru || '').trim();
      const rawRumah = (params.no_rumah || '').trim();
      if (!cleanNamaBaru) {
        throw new Error('Nama lengkap wajib diisi.');
      }
      if (!rawRumah) {
        throw new Error('Nomor Rumah wajib diisi (contoh: G-02 atau F-04).');
      }
      const houseNorm = normalizeHouseAndBlok(rawRumah, params.blok);
      const sameHouse = this.sheets.Residents.find(
        (r) => r.no_rumah.toUpperCase() === houseNorm.no_rumah && r.no_kk
      );
      const newRes = this.internalCreateRecord('Residents', {
        id: generateNextId('RES', this.sheets.Residents),
        nik: '',
        nama: cleanNamaBaru,
        no_kk: sameHouse?.no_kk || `KK-${houseNorm.no_rumah}`,
        hubungan_keluarga: 'Kepala Keluarga',
        tgl_lahir: '',
        blok: houseNorm.blok,
        no_rumah: houseNorm.no_rumah,
        no_hp: '',
        status: 'Tetap',
        created_at: new Date().toISOString()
      });
      resolvedResidentId = newRes.id;
      resolvedDisplay =
        params.role === 'admin'
          ? `${cleanNamaBaru} (Admin)`
          : `${cleanNamaBaru} (${houseNorm.no_rumah})`;
    } else if (params.role !== 'security' && !resolvedResidentId) {
      throw new Error('Setiap akun warga/pengurus wajib memiliki data Nama, No. Rumah, dan Blok.');
    }

    const created = this.internalCreateRecord('Users', {
      id: generateNextId('USR', this.sheets.Users),
      username: cleanUsername,
      pin: params.pin.trim(),
      role: params.role,
      nama_tampilan: resolvedDisplay || cleanUsername,
      resident_id: resolvedResidentId,
      shift_label: params.role === 'security' ? params.shift_label.trim() || 'Shift Pos Utama' : '',
      aktif: 'Ya',
      created_at: new Date().toISOString()
    });

    this.recordAudit({
      action: 'create',
      module: 'akun',
      recordId: created.id,
      summary: `Membuat akun pengguna baru "${created.username}" dengan peran ${ROLE_DEFINITIONS[created.role].label}.`,
      isAdminOwnModule: sess.role === 'admin'
    });
    return created;
  }

  public toggleUserAccountActive(userId: string, nextActive: boolean): UserAccount {
    const sess = this.requirePermission('akun', 'update');
    const existing = this.getRawById('Users', userId);
    if (!existing) throw new Error('Akun pengguna tidak ditemukan.');

    if (!nextActive && existing.role === 'admin') {
      const activeAdmins = this.sheets.Users.filter(
        (u) => u.role === 'admin' && u.aktif === 'Ya' && u.id !== userId
      );
      if (activeAdmins.length === 0) {
        throw new Error(
          'Tidak dapat menonaktifkan akun ini: sistem mewajibkan minimal 1 akun Admin aktif setiap saat.'
        );
      }
    }

    const updated = this.internalUpdateRecord('Users', userId, {
      aktif: nextActive ? 'Ya' : 'Tidak'
    });
    if (!updated) throw new Error('Gagal mengubah status akun.');

    this.recordAudit({
      action: 'update',
      module: 'akun',
      recordId: userId,
      summary: `${nextActive ? 'Mengaktifkan' : 'Menonaktifkan'} akun pengguna "${existing.username}" (${ROLE_DEFINITIONS[existing.role].label}).`,
      isAdminOwnModule: sess.role === 'admin'
    });
    return updated;
  }

  public resetUserPin(userId: string, newPin: string): UserAccount {
    const sess = this.requirePermission('akun', 'update');
    const cleanPin = newPin.trim();
    if (!/^\d{4,8}$/.test(cleanPin)) {
      throw new Error('PIN baru wajib terdiri dari 4 sampai 8 digit angka.');
    }
    const existing = this.getRawById('Users', userId);
    if (!existing) throw new Error('Akun pengguna tidak ditemukan.');

    const updated = this.internalUpdateRecord('Users', userId, { pin: cleanPin });
    if (!updated) throw new Error('Gagal mereset PIN pengguna.');

    this.recordAudit({
      action: 'update',
      module: 'akun',
      recordId: userId,
      summary: `Mereset PIN keamanan untuk akun "${existing.username}" (${ROLE_DEFINITIONS[existing.role].label}).`,
      isAdminOwnModule: sess.role === 'admin'
    });
    return updated;
  }

  public updateUserResidentLink(
    userId: string,
    params: { resident_id: string; shift_label: string; nama_tampilan: string }
  ): UserAccount {
    const sess = this.requirePermission('akun', 'update');
    const existing = this.getRawById('Users', userId);
    if (!existing) throw new Error('Akun pengguna tidak ditemukan.');
    if (existing.role !== 'security' && !params.resident_id) {
      throw new Error('Akun selain Security wajib tertaut pada resident_id.');
    }

    const prevAvatar = extractShiftAndAvatar(existing.shift_label).avatarUrl;
    const nextShiftText = existing.role === 'security' ? params.shift_label.trim() : '';
    const updated = this.internalUpdateRecord('Users', userId, {
      resident_id: existing.role === 'security' ? '' : params.resident_id,
      shift_label: packShiftAndAvatar(nextShiftText, prevAvatar),
      nama_tampilan: params.nama_tampilan.trim() || existing.nama_tampilan
    });
    if (!updated) throw new Error('Gagal memperbarui tautan warga akun.');

    this.recordAudit({
      action: 'update',
      module: 'akun',
      recordId: userId,
      summary: `Memperbarui tautan identitas akun "${existing.username}".`,
      isAdminOwnModule: sess.role === 'admin'
    });
    this.emit();
    return updated;
  }

  public updateUserAccount(
    userId: string,
    params: {
      username: string;
      role: RoleId;
      nama_tampilan: string;
      resident_id: string;
      shift_label: string;
      nama_warga_tertaut?: string;
      no_rumah?: string;
      blok?: 'G' | 'F';
      syncResidentName?: boolean;
    }
  ): UserAccount {
    const sess = this.requirePermission('akun', 'update');
    const existing = this.getRawById('Users', userId);
    if (!existing) throw new Error('Akun pengguna tidak ditemukan.');

    const cleanUsername = params.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(cleanUsername)) {
      throw new Error('Username wajib 3-24 karakter (huruf kecil, angka, titik, atau garis bawah).');
    }
    if (
      this.sheets.Users.some(
        (u) => u.id !== userId && u.username.toLowerCase() === cleanUsername
      )
    ) {
      throw new Error(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
    }

    if (existing.role === 'admin' && params.role !== 'admin' && existing.aktif === 'Ya') {
      const otherAdmins = this.sheets.Users.filter(
        (u) => u.role === 'admin' && u.aktif === 'Ya' && u.id !== userId
      );
      if (otherAdmins.length === 0) {
        throw new Error(
          'Tidak dapat mengubah peran Admin terakhir: wajib ada minimal 1 akun Admin aktif setiap saat.'
        );
      }
    }

    if (params.role !== 'security' && !params.resident_id) {
      throw new Error('Akun warga atau pengurus wajib ditautkan ke data warga.');
    }

    let cleanDisplay = params.nama_tampilan.trim();
    if (!cleanDisplay) {
      throw new Error('Nama tampilan akun wajib diisi.');
    }

    const prevAvatar = extractShiftAndAvatar(existing.shift_label).avatarUrl;
    const nextShiftText =
      params.role === 'security' ? params.shift_label.trim() || 'Shift Pos Utama' : '';

    if (params.syncResidentName && params.role !== 'security' && params.resident_id) {
      const linkedRes = this.getRawById('Residents', params.resident_id);
      if (linkedRes) {
        const nextResName = (params.nama_warga_tertaut || '').trim() || linkedRes.nama;
        const houseNorm = normalizeHouseAndBlok(
          params.no_rumah ?? linkedRes.no_rumah,
          params.blok ?? linkedRes.blok
        );
        const oldResName = linkedRes.nama;
        this.internalUpdateRecord('Residents', linkedRes.id, {
          nama: nextResName,
          no_rumah: houseNorm.no_rumah,
          blok: houseNorm.blok
        });
        this.propagateResidentNameChange(
          linkedRes.id,
          oldResName,
          nextResName,
          houseNorm.no_rumah,
          houseNorm.blok
        );
        cleanDisplay =
          params.role === 'admin'
            ? `${nextResName} (Admin)`
            : `${nextResName} (${houseNorm.no_rumah})`;
      }
    }

    const updated = this.internalUpdateRecord('Users', userId, {
      username: cleanUsername,
      role: params.role,
      nama_tampilan: cleanDisplay,
      resident_id: params.role === 'security' ? '' : params.resident_id,
      shift_label: packShiftAndAvatar(nextShiftText, prevAvatar)
    });
    if (!updated) throw new Error('Gagal memperbarui data akun pengguna.');

    if (this.session && this.session.userId === userId) {
      this.session = {
        ...this.session,
        username: updated.username,
        role: updated.role,
        displayName: updated.nama_tampilan,
        residentId: updated.resident_id
      };
      safeStorage.setJSON(STORAGE_KEYS.SESSION, this.session);
    }

    if (updated.role === 'ketua') {
      const ketuaClean = (params.nama_warga_tertaut?.trim() || cleanDisplay).replace(
        /\s*\([GF]-\d+\)\s*$/i,
        ''
      );
      if (ketuaClean) {
        this.settings = { ...this.settings, ketuaName: ketuaClean };
        safeStorage.setJSON(STORAGE_KEYS.SETTINGS, this.settings);
      }
    }

    this.recordAudit({
      action: 'update',
      module: 'akun',
      recordId: userId,
      summary: `Memperbarui profil & nama akun "${updated.username}" (${updated.nama_tampilan}).`,
      isAdminOwnModule: sess.role === 'admin'
    });
    this.emit();
    return updated;
  }

  // ============================================================================
  // 8. AUDIT LOG SELECTOR (Strictly Admin ONLY)
  // ============================================================================

  public getScopedAuditLogs(): AuditLogEntry[] {
    if (!this.session || this.session.role !== 'admin' || !hasPermission('admin', 'log_aktivitas', 'read')) {
      return [];
    }
    return this.sheets.AuditLog;
  }

  // ============================================================================
  // LOW-LEVEL MUTATION & GOOGLE SHEETS SYNC QUEUE
  // ============================================================================

  private enqueueSyncOperation(
    action: Exclude<ApiAction, 'list'>,
    sheet: SheetName,
    id: string,
    data: Record<string, unknown>
  ): void {
    if (!this.isCloudConfigured()) {
      this.sync = { ...this.sync, status: 'Lokal' };
      this.persistSync();
      return;
    }

    const filteredQueue = this.sync.queue.filter(
      (item) => !(item.sheet === sheet && item.id === id && item.action === 'update' && action === 'update')
    );

    const nextItem: PendingSyncItem = {
      queueId: `Q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      sheet,
      id,
      data,
      queuedAt: new Date().toISOString(),
      attempts: 0
    };

    this.sync = {
      ...this.sync,
      status: 'Menyinkronkan',
      queue: [...filteredQueue, nextItem]
    };
    this.persistSync();
    void this.flushPendingQueue();
  }

  private internalCreateRecord<K extends SheetName>(sheet: K, record: SheetRecordMap[K]): SheetRecordMap[K] {
    const normalized = normalizeRowForSheet(sheet, record as unknown as Record<string, unknown>);
    const nextList = [normalized, ...this.sheets[sheet]];
    this.sheets = {
      ...this.sheets,
      [sheet]: nextList
    };
    this.persistSheets();
    this.enqueueSyncOperation('create', sheet, String(normalized.id), normalized as unknown as Record<string, unknown>);
    this.emit();
    return normalized;
  }

  private internalUpdateRecord<K extends SheetName>(
    sheet: K,
    id: string,
    partial: Partial<SheetRecordMap[K]>
  ): SheetRecordMap[K] | null {
    let updatedItem: SheetRecordMap[K] | null = null;
    const nextList = this.sheets[sheet].map((row) => {
      if (String(row.id) !== String(id)) return row;
      updatedItem = normalizeRowForSheet(sheet, {
        ...(row as unknown as Record<string, unknown>),
        ...(partial as unknown as Record<string, unknown>),
        id
      });
      return updatedItem;
    });

    if (!updatedItem) return null;

    this.sheets = {
      ...this.sheets,
      [sheet]: nextList
    };
    this.persistSheets();
    this.enqueueSyncOperation(
      'update',
      sheet,
      String(id),
      updatedItem as unknown as Record<string, unknown>
    );
    this.emit();
    return updatedItem;
  }

  private internalDeleteRecord<K extends SheetName>(sheet: K, id: string): boolean {
    const before = this.sheets[sheet].length;
    const nextList = this.sheets[sheet].filter((row) => String(row.id) !== String(id));
    if (nextList.length === before) return false;

    this.sheets = {
      ...this.sheets,
      [sheet]: nextList
    };
    this.persistSheets();
    this.enqueueSyncOperation('delete', sheet, String(id), { id });
    this.emit();
    return true;
  }

  public async flushPendingQueue(): Promise<boolean> {
    if (this.isFlushing) return false;
    if (!this.isCloudConfigured()) {
      this.sync = { ...this.sync, status: 'Lokal', lastError: '' };
      this.persistSync();
      this.emit();
      return true;
    }

    if (this.sync.queue.length === 0) {
      this.sync = { ...this.sync, status: 'Tersinkron', lastError: '' };
      this.persistSync();
      this.emit();
      return true;
    }

    this.isFlushing = true;
    this.sync = { ...this.sync, status: 'Menyinkronkan', lastError: '' };
    this.persistSync();
    this.emit();

    try {
      while (this.sync.queue.length > 0) {
        const head = this.sync.queue[0];
        await postToGoogleSheets({
          action: head.action,
          sheet: head.sheet,
          id: head.id,
          data: head.data,
          settings: this.settings
        });
        const remaining = this.sync.queue.slice(1);
        this.sync = {
          ...this.sync,
          queue: remaining
        };
        this.persistSync();
      }

      this.sync = {
        ...this.sync,
        status: 'Tersinkron',
        lastSyncAt: new Date().toISOString(),
        lastError: ''
      };
      this.persistSync();
      this.emit();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sinkronisasi ke Google Sheets gagal.';
      const updatedQueue = [...this.sync.queue];
      if (updatedQueue.length > 0) {
        updatedQueue[0] = {
          ...updatedQueue[0],
          attempts: updatedQueue[0].attempts + 1,
          lastError: message
        };
      }
      this.sync = {
        ...this.sync,
        status: 'Gagal',
        queue: updatedQueue,
        lastError: message
      };
      this.persistSync();
      this.emit();
      return false;
    } finally {
      this.isFlushing = false;
    }
  }

  public async syncFromCloudPublic(): Promise<boolean> {
    if (!this.isCloudConfigured()) return false;
    if (this.sync.queue.length > 0) {
      const flushed = await this.flushPendingQueue();
      if (!flushed) return false;
    }

    this.sync = { ...this.sync, status: 'Menyinkronkan', lastError: '' };
    this.persistSync();
    this.emit();

    try {
      const sheetNames = Object.keys(SHEET_SCHEMAS) as SheetName[];
      const results = await Promise.all(
        sheetNames.map(async (sheet) => ({
          sheet,
          rows: await getSheetRowsFromGoogleSheets(sheet, this.settings)
        }))
      );

      const nextSheets = { ...this.sheets };
      for (const { sheet, rows } of results) {
        if (sheet === 'Users' && rows.length === 0) {
          nextSheets.Users = this.sheets.Users;
        } else if (sheet === 'Residents' && rows.length === 0) {
          nextSheets.Residents = this.sheets.Residents;
        } else {
          (nextSheets as Record<SheetName, unknown[]>)[sheet] = rows;
        }
      }

      this.sheets = nextSheets;
      if (this.session) {
        const refreshedAccount = this.sheets.Users.find(
          (u) => u.id === this.session?.userId && u.aktif === 'Ya'
        );
        if (!refreshedAccount) {
          this.session = null;
          safeStorage.removeItem(STORAGE_KEYS.SESSION);
        }
      }
      this.refreshGuestExpirations(false);
      this.persistSheets();

      this.sync = {
        ...this.sync,
        status: 'Tersinkron',
        lastSyncAt: new Date().toISOString(),
        lastError: ''
      };
      this.persistSync();
      this.emit();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyinkronkan dari Google Sheets.';
      this.sync = { ...this.sync, status: 'Gagal', lastError: message };
      this.persistSync();
      this.emit();
      return false;
    }
  }

  public async pullAllSheetsFromCloud(): Promise<void> {
    this.requirePermission('pengaturan', 'update');
    if (!this.isCloudConfigured()) {
      throw new GoogleSheetsApiError('Masukkan URL Web App Google Apps Script terlebih dahulu di Pengaturan.');
    }
    const ok = await this.syncFromCloudPublic();
    if (!ok) {
      throw new GoogleSheetsApiError(this.sync.lastError || 'Gagal menarik data dari Google Sheets.');
    }
  }

  public async pushAllSheetsToCloud(): Promise<void> {
    this.requirePermission('pengaturan', 'update');
    if (!this.isCloudConfigured()) {
      throw new GoogleSheetsApiError('Masukkan URL Web App Google Apps Script terlebih dahulu di Pengaturan.');
    }

    this.sync = { ...this.sync, status: 'Menyinkronkan', lastError: '' };
    this.persistSync();
    this.emit();

    try {
      const sheetNames = Object.keys(SHEET_SCHEMAS) as SheetName[];
      for (const sheet of sheetNames) {
        const existingRemote = await postToGoogleSheets<Array<Record<string, unknown>>>({
          action: 'list',
          sheet,
          settings: this.settings
        });
        const remoteIds = new Set((existingRemote ?? []).map((r) => String(r.id)));
        const localRows = this.sheets[sheet] as unknown as Array<Record<string, unknown>>;

        for (const row of localRows) {
          const recordId = String(row.id);
          await postToGoogleSheets({
            action: remoteIds.has(recordId) ? 'update' : 'create',
            sheet,
            id: recordId,
            data: row,
            settings: this.settings
          });
        }
      }

      this.sync = {
        ...this.sync,
        status: 'Tersinkron',
        queue: [],
        lastSyncAt: new Date().toISOString(),
        lastError: ''
      };
      this.persistSync();
      this.emit();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengunggah seluruh sheet ke Google Sheets.';
      this.sync = { ...this.sync, status: 'Gagal', lastError: message };
      this.persistSync();
      this.emit();
      throw err;
    }
  }

  public resetDemoData(): void {
    this.requirePermission('pengaturan', 'update');
    this.sheets = buildSeedSheets();
    this.persistSheets();
    this.sync = {
      ...this.sync,
      queue: [],
      status: this.isCloudConfigured() ? 'Tersinkron' : 'Lokal',
      lastError: ''
    };
    this.persistSync();
    this.emit();
  }

  public refreshGuestExpirations(enqueueRemote: boolean): boolean {
    const now = Date.now();
    let changed = false;
    const nextGuests = this.sheets.Guestbook.map((g) => {
      if (g.status === 'Aktif' && g.expired_at) {
        const expMs = new Date(g.expired_at).getTime();
        if (!Number.isNaN(expMs) && expMs <= now) {
          changed = true;
          const updated = { ...g, status: 'Kedaluwarsa' as const };
          if (enqueueRemote) {
            this.enqueueSyncOperation('update', 'Guestbook', updated.id, updated as unknown as Record<string, unknown>);
          }
          return updated;
        }
      }
      return g;
    });

    if (changed) {
      this.sheets = { ...this.sheets, Guestbook: nextGuests };
      this.persistSheets();
      if (enqueueRemote) this.emit();
    }
    return changed;
  }

  public refreshMissedPatrolSlots(
    shiftDateISO: string,
    defaultSecurityName = 'Petugas Shift Malam',
    enqueueRemote = true,
    now: Date = new Date()
  ): number {
    if (!shiftDateISO) return 0;
    const existingList = this.sheets.SecurityPatrol ?? [];
    const createdRows: SecurityPatrolEntry[] = [];

    PATROL_SLOTS.forEach((slot) => {
      const alreadyExists = existingList.some(
        (p) => !isPatrolPhotoRow(p) && p.tanggal_shift === shiftDateISO && p.slot_jadwal === slot
      );
      if (alreadyExists) return;

      const win = evaluatePatrolSlotWindow(shiftDateISO, slot, now);
      if (win.isMissedWindow) {
        const missedEntry: SecurityPatrolEntry = {
          id: generateNextId('PTR', [...existingList, ...createdRows]),
          tanggal_shift: shiftDateISO,
          slot_jadwal: slot,
          waktu_target: win.targetFormatted,
          waktu_checkin: '-',
          selisih_menit: win.diffMinutes,
          nama_security: defaultSecurityName.trim() || 'Petugas Shift Malam',
          area_patroli: 'Pos Gerbang Utama & Blok G-F',
          status: 'Terlewat',
          catatan: `TIDAK CHECK-IN JAM ${slot} (lewat >${PATROL_MISSED_THRESHOLD_MINUTES} menit): Indikasi kuat security ketiduran/lupa kontrol pos.`
        };
        createdRows.push(missedEntry);
      }
    });

    if (createdRows.length > 0) {
      this.sheets = {
        ...this.sheets,
        SecurityPatrol: [...createdRows, ...existingList]
      };
      this.persistSheets();
      if (enqueueRemote) {
        createdRows.forEach((row) => {
          this.enqueueSyncOperation(
            'create',
            'SecurityPatrol',
            row.id,
            row as unknown as Record<string, unknown>
          );
        });
        this.emit();
        if (this.isCloudConfigured()) {
          void this.flushPendingQueue();
        }
      }
    }

    return createdRows.length;
  }

  public checkInSecurityPatrol(params: {
    shiftDateISO: string;
    slot: PatrolSlotLabel;
    namaSecurity: string;
    areaPatroli: string;
    koordinatGps?: string;
    catatanTambahan?: string;
    photos?: PatrolLivePhotoInput[];
    now?: Date;
  }): SecurityPatrolEntry {
    const sess = this.requirePermission('patroli', 'create');
    if (sess.role !== 'security' && sess.role !== 'admin') {
      throw new Error('Hanya petugas Security (atau Admin) yang dapat menekan tombol check-in patroli.');
    }

    const now = params.now ?? new Date();
    const officer = params.namaSecurity.trim();
    if (!officer) {
      throw new Error('Mohon isi Nama Petugas Security terlebih dahulu sebelum menyimpan check-in.');
    }

    const areaBase = params.areaPatroli.trim() || 'Pos Gerbang Utama & Jalur Blok G-F';
    const gpsInfo = (params.koordinatGps ?? '').trim();
    const areaWithGps = gpsInfo ? `${areaBase} | GPS: ${gpsInfo}` : areaBase;
    const extraNote = (params.catatanTambahan ?? '').trim();
    const incomingPhotos = params.photos ?? [];
    const win = evaluatePatrolSlotWindow(params.shiftDateISO, params.slot, now);

    if (!win.canCheckIn) {
      throw new Error(
        `Jadwal kontrol ${params.slot} belum dibuka. Tombol aktif mulai pukul ${win.opensAtFormatted} WIB.`
      );
    }

    const existing = (this.sheets.SecurityPatrol ?? []).find(
      (p) =>
        !isPatrolPhotoRow(p) &&
        p.tanggal_shift === params.shiftDateISO &&
        p.slot_jadwal === params.slot
    );

    // PERMANENT LOCK: Once checked in (Tepat Waktu or Terlambat), NEVER allow overwrite/update!
    if (existing && (existing.status === 'Tepat Waktu' || existing.status === 'Terlambat')) {
      throw new Error(
        `Terkunci permanen: Jam ronda ${params.slot} sudah di-check-in pada ${existing.waktu_checkin} WIB dan tidak dapat diubah ulang.`
      );
    }

    const existingShiftPhotos = this.getScopedPatrolPhotos(params.shiftDateISO);
    if (existingShiftPhotos.length + incomingPhotos.length > MAX_SHIFT_PATROL_PHOTOS) {
      throw new Error(
        `Kapasitas foto live shift ini maksimal ${MAX_SHIFT_PATROL_PHOTOS} foto (tersisa ${Math.max(0, MAX_SHIFT_PATROL_PHOTOS - existingShiftPhotos.length)} slot foto).`
      );
    }

    const checkinStr = formatLocalDateTimeSecond(now);
    const photoCountLabel =
      incomingPhotos.length > 0 ? ` [${incomingPhotos.length} Foto Live Terstempel]` : '';

    let savedRecord: SecurityPatrolEntry;

    if (existing && existing.status === 'Terlewat') {
      const delayMins = Math.max(1, win.diffMinutes);
      const baseNote = `TERLAMBAT SUSULAN (+${delayMins} menit dari jadwal ${params.slot})${photoCountLabel}.`;
      const updated = this.internalUpdateRecord('SecurityPatrol', existing.id, {
        waktu_checkin: checkinStr,
        selisih_menit: delayMins,
        nama_security: officer,
        area_patroli: areaWithGps,
        status: 'Terlambat',
        catatan: extraNote ? `${baseNote} Ket: ${extraNote}` : baseNote
      });
      if (!updated) throw new Error('Gagal menyimpan check-in patroli.');
      savedRecord = updated;
    } else {
      const isLate = win.isLateWindow;
      const delayMins = Math.max(0, win.diffMinutes);
      const status: SecurityPatrolEntry['status'] = isLate ? 'Terlambat' : 'Tepat Waktu';
      const baseNote = isLate
        ? `TERLAMBAT CHECK-IN (+${delayMins} menit dari jadwal ${params.slot})${photoCountLabel}.`
        : `Check-in tepat waktu jam ronda ${params.slot}${photoCountLabel}. Situasi aman.`;

      savedRecord = this.internalCreateRecord('SecurityPatrol', {
        id: generateNextId(
          'PTR',
          (this.sheets.SecurityPatrol ?? []).filter((r) => !isPatrolPhotoRow(r))
        ),
        tanggal_shift: params.shiftDateISO,
        slot_jadwal: params.slot,
        waktu_target: win.targetFormatted,
        waktu_checkin: checkinStr,
        selisih_menit: delayMins,
        nama_security: officer,
        area_patroli: areaWithGps,
        status,
        catatan: extraNote ? `${baseNote} Ket: ${extraNote}` : baseNote
      });
    }

    // Save each stamped live photo as a companion PHT- row in SecurityPatrol so it syncs cleanly under 50k chars/cell
    let nextOrder = existingShiftPhotos.length + 1;
    for (const ph of incomingPhotos) {
      const phtId = `PHT-${params.shiftDateISO.replace(/-/g, '')}-${params.slot.replace('.', '')}-${String(nextOrder).padStart(2, '0')}`;
      this.internalCreateRecord('SecurityPatrol', {
        id: phtId,
        tanggal_shift: params.shiftDateISO,
        slot_jadwal: params.slot,
        waktu_target: 'FOTO_LIVE',
        waktu_checkin: ph.waktu_foto,
        selisih_menit: nextOrder,
        nama_security: officer,
        area_patroli: `${ph.titik_lokasi} || ${ph.koordinat_gps}`,
        status: 'Tepat Waktu',
        catatan: ph.data_url
      });
      nextOrder += 1;
    }

    this.recordAudit({
      action: 'create',
      module: 'patroli',
      recordId: savedRecord.id,
      summary: `Check-in ronda jam ${params.slot} (${savedRecord.status}, terkunci permanen, ${incomingPhotos.length} foto live) oleh ${officer}.`
    });
    return savedRecord;
  }

  private computeRawActiveHouseholds(): Array<{
    no_kk: string;
    kepala: Resident;
    blok: 'G' | 'F';
    no_rumah: string;
    status: Resident['status'];
    members: Resident[];
  }> {
    const active = this.sheets.Residents.filter((r) => r.status === 'Tetap' || r.status === 'Kontrak');
    const grouped = new Map<string, Resident[]>();
    active.forEach((r) => {
      const key = r.no_kk || r.no_rumah || r.id;
      const bucket = grouped.get(key) ?? [];
      bucket.push(r);
      grouped.set(key, bucket);
    });

    const households: Array<{
      no_kk: string;
      kepala: Resident;
      blok: 'G' | 'F';
      no_rumah: string;
      status: Resident['status'];
      members: Resident[];
    }> = [];

    grouped.forEach((members, no_kk) => {
      const kepala =
        members.find((m) => isHeadOfHouseholdStatus(m.hubungan_keluarga)) ?? members[0];
      households.push({
        no_kk,
        kepala,
        blok: kepala.blok,
        no_rumah: kepala.no_rumah,
        status: kepala.status,
        members
      });
    });

    return households.sort((a, b) => String(a.no_rumah).localeCompare(String(b.no_rumah), 'id'));
  }

  public getDemographicsSummary() {
    if (!this.session || !hasPermission(this.session.role, 'demografi', 'read')) {
      return {
        totalRecords: 0,
        totalWargaAktif: 0,
        totalKK: 0,
        balita: 0,
        anakRemaja: 0,
        dewasa: 0,
        lansia: 0,
        tetap: 0,
        kontrak: 0,
        pindah: 0,
        meninggal: 0,
        blokGWarga: 0,
        blokFWarga: 0,
        blokGKK: 0,
        blokFKK: 0
      };
    }
    const all = this.sheets.Residents;
    const active = all.filter((r) => r.status === 'Tetap' || r.status === 'Kontrak');
    const households = this.computeRawActiveHouseholds();
    let balita = 0;
    let anakRemaja = 0;
    let dewasa = 0;
    let lansia = 0;

    active.forEach((r) => {
      if (!r.tgl_lahir || !r.tgl_lahir.trim()) {
        if (r.hubungan_keluarga === 'Anak') anakRemaja += 1;
        else dewasa += 1;
        return;
      }
      const age = calcAge(r.tgl_lahir);
      if (age < 5) balita += 1;
      else if (age < 18) anakRemaja += 1;
      else if (age < 60) dewasa += 1;
      else lansia += 1;
    });

    return {
      totalRecords: all.length,
      totalWargaAktif: active.length,
      totalKK: households.length,
      balita,
      anakRemaja,
      dewasa,
      lansia,
      tetap: all.filter((r) => r.status === 'Tetap').length,
      kontrak: all.filter((r) => r.status === 'Kontrak').length,
      pindah: all.filter((r) => r.status === 'Pindah').length,
      meninggal: all.filter((r) => r.status === 'Meninggal').length,
      blokGWarga: active.filter((r) => r.blok === 'G').length,
      blokFWarga: active.filter((r) => r.blok === 'F').length,
      blokGKK: households.filter((h) => h.blok === 'G').length,
      blokFKK: households.filter((h) => h.blok === 'F').length
    };
  }

  public getScopedDemographicsHouseholds(): Array<{
    no_kk_display: string;
    kepala_nama: string;
    blok: 'G' | 'F';
    no_rumah: string;
    status: Resident['status'];
    memberCount: number;
  }> {
    const role = this.session?.role;
    if (!role || !hasPermission(role, 'demografi', 'read')) return [];
    const showFullId = role === 'sekretaris' || role === 'ketua';
    return this.computeRawActiveHouseholds().map((hh) => ({
      no_kk_display: showFullId ? hh.no_kk : maskNik(hh.no_kk, role),
      kepala_nama: hh.kepala.nama,
      blok: hh.blok,
      no_rumah: hh.no_rumah,
      status: hh.status,
      memberCount: hh.members.length
    }));
  }
}

export const appStore = new PaguyubanLocalFirstStore();
