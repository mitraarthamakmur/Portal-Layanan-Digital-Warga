export type SheetName =
  | 'Residents'
  | 'Users'
  | 'Letters'
  | 'Guestbook'
  | 'SecurityPatrol'
  | 'Complaints'
  | 'Sanitation'
  | 'SocialFund'
  | 'Cashflow'
  | 'Assets'
  | 'Bookings'
  | 'AuditLog';

export type RoleId =
  | 'admin'
  | 'ketua'
  | 'wakil_ketua'
  | 'sekretaris'
  | 'bendahara'
  | 'security'
  | 'warga';

export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'approve';

export type ModuleId =
  | 'dashboard'
  | 'data_saya'
  | 'warga'
  | 'warga_security'
  | 'demografi'
  | 'surat'
  | 'patroli'
  | 'tamu'
  | 'keluhan'
  | 'sanitasi'
  | 'sosial'
  | 'kas'
  | 'aset'
  | 'akun'
  | 'pengaturan'
  | 'log_aktivitas';

export type PermissionMatrix = Record<RoleId, Record<ModuleId, PermissionAction[]>>;

export type SyncStatus = 'Lokal' | 'Menyinkronkan' | 'Tersinkron' | 'Gagal';

export type ApiAction = 'create' | 'update' | 'delete' | 'list';

export type PatrolSlotLabel = '21.00' | '23.00' | '01.00' | '03.00' | '05.00';

export const PATROL_SLOTS: readonly PatrolSlotLabel[] = [
  '21.00',
  '23.00',
  '01.00',
  '03.00',
  '05.00'
] as const;

export interface Resident {
  id: string;
  nik: string;
  nama: string;
  no_kk: string;
  hubungan_keluarga: string;
  tgl_lahir: string;
  blok: 'G' | 'F';
  no_rumah: string;
  no_hp: string;
  status: 'Tetap' | 'Kontrak' | 'Pindah' | 'Meninggal';
  created_at: string;
}

export interface MinimalHouseInfo {
  resident_id: string;
  blok: 'G' | 'F';
  no_rumah: string;
  nama_kepala: string;
}

export interface LimitedResidentInfo {
  id: string;
  nama: string;
  blok: 'G' | 'F';
  no_rumah: string;
}

export interface UserAccount {
  id: string;
  username: string;
  pin: string;
  role: RoleId;
  nama_tampilan: string;
  resident_id: string;
  shift_label: string;
  aktif: 'Ya' | 'Tidak';
  created_at: string;
}

export type LetterStatus = 'Menunggu Verifikasi' | 'Terverifikasi' | 'Disetujui' | 'Ditolak';

export interface Letter {
  id: string;
  no_surat: string;
  resident_id: string;
  nama: string;
  jenis:
    | 'Pengantar KTP'
    | 'Pengantar Kartu Keluarga'
    | 'Surat Keterangan Domisili'
    | 'Surat Keterangan Usaha';
  keperluan: string;
  tgl_pengajuan: string;
  status: LetterStatus;
  diverifikasi_oleh: string;
  tgl_diverifikasi: string;
  disetujui_oleh: string;
  tgl_disetujui: string;
}

export interface GuestbookEntry {
  id: string;
  nama_tamu: string;
  no_identitas: string;
  tujuan_blok: 'G' | 'F';
  no_rumah: string;
  resident_id: string;
  keperluan: string;
  tgl_masuk: string;
  jam_masuk: string;
  expired_at: string;
  status: 'Aktif' | 'Kedaluwarsa' | 'Selesai';
}

export interface SecurityPatrolEntry {
  id: string;
  tanggal_shift: string;
  slot_jadwal: PatrolSlotLabel;
  waktu_target: string;
  waktu_checkin: string;
  selisih_menit: number;
  nama_security: string;
  area_patroli: string;
  status: 'Tepat Waktu' | 'Terlambat' | 'Terlewat';
  catatan: string;
}

export interface PatrolLivePhotoInput {
  waktu_foto: string;
  titik_lokasi: string;
  koordinat_gps: string;
  data_url: string;
}

export interface PatrolLivePhoto extends PatrolLivePhotoInput {
  id: string;
  tanggal_shift: string;
  slot_jadwal: PatrolSlotLabel;
  urutan: number;
  nama_security: string;
}

