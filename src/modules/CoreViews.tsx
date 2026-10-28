import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Camera,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FileText,
  HeartHandshake,
  Home,
  KeyRound,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  Wallet
} from '../components/MingcuteIcons';
import { AgendaCalendarCheckIcon, SanitationHandShieldIcon } from '../components/CustomIcons';
import {
  appStore,
  extractShiftAndAvatar,
  hasPermission,
  PRESET_AVATAR_URLS,
  ROLE_DEFINITIONS
} from '../services/api';
import type { ModuleId, Resident, UserAccount } from '../types';
import {
  addDaysISO,
  calcAge,
  FAMILY_STATUS_OPTIONS,
  formatDate,
  formatFamilyStatusLabel,
  formatRupiah,
  isValidOptionalIndonesianPhone,
  normalizeFamilyStatus,
  normalizeHouseAndBlok,
  ORG_SUBTITLE,
  todayISO
} from '../utils/format';
import {
  AccessibleModal,
  ChartCanvas,
  ConfirmDialog,
  CtaArrowBadge,
  EmptyStateRow,
  SegmentedPills,
  StatusBadge,
  useAppStore,
  useChartThemePalette,
  UserAvatarBadge,
  useToast
} from '../components/SharedUI';

interface ManualPersonelResult {
  summary: string;
  createdCredentials?: {
    username: string;
    pin: string;
    roleLabel: string;
    displayName: string;
  };
}

const ManualPersonelModal: React.FC<{
  open: boolean;
  onClose: () => void;
  defaultKategori?: 'warga' | 'pengurus' | 'security';
}> = ({ open, onClose, defaultKategori = 'warga' }) => {
  const { session, settings } = useAppStore();
  const { notify } = useToast();
  const activeResidents = appStore.getScopedResidents().filter((r) => r.status !== 'Meninggal');
  const canAddPengurus =
    session?.role === 'ketua' || session?.role === 'wakil_ketua' || session?.role === 'admin';

  const [kategori, setKategori] = useState<'warga' | 'pengurus' | 'security'>(defaultKategori);
  const [pengurusRole, setPengurusRole] = useState<'wakil_ketua' | 'sekretaris' | 'bendahara'>('sekretaris');
  const [residentMode, setResidentMode] = useState<'existing' | 'new'>('new');
  const [existingResidentId, setExistingResidentId] = useState<string>('');
  const [createLoginForWarga, setCreateLoginForWarga] = useState<boolean>(true);

  const [nama, setNama] = useState('');
  const [hubungan, setHubungan] = useState('Kepala Keluarga');
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [noHp, setNoHp] = useState('');
  const [blok, setBlok] = useState<'G' | 'F'>('G');
  const [noRumah, setNoRumah] = useState('G-09');
  const [statusHunian, setStatusHunian] = useState<Resident['status']>('Tetap');

  const [shiftLabel, setShiftLabel] = useState('Shift Malam Pos Gerbang Utama');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');

  const [errMsg, setErrMsg] = useState('');
  const [savedResult, setSavedResult] = useState<ManualPersonelResult | null>(null);

  const resetForm = () => {
    setErrMsg('');
    setSavedResult(null);
    setNama('');
    setHubungan('Kepala Keluarga');
    setNik('');
    setNoKk('');
    setTglLahir('');
    setNoHp('');
    setUsername('');
    setPin('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg('');
    try {
      const needResidentForm =
        kategori === 'warga' || (kategori === 'pengurus' && (residentMode === 'new' || activeResidents.length === 0));

      if (needResidentForm) {
        if (!nama.trim()) {
          setErrMsg('Nama lengkap wajib diisi.');
          return;
        }
        if (!noRumah.trim()) {
          setErrMsg('Nomor Rumah wajib diisi (contoh: G-02 atau F-04).');
          return;
        }
        if (!isValidOptionalIndonesianPhone(noHp)) {
          setErrMsg('Format Nomor HP tidak valid (kosongkan jika tidak ada).');
          return;
        }
      }

      const houseNorm = normalizeHouseAndBlok(noRumah, blok);
      const selectedExistingId = existingResidentId || activeResidents[0]?.id || '';
      const rawRes = appStore.registerManualPersonelByKetuaOrAdmin({
        kategori,
        jabatanPengurus: pengurusRole,
        useExistingResidentId:
          kategori === 'pengurus' && residentMode === 'existing' ? selectedExistingId : undefined,
        nama: nama.trim(),
        hubungan_keluarga: hubungan,
        nik: '',
        no_kk: '',
        tgl_lahir: '',
        no_hp: noHp.trim(),
        blok: houseNorm.blok,
        no_rumah: houseNorm.no_rumah,
        status_warga: statusHunian,
        shift_label: shiftLabel.trim(),
        buatAkunLogin: kategori === 'warga' ? createLoginForWarga : true,
        username: username.trim(),
        pin: pin.trim()
      });

      const summary = rawRes.createdAccount
        ? `Berhasil menambahkan ${rawRes.createdAccount.roleLabel}: ${rawRes.createdAccount.displayName} (akun "${rawRes.createdAccount.username}").`
        : `Berhasil menambahkan data warga ${rawRes.resident?.nama || nama.trim()} (${rawRes.resident?.no_rumah || noRumah}).`;

      setSavedResult({
        summary,
        createdCredentials: rawRes.createdAccount
      });
      notify(summary);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal menyimpan input manual.');
    }
  };

  const handleCopyCredentials = async () => {
    if (!savedResult?.createdCredentials) return;
    const c = savedResult.createdCredentials;
    const text = [
      `Akses Akun Pribadi - ${settings.orgName}`,
      `Nama: ${c.displayName} (${c.roleLabel})`,
      `Username: ${c.username}`,
      `PIN: ${c.pin}`,
      `Mohon simpan secara pribadi dan jangan dibagikan kepada pihak lain.`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      notify(`Akses pribadi ${c.username} berhasil disalin ke papan klip.`);
    } catch {
      notify(`Username: ${c.username} | PIN: ${c.pin}`);
    }
  };

  return (
    <AccessibleModal
      open={open}
      title="Input Manual: Warga, Pengurus, atau Security"
      wide
      onClose={handleClose}
    >
      {savedResult ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl badge-green text-sm font-semibold flex items-start gap-2.5">
            <CheckCircle2 size={18} aria-hidden="true" className="shrink-0 mt-0.5" />
            <div>{savedResult.summary}</div>
          </div>

          {savedResult.createdCredentials && (
            <div className="soft-well p-4 space-y-3">
              <div className="text-xs font-bold">
                Kredensial Login Pribadi (Bagikan ke Penerima Akun):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="surface-card p-3">
                  <div className="text-muted">Peran</div>
                  <div className="font-bold mt-0.5">{savedResult.createdCredentials.roleLabel}</div>
                </div>
                <div className="surface-card p-3">
                  <div className="text-muted">Username</div>
                  <div className="font-bold mt-0.5">
                    <code>{savedResult.createdCredentials.username}</code>
                  </div>
                </div>
                <div className="surface-card p-3">
                  <div className="text-muted">PIN Awal</div>
                  <div className="font-bold num mt-0.5">{savedResult.createdCredentials.pin}</div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-compact whitespace-nowrap"
                onClick={handleCopyCredentials}
              >
                <Copy size={14} aria-hidden="true" />
                <span>Salin Akses Pribadi</span>
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary whitespace-nowrap"
              onClick={resetForm}
            >
              Input Lagi
            </button>
            <button
              type="button"
              className="btn btn-primary whitespace-nowrap"
              onClick={handleClose}
            >
              Selesai
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <SegmentedPills
            label="Pilih jenis personel input manual"
            value={kategori}
            onChange={(val) => {
              setKategori(val as 'warga' | 'pengurus' | 'security');
              setErrMsg('');
            }}
            options={
              canAddPengurus
                ? [
                    { value: 'warga', label: 'Warga' },
                    { value: 'pengurus', label: 'Pengurus' },
                    { value: 'security', label: 'Security' }
                  ]
                : [
                    { value: 'warga', label: 'Warga' },
                    { value: 'security', label: 'Security' }
                  ]
            }
          />

          {errMsg && (
            <div className="p-3 rounded-xl badge-red text-xs font-semibold flex items-center gap-2" role="alert">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>{errMsg}</span>
            </div>
          )}

          {kategori === 'pengurus' && (
            <div className="soft-well p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="mp-jabatan">
                    Jabatan Pengurus
                  </label>
                  <select
                    id="mp-jabatan"
                    aria-label="Jabatan Pengurus"
                    className="input"
                    value={pengurusRole}
                    onChange={(e) =>
                      setPengurusRole(e.target.value as 'wakil_ketua' | 'sekretaris' | 'bendahara')
                    }
                  >
                    <option value="wakil_ketua">Wakil Ketua</option>
                    <option value="sekretaris">Sekretaris</option>
                    <option value="bendahara">Bendahara</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="mp-res-mode">
                    Sumber Data Warga Pengurus
                  </label>
                  <select
                    id="mp-res-mode"
                    aria-label="Sumber Data Warga Pengurus"
                    className="input"
                    value={residentMode}
                    onChange={(e) => setResidentMode(e.target.value as 'existing' | 'new')}
                  >
                    <option value="new">Input Data Warga Baru</option>
                    <option value="existing">Pilih dari Data Warga Aktif</option>
                  </select>
                </div>
              </div>

              {residentMode === 'existing' && activeResidents.length > 0 && (
                <div>
                  <label className="field-label" htmlFor="mp-existing-res">
                    Pilih Warga Aktif
                  </label>
                  <select
                    id="mp-existing-res"
                    aria-label="Pilih Warga Aktif"
                    className="input"
                    value={existingResidentId || activeResidents[0]?.id || ''}
                    onChange={(e) => setExistingResidentId(e.target.value)}
                  >
                    {activeResidents.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.no_rumah} - {r.nama}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {kategori === 'security' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="mp-sec-nama">
                  Nama Lengkap Petugas Security
                </label>
                <input
                  id="mp-sec-nama"
                  aria-label="Nama Lengkap Petugas Security"
                  className="input"
                  placeholder="Contoh: Bapak Budi Santoso"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="mp-sec-shift">
                  Label Shift / Pos Jaga
                </label>
                <input
                  id="mp-sec-shift"
                  aria-label="Label Shift atau Pos Jaga"
                  className="input"
                  value={shiftLabel}
                  onChange={(e) => setShiftLabel(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            (kategori === 'warga' || residentMode === 'new' || activeResidents.length === 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="mp-nama">
                    Nama
                  </label>
                  <input
                    id="mp-nama"
                    aria-label="Nama Lengkap Warga"
                    className="input"
                    placeholder="Masukkan nama lengkap warga"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="mp-rumah">
                    No. Rumah
                  </label>
                  <input
                    id="mp-rumah"
                    aria-label="Nomor Rumah"
                    className="input num"
                    placeholder="Contoh: G-09 atau F-04"
                    value={noRumah}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNoRumah(val);
                      const upper = val.trim().toUpperCase();
                      if (upper.startsWith('F')) setBlok('F');
                      else if (upper.startsWith('G')) setBlok('G');
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="mp-blok">
                    Blok
                  </label>
                  <select
                    id="mp-blok"
                    aria-label="Blok Hunian"
                    className="input"
                    value={blok}
                    onChange={(e) => {
                      const nb = e.target.value as 'G' | 'F';
                      setBlok(nb);
                      const norm = normalizeHouseAndBlok(noRumah, nb);
                      setNoRumah(norm.no_rumah);
                    }}
                  >
                    <option value="G">Blok G</option>
                    <option value="F">Blok F</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="mp-hub">
                    Status dalam Keluarga
                  </label>
                  <select
                    id="mp-hub"
                    aria-label="Status dalam Keluarga"
                    className="input"
                    value={hubungan}
                    onChange={(e) => setHubungan(e.target.value)}
                  >
                    {FAMILY_STATUS_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h === 'Keluarga'
                          ? 'Keluarga (Kakek / Nenek / Keponakan / Tante / dll.)'
                          : h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="mp-hp">
                    Nomor HP / WhatsApp (Opsional)
                  </label>
                  <input
                    id="mp-hp"
                    aria-label="Nomor HP atau WhatsApp Opsional"
                    type="tel"
                    className="input num"
                    placeholder="Tidak wajib (kosongkan bila belum ada)"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="mp-status">
                    Status Hunian
                  </label>
                  <select
                    id="mp-status"
                    aria-label="Status Hunian"
                    className="input"
                    value={statusHunian}
                    onChange={(e) => setStatusHunian(e.target.value as Resident['status'])}
                  >
                    {(['Tetap', 'Kontrak', 'Pindah', 'Meninggal'] as const).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )
          )}

          {kategori === 'warga' && (
            <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer pt-1">
              <input
                type="checkbox"
                aria-label="Sekaligus buatkan akun login Warga"
                checked={createLoginForWarga}
                onChange={(e) => setCreateLoginForWarga(e.target.checked)}
              />
              <span>Sekaligus buatkan akun login Warga (Username &amp; PIN pribadi)</span>
            </label>
          )}

          {(kategori !== 'warga' || createLoginForWarga) && (
            <div className="soft-well p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="mp-username">
                  Username Login Baru
                </label>
                <input
                  id="mp-username"
                  aria-label="Username Login Baru"
                  className="input"
                  placeholder={
                    kategori === 'security'
                      ? 'Contoh: security.malam2'
                      : kategori === 'pengurus'
                        ? 'Contoh: sekretaris2'
                        : 'Contoh: warga.g09'
                  }
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="mp-pin">
                  PIN Akses Awal (4-8 Digit Angka)
                </label>
                <input
                  id="mp-pin"
                  aria-label="PIN Akses Awal 4 sampai 8 Digit Angka"
                  inputMode="numeric"
                  maxLength={8}
                  className="input num"
                  placeholder="Contoh: 5678"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-secondary whitespace-nowrap"
              onClick={handleClose}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              <span>Simpan Input Manual</span>
              <CtaArrowBadge />
            </button>
          </div>
        </form>
      )}
    </AccessibleModal>
  );
};

function readSquareProfileAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Pilih berkas gambar (JPG, PNG, atau WebP).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas foto profil.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak dapat diproses.'));
      img.onload = () => {
        const size = 160;
        const minSide = Math.min(img.width, img.height);
        const sx = Math.max(0, Math.round((img.width - minSide) / 2));
        const sy = Math.max(0, Math.round((img.height - minSide) / 2));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Peramban tidak mendukung pemotongan foto profil.'));
          return;
        }
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        for (const q of [0.74, 0.62, 0.5]) {
          const out = canvas.toDataURL('image/jpeg', q);
          if (out.length <= 28000) {
            resolve(out);
            return;
          }
        }
        resolve(canvas.toDataURL('image/jpeg', 0.42));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const AccessDeniedView: React.FC<{
  attemptedRoute: string;
  onReturnHome: () => void;
}> = ({ attemptedRoute, onReturnHome }) => {
  const { session } = useAppStore();
  const roleLabel = session ? ROLE_DEFINITIONS[session.role].label : 'Pengguna';

  return (
    <section
      className="surface-card p-8 max-w-xl mx-auto my-8 text-center space-y-4"
      role="alert"
      aria-labelledby="access-denied-heading"
    >
      <div className="mx-auto w-14 h-14 rounded-2xl badge-red flex items-center justify-center">
        <ShieldAlert size={26} aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h1 id="access-denied-heading" className="text-2xl font-bold">
          Akses Ditolak
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Peran <strong>{roleLabel}</strong> tidak memiliki izin akses halaman{' '}
          <code>#/{attemptedRoute}</code>.
        </p>
      </div>
      <div className="pt-2 flex justify-center">
        <button type="button" className="btn btn-primary whitespace-nowrap" onClick={onReturnHome}>
          <span>Kembali ke Beranda</span>
          <CtaArrowBadge />
        </button>
      </div>
    </section>
  );
};

export const SecuritySelfProfileModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { session } = useAppStore();
  const { notify } = useToast();
  const currentAvatar = appStore.getCurrentUserAvatar();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [nama, setNama] = useState(session?.displayName || '');
  const [shiftLabel, setShiftLabel] = useState(
    session?.shiftLabel || 'Shift Malam Pos Gerbang Utama'
  );
  const [username, setUsername] = useState(session?.username || '');
  const [err, setErr] = useState('');

  const [oldPin, setOldPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  const prevOpenRef = useRef(false);

  React.useEffect(() => {
    if (open && !prevOpenRef.current && session) {
      setNama(session.displayName || '');
      setShiftLabel(session.shiftLabel || 'Shift Malam Pos Gerbang Utama');
      setUsername(session.username || '');
      setErr('');
      setPinMsg('');
      setOldPin('');
      setNextPin('');
    }
    prevOpenRef.current = open;
  }, [open, session]);

  const handleSaveSecProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      appStore.updateMyOwnProfile({
        nama: nama.trim(),
        shift_label: shiftLabel.trim(),
        username: username.trim()
      });
      notify('Profil Security berhasil diperbarui & disinkronkan ke Manajemen Akun.');
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Gagal memperbarui profil.');
    }
  };

  const handleUploadSecPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readSquareProfileAvatarDataUrl(file);
      appStore.updateMyProfileAvatar(dataUrl);
      notify('Foto profil berhasil diperbarui & disinkronkan.');
    } catch (ex) {
      notify(ex instanceof Error ? ex.message : 'Gagal mengunggah foto.', 'red');
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveSecPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg('');
    try {
      appStore.updateMyOwnPin(oldPin, nextPin);
      setOldPin('');
      setNextPin('');
      notify('PIN akses pribadi berhasil diperbarui.');
    } catch (ex) {
      setPinMsg(ex instanceof Error ? ex.message : 'Gagal mengganti PIN.');
    }
  };

  return (
    <AccessibleModal
      open={open}
      title="Profil Saya (Tersinkron ke Manajemen Akun)"
      wide
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 soft-well p-4">
          <div className="flex items-center gap-3.5">
            <UserAvatarBadge
              avatarUrl={currentAvatar}
              name={session?.displayName || 'Security'}
              size={64}
            />
            <div>
              <div className="font-bold text-base">{session?.displayName}</div>
              <div className="text-xs text-muted">
                Peran: Security · Username: <code>{session?.username}</code>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              aria-label="Unggah foto profil Security"
              className="sr-only"
              onChange={handleUploadSecPhoto}
            />
            <button
              type="button"
              className="btn btn-secondary btn-compact whitespace-nowrap"
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={14} aria-hidden="true" />
              <span>Unggah Foto</span>
            </button>
            {currentAvatar && (
              <button
                type="button"
                className="btn btn-secondary btn-compact whitespace-nowrap"
                onClick={() => {
                  appStore.updateMyProfileAvatar('');
                  notify('Avatar dikembalikan ke inisial.');
                }}
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Pakai Inisial</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {PRESET_AVATAR_URLS.map((url, idx) => {
            const isSelected = currentAvatar === url;
            return (
              <button
                key={url}
                type="button"
                onClick={() => {
                  appStore.updateMyProfileAvatar(url);
                  notify('Avatar berhasil diterapkan.');
                }}
                aria-label={`Pilih Avatar Karakter ${idx + 1}`}
                aria-pressed={isSelected}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-pill)',
                  padding: '2px',
                  outline: isSelected
                    ? '3px solid var(--color-focus)'
                    : '1px solid var(--color-hairline)',
                  background: isSelected ? 'var(--color-active-bg)' : 'transparent'
                }}
                className="inline-flex items-center justify-center"
              >
                <img
                  src={url}
                  alt={`Karakter Avatar ${idx + 1}`}
                  width={42}
                  height={42}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-pill)',
                    objectFit: 'cover'
                  }}
                />
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSaveSecProfile} className="space-y-4">
          {err && (
            <div className="p-3 rounded-xl badge-red text-xs font-semibold" role="alert">
              {err}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="sec-self-nama">
                Nama Lengkap
              </label>
              <input
                id="sec-self-nama"
                aria-label="Nama Lengkap Petugas"
                className="input"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="sec-self-user">
                Username Login
              </label>
              <input
                id="sec-self-user"
                aria-label="Username Login Petugas"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="sec-self-shift">
                Shift / Pos Jaga
              </label>
              <input
                id="sec-self-shift"
                aria-label="Shift atau Pos Jaga"
                className="input"
                value={shiftLabel}
                onChange={(e) => setShiftLabel(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Simpan Profil
            </button>
          </div>
        </form>

        <form onSubmit={handleSaveSecPin} className="rule-t pt-4 space-y-3">
          <div className="text-xs font-bold">Ganti PIN Akses Pribadi</div>
          {pinMsg && (
            <div className="p-3 rounded-xl badge-red text-xs font-semibold" role="alert">
              {pinMsg}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="field-label" htmlFor="sec-pin-old">
                PIN Saat Ini
              </label>
              <input
                id="sec-pin-old"
                aria-label="PIN Saat Ini"
                type="password"
                inputMode="numeric"
                maxLength={8}
                className="input num"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="sec-pin-new">
                PIN Baru (4-8 digit)
              </label>
              <input
                id="sec-pin-new"
                aria-label="PIN Baru 4 sampai 8 digit"
                type="password"
                inputMode="numeric"
                maxLength={8}
                className="input num"
                value={nextPin}
                onChange={(e) => setNextPin(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-secondary whitespace-nowrap">
              <KeyRound size={14} aria-hidden="true" />
              <span>Perbarui PIN</span>
            </button>
          </div>
        </form>
      </div>
    </AccessibleModal>
  );
};

export const MyDataView: React.FC = () => {
  const { session } = useAppStore();
  const { notify } = useToast();
  const members = appStore.getMyHouseholdMembers();
  const scope = appStore.getCallerHouseholdScope();
  const currentAvatar = appStore.getCurrentUserAvatar();

  const selfRes = scope.selfResident;
  const derivedSelfName =
    selfRes?.nama ||
    (session?.displayName || '').replace(/\s*\([^)]+\)\s*$/, '').trim() ||
    'Pengguna';
  const derivedNoRumah = selfRes?.no_rumah || scope.no_rumah || 'G-01';
  const derivedBlok: 'G' | 'F' =
    selfRes?.blok || (derivedNoRumah.startsWith('F') ? 'F' : 'G');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selfEditOpen, setSelfEditOpen] = useState(false);
  const [selfForm, setSelfForm] = useState({
    nama: derivedSelfName,
    no_rumah: derivedNoRumah,
    blok: derivedBlok as 'G' | 'F',
    hubungan_keluarga: selfRes
      ? normalizeFamilyStatus(selfRes.hubungan_keluarga)
      : 'Kepala Keluarga',
    no_hp: selfRes?.no_hp || '',
    username: session?.username || ''
  });
  const [selfEditErr, setSelfEditErr] = useState('');

  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Resident | null>(null);
  const [nameInput, setNameInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<string>('Kepala Keluarga');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [pinErr, setPinErr] = useState('');

  const canEditContact = hasPermission(session?.role, 'data_saya', 'update');

  const openSelfProfileEdit = () => {
    setSelfForm({
      nama: derivedSelfName,
      no_rumah: derivedNoRumah,
      blok: derivedBlok,
      hubungan_keluarga: selfRes
        ? normalizeFamilyStatus(selfRes.hubungan_keluarga)
        : 'Kepala Keluarga',
      no_hp: selfRes?.no_hp || '',
      username: session?.username || ''
    });
    setSelfEditErr('');
    setSelfEditOpen(true);
  };

  const handleSaveSelfProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSelfEditErr('');
    try {
      const saved = appStore.updateMyOwnProfile({
        nama: selfForm.nama.trim(),
        no_rumah: selfForm.no_rumah.trim(),
        blok: selfForm.blok,
        hubungan_keluarga: selfForm.hubungan_keluarga,
        no_hp: selfForm.no_hp.trim(),
        username: selfForm.username.trim()
      });
      setSelfEditOpen(false);
      notify(
        `Profil "${saved.resident?.nama || selfForm.nama.trim()}" (${saved.resident?.no_rumah || selfForm.no_rumah}) berhasil disimpan & disinkronkan ke Manajemen Akun.`
      );
    } catch (err) {
      setSelfEditErr(err instanceof Error ? err.message : 'Gagal memperbarui profil Anda.');
    }
  };

  const handleUploadProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const squareDataUrl = await readSquareProfileAvatarDataUrl(file);
      appStore.updateMyProfileAvatar(squareDataUrl);
      notify('Foto profil Anda berhasil diperbarui & disinkronkan.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memperbarui foto profil.', 'red');
    } finally {
      e.target.value = '';
    }
  };

  const handleSelectPresetAvatar = (url: string) => {
    try {
      appStore.updateMyProfileAvatar(url);
      notify('Avatar pilihan berhasil diterapkan ke Profil Saya.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menerapkan avatar.', 'red');
    }
  };

  const handleResetToInitials = () => {
    try {
      appStore.updateMyProfileAvatar('');
      notify('Profil dikembalikan ke tampilan inisial nama.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengatur ulang avatar.', 'red');
    }
  };

  const handleChangeOwnPin = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      appStore.updateMyOwnPin(oldPin, nextPin);
      setPinModalOpen(false);
      setOldPin('');
      setNextPin('');
      setPinErr('');
      notify('PIN akses pribadi Anda berhasil diperbarui.');
    } catch (err) {
      setPinErr(err instanceof Error ? err.message : 'Gagal memperbarui PIN.');
    }
  };

  const handleSaveFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setPhoneError('Nama lengkap anggota keluarga wajib diisi.');
      return;
    }
    if (!isValidOptionalIndonesianPhone(phoneInput)) {
      setPhoneError('Format Nomor HP tidak valid (kosongkan bila tidak ada, atau isi contoh: 081234567890).');
      return;
    }
    try {
      appStore.saveMyFamilyMember({
        residentId: editingMember?.id,
        nama: nameInput.trim(),
        hubungan_keluarga: statusInput,
        no_hp: phoneInput.trim()
      });
      setFamilyModalOpen(false);
      setEditingMember(null);
      setPhoneError('');
      notify(
        editingMember
          ? `Data anggota keluarga "${nameInput.trim()}" berhasil diperbarui.`
          : `Anggota keluarga "${nameInput.trim()}" berhasil ditambahkan.`
      );
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Gagal menyimpan data anggota keluarga.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Profil Saya</h1>
          <p className="text-sm text-muted mt-1">
            Ubah data diri Anda (Nama, No. Rumah, Blok) yang otomatis tersinkron ke database Manajemen Akun.
          </p>
        </div>
        <span className="status-badge badge-green">
          <UserCheck size={14} aria-hidden="true" />
          <span>Tersinkron Manajemen Akun</span>
        </span>
      </div>

      {/* Kartu Data Diri, Foto Profil & Pilihan Avatar */}
      <section className="surface-card p-5 sm:p-6 space-y-5" aria-label="Data diri dan pengaturan foto profil">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <UserAvatarBadge
              avatarUrl={currentAvatar}
              name={session?.displayName || 'Warga'}
              size={84}
            />
            <div className="min-w-0 space-y-1">
              <div className="text-lg sm:text-xl font-bold truncate">
                {derivedSelfName}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {session?.role && (
                  <span className="status-badge badge-green">
                    {ROLE_DEFINITIONS[session.role].label}
                  </span>
                )}
                <span className="text-muted">
                  Username: <code>{session?.username}</code>
                </span>
                <span className="text-muted">
                  {derivedNoRumah} · Blok {derivedBlok}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-compact whitespace-nowrap"
              onClick={openSelfProfileEdit}
            >
              <Pencil size={14} aria-hidden="true" />
              <span>Edit Data Profil</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="Unggah berkas foto profil"
              className="sr-only"
              onChange={handleUploadProfilePhoto}
            />
            <button
              type="button"
              className="btn btn-secondary btn-compact whitespace-nowrap"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={14} aria-hidden="true" />
              <span>Unggah Foto</span>
            </button>
            {currentAvatar && (
              <button
                type="button"
                className="btn btn-secondary btn-compact whitespace-nowrap"
                onClick={handleResetToInitials}
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Pakai Inisial</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-compact whitespace-nowrap"
              onClick={() => {
                setPinErr('');
                setOldPin('');
                setNextPin('');
                setPinModalOpen(true);
              }}
            >
              <KeyRound size={14} aria-hidden="true" />
              <span>Ganti PIN</span>
            </button>
          </div>
        </div>

        {/* Format Pendataan Utama: Nama, No. Rumah, Blok */}
        <div className="soft-well p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted">Nama</div>
            <div className="font-bold mt-0.5">{derivedSelfName}</div>
          </div>
          <div>
            <div className="text-xs text-muted">No. Rumah</div>
            <div className="font-bold num mt-0.5">{derivedNoRumah}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Blok</div>
            <div className="font-bold mt-0.5">Blok {derivedBlok}</div>
          </div>
        </div>

        <div className="soft-well p-4 space-y-3">
          <div className="text-xs font-bold">
            Atau Pilih dari 9 Karakter Avatar Pilihan:
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {PRESET_AVATAR_URLS.map((url, idx) => {
              const isSelected = currentAvatar === url;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => handleSelectPresetAvatar(url)}
                  aria-label={`Pilih Avatar Karakter ${idx + 1}`}
                  aria-pressed={isSelected}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius-pill)',
                    padding: '3px',
                    outline: isSelected ? '3px solid var(--color-focus)' : '1px solid var(--color-hairline)',
                    background: isSelected ? 'var(--color-active-bg)' : 'transparent'
                  }}
                  className="inline-flex items-center justify-center transition-transform hover:scale-105"
                >
                  <img
                    src={url}
                    alt={`Karakter Avatar ${idx + 1}`}
                    width={54}
                    height={54}
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: 'var(--radius-pill)',
                      objectFit: 'cover'
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Anggota Keluarga ({derivedNoRumah} · Blok {derivedBlok})</h2>
          <p className="text-xs text-muted mt-0.5">
            Cukup isi <strong>Nama</strong> &amp; <strong>Status</strong> (Kepala Keluarga / Istri / Anak / Keluarga). Nomor HP bersifat opsional.
          </p>
        </div>
        {canEditContact && scope.selfResident && (
          <button
            type="button"
            className="btn btn-secondary btn-compact whitespace-nowrap"
            onClick={() => {
              setEditingMember(null);
              setNameInput('');
              setStatusInput('Anak');
              setPhoneInput('');
              setPhoneError('');
              setFamilyModalOpen(true);
            }}
          >
            <Plus size={14} aria-hidden="true" />
            <span>Tambah Anggota Keluarga</span>
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="surface-card p-6 text-sm text-muted">
          Klik tombol <strong>Edit Data Profil</strong> di atas untuk menyimpan Nama, No. Rumah, dan Blok Anda.
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Daftar anggota keluarga sendiri">
          {members.map((m) => (
            <article key={m.id} className="surface-card p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold">{m.nama}</h3>
                    <div className="text-xs text-muted">
                      <strong>{formatFamilyStatusLabel(m.hubungan_keluarga)}</strong> · {m.no_rumah} (Blok {m.blok})
                    </div>
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                <div className="soft-well p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted">No. Rumah &amp; Blok</div>
                    <div className="font-bold num mt-0.5">{m.no_rumah} · Blok {m.blok}</div>
                  </div>
                  <div>
                    <div className="text-muted">Status Keluarga</div>
                    <div className="font-bold mt-0.5">{formatFamilyStatusLabel(m.hubungan_keluarga)}</div>
                  </div>
                  <div className="sm:col-span-2 pt-1">
                    <div className="text-muted">Nomor HP / WhatsApp (Opsional)</div>
                    <div className="font-bold num mt-0.5">{m.no_hp || 'Belum diisi'}</div>
                  </div>
                </div>
              </div>

              {canEditContact && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact whitespace-nowrap"
                    onClick={() => {
                      if (scope.selfResident && m.id === scope.selfResident.id) {
                        openSelfProfileEdit();
                        return;
                      }
                      setEditingMember(m);
                      setNameInput(m.nama);
                      setStatusInput(normalizeFamilyStatus(m.hubungan_keluarga));
                      setPhoneInput(m.no_hp || '');
                      setPhoneError('');
                      setFamilyModalOpen(true);
                    }}
                  >
                    <Pencil size={14} aria-hidden="true" />
                    <span>Ubah Data</span>
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {/* Modal Edit Profil Saya (Nama, No. Rumah, Blok -> Sinkron ke Manajemen Akun) */}
      <AccessibleModal
        open={selfEditOpen}
        title="Edit Data Profil Saya (Sinkron Manajemen Akun)"
        onClose={() => setSelfEditOpen(false)}
      >
        <form onSubmit={handleSaveSelfProfile} className="space-y-4" noValidate>
          {selfEditErr && (
            <div className="p-3 rounded-xl badge-red text-xs font-semibold" role="alert">
              {selfEditErr}
            </div>
          )}
          <div>
            <label className="field-label" htmlFor="self-nama">
              Nama
            </label>
            <input
              id="self-nama"
              aria-label="Nama Lengkap Profil Saya"
              className="input"
              value={selfForm.nama}
              onChange={(e) => setSelfForm({ ...selfForm, nama: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="self-rumah">
                No. Rumah
              </label>
              <input
                id="self-rumah"
                aria-label="Nomor Rumah Profil Saya"
                className="input num"
                placeholder="Contoh: G-06 atau F-03"
                value={selfForm.no_rumah}
                onChange={(e) => {
                  const val = e.target.value;
                  const upper = val.trim().toUpperCase();
                  const nextBlok = upper.startsWith('F')
                    ? 'F'
                    : upper.startsWith('G')
                      ? 'G'
                      : selfForm.blok;
                  setSelfForm({ ...selfForm, no_rumah: val, blok: nextBlok });
                }}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="self-blok">
                Blok
              </label>
              <select
                id="self-blok"
                aria-label="Blok Hunian Profil Saya"
                className="input"
                value={selfForm.blok}
                onChange={(e) => {
                  const nb = e.target.value as 'G' | 'F';
                  const norm = normalizeHouseAndBlok(selfForm.no_rumah, nb);
                  setSelfForm({ ...selfForm, blok: nb, no_rumah: norm.no_rumah });
                }}
              >
                <option value="G">Blok G</option>
                <option value="F">Blok F</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="self-hub">
                Status dalam Keluarga
              </label>
              <select
                id="self-hub"
                aria-label="Status dalam Keluarga"
                className="input"
                value={selfForm.hubungan_keluarga}
                onChange={(e) =>
                  setSelfForm({
                    ...selfForm,
                    hubungan_keluarga: normalizeFamilyStatus(e.target.value)
                  })
                }
              >
                {FAMILY_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'Keluarga'
                      ? 'Keluarga (Kakek / Nenek / Keponakan / Tante / dll.)'
                      : opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="self-user">
                Username Login
              </label>
              <input
                id="self-user"
                aria-label="Username Login"
                className="input"
                value={selfForm.username}
                onChange={(e) => setSelfForm({ ...selfForm, username: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="self-hp">
              Nomor HP / WhatsApp (Opsional)
            </label>
            <input
              id="self-hp"
              aria-label="Nomor HP atau WhatsApp Opsional"
              type="tel"
              className="input num"
              placeholder="Kosongkan apabila tidak ada nomor HP"
              value={selfForm.no_hp}
              onChange={(e) => setSelfForm({ ...selfForm, no_hp: e.target.value })}
            />
            <p className="field-hint">
              Perubahan Nama, No. Rumah, Blok, dan Username otomatis diperbarui ke database Manajemen Akun.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSelfEditOpen(false)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Simpan &amp; Sinkronkan
            </button>
          </div>
        </form>
      </AccessibleModal>

      <AccessibleModal
        open={familyModalOpen}
        title={
          editingMember
            ? `Ubah Data Anggota: ${editingMember.nama}`
            : 'Tambah Anggota Keluarga'
        }
        onClose={() => {
          setFamilyModalOpen(false);
          setEditingMember(null);
        }}
      >
        <form onSubmit={handleSaveFamilyMember} className="space-y-4" noValidate>
          {phoneError && (
            <div className="p-3 rounded-xl badge-red text-xs font-semibold" role="alert">
              {phoneError}
            </div>
          )}
          <div>
            <label className="field-label" htmlFor="mydata-name">
              Nama Lengkap
            </label>
            <input
              id="mydata-name"
              aria-label="Nama Lengkap Anggota Keluarga"
              className="input"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (phoneError) setPhoneError('');
              }}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="mydata-status">
              Status dalam Keluarga
            </label>
            <select
              id="mydata-status"
              aria-label="Status dalam Keluarga"
              className="input"
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
            >
              {FAMILY_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'Keluarga'
                    ? 'Keluarga (Kakek / Nenek / Keponakan / Tante / dll.)'
                    : opt}
                </option>
              ))}
            </select>
            <p className="field-hint">
              Pilih <strong>Keluarga</strong> untuk kakek, nenek, orang tua, keponakan, tante, paman, atau kerabat lainnya.
            </p>
          </div>
          <div>
            <label className="field-label" htmlFor="mydata-phone">
              Nomor HP / WhatsApp (Opsional - Tidak Wajib)
            </label>
            <input
              id="mydata-phone"
              aria-label="Nomor HP atau WhatsApp Opsional"
              type="tel"
              className="input num"
              placeholder="Kosongkan apabila tidak ada nomor HP"
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(e.target.value);
                if (phoneError) setPhoneError('');
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setFamilyModalOpen(false);
                setEditingMember(null);
              }}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Data
            </button>
          </div>
        </form>
      </AccessibleModal>

      <AccessibleModal
        open={pinModalOpen}
        title="Ganti PIN Akses Pribadi"
        onClose={() => setPinModalOpen(false)}
      >
        <form onSubmit={handleChangeOwnPin} className="space-y-4">
          {pinErr && (
            <div className="p-3 rounded-xl badge-red text-xs font-semibold" role="alert">
              {pinErr}
            </div>
          )}
          <div>
            <label className="field-label" htmlFor="own-pin-old">
              PIN Saat Ini
            </label>
            <input
              id="own-pin-old"
              aria-label="PIN Saat Ini"
              type="password"
              inputMode="numeric"
              maxLength={8}
              className="input num"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="own-pin-new">
              PIN Baru (4 sampai 8 digit angka)
            </label>
            <input
              id="own-pin-new"
              aria-label="PIN Baru 4 sampai 8 digit angka"
              type="password"
              inputMode="numeric"
              maxLength={8}
              className="input num"
              value={nextPin}
              onChange={(e) => setNextPin(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary whitespace-nowrap"
              onClick={() => setPinModalOpen(false)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Simpan PIN Baru
            </button>
          </div>
        </form>
      </AccessibleModal>
    </div>
  );
};

export const DashboardView: React.FC<{ onNavigate: (mod: ModuleId) => void }> = ({ onNavigate }) => {
  const { session, theme, settings } = useAppStore();
  const palette = useChartThemePalette(theme);
  const role = session?.role ?? 'warga';
  const [manualPersonelOpen, setManualPersonelOpen] = useState(false);

  const fin = appStore.getScopedFinancialSummary();
  const social = appStore.getScopedSocialFund();
  const sanitationList = appStore.getScopedSanitation();
  const scopedLetters = appStore.getScopedLetters();
  const scopedBookings = appStore.getScopedBookings();
  const scopedGuests = appStore.getScopedGuestbook();

  const today = todayISO();
  const in14 = addDaysISO(today, 14);
  const upcomingSanitation = sanitationList
    .filter((s) => s.status === 'Terjadwal' && s.tgl_jadwal >= today && s.tgl_jadwal <= in14)
    .sort((a, b) => a.tgl_jadwal.localeCompare(b.tgl_jadwal));

  // Warga-specific clean personal & read-only announcement dashboard
  if (role === 'warga') {
    const scope = appStore.getCallerHouseholdScope();
    const myUnpaidMonths = fin.arrearsMatrix[0]?.rowUnpaidMonths ?? 0;
    const myArrears = fin.arrearsMatrix[0]?.rowArrears ?? 0;

    return (
      <div className="space-y-6">
        <section className="space-y-4" aria-labelledby="warga-dash-title">
          <div>
            <h1 id="warga-dash-title" className="text-2xl sm:text-3xl font-bold leading-tight">
              Halo, Keluarga Rumah {scope.no_rumah || ORG_SUBTITLE}
            </h1>
            <p className="text-sm text-muted mt-1">
              Layanan mandiri keluarga, pengumuman jadwal sanitasi, serta ringkasan transparan saldo kas &amp; dana sosial {settings.orgName}.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="group" aria-label="Pintasan layanan warga">
            <button type="button" className="pastel-tile tile-mint" onClick={() => onNavigate('data_saya')}>
              <Users size={22} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Profil Saya</div>
                <div className="text-xs opacity-80 num">{scope.memberIds.length} Anggota KK</div>
              </div>
            </button>
            <button type="button" className="pastel-tile tile-sky" onClick={() => onNavigate('surat')}>
              <FileText size={22} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">E-Letter</div>
                <div className="text-xs opacity-80 num">{scopedLetters.length} Riwayat KK</div>
              </div>
            </button>
            <button type="button" className="pastel-tile tile-lavender" onClick={() => onNavigate('kas')}>
              <Wallet size={22} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Iuran Saya</div>
                <div className="text-xs opacity-80 num">
                  {myUnpaidMonths === 0 ? 'Lunas Semua' : `${myUnpaidMonths} Bln Belum Lunas`}
                </div>
              </div>
            </button>
            <button type="button" className="pastel-tile tile-sand whitespace-nowrap" onClick={() => onNavigate('aset')}>
              <Home size={22} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Booking Aset</div>
                <div className="text-xs opacity-80 num">{scopedBookings.length} Ajuan</div>
              </div>
            </button>
          </div>
        </section>

        {/* Read-only Kas & Social Fund Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="feature-hero-card lg:col-span-7" aria-labelledby="warga-kas-summary">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="feature-hero-pill">
                <Wallet size={14} aria-hidden="true" />
                <span>Pengumuman Ringkasan Saldo Kas (Baca Saja)</span>
              </span>
              <span className="feature-hero-pill num">Per {formatDate(today)}</span>
            </div>
            <h2 id="warga-kas-summary" className="text-3xl sm:text-4xl font-bold num">
              {formatRupiah(fin.saldoKas)}
            </h2>
            <p className="feature-hero-sub text-sm mt-1.5">
              Total pemasukan lunas <strong className="num">{formatRupiah(fin.pemasukanLunas)}</strong> · Total pengeluaran operasional{' '}
              <strong className="num">{formatRupiah(fin.pengeluaranLunas)}</strong>.
            </p>
            <div className="mt-4 pt-4 rule-t flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs feature-hero-sub">
                Status iuran rumah <strong>{scope.no_rumah}</strong>:{' '}
                <strong>{myArrears === 0 ? 'Lunas' : `Tunggakan ${formatRupiah(myArrears)}`}</strong>
              </span>
              <button type="button" className="btn btn-primary btn-compact whitespace-nowrap" onClick={() => onNavigate('kas')}>
                <span>Bayar Iuran</span>
                <CtaArrowBadge />
              </button>
            </div>
          </section>

          <section className="surface-card p-5 lg:col-span-5 flex flex-col justify-between gap-4" aria-label="Ringkasan dana sosial">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted flex items-center gap-1.5">
                  <HeartHandshake size={15} aria-hidden="true" />
                  <span>Ringkasan Dana Sosial (Baca Saja)</span>
                </span>
                <StatusBadge status="Aktif" />
              </div>
              <div className="text-2xl font-bold num">{formatRupiah(social.saldoSosial)}</div>
              <div className="text-xs text-muted">
                Terkumpul <strong className="num">{formatRupiah(social.totalMasuk)}</strong> · Tersalurkan{' '}
                <strong className="num">{formatRupiah(social.totalSalur)}</strong>
              </div>
            </div>
            <button type="button" className="btn btn-secondary btn-compact w-full whitespace-nowrap" onClick={() => onNavigate('sosial')}>
              Lihat Dana Sosial
            </button>
          </section>
        </div>

        {/* Read-only Sanitation Announcements */}
        <section className="surface-card p-5 space-y-3" aria-label="Pengumuman jadwal sanitasi dan fogging">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <SanitationHandShieldIcon size={18} aria-hidden="true" />
              <span>Pengumuman Jadwal Sanitasi &amp; Fogging</span>
            </h2>
            <button type="button" className="btn btn-ghost btn-compact" onClick={() => onNavigate('sanitasi')}>
              Semua Jadwal
            </button>
          </div>
          {upcomingSanitation.length === 0 ? (
            <p className="text-sm text-muted">Belum ada pengumuman sanitasi terdekat.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {upcomingSanitation.map((s) => (
                <div key={s.id} className="soft-well p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">{s.jenis}</span>
                    <span className="status-badge badge-amber num">{formatDate(s.tgl_jadwal)}</span>
                  </div>
                  <div className="text-xs text-muted">{s.lokasi}</div>
                  {s.catatan && <p className="text-xs">{s.catatan}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // Pengurus & Admin Dashboard
  const canSeeDemografi = hasPermission(role, 'demografi', 'read');
  const demo = appStore.getDemographicsSummary();
  const waitingVerifyLetters = scopedLetters.filter((l) => l.status === 'Menunggu Verifikasi');
  const waitingApproveLetters = scopedLetters.filter((l) => l.status === 'Terverifikasi');
  const actionableBookings = scopedBookings.filter((b) =>
    ['Menunggu', 'Disetujui'].includes(b.status)
  );

  const totalCells = fin.arrearsMatrix.length * fin.periods.length;
  const paidCells = Math.max(0, totalCells - fin.unpaidCellCount);
  const compliancePct = totalCells > 0 ? Math.round((paidCells / totalCells) * 100) : 100;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-8 space-y-6">
        <section aria-labelledby="dash-welcome-title" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 id="dash-welcome-title" className="text-2xl sm:text-3xl font-bold leading-tight">
                Ruang Kendali Pengurus {ORG_SUBTITLE}
              </h1>
              <p className="text-sm text-muted mt-1">
                Alur berjenjang E-Letter, verifikasi bukti iuran, booking aset, dan pengumuman warga {settings.orgName}.
              </p>
            </div>
            {hasPermission(role, 'warga_security', 'read') && (
              <button
                type="button"
                className="btn btn-primary whitespace-nowrap"
                onClick={() => onNavigate('warga_security')}
                title="Buka Manajemen Warga dan Security"
              >
                <UserPlus size={16} aria-hidden="true" />
                <span>Manajemen Warga &amp; Security</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="group" aria-label="Pintasan layanan pengurus">
            <button
              type="button"
              className="pastel-tile tile-mint"
              onClick={() => onNavigate(hasPermission(role, 'warga', 'read') ? 'warga' : 'data_saya')}
            >
              <Users size={22} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Data Warga</div>
                <div className="text-xs opacity-80 num">
                  {canSeeDemografi ? `${demo.totalKK} KK · ${demo.totalWargaAktif} Jiwa` : 'Daftar Rumah'}
                </div>
              </div>
            </button>
            <button
              type="button"
              className="pastel-tile tile-sky"
              onClick={() => onNavigate(hasPermission(role, 'surat', 'read') ? 'surat' : 'data_saya')}
            >
              <FileText size={22} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Alur E-Letter</div>
                <div className="text-xs opacity-80 num">
                  {waitingVerifyLetters.length + waitingApproveLetters.length} Diproses
                </div>
              </div>
            </button>
            <button type="button" className="pastel-tile tile-lavender whitespace-nowrap" onClick={() => onNavigate('kas')}>
              <Wallet size={22} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Kas &amp; Iuran</div>
                <div className="text-xs opacity-80 num">
                  {fin.waitingVerificationCount} Antrean
                </div>
              </div>
            </button>
            <button type="button" className="pastel-tile tile-sand whitespace-nowrap" onClick={() => onNavigate('aset')}>
              <Home size={22} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Booking Aset</div>
                <div className="text-xs opacity-80 num">{actionableBookings.length} Antrean</div>
              </div>
            </button>
          </div>
        </section>

        <section className="feature-hero-card" aria-labelledby="dash-hero-heading">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="feature-hero-pill">
              <Wallet size={14} aria-hidden="true" />
              <span>Saldo Kas Bersih {ORG_SUBTITLE}</span>
            </span>
            <span className="feature-hero-pill num">Per {formatDate(today)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-7">
              <h2 id="dash-hero-heading" className="text-3xl sm:text-4xl font-bold num">
                {formatRupiah(fin.saldoKas)}
              </h2>
              <p className="feature-hero-sub text-sm mt-1.5">
                Iuran lunas <strong className="num">{formatRupiah(fin.iuranTerkumpul)}</strong> · Menunggu verifikasi Bendahara{' '}
                <strong className="num">{fin.waitingVerificationCount} bukti</strong>.
              </p>
            </div>
            <div className="md:col-span-5 flex flex-wrap md:justify-end gap-2">
              <button type="button" className="btn btn-primary" onClick={() => onNavigate('kas')}>
                <span>Buka Kas &amp; Iuran</span>
                <CtaArrowBadge />
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 rule-t flex flex-wrap gap-2.5 text-xs">
            <span className="feature-hero-pill num">Masuk: {formatRupiah(fin.pemasukanLunas)}</span>
            <span className="feature-hero-pill num">Keluar: {formatRupiah(fin.pengeluaranLunas)}</span>
            <span className="feature-hero-pill num">Kepatuhan: {compliancePct}%</span>
          </div>
        </section>

        {/* Compliance Breakdown */}
        <section className="surface-card p-5" aria-label="Tingkat kepatuhan pembayaran iuran bulanan">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 text-center md:text-left">
              <div className="text-xs font-bold text-muted">Kepatuhan Iuran Warga</div>
              <div className="text-4xl font-bold num mt-1">{compliancePct}%</div>
              <div className="text-xs text-muted mt-1 num">
                {paidCells} dari {totalCells} tagihan KK lunas
              </div>
            </div>
            <div className="md:col-span-8 space-y-2.5">
              {fin.periods.map((p) => {
                const totalHH = Math.max(1, fin.arrearsMatrix.length);
                const lunasHH = fin.arrearsMatrix.filter(
                  (row) => row.cells.find((c) => c.periode === p)?.status === 'Lunas'
                ).length;
                const pct = Math.round((lunasHH / totalHH) * 100);
                return (
                  <div key={p} className="flex items-center gap-3 text-xs">
                    <span className="w-16 font-semibold num shrink-0">{p}</span>
                    <div className="progress-track flex-1">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-muted num shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Charts Row */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Grafik arus kas dan dana sosial">
          <div className="surface-card p-5">
            <h2 className="text-base font-bold mb-1">Arus Kas Lunas (Jul s.d. Okt 2026)</h2>
            <p className="text-xs text-muted mb-3">Perbandingan pemasukan dan pengeluaran berstatus Lunas</p>
            <ChartCanvas
              ariaLabel="Grafik batang arus kas pemasukan dan pengeluaran Juli sampai Oktober 2026"
              deps={[fin.transactions.length, fin.saldoKas, theme]}
              configBuilder={() => {
                const lunas = fin.transactions.filter((c) => c.status === 'Lunas');
                const periods = ['2026-07', '2026-08', '2026-09', '2026-10'];
                return {
                  type: 'bar',
                  data: {
                    labels: ['Jul', 'Agu', 'Sep', 'Okt'],
                    datasets: [
                      {
                        label: 'Pemasukan',
                        data: periods.map((p) =>
                          lunas
                            .filter((c) => c.periode === p && c.tipe === 'Pemasukan')
                            .reduce((s, c) => s + c.nominal, 0)
                        ),
                        backgroundColor: palette.petrol,
                        borderRadius: 6
                      },
                      {
                        label: 'Pengeluaran',
                        data: periods.map((p) =>
                          lunas
                            .filter((c) => c.periode === p && c.tipe === 'Pengeluaran')
                            .reduce((s, c) => s + c.nominal, 0)
                        ),
                        backgroundColor: palette.amber,
                        borderRadius: 6
                      }
                    ]
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: palette.ink } } },
                    scales: {
                      x: { ticks: { color: palette.ink }, grid: { display: false } },
                      y: { ticks: { color: palette.ink }, grid: { color: palette.grid } }
                    }
                  }
                };
              }}
            />
          </div>

          <div className="surface-card p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold mb-1">Ringkasan Dana Sosial &amp; Operasional</h2>
              <p className="text-xs text-muted mb-4">Transparansi saldo sosial dan tamu lingkungan</p>
              <div className="space-y-3">
                <div className="soft-well p-3.5 flex items-center justify-between">
                  <span className="text-xs font-semibold">Saldo Dana Sosial Tersedia</span>
                  <span className="font-bold num">{formatRupiah(social.saldoSosial)}</span>
                </div>
                <div className="soft-well p-3.5 flex items-center justify-between">
                  <span className="text-xs font-semibold">Total Santunan Tersalurkan</span>
                  <span className="font-bold num">{formatRupiah(social.totalSalur)}</span>
                </div>
                {hasPermission(role, 'tamu', 'read') && (
                  <div className="soft-well p-3.5 flex items-center justify-between">
                    <span className="text-xs font-semibold">Tamu Aktif Tercatat</span>
                    <span className="font-bold num">
                      {scopedGuests.filter((g) => g.status === 'Aktif').length} Tamu
                    </span>
                  </div>
                )}
              </div>
            </div>
            {canSeeDemografi && (
              <div className="pt-3 flex justify-end">
                <button type="button" className="btn btn-ghost btn-compact whitespace-nowrap" onClick={() => onNavigate('demografi')}>
                  <span>Buka Demografi</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right Contextual Action Queue */}
      <aside className="xl:col-span-4 context-panel space-y-5" aria-label="Jadwal sanitasi dan antrean verifikasi">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <AgendaCalendarCheckIcon size={17} aria-hidden="true" />
            <span>Agenda &amp; Antrean Tugas</span>
          </div>
          <span className="status-badge badge-amber num">{upcomingSanitation.length} Jadwal</span>
        </div>

        <div className="surface-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted">
            <CalendarClock size={15} aria-hidden="true" />
            <span>Pengumuman Sanitasi &amp; Fogging</span>
          </div>
          {upcomingSanitation.length === 0 ? (
            <p className="text-sm text-muted">Tidak ada jadwal sanitasi dalam 14 hari ke depan.</p>
          ) : (
            upcomingSanitation.slice(0, 2).map((s) => (
              <div key={s.id} className="soft-well p-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm">{s.jenis}</span>
                  <span className="status-badge badge-amber num">{formatDate(s.tgl_jadwal)}</span>
                </div>
                <div className="text-xs text-muted">{s.lokasi}</div>
              </div>
            ))
          )}
          <button
            type="button"
            className="btn btn-secondary btn-compact w-full"
            onClick={() => onNavigate('sanitasi')}
          >
            Buka Jadwal Sanitasi
          </button>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-sm font-bold">Antrean Alur Berjenjang</h3>
          {waitingVerifyLetters.length === 0 &&
          waitingApproveLetters.length === 0 &&
          actionableBookings.length === 0 &&
          fin.waitingVerificationCount === 0 ? (
            <div className="surface-card p-4 text-xs text-muted flex items-center gap-2">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>Seluruh antrean verifikasi dan persetujuan selesai.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {hasPermission(role, 'surat', 'read') &&
                [...waitingVerifyLetters, ...waitingApproveLetters].slice(0, 3).map((ltr) => (
                  <div key={ltr.id} className="surface-card p-3 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{ltr.nama}</div>
                      <div className="text-muted truncate">
                        {ltr.jenis} ({ltr.status})
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact shrink-0"
                      onClick={() => onNavigate('surat')}
                    >
                      Buka
                    </button>
                  </div>
                ))}
              {fin.waitingVerificationCount > 0 && (
                <div className="surface-card p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold truncate">Bukti Iuran Warga</div>
                    <div className="text-muted num">{fin.waitingVerificationCount} menunggu verifikasi Bendahara</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact shrink-0"
                    onClick={() => onNavigate('kas')}
                  >
                    Periksa
                  </button>
                </div>
              )}
              {actionableBookings.slice(0, 2).map((bkg) => (
                <div key={bkg.id} className="surface-card p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold truncate">Booking {bkg.id}</div>
                    <div className="text-muted truncate">Status: {bkg.status}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact shrink-0"
                    onClick={() => onNavigate('aset')}
                  >
                    Tinjau
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
      {(role === 'ketua' || role === 'admin') && (
        <ManualPersonelModal
          open={manualPersonelOpen}
          onClose={() => setManualPersonelOpen(false)}
        />
      )}
    </div>
  );
};

export const ResidentsView: React.FC = () => {
  const { session } = useAppStore();
  const { notify } = useToast();
  const role = session?.role;

  const canCreate = hasPermission(role, 'warga', 'create');
  const canUpdate = hasPermission(role, 'warga', 'update');
  const canDelete = hasPermission(role, 'warga', 'delete');
  const canManualPersonel = hasPermission(role, 'warga_security', 'create');
  const isBendaharaLimited = role === 'bendahara';

  const scopedResidents = appStore.getScopedResidents();

  const [manualPersonelOpen, setManualPersonelOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [blokFilter, setBlokFilter] = useState<'Semua' | 'G' | 'F'>('Semua');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [page, setPage] = useState(1);
  const perPage = 8;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Resident | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    nama: '',
    hubungan_keluarga: 'Kepala Keluarga',
    no_hp: '',
    blok: 'G' as 'G' | 'F',
    no_rumah: 'G-01',
    status: 'Tetap' as Resident['status']
  });

  const q = query.trim().toLowerCase();
  const filtered = scopedResidents.filter((r) => {
    if (blokFilter !== 'Semua' && r.blok !== blokFilter) return false;
    if (statusFilter !== 'Semua' && r.status !== statusFilter) return false;
    if (q) {
      const hay = `${r.nama} ${r.no_rumah} blok ${r.blok}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const openAdd = () => {
    setEditing(null);
    setForm({
      nama: '',
      hubungan_keluarga: 'Kepala Keluarga',
      no_hp: '',
      blok: 'G',
      no_rumah: 'G-09',
      status: 'Tetap'
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row: Resident) => {
    const editable = appStore.getEditableResidentById(row.id) ?? row;
    setEditing(editable);
    setForm({
      nama: editable.nama,
      hubungan_keluarga: normalizeFamilyStatus(editable.hubungan_keluarga),
      no_hp: editable.no_hp,
      blok: editable.blok,
      no_rumah: editable.no_rumah,
      status: editable.status
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      setFormError('Nama warga wajib diisi.');
      return;
    }
    if (!form.no_rumah.trim()) {
      setFormError('No. Rumah wajib diisi (contoh: G-01 atau F-02).');
      return;
    }
    if (!isValidOptionalIndonesianPhone(form.no_hp)) {
      setFormError('Format Nomor HP tidak valid (kosongkan jika tidak ada).');
      return;
    }

    const houseNorm = normalizeHouseAndBlok(form.no_rumah, form.blok);

    try {
      if (editing) {
        appStore.updateResidentRecord(editing.id, {
          nama: form.nama.trim(),
          hubungan_keluarga: normalizeFamilyStatus(form.hubungan_keluarga),
          no_hp: form.no_hp.trim(),
          blok: houseNorm.blok,
          no_rumah: houseNorm.no_rumah,
          status: form.status
        });
        notify(`Data warga ${form.nama.trim()} (${houseNorm.no_rumah}) berhasil diperbarui.`);
      } else {
        appStore.createResidentRecord({
          nama: form.nama.trim(),
          hubungan_keluarga: normalizeFamilyStatus(form.hubungan_keluarga),
          nik: '',
          no_kk: '',
          tgl_lahir: '',
          no_hp: form.no_hp.trim(),
          blok: houseNorm.blok,
          no_rumah: houseNorm.no_rumah,
          status: form.status
        });
        notify(`Warga baru ${form.nama.trim()} (${houseNorm.no_rumah}) berhasil ditambahkan.`);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data warga.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {isBendaharaLimited ? 'Daftar Rumah & Warga' : 'Data Warga'}
          </h1>
          <p className="text-sm text-muted mt-1">
            Format pendataan warga terstandar: Nama, No. Rumah, dan Blok (tersinkron ke Manajemen Akun).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManualPersonel && (
            <button
              type="button"
              className="btn btn-secondary whitespace-nowrap"
              onClick={() => setManualPersonelOpen(true)}
              title="Input Manual Warga, Pengurus, atau Security"
            >
              <UserPlus size={16} aria-hidden="true" />
              <span>Input Warga / Pengurus / Security</span>
            </button>
          )}
          {canCreate && (
            <button type="button" className="btn btn-primary whitespace-nowrap" onClick={openAdd}>
              <Plus size={16} aria-hidden="true" />
              <span>Tambah Warga</span>
              <CtaArrowBadge />
            </button>
          )}
        </div>
      </div>

      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <input
            aria-label="Cari nama, nomor rumah, atau blok"
            className="input max-w-xs"
            placeholder="Cari nama atau no. rumah (G-01)…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <SegmentedPills
            label="Filter blok hunian"
            value={blokFilter}
            onChange={(next) => {
              setBlokFilter(next);
              setPage(1);
            }}
            options={[
              { value: 'Semua', label: 'Semua Blok' },
              { value: 'G', label: 'Blok G' },
              { value: 'F', label: 'Blok F' }
            ]}
          />
        </div>
        <select
          aria-label="Filter status hunian"
          className="input"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="Semua">Semua Status</option>
          <option value="Tetap">Tetap</option>
          <option value="Kontrak">Kontrak</option>
          <option value="Pindah">Pindah</option>
          <option value="Meninggal">Meninggal</option>
        </select>
      </div>

      <section className="surface-card overflow-hidden" aria-label="Tabel daftar warga">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              {isBendaharaLimited ? (
                <tr>
                  <th>Nama</th>
                  <th>No. Rumah</th>
                  <th>Blok</th>
                  <th>Status</th>
                </tr>
              ) : (
                <tr>
                  <th>Nama</th>
                  <th>No. Rumah</th>
                  <th>Blok</th>
                  <th>Status Keluarga</th>
                  <th>No. HP (Opsional)</th>
                  <th>Status</th>
                  {(canUpdate || canDelete) && <th>Tindakan</th>}
                </tr>
              )}
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <EmptyStateRow
                  colSpan={isBendaharaLimited ? 4 : canUpdate || canDelete ? 7 : 6}
                  text="Tidak ada data warga yang sesuai filter."
                />
              ) : isBendaharaLimited ? (
                pageItems.map((r) => (
                  <tr key={r.id}>
                    <td className="font-bold">{r.nama}</td>
                    <td className="font-bold num">{r.no_rumah}</td>
                    <td>Blok {r.blok}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              ) : (
                pageItems.map((r) => (
                  <tr key={r.id}>
                    <td className="font-bold">{r.nama}</td>
                    <td className="font-bold num">{r.no_rumah}</td>
                    <td>Blok {r.blok}</td>
                    <td className="text-xs font-semibold">
                      {formatFamilyStatusLabel(r.hubungan_keluarga)}
                    </td>
                    <td className="num text-xs">{r.no_hp || '-'}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    {(canUpdate || canDelete) && (
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {canUpdate && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-compact"
                              onClick={() => openEdit(r)}
                            >
                              Ubah
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-danger btn-compact"
                              onClick={() => setDeleteTarget(r)}
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 rule-t flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            Menampilkan <strong className="num">{pageItems.length}</strong> dari{' '}
            <strong className="num">{filtered.length}</strong> warga
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </button>
            <span className="num font-semibold">
              Halaman {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      <AccessibleModal
        open={modalOpen}
        title={editing ? `Ubah Data Warga: ${editing.nama}` : 'Tambah Warga Baru'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          {formError && (
            <div className="p-3 rounded-xl badge-red text-xs font-semibold flex items-center gap-2" role="alert">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="f-res-nama">
                Nama
              </label>
              <input
                id="f-res-nama"
                aria-label="Nama Lengkap Warga"
                className="input"
                placeholder="Masukkan nama lengkap"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="f-res-rumah">
                No. Rumah
              </label>
              <input
                id="f-res-rumah"
                aria-label="Nomor Rumah"
                className="input num"
                placeholder="G-01 atau F-02"
                value={form.no_rumah}
                onChange={(e) => {
                  const val = e.target.value;
                  const upper = val.trim().toUpperCase();
                  const nextBlok = upper.startsWith('F')
                    ? 'F'
                    : upper.startsWith('G')
                      ? 'G'
                      : form.blok;
                  setForm({ ...form, no_rumah: val, blok: nextBlok });
                }}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="f-res-blok">
                Blok
              </label>
              <select
                id="f-res-blok"
                aria-label="Blok Hunian"
                className="input"
                value={form.blok}
                onChange={(e) => {
                  const nb = e.target.value as 'G' | 'F';
                  const norm = normalizeHouseAndBlok(form.no_rumah, nb);
                  setForm({ ...form, blok: nb, no_rumah: norm.no_rumah });
                }}
              >
                <option value="G">Blok G</option>
                <option value="F">Blok F</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="f-res-hub">
                Status dalam Keluarga
              </label>
              <select
                id="f-res-hub"
                aria-label="Status dalam Keluarga"
                className="input"
                value={form.hubungan_keluarga}
                onChange={(e) => setForm({ ...form, hubungan_keluarga: e.target.value })}
              >
                {FAMILY_STATUS_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h === 'Keluarga'
                      ? 'Keluarga (Kakek / Nenek / Keponakan / Tante / dll.)'
                      : h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="f-res-hp">
                Nomor HP / WhatsApp (Opsional)
              </label>
              <input
                id="f-res-hp"
                aria-label="Nomor HP atau WhatsApp Opsional"
                type="tel"
                className="input num"
                placeholder="Tidak wajib (kosongkan bila belum ada)"
                value={form.no_hp}
                onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="f-res-status">
                Status Hunian
              </label>
              <select
                id="f-res-status"
                aria-label="Status Hunian"
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Resident['status'] })}
              >
                {(['Tetap', 'Kontrak', 'Pindah', 'Meninggal'] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Data Warga
            </button>
          </div>
        </form>
      </AccessibleModal>

      {canManualPersonel && (
        <ManualPersonelModal
          open={manualPersonelOpen}
          onClose={() => setManualPersonelOpen(false)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Data Warga"
        message={
          deleteTarget
            ? `Hapus data warga "${deleteTarget.nama}" (${deleteTarget.no_rumah})? Statistik KK dan demografi akan langsung diperbarui.`
            : ''
        }
        confirmLabel="Hapus Warga"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            try {
              appStore.deleteResidentRecord(deleteTarget.id);
              notify('Data warga berhasil dihapus.', 'amber');
            } catch (err) {
              notify(err instanceof Error ? err.message : 'Gagal menghapus data warga.', 'red');
            }
          }
        }}
      />
    </div>
  );
};

export const DemographicsView: React.FC = () => {
  const { sheets, theme } = useAppStore();
  const palette = useChartThemePalette(theme);
  const d = appStore.getDemographicsSummary();
  const households = appStore.getScopedDemographicsHouseholds();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Demografi &amp; Komposisi Kartu Keluarga</h1>
        <p className="text-sm text-muted mt-1">
          Kalkulasi otomatis Kepala Keluarga aktif, kelompok Balita (&lt;5 tahun), Lansia (60+ tahun), status hunian, dan distribusi Blok G &amp; F.
        </p>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" aria-label="Ringkasan demografi">
        {[
          ['Kepala Keluarga', `${d.totalKK} KK`],
          ['Warga Menetap', `${d.totalWargaAktif} Jiwa`],
          ['Balita (<5 Thn)', `${d.balita} Jiwa`],
          ['Lansia (60+ Thn)', `${d.lansia} Jiwa`],
          ['Warga Tetap', `${d.tetap} Jiwa`],
          ['Warga Kontrak', `${d.kontrak} Jiwa`]
        ].map(([label, val]) => (
          <div key={label} className="surface-card p-4">
            <div className="text-xs font-semibold text-muted">{label}</div>
            <div className="text-xl font-bold num mt-1">{val}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-label="Grafik analisis demografi">
        <div className="surface-card p-5">
          <h2 className="text-base font-bold mb-3">Kelompok Usia Aktif</h2>
          <ChartCanvas
            ariaLabel="Grafik batang kelompok usia warga aktif"
            deps={[sheets.Residents.length, theme]}
            configBuilder={() => ({
              type: 'bar',
              data: {
                labels: ['Balita (<5)', 'Anak/Remaja', 'Dewasa', 'Lansia (60+)'],
                datasets: [
                  {
                    label: 'Jiwa',
                    data: [d.balita, d.anakRemaja, d.dewasa, d.lansia],
                    backgroundColor: [palette.olive, palette.amber, palette.petrol, palette.coral],
                    borderRadius: 6
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: palette.ink }, grid: { display: false } },
                  y: { ticks: { color: palette.ink, stepSize: 2 }, grid: { color: palette.grid } }
                }
              }
            })}
          />
        </div>

        <div className="surface-card p-5">
          <h2 className="text-base font-bold mb-3">Status Kependudukan</h2>
          <ChartCanvas
            ariaLabel="Grafik donat status tetap kontrak pindah dan meninggal"
            deps={[sheets.Residents.length, theme]}
            configBuilder={() => ({
              type: 'doughnut',
              data: {
                labels: ['Tetap', 'Kontrak', 'Pindah', 'Meninggal'],
                datasets: [
                  {
                    data: [d.tetap, d.kontrak, d.pindah, d.meninggal],
                    backgroundColor: [palette.petrol, palette.olive, palette.amber, palette.slate],
                    borderWidth: 0
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: palette.ink, boxWidth: 12 } } }
              }
            })}
          />
        </div>

        <div className="surface-card p-5">
          <h2 className="text-base font-bold mb-3">Sebaran Blok G vs Blok F</h2>
          <ChartCanvas
            ariaLabel="Grafik batang perbandingan Blok G dan Blok F"
            deps={[sheets.Residents.length, theme]}
            configBuilder={() => ({
              type: 'bar',
              data: {
                labels: ['Blok G', 'Blok F'],
                datasets: [
                  { label: 'KK Aktif', data: [d.blokGKK, d.blokFKK], backgroundColor: palette.olive, borderRadius: 6 },
                  { label: 'Warga Aktif', data: [d.blokGWarga, d.blokFWarga], backgroundColor: palette.petrol, borderRadius: 6 }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: palette.ink } } },
                scales: {
                  x: { ticks: { color: palette.ink }, grid: { display: false } },
                  y: { ticks: { color: palette.ink, stepSize: 2 }, grid: { color: palette.grid } }
                }
              }
            })}
          />
        </div>
      </section>

      <section className="surface-card overflow-hidden" aria-label="Daftar Kepala Keluarga aktif">
        <div className="px-5 py-4 rule-b flex items-center justify-between">
          <h2 className="text-base font-bold">Daftar Kepala Keluarga Aktif per Rumah</h2>
          <span className="text-xs text-muted num">{households.length} Kartu Keluarga</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>No. Rumah</th>
                <th>Blok</th>
                <th>Anggota</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {households.map((h) => (
                <tr key={`${h.no_rumah}-${h.kepala_nama}`}>
                  <td className="font-bold">{h.kepala_nama}</td>
                  <td className="font-bold num">{h.no_rumah}</td>
                  <td>Blok {h.blok}</td>
                  <td className="num">{h.memberCount} jiwa</td>
                  <td>
                    <StatusBadge status={h.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export const WargaSecurityManagementView: React.FC = () => {
  const { session, settings } = useAppStore();
  const { notify } = useToast();
  const role = session?.role;
  const isSekretaris = role === 'sekretaris';

  const managedUsers = appStore.getManagedWargaAndSecurityUsers();
  const residents = appStore.getScopedResidents();
  const residentMap = new Map(residents.map((r) => [r.id, r]));

  const [tab, setTab] = useState<'warga' | 'security'>('warga');
  const [query, setQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDefaultKategori, setAddDefaultKategori] = useState<'warga' | 'security'>('warga');

  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [editTarget, setEditTarget] = useState<UserAccount | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    nama_tampilan: '',
    shift_label: 'Shift Malam Pos Gerbang Utama',
    nama_warga_tertaut: '',
    no_rumah: 'G-01',
    blok: 'G' as 'G' | 'F',
    hubungan_keluarga: 'Kepala Keluarga',
    no_hp: ''
  });
  const [editErr, setEditErr] = useState('');

  const [resetTarget, setResetTarget] = useState<UserAccount | null>(null);
  const [newPin, setNewPin] = useState('');

  const wargaAndPengurusAccounts = managedUsers.filter((u) => u.role !== 'security');
  const securityAccounts = managedUsers.filter((u) => u.role === 'security');

  const visibleAccounts = (tab === 'security' ? securityAccounts : wargaAndPengurusAccounts).filter(
    (u) => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      const linked = u.resident_id ? residentMap.get(u.resident_id) : undefined;
      return (
        u.nama_tampilan.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (linked?.no_rumah || '').toLowerCase().includes(q) ||
        (linked?.nama || '').toLowerCase().includes(q)
      );
    }
  );

  const openEditModal = (u: UserAccount) => {
    const linked = u.resident_id ? residentMap.get(u.resident_id) : undefined;
    const { shiftText } = extractShiftAndAvatar(u.shift_label);
    setEditTarget(u);
    setEditForm({
      username: u.username,
      nama_tampilan: u.nama_tampilan,
      shift_label: shiftText || 'Shift Malam Pos Gerbang Utama',
      nama_warga_tertaut: linked?.nama || '',
      no_rumah: linked?.no_rumah || 'G-01',
      blok: linked?.blok || 'G',
      hubungan_keluarga: linked
        ? normalizeFamilyStatus(linked.hubungan_keluarga)
        : 'Kepala Keluarga',
      no_hp: linked?.no_hp || ''
    });
    setEditErr('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      appStore.updateManagedWargaOrSecurityAccount(editTarget.id, {
        username: editForm.username,
        nama_tampilan: editForm.nama_tampilan,
        shift_label: editForm.shift_label,
        nama_warga_tertaut: editForm.nama_warga_tertaut,
        no_rumah: editForm.no_rumah,
        blok: editForm.blok,
        hubungan_keluarga: editForm.hubungan_keluarga,
        no_hp: editForm.no_hp
      });
      setEditTarget(null);
      setEditErr('');
      notify(`Data & akun "${editForm.username}" berhasil diperbarui.`);
    } catch (err) {
      setEditErr(err instanceof Error ? err.message : 'Gagal memperbarui akun.');
    }
  };

  const handleResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      appStore.resetManagedAccountPin(resetTarget.id, newPin);
      setResetTarget(null);
      setNewPin('');
      notify(`PIN akses "${resetTarget.username}" berhasil diperbarui.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mereset PIN.', 'red');
    }
  };

  const handleCopyInvite = async (u: UserAccount) => {
    const text = [
      `Akses Akun Pribadi - ${settings.orgName}`,
      `Nama: ${u.nama_tampilan} (${ROLE_DEFINITIONS[u.role].label})`,
      `Username: ${u.username}`,
      `PIN: ${u.pin}`,
      `Mohon simpan secara pribadi dan jangan dibagikan kepada pihak lain.`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      notify(`Akses pribadi "${u.username}" disalin ke papan klip.`);
    } catch {
      notify(`Username: ${u.username} | PIN: ${u.pin}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Manajemen Warga &amp; Security</h1>
          <p className="text-sm text-muted mt-1">
            {isSekretaris
              ? 'Kelola data & akses akun Warga serta personel Security.'
              : 'Khusus Pengurus Inti (Ketua, Wakil Ketua & Sekretaris): tambah dan ubah data serta akses Warga, Pengurus, dan Security.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary whitespace-nowrap"
            onClick={() => {
              setAddDefaultKategori('security');
              setAddModalOpen(true);
            }}
          >
            <UserPlus size={16} aria-hidden="true" />
            <span>Tambah Security</span>
          </button>
          <button
            type="button"
            className="btn btn-primary whitespace-nowrap"
            onClick={() => {
              setAddDefaultKategori('warga');
              setAddModalOpen(true);
            }}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Tambah Warga</span>
            <CtaArrowBadge />
          </button>
        </div>
      </div>

      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedPills
          label="Pilih kategori manajemen"
          value={tab}
          onChange={(v) => setTab(v as 'warga' | 'security')}
          options={[
            {
              value: 'warga',
              label: `Akun & Data Warga (${wargaAndPengurusAccounts.length})`
            },
            {
              value: 'security',
              label: `Personel Security (${securityAccounts.length})`
            }
          ]}
        />
        <input
          aria-label="Cari nama, rumah, atau username"
          className="input max-w-xs"
          placeholder="Cari nama, rumah, atau username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <section className="surface-card overflow-hidden" aria-label="Tabel manajemen warga dan security">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama &amp; Username</th>
                <th>Peran</th>
                <th>{tab === 'security' ? 'Shift / Pos Jaga' : 'Rumah & Status Keluarga'}</th>
                <th>PIN Akses</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {visibleAccounts.length === 0 ? (
                <EmptyStateRow
                  colSpan={6}
                  text={
                    tab === 'security'
                      ? 'Belum ada personel Security terdaftar.'
                      : 'Belum ada data akun Warga yang cocok.'
                  }
                />
              ) : (
                visibleAccounts.map((u) => {
                  const linked = u.resident_id ? residentMap.get(u.resident_id) : undefined;
                  const { shiftText, avatarUrl } = extractShiftAndAvatar(u.shift_label);
                  const isKetuaAccount = u.role === 'ketua';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <UserAvatarBadge
                            avatarUrl={avatarUrl}
                            name={u.nama_tampilan}
                            size={34}
                          />
                          <div>
                            <div className="font-bold">{u.nama_tampilan}</div>
                            <div className="text-xs text-muted">
                              <code>{u.username}</code>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="status-badge badge-slate">
                          {ROLE_DEFINITIONS[u.role].label}
                        </span>
                      </td>
                      <td className="text-xs">
                        {u.role === 'security' ? (
                          <span className="font-semibold">
                            {shiftText || 'Shift Malam Pos Gerbang Utama'}
                          </span>
                        ) : linked ? (
                          <div>
                            <div className="font-bold">
                              {linked.no_rumah} · {linked.nama}
                            </div>
                            <div className="text-muted">
                              {formatFamilyStatusLabel(linked.hubungan_keluarga)}
                              {linked.no_hp ? ` · ${linked.no_hp}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">{u.resident_id || '-'}</span>
                        )}
                      </td>
                      <td className="num text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{revealedIds[u.id] ? u.pin : '••••'}</span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-compact"
                            aria-label={
                              revealedIds[u.id]
                                ? `Sembunyikan PIN ${u.username}`
                                : `Lihat PIN ${u.username}`
                            }
                            onClick={() =>
                              setRevealedIds((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                            }
                          >
                            {revealedIds[u.id] ? (
                              <EyeOff size={13} aria-hidden="true" />
                            ) : (
                              <Eye size={13} aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={u.aktif === 'Ya' ? 'Aktif' : 'Dibatalkan'} />
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact whitespace-nowrap"
                            onClick={() => openEditModal(u)}
                          >
                            <Pencil size={13} aria-hidden="true" />
                            <span>Ubah</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact whitespace-nowrap"
                            onClick={() => handleCopyInvite(u)}
                          >
                            <Copy size={13} aria-hidden="true" />
                            <span>Salin Akses</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact whitespace-nowrap"
                            onClick={() => {
                              setResetTarget(u);
                              setNewPin(u.pin);
                            }}
                          >
                            <KeyRound size={13} aria-hidden="true" />
                            <span>Reset PIN</span>
                          </button>
                          {!isKetuaAccount && (
                            <button
                              type="button"
                              className={`btn ${
                                u.aktif === 'Ya' ? 'btn-danger' : 'btn-primary'
                              } btn-compact whitespace-nowrap`}
                              onClick={() => {
                                try {
                                  appStore.toggleManagedAccountActive(
                                    u.id,
                                    u.aktif === 'Ya' ? 'Tidak' : 'Ya'
                                  );
                                  notify(
                                    u.aktif === 'Ya'
                                      ? `Akun ${u.username} dinonaktifkan.`
                                      : `Akun ${u.username} diaktifkan kembali.`
                                  );
                                } catch (err) {
                                  notify(
                                    err instanceof Error
                                      ? err.message
                                      : 'Gagal mengubah status.',
                                    'red'
                                  );
                                }
                              }}
                            >
                              {u.aktif === 'Ya' ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ManualPersonelModal
        key={addDefaultKategori}
        open={addModalOpen}
        defaultKategori={addDefaultKategori}
        onClose={() => setAddModalOpen(false)}
      />

      {/* Edit Warga / Security Modal */}
      <AccessibleModal
        open={Boolean(editTarget)}
        title={
          editTarget
            ? editTarget.role === 'security'
              ? `Ubah Personel Security: ${editTarget.nama_tampilan}`
              : `Ubah Data & Akun Warga: ${editTarget.nama_tampilan}`
            : 'Ubah Data'
        }
        onClose={() => setEditTarget(null)}
      >
        {editTarget && (
          <form onSubmit={handleSaveEdit} className="space-y-4" noValidate>
            {editErr && (
              <div className="p-3 rounded-xl badge-red text-xs font-semibold" role="alert">
                {editErr}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="mws-username">
                  Username Login
                </label>
                <input
                  id="mws-username"
                  aria-label="Username Login"
                  className="input"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="mws-display">
                  Nama Tampilan Akun
                </label>
                <input
                  id="mws-display"
                  aria-label="Nama Tampilan Akun"
                  className="input"
                  value={editForm.nama_tampilan}
                  onChange={(e) => setEditForm({ ...editForm, nama_tampilan: e.target.value })}
                  required
                />
              </div>

              {editTarget.role === 'security' ? (
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="mws-shift">
                    Shift / Pos Jaga Security
                  </label>
                  <input
                    id="mws-shift"
                    aria-label="Shift atau Pos Jaga Security"
                    className="input"
                    value={editForm.shift_label}
                    onChange={(e) => setEditForm({ ...editForm, shift_label: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <label className="field-label" htmlFor="mws-resnama">
                      Nama
                    </label>
                    <input
                      id="mws-resnama"
                      aria-label="Nama Lengkap Warga"
                      className="input"
                      value={editForm.nama_warga_tertaut}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          nama_warga_tertaut: e.target.value,
                          nama_tampilan: `${e.target.value} (${editForm.no_rumah})`
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="mws-rumah">
                      No. Rumah
                    </label>
                    <input
                      id="mws-rumah"
                      aria-label="Nomor Rumah Warga"
                      className="input num"
                      value={editForm.no_rumah}
                      onChange={(e) => {
                        const val = e.target.value;
                        const upper = val.trim().toUpperCase();
                        const nextBlok = upper.startsWith('F')
                          ? 'F'
                          : upper.startsWith('G')
                            ? 'G'
                            : editForm.blok;
                        setEditForm({
                          ...editForm,
                          no_rumah: val,
                          blok: nextBlok,
                          nama_tampilan: `${editForm.nama_warga_tertaut} (${val.trim().toUpperCase()})`
                        });
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="mws-blok">
                      Blok
                    </label>
                    <select
                      id="mws-blok"
                      aria-label="Blok Hunian Warga"
                      className="input"
                      value={editForm.blok}
                      onChange={(e) => {
                        const nb = e.target.value as 'G' | 'F';
                        const norm = normalizeHouseAndBlok(editForm.no_rumah, nb);
                        setEditForm({
                          ...editForm,
                          blok: nb,
                          no_rumah: norm.no_rumah,
                          nama_tampilan: `${editForm.nama_warga_tertaut} (${norm.no_rumah})`
                        });
                      }}
                    >
                      <option value="G">Blok G</option>
                      <option value="F">Blok F</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="mws-hub">
                      Status dalam Keluarga
                    </label>
                    <select
                      id="mws-hub"
                      aria-label="Status dalam Keluarga"
                      className="input"
                      value={editForm.hubungan_keluarga}
                      onChange={(e) =>
                        setEditForm({ ...editForm, hubungan_keluarga: e.target.value })
                      }
                    >
                      {FAMILY_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === 'Keluarga'
                            ? 'Keluarga (Kakek / Nenek / Keponakan / Tante / dll.)'
                            : opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="mws-hp">
                      Nomor HP / WhatsApp (Opsional)
                    </label>
                    <input
                      id="mws-hp"
                      aria-label="Nomor HP atau WhatsApp Opsional"
                      type="tel"
                      className="input num"
                      placeholder="Kosongkan apabila tidak ada nomor HP"
                      value={editForm.no_hp}
                      onChange={(e) => setEditForm({ ...editForm, no_hp: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditTarget(null)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-primary whitespace-nowrap">
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </AccessibleModal>

      {/* Reset PIN Modal */}
      <AccessibleModal
        open={Boolean(resetTarget)}
        title={resetTarget ? `Reset PIN: ${resetTarget.username}` : 'Reset PIN'}
        onClose={() => setResetTarget(null)}
      >
        <form onSubmit={handleResetPin} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="mws-pin">
              PIN Baru (4 sampai 8 digit angka)
            </label>
            <input
              id="mws-pin"
              aria-label="PIN Baru 4 sampai 8 digit angka"
              inputMode="numeric"
              maxLength={8}
              className="input num"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setResetTarget(null)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Simpan PIN Baru
            </button>
          </div>
        </form>
      </AccessibleModal>
    </div>
  );
};