export type ComplaintCategory =
  | 'Keamanan & Pos'
  | 'Parkir & Akses Jalan'
  | 'Penerangan & Fasum'
  | 'Kebisingan Malam'
  | 'Kebersihan & Lingkungan';

export type ComplaintStatus = 'Menunggu' | 'Diproses' | 'Selesai';

export interface ComplaintEntry {
  id: string;
  resident_id: string;
  no_rumah: string;
  blok: 'G' | 'F';
  nama_pelapor: string;
  kategori: ComplaintCategory;
  judul: string;
  deskripsi: string;
  prioritas: 'Normal' | 'Mendesak';
  tgl_lapor: string;
  status: ComplaintStatus;
  ditindaklanjuti_oleh: string;
  catatan_tindak_lanjut: string;
  tgl_update: string;
}

export interface SanitationSchedule {
  id: string;
  jenis: string;
  tgl_jadwal: string;
  lokasi: string;
  petugas: string;
  status: 'Terjadwal' | 'Selesai' | 'Dibatalkan';
  catatan: string;
}

export interface SocialFundEntry {
  id: string;
  tipe: 'Donasi Masuk' | 'Kabar Duka' | 'Kabar Sakit' | 'Bantuan Bencana';
  nama_terkait: string;
  deskripsi: string;
  nominal: number;
  tanggal: string;
  status: 'Terkumpul' | 'Disalurkan' | 'Menunggu';
}

export type CashflowStatus = 'Menunggu Verifikasi' | 'Lunas';

export interface CashflowEntry {
  id: string;
  tanggal: string;
  tipe: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  resident_id: string;
  periode: string;
  nominal: number;
  metode: 'Transfer' | 'QRIS' | 'Tunai';
  status: CashflowStatus;
  bukti: string;
  keterangan: string;
  diverifikasi_oleh: string;
  tgl_verifikasi: string;
}

export interface AssetItem {
  id: string;
  nama: string;
  kategori: string;
  stok: number;
  kondisi: 'Baik' | 'Perlu Perbaikan';
  tarif_sewa: number;
  deposit: number;
}

export type BookingStatus = 'Menunggu' | 'Disetujui' | 'Aktif' | 'Selesai' | 'Dibatalkan';

export interface BookingEntry {
  id: string;
  asset_id: string;
  resident_id: string;
  qty: number;
  tgl_mulai: string;
  tgl_selesai: string;
  status: BookingStatus;
  total_biaya: number;
  stok_diverifikasi_oleh: string;
  disetujui_oleh: string;
  tgl_disetujui: string;
  biaya_dicatat_oleh: string;
  cashflow_id: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor_user_id: string;
  actor_username: string;
  actor_name: string;
  actor_role: RoleId;
  on_behalf_note: string;
  action: PermissionAction;
  module: ModuleId;
  record_id: string;
  summary: string;
}

export interface SheetRecordMap {
  Residents: Resident;
  Users: UserAccount;
  Letters: Letter;
  Guestbook: GuestbookEntry;
  SecurityPatrol: SecurityPatrolEntry;
  Complaints: ComplaintEntry;
  Sanitation: SanitationSchedule;
  SocialFund: SocialFundEntry;
  Cashflow: CashflowEntry;
  Assets: AssetItem;
  Bookings: BookingEntry;
  AuditLog: AuditLogEntry;
}

export type AllSheetsData = {
  [K in SheetName]: SheetRecordMap[K][];
};

export interface AppSettings {
  appsScriptUrl: string;
  apiToken: string;
  monthlyDues: number;
  orgName: string;
  ketuaName: string;
}

export interface PendingSyncItem {
  queueId: string;
  action: Exclude<ApiAction, 'list'>;
  sheet: SheetName;
  id: string;
  data: Record<string, unknown>;
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

export interface SyncState {
  status: SyncStatus;
  queue: PendingSyncItem[];
  lastSyncAt: string;
  lastError: string;
  usingMemoryFallback: boolean;
}

export interface UserSession {
  userId: string;
  username: string;
  displayName: string;
  role: RoleId;
  residentId: string;
  shiftLabel: string;
  loginAt: string;
}

export interface RoleDefinition {
  id: RoleId;
  label: string;
  demoUsername: string;
  demoPin: string;
  defaultModule: ModuleId;
  badgeNote: string;
  summary: string;
}

export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data?: T;
  rows?: T;
}

export interface ApiErrorResponse {
  ok: false;
  error: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
