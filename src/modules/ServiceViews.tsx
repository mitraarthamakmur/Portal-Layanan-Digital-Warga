import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  Download,
  Lock,
  MapPin,
  MessageSquareWarning,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  ShieldAlert,
  Trash2
} from '../components/MingcuteIcons';
import {
  appStore,
  evaluatePatrolSlotWindow,
  formatLocalDateTimeSecond,
  getActiveNightShiftDate,
  hasPermission,
  MAX_SHIFT_PATROL_PHOTOS,
  PATROL_EARLY_OPEN_MINUTES,
  PATROL_ONTIME_TOLERANCE_MINUTES
} from '../services/api';
import { PATROL_SLOTS } from '../types';
import type {
  ComplaintCategory,
  ComplaintEntry,
  ComplaintStatus,
  GuestbookEntry,
  Letter,
  LetterStatus,
  ModuleId,
  PatrolLivePhoto,
  PatrolLivePhotoInput,
  PatrolSlotLabel,
  SanitationSchedule,
  SecurityPatrolEntry,
  SocialFundEntry
} from '../types';
import {
  formatDate,
  formatDateTime,
  formatRupiah,
  ORG_SUBTITLE,
  todayISO
} from '../utils/format';
import {
  AccessibleModal,
  BrandLogo,
  ChartCanvas,
  ConfirmDialog,
  CtaArrowBadge,
  EmptyStateRow,
  printOfficialDocument,
  SegmentedPills,
  StatusBadge,
  useAppStore,
  useChartThemePalette,
  useToast
} from '../components/SharedUI';

export const LettersView: React.FC = () => {
  const { session, settings } = useAppStore();
  const { notify } = useToast();
  const role = session?.role;

  const canCreate = hasPermission(role, 'surat', 'create');
  const canVerify = role === 'sekretaris' || role === 'admin';
  const canApprove = role === 'ketua' || role === 'wakil_ketua' || role === 'admin';

  const visibleLetters = appStore.getScopedLetters();
  const applicantChoices = appStore.getLetterApplicantChoices();

  const [createOpen, setCreateOpen] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<Letter | null>(null);
  const [statusTab, setStatusTab] = useState<'Semua' | LetterStatus>('Semua');
  const [applicantId, setApplicantId] = useState<string>(applicantChoices[0]?.id ?? '');
  const [jenis, setJenis] = useState<Letter['jenis']>('Pengantar KTP');
  const [keperluan, setKeperluan] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenId = applicantId || applicantChoices[0]?.id || '';
    if (!chosenId || !keperluan.trim()) return;
    try {
      appStore.submitLetterRequest({
        resident_id: chosenId,
        jenis,
        keperluan: keperluan.trim()
      });
      setKeperluan('');
      setCreateOpen(false);
      notify('Permohonan E-Letter diajukan dan menunggu verifikasi Sekretaris.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengajukan surat.', 'red');
    }
  };

  const handleVerify = (ltr: Letter, decision: 'Terverifikasi' | 'Ditolak') => {
    try {
      appStore.verifyLetterBySekretaris(ltr.id, decision);
      notify(
        decision === 'Terverifikasi'
          ? 'Data surat terverifikasi. Diteruskan ke Ketua/Wakil Ketua untuk persetujuan.'
          : 'Pengajuan surat ditolak pada tahap verifikasi.',
        decision === 'Terverifikasi' ? 'info' : 'amber'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memverifikasi surat.', 'red');
    }
  };

  const handleApprove = (ltr: Letter, decision: 'Disetujui' | 'Ditolak') => {
    try {
      const updated = appStore.approveLetterByKetuaOrWakil(ltr.id, decision);
      notify(
        decision === 'Disetujui'
          ? `Surat disetujui! Nomor otomatis terbit: ${updated.no_surat}`
          : 'Permohonan surat ditolak oleh pimpinan.',
        decision === 'Disetujui' ? 'info' : 'amber'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyetujui surat.', 'red');
    }
  };

  const buildLetterPrintBody = (ltr: Letter) => {
    const r = appStore.getPrintableLetterResident(ltr.resident_id);
    const signer = ltr.disetujui_oleh || settings.ketuaName || 'Ketua Paguyuban';
    const org = appStore.getOrgName();
    const hasNik = Boolean(r?.nik && r.nik !== '-');
    return `
      <div style="text-align:center;margin:18px 0;">
        <h2 style="font-size:15pt;font-weight:700;border-bottom:1.5px solid currentColor;display:inline-block;padding-bottom:2px;margin:0;">SURAT PENGANTAR WARGA</h2>
        <p class="num" style="font-size:11pt;margin-top:4px;">Nomor: ${ltr.no_surat}</p>
      </div>
      <p style="margin-bottom:12px;">Pengurus ${org} (${ORG_SUBTITLE}) menerangkan bahwa warga tersebut di bawah ini:</p>
      <table style="width:100%;line-height:1.8;margin-bottom:16px;">
        <tr><td style="width:190px;">Nama Lengkap</td><td>: <strong>${ltr.nama}</strong></td></tr>
        ${hasNik ? `<tr><td>NIK</td><td class="num">: ${r?.nik}</td></tr>` : ''}
        <tr><td>Alamat Hunian</td><td>: ${org}, Blok ${r?.blok ?? '-'}, No. Rumah ${r?.no_rumah ?? '-'}</td></tr>
        <tr><td>Status Hunian</td><td>: Warga ${r?.status ?? 'Tetap'}</td></tr>
        <tr><td>Jenis Pengantar</td><td>: <strong>${ltr.jenis}</strong></td></tr>
        <tr><td>Keperluan</td><td>: ${ltr.keperluan}</td></tr>
        <tr><td>Diverifikasi Oleh</td><td>: ${ltr.diverifikasi_oleh || '-'} (${formatDate(ltr.tgl_diverifikasi)})</td></tr>
      </table>
      <p style="margin-bottom:28px;">Demikian surat pengantar ini diterbitkan secara resmi untuk dipergunakan sebagaimana mestinya.</p>
      <div style="display:flex;justify-content:flex-end;">
        <div style="text-align:center;min-width:220px;">
          <div>Diterbitkan pada ${formatDate(ltr.tgl_disetujui || todayISO())}</div>
          <div>Menyetujui,</div>
          <div style="height:52px;"></div>
          <div style="font-weight:700;border-bottom:1px solid currentColor;display:inline-block;padding-bottom:2px;">${signer}</div>
        </div>
      </div>
    `;
  };

  const handleDownloadLetterHtml = (ltr: Letter) => {
    const org = appStore.getOrgName();
    const htmlDoc = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/><title>${ltr.no_surat} - ${ltr.nama}</title></head><body style="font-family:Georgia,serif;max-width:740px;margin:32px auto;padding:24px;color:#111f1b;"><h2>${org} (${ORG_SUBTITLE})</h2><hr/>${buildLetterPrintBody(ltr)}</body></html>`;
    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Surat-${ltr.no_surat.replace(/\//g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const filteredLetters = visibleLetters.filter(
    (l) => statusTab === 'Semua' || l.status === statusTab
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Layanan E-Letter Berjenjang</h1>
          <p className="text-sm text-muted mt-1">
            Alur resmi: Warga ajukan &rarr; Sekretaris verifikasi data &rarr; Ketua/Wakil setujui &rarr; Nomor surat <code>/PWSJR/</code> terbit otomatis &rarr; Warga cetak/unduh.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setApplicantId(applicantChoices[0]?.id ?? '');
              setCreateOpen(true);
            }}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Ajukan Surat</span>
            <CtaArrowBadge />
          </button>
        )}
      </div>

      {/* Pipeline Steps Indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { step: '1. Pengajuan Warga', desc: 'Status: Menunggu Verifikasi' },
          { step: '2. Cek Sekretaris', desc: 'Verifikasi kelengkapan data KK' },
          { step: '3. Persetujuan Ketua/Wakil', desc: 'Nomor surat terbit otomatis' },
          { step: '4. Cetak / Unduh', desc: 'Dokumen resmi siap digunakan' }
        ].map((item) => (
          <div key={item.step} className="soft-well p-3.5">
            <div className="text-xs font-bold">{item.step}</div>
            <div className="text-xs text-muted mt-0.5">{item.desc}</div>
          </div>
        ))}
      </div>

      <div>
        <SegmentedPills
          label="Filter status E-Letter"
          options={[
            { value: 'Semua', label: 'Semua' },
            { value: 'Menunggu Verifikasi', label: 'Menunggu Verifikasi' },
            { value: 'Terverifikasi', label: 'Terverifikasi' },
            { value: 'Disetujui', label: 'Disetujui' },
            { value: 'Ditolak', label: 'Ditolak' }
          ]}
          value={statusTab}
          onChange={setStatusTab}
        />
      </div>

      <section className="surface-card overflow-hidden" aria-label="Daftar pengajuan E-Letter">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nomor Surat</th>
                <th>Pemohon</th>
                <th>Jenis &amp; Keperluan</th>
                <th>Jejak Verifikasi &amp; Persetujuan</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {filteredLetters.length === 0 ? (
                <EmptyStateRow colSpan={6} text="Belum ada pengajuan surat pada filter ini." />
              ) : (
                filteredLetters.map((l) => {
                  const houseInfo = appStore.getLimitedResidentLookup(l.resident_id);
                  return (
                    <tr key={l.id}>
                      <td className="num text-xs font-bold">
                        {l.status === 'Disetujui' && l.no_surat
                          ? l.no_surat
                          : 'Terbit saat Disetujui'}
                      </td>
                      <td>
                        <div className="font-bold">{l.nama}</div>
                        <div className="text-xs text-muted">
                          {houseInfo?.no_rumah ?? '-'} · Diajukan {formatDate(l.tgl_pengajuan)}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold">{l.jenis}</div>
                        <div className="text-xs text-muted">{l.keperluan}</div>
                      </td>
                      <td className="text-xs">
                        <div>
                          <span className="text-muted">Verifikasi:</span>{' '}
                          <strong>{l.diverifikasi_oleh || 'Belum'}</strong>
                        </div>
                        <div className="mt-0.5">
                          <span className="text-muted">Persetujuan:</span>{' '}
                          <strong>{l.disetujui_oleh || 'Belum'}</strong>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={l.status} />
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {l.status === 'Menunggu Verifikasi' && canVerify && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-compact"
                                onClick={() => handleVerify(l, 'Terverifikasi')}
                              >
                                Verifikasi Data
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-compact"
                                onClick={() => handleVerify(l, 'Ditolak')}
                              >
                                Tolak
                              </button>
                            </>
                          )}

                          {l.status === 'Terverifikasi' && canApprove && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-compact"
                                onClick={() => handleApprove(l, 'Disetujui')}
                              >
                                Setujui Surat
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-compact"
                                onClick={() => handleApprove(l, 'Ditolak')}
                              >
                                Tolak
                              </button>
                            </>
                          )}

                          {l.status === 'Disetujui' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-compact"
                              onClick={() => setPreviewLetter(l)}
                            >
                              <Printer size={14} aria-hidden="true" />
                              <span>Cetak / Unduh</span>
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

      <AccessibleModal
        open={createOpen}
        title="Ajukan Surat Pengantar Baru"
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="ltr-applicant">
              Anggota Keluarga Pemohon
            </label>
            <select
              id="ltr-applicant"
              aria-label="Anggota Keluarga Pemohon"
              className="input"
              value={applicantId}
              onChange={(e) => setApplicantId(e.target.value)}
            >
              {applicantChoices.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.no_rumah} - {r.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="ltr-jenis">
              Jenis Surat Pengantar
            </label>
            <select
              id="ltr-jenis"
              aria-label="Jenis Surat Pengantar"
              className="input"
              value={jenis}
              onChange={(e) => setJenis(e.target.value as Letter['jenis'])}
            >
              {(
                [
                  'Pengantar KTP',
                  'Pengantar Kartu Keluarga',
                  'Surat Keterangan Domisili',
                  'Surat Keterangan Usaha'
                ] as const
              ).map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="ltr-keperluan">
              Keperluan Pengajuan
            </label>
            <textarea
              id="ltr-keperluan"
              aria-label="Keperluan Pengajuan Surat"
              className="input"
              placeholder="Jelaskan keperluan administrasi secara lengkap…"
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Kirim Pengajuan
            </button>
          </div>
        </form>
      </AccessibleModal>

      <AccessibleModal
        open={Boolean(previewLetter)}
        title={previewLetter ? `Pratinjau Surat Resmi: ${previewLetter.no_surat}` : 'Pratinjau Surat'}
        wide
        onClose={() => setPreviewLetter(null)}
      >
        {previewLetter && (
          <div className="space-y-4">
            <div className="soft-well p-6 space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-3 rule-b">
                <BrandLogo height={38} orgName={appStore.getOrgName()} />
                <div>
                  <div className="font-bold text-base">{appStore.getOrgName()}</div>
                  <div className="text-xs text-muted">
                    Sekretariat Pengurus {appStore.getOrgName()} · {ORG_SUBTITLE}
                  </div>
                </div>
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: buildLetterPrintBody(previewLetter)
                }}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleDownloadLetterHtml(previewLetter)}
              >
                <Download size={15} aria-hidden="true" />
                <span>Unduh Dokumen (.html)</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  printOfficialDocument({
                    orgName: appStore.getOrgName(),
                    kopSubtitle: `Dokumen E-Letter Terverifikasi (${previewLetter.no_surat})`,
                    bodyHtml: buildLetterPrintBody(previewLetter)
                  })
                }
              >
                <Printer size={15} aria-hidden="true" />
                <span>Cetak Surat Resmi</span>
              </button>
            </div>
          </div>
        )}
      </AccessibleModal>
    </div>
  );
};

const SecurityThreeTabHeader: React.FC<{
  activeTab: 'patroli' | 'tamu' | 'keluhan';
  onNavigate?: (mod: ModuleId) => void;
}> = ({ activeTab, onNavigate }) => {
  const { session } = useAppStore();
  if (session?.role !== 'security' || !onNavigate) return null;

  return (
    <div className="surface-card p-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs font-bold text-muted px-2">
        Menu Tugas Security (3 Tab Operasional)
      </div>
      <SegmentedPills
        label="Tiga tab tugas Security"
        value={activeTab}
        onChange={(next) => onNavigate(next)}
        options={[
          { value: 'patroli', label: 'Check-In (21.00 - 05.00)' },
          { value: 'tamu', label: 'Buku Tamu' },
          { value: 'keluhan', label: 'Keluhan Warga' }
        ]}
      />
    </div>
  );
};

function formatRealtimeWibStamp(dt: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(dt.getDate())} ${months[dt.getMonth()]} ${dt.getFullYear()} · ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())} WIB`;
}

function captureVideoWithPermanentStamp(params: {
  video: HTMLVideoElement;
  slot: PatrolSlotLabel;
  titikLokasi: string;
  koordinatGps: string;
  namaSecurity: string;
  now: Date;
}): string {
  const vw = params.video.videoWidth || 640;
  const vh = params.video.videoHeight || 480;
  const maxSide = 640;
  const scale = Math.min(1, maxSide / Math.max(vw, vh));
  const cw = Math.max(320, Math.round(vw * scale));
  const ch = Math.max(240, Math.round(vh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Peramban tidak mendukung kanvas kamera live.');
  }

  ctx.drawImage(params.video, 0, 0, cw, ch);

  const barHeight = Math.max(76, Math.round(ch * 0.2));
  const barY = ch - barHeight;

  ctx.fillStyle = 'rgba(10, 24, 19, 0.84)';
  ctx.fillRect(0, barY, cw, barHeight);

  ctx.fillStyle = '#8ce8b9';
  ctx.fillRect(0, barY, cw, 2.5);

  const padX = 12;
  const maxTextW = cw - padX * 2;
  const fontBase = Math.max(11, Math.min(13, Math.round(cw / 46)));

  ctx.textBaseline = 'top';
  ctx.font = `700 ${fontBase + 1}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#8ce8b9';
  ctx.fillText(
    `Portal Layanan Digital Warga - Blok G & F · Ronda ${params.slot} WIB`,
    padX,
    barY + 9,
    maxTextW
  );

  ctx.font = `600 ${fontBase}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#f4fbf8';
  ctx.fillText(
    `${params.titikLokasi} · ${params.koordinatGps}`,
    padX,
    barY + 9 + fontBase + 6,
    maxTextW
  );

  ctx.font = `500 ${fontBase}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#d4ebe2';
  ctx.fillText(
    `${formatRealtimeWibStamp(params.now)} · Petugas: ${params.namaSecurity}`,
    padX,
    barY + 9 + (fontBase + 6) * 2,
    maxTextW
  );

  for (const q of [0.66, 0.54, 0.44, 0.36]) {
    const encoded = canvas.toDataURL('image/jpeg', q);
    if (encoded.length <= 42000) return encoded;
  }
  return canvas.toDataURL('image/jpeg', 0.32);
}

export const SecurityPatrolView: React.FC<{
  onNavigate?: (mod: ModuleId) => void;
}> = ({ onNavigate }) => {
  const { session, sheets } = useAppStore();
  const { notify } = useToast();
  const role = session?.role;
  const isAdmin = role === 'admin';

  const canCheckInPatrol = role === 'security' || role === 'admin';
  const patrolRowsAll = appStore.getScopedSecurityPatrol();

  const defaultSecurityOfficerName = (() => {
    if (session?.role === 'security' && session.displayName) {
      return session.displayName;
    }
    const secAccount = sheets.Users.find((u) => u.role === 'security' && u.aktif === 'Ya');
    return secAccount?.nama_tampilan || session?.displayName || 'Petugas Security Pos Utama';
  })();

  const [nowTick, setNowTick] = useState<Date>(() => new Date());
  const [shiftDate, setShiftDate] = useState<string>(() => getActiveNightShiftDate());
  const [namaSecurity, setNamaSecurity] = useState<string>(defaultSecurityOfficerName);
  const [areaPatroli, setAreaPatroli] = useState<string>('Pos Gerbang Utama');
  const [catatanPatroli, setCatatanPatroli] = useState<string>('');

  // Live Check-In Window + Camera + GPS State
  const [activeCheckInSlot, setActiveCheckInSlot] = useState<PatrolSlotLabel | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [gpsStatus, setGpsStatus] = useState('Mendeteksi koordinat lokasi live…');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [draftPhotos, setDraftPhotos] = useState<PatrolLivePhotoInput[]>([]);
  const [zoomPhoto, setZoomPhoto] = useState<PatrolLivePhoto | null>(null);
  const [adminEditRow, setAdminEditRow] = useState<SecurityPatrolEntry | null>(null);
  const [adminOfficerDraft, setAdminOfficerDraft] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (session?.role === 'security' && session.displayName) {
      setNamaSecurity(session.displayName);
    }
  }, [session?.displayName, session?.role]);

  useEffect(() => {
    appStore.refreshMissedPatrolSlots(shiftDate, namaSecurity, true);
    const interval = window.setInterval(() => {
      const current = new Date();
      setNowTick(current);
      appStore.refreshMissedPatrolSlots(shiftDate, namaSecurity, true, current);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [shiftDate, namaSecurity]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const refreshLiveGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('GPS perangkat tidak tersedia');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const acc = Math.round(pos.coords.accuracy || 0);
        setGpsStatus(`GPS ${lat}, ${lng} (±${acc}m)`);
        setGpsLoading(false);
      },
      () => {
        setGpsStatus('Izin lokasi belum aktif (Pos Utama Lingkungan)');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!activeCheckInSlot) {
      stopCameraStream();
      return;
    }

    refreshLiveGps();
    let cancelled = false;
    setCameraError('');
    setCameraReady(false);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Kamera langsung tidak tersedia pada peramban perangkat ini.');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 960 }
        },
        audio: false
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError(
            'Izin kamera belum diberikan. Izinkan akses kamera perangkat untuk mengambil Foto Live berstempel.'
          );
        }
      });

    return () => {
      cancelled = true;
      stopCameraStream();
    };
  }, [activeCheckInSlot, facingMode]);

  const shiftPatrolRows = patrolRowsAll.filter((p) => p.tanggal_shift === shiftDate);
  const shiftPhotos = appStore.getScopedPatrolPhotos(shiftDate);
  const totalShiftPhotoUsed = shiftPhotos.length + draftPhotos.length;

  const openCheckInWindow = (slot: PatrolSlotLabel) => {
    const existing = shiftPatrolRows.find((r) => r.slot_jadwal === slot);
    if (existing && (existing.status === 'Tepat Waktu' || existing.status === 'Terlambat')) {
      notify(`Jam ronda ${slot} sudah terkunci permanen dan tidak dapat diubah.`, 'amber');
      return;
    }
    setDraftPhotos([]);
    setActiveCheckInSlot(slot);
  };

  const handleSnapLiveStampedPhoto = () => {
    if (!activeCheckInSlot) return;
    if (totalShiftPhotoUsed >= MAX_SHIFT_PATROL_PHOTOS) {
      notify(`Batas maksimum ${MAX_SHIFT_PATROL_PHOTOS} Foto Live untuk shift ini telah tercapai.`, 'amber');
      return;
    }
    if (!videoRef.current || !cameraReady) {
      notify('Kamera live belum siap. Pastikan izin kamera pada perangkat sudah diaktifkan.', 'red');
      return;
    }
    if (!namaSecurity.trim()) {
      notify('Isi Nama Petugas Security terlebih dahulu agar tercetak pada stempel foto.', 'red');
      return;
    }

    try {
      const snapNow = new Date();
      const stampedDataUrl = captureVideoWithPermanentStamp({
        video: videoRef.current,
        slot: activeCheckInSlot,
        titikLokasi: areaPatroli,
        koordinatGps: gpsStatus,
        namaSecurity: namaSecurity.trim(),
        now: snapNow
      });

      setDraftPhotos((prev) => [
        ...prev,
        {
          waktu_foto: formatLocalDateTimeSecond(snapNow),
          titik_lokasi: areaPatroli,
          koordinat_gps: gpsStatus,
          data_url: stampedDataUrl
        }
      ]);
      notify(`Foto Live ke-${totalShiftPhotoUsed + 1}/${MAX_SHIFT_PATROL_PHOTOS} berhasil diambil dengan stempel lokasi.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengambil foto live.', 'red');
    }
  };

  const handleConfirmPermanentCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCheckInSlot) return;
    try {
      const rec = appStore.checkInSecurityPatrol({
        shiftDateISO: shiftDate,
        slot: activeCheckInSlot,
        namaSecurity,
        areaPatroli,
        koordinatGps: gpsStatus,
        catatanTambahan: catatanPatroli,
        photos: draftPhotos,
        now: new Date()
      });
      setNowTick(new Date());
      setCatatanPatroli('');
      setDraftPhotos([]);
      setActiveCheckInSlot(null);
      if (rec.status === 'Terlambat') {
        notify(
          `Check-in ${rec.slot_jadwal} tersimpan & TERKUNCI PERMANEN (Terlambat +${rec.selisih_menit} menit).`,
          'amber'
        );
      } else {
        notify(
          `Check-in ronda jam ${rec.slot_jadwal} tersimpan & TERKUNCI PERMANEN di Google Sheets.`
        );
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan check-in security.', 'red');
    }
  };

  const handleAdminSaveOfficerName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEditRow) return;
    try {
      appStore.updatePatrolOfficerNameByAdmin(adminEditRow.id, adminOfficerDraft);
      setAdminEditRow(null);
      notify('Nama petugas pada rekaman patroli berhasil diperbarui oleh Admin.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memperbarui nama petugas.', 'red');
    }
  };

  const onTimeShiftCount = shiftPatrolRows.filter((p) => p.status === 'Tepat Waktu').length;
  const lateAllCount = patrolRowsAll.filter((p) => p.status === 'Terlambat').length;
  const missedAllCount = patrolRowsAll.filter((p) => p.status === 'Terlewat').length;

  const currentClockLabel = `${String(nowTick.getHours()).padStart(2, '0')}:${String(
    nowTick.getMinutes()
  ).padStart(2, '0')}:${String(nowTick.getSeconds()).padStart(2, '0')} WIB`;

  return (
    <div className="space-y-5">
      <SecurityThreeTabHeader activeTab="patroli" onNavigate={onNavigate} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Check-In Patroli Security (21.00 - 23.00 - 01.00 - 03.00 - 05.00)
          </h1>
          <p className="text-sm text-muted mt-1">
            Check-in sekali klik terkunci permanen dan dilengkapi Kamera Live + Stamp Lokasi otomatis.
          </p>
        </div>
        <span className="status-badge badge-green num">
          <Clock size={14} aria-hidden="true" />
          <span>Jam Pos: {currentClockLabel}</span>
        </span>
      </div>

      <section
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        aria-label="Ringkasan disiplin patroli security"
      >
        <div className="tile-mint p-4">
          <div className="text-xs font-semibold">Check-In Tepat Waktu (Shift Ini)</div>
          <div className="text-2xl font-bold num mt-1">
            {onTimeShiftCount} / {PATROL_SLOTS.length} Jam
          </div>
          <div className="text-xs mt-1">
            Aktif {PATROL_EARLY_OPEN_MINUTES} mnt sebelum jadwal, toleransi +{PATROL_ONTIME_TOLERANCE_MINUTES} mnt
          </div>
        </div>
        <div className="tile-sky p-4">
          <div className="text-xs font-semibold">Dokumentasi Foto Live Shift Ini</div>
          <div className="text-2xl font-bold num mt-1">
            {shiftPhotos.length} / {MAX_SHIFT_PATROL_PHOTOS} Foto
          </div>
          <div className="text-xs mt-1">3 titik rute x 5 jam patroli (tanpa galeri)</div>
        </div>
        <div className="surface-card p-4">
          <div className="text-xs font-semibold text-muted">Catatan Terlambat</div>
          <div className="text-2xl font-bold num mt-1">{lateAllCount} Kejadian</div>
          <div className="text-xs text-muted mt-1">Terkunci otomatis di Google Sheets</div>
        </div>
        <div className="tile-lavender p-4">
          <div className="text-xs font-semibold">Slot Terlewat (&gt;60 Menit)</div>
          <div className="text-2xl font-bold num mt-1">{missedAllCount} Slot</div>
          <div className="text-xs mt-1">Shift aktif: {formatDate(shiftDate)}</div>
        </div>
      </section>

      <section
        className="surface-card p-5 space-y-5"
        aria-label="Panel tombol check-in jam jaga malam security"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div>
            <label className="field-label" htmlFor="ptr-shift-date">
              Tanggal Mulai Shift Malam
            </label>
            <input
              id="ptr-shift-date"
              aria-label="Tanggal Mulai Shift Malam Security"
              type="date"
              className="input num"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value || getActiveNightShiftDate())}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="ptr-officer">
              Nama Petugas Security Jaga
            </label>
            <input
              id="ptr-officer"
              aria-label="Nama Petugas Security Jaga"
              className="input"
              placeholder="Nama petugas shift malam…"
              disabled={!canCheckInPatrol}
              value={namaSecurity}
              onChange={(e) => setNamaSecurity(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="ptr-note-quick">
              Catatan Umum Shift (Opsional)
            </label>
            <input
              id="ptr-note-quick"
              aria-label="Catatan Umum Shift Patroli Opsional"
              className="input"
              placeholder="Contoh: Portal malam terkunci aman…"
              disabled={!canCheckInPatrol}
              value={catatanPatroli}
              onChange={(e) => setCatatanPatroli(e.target.value)}
            />
          </div>
        </div>

        {!canCheckInPatrol && (
          <div className="soft-well p-3.5 text-xs text-muted">
            Mode pantau pengurus: setiap jam ronda yang sudah disimpan terkunci permanen beserta stempel foto kamera live petugas.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {PATROL_SLOTS.map((slot) => {
            const existing = shiftPatrolRows.find((r) => r.slot_jadwal === slot);
            const slotPhotos = shiftPhotos.filter((ph) => ph.slot_jadwal === slot);
            const win = evaluatePatrolSlotWindow(shiftDate, slot, nowTick);
            const isRecordedDone = Boolean(
              existing && (existing.status === 'Tepat Waktu' || existing.status === 'Terlambat')
            );
            const isMissed = existing?.status === 'Terlewat';

            return (
              <div key={slot} className="soft-well p-4 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl font-bold num">{slot} WIB</span>
                    {existing ? (
                      <StatusBadge status={existing.status} />
                    ) : !win.canCheckIn ? (
                      <StatusBadge status="Terjadwal" />
                    ) : win.isLateWindow ? (
                      <StatusBadge status="Terlambat" />
                    ) : (
                      <StatusBadge status="Aktif" />
                    )}
                  </div>

                  <div className="text-xs text-muted num">Jadwal: {win.targetFormatted}</div>

                  {isRecordedDone && existing ? (
                    <div className="text-xs space-y-1 pt-1">
                      <div className="font-bold num">
                        Masuk: {existing.waktu_checkin.split(' ')[1] ?? existing.waktu_checkin} WIB
                      </div>
                      <div className="text-muted">Oleh {existing.nama_security}</div>
                      <div className="font-semibold text-muted">
                        Foto Live: <span className="num">{slotPhotos.length} foto</span> · Tidak dapat diubah
                      </div>
                    </div>
                  ) : isMissed ? (
                    <div className="text-xs space-y-1 pt-1">
                      <div className="font-bold flex items-center gap-1">
                        <ShieldAlert size={13} aria-hidden="true" />
                        <span>Lewat batas 60 menit</span>
                      </div>
                      <div className="text-muted">
                        Tercatat Terlewat. Buka check-in susulan sekali klik bila baru hadir.
                      </div>
                    </div>
                  ) : !win.canCheckIn ? (
                    <div className="text-xs text-muted pt-1">
                      Aktif 5 mnt sebelum jadwal (<strong className="num">{win.opensAtFormatted}</strong> WIB)
                    </div>
                  ) : win.isLateWindow ? (
                    <div className="text-xs pt-1">
                      Lewat <strong className="num">+{win.diffMinutes} menit</strong> dari jadwal
                    </div>
                  ) : (
                    <div className="text-xs text-muted pt-1">
                      Siap check-in + Foto Live (s.d. <strong className="num">{win.toleranceUntilFormatted}</strong> WIB)
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  {isRecordedDone ? (
                    <button
                      type="button"
                      className="btn btn-secondary w-full btn-compact whitespace-nowrap"
                      disabled
                      title="Terkunci permanen: sudah Check-In dan tidak dapat diubah ulang"
                    >
                      <Lock size={14} aria-hidden="true" />
                      <span>Terkunci · Sudah Check-In</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`btn ${
                        win.canCheckIn && canCheckInPatrol ? 'btn-primary' : 'btn-secondary'
                      } w-full btn-compact whitespace-nowrap`}
                      disabled={!canCheckInPatrol || !win.canCheckIn}
                      onClick={() => openCheckInWindow(slot)}
                    >
                      <Camera size={14} aria-hidden="true" />
                      <span>
                        {!win.canCheckIn
                          ? `Buka ${win.opensAtFormatted}`
                          : isMissed
                            ? `Susulan ${slot}`
                            : win.isLateWindow
                              ? `Check-In Telat`
                              : `Check-In ${slot}`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Galeri Dokumentasi Foto Live Patroli (Kapasitas 15 Foto) */}
      <section
        className="surface-card p-5 space-y-4"
        aria-label="Galeri dokumentasi foto live patroli security"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">
              Galeri Dokumentasi Foto Live &amp; Stamp Lokasi ({shiftPhotos.length}/{MAX_SHIFT_PATROL_PHOTOS})
            </h2>
            <p className="text-xs text-muted">
              Seluruh foto diambil langsung dari kamera perangkat (tanpa unggah galeri) dengan stempel permanen lokasi, koordinat GPS, detik WIB, dan nama petugas.
            </p>
          </div>
          <span className="status-badge badge-green num">
            {shiftPhotos.length} / {MAX_SHIFT_PATROL_PHOTOS} Foto Shift {formatDate(shiftDate)}
          </span>
        </div>

        {shiftPhotos.length === 0 ? (
          <div className="soft-well p-6 text-center text-sm text-muted">
            Belum ada dokumentasi Foto Live untuk tanggal shift {formatDate(shiftDate)}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftPhotos.map((ph) => (
              <article key={ph.id} className="soft-well overflow-hidden flex flex-col justify-between">
                <div className="relative bg-black/10">
                  <img
                    src={ph.data_url}
                    alt={`Foto live ronda jam ${ph.slot_jadwal} di ${ph.titik_lokasi}`}
                    className="w-full h-48 object-cover block"
                  />
                </div>
                <div className="p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="status-badge badge-green num">Slot {ph.slot_jadwal} WIB</span>
                    <span className="text-muted num">Foto #{ph.urutan}/{MAX_SHIFT_PATROL_PHOTOS}</span>
                  </div>
                  <div className="font-bold">{ph.titik_lokasi}</div>
                  <div className="text-muted num">{ph.koordinat_gps}</div>
                  <div className="text-muted num">
                    {ph.waktu_foto} WIB · {ph.nama_security}
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact w-full whitespace-nowrap"
                      onClick={() => setZoomPhoto(ph)}
                    >
                      Lihat Ukuran Penuh
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Tabel Rekaman Data Check-In Patroli di Bagian Bawah Halaman */}
      <section
        className="surface-card overflow-hidden"
        aria-label="Tabel log check-in patroli security di Google Sheets"
      >
        <div className="px-5 py-4 rule-b flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">Tabel Rekaman Data Check-In Patroli (Sheet: SecurityPatrol)</h2>
            <p className="text-xs text-muted">
              Setiap check-in jam 21.00, 23.00, 01.00, 03.00, dan 05.00 terkunci permanen dan tersinkron ke Google Sheets.
            </p>
          </div>
          <span className="status-badge badge-slate num">{patrolRowsAll.length} Rekaman</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Shift &amp; Jam Ronda</th>
                <th>Waktu Aktual WIB</th>
                <th>Petugas &amp; Titik Lokasi GPS</th>
                <th>Foto Live</th>
                <th>Status Kunci</th>
                <th>Catatan Rekaman</th>
                {isAdmin && <th>Koreksi Admin</th>}
              </tr>
            </thead>
            <tbody>
              {patrolRowsAll.length === 0 ? (
                <EmptyStateRow colSpan={isAdmin ? 7 : 6} text="Belum ada rekaman check-in patroli tercatat." />
              ) : (
                patrolRowsAll.map((row) => {
                  const rowPhotos = appStore
                    .getScopedPatrolPhotos(row.tanggal_shift)
                    .filter((ph) => ph.slot_jadwal === row.slot_jadwal);
                  const isLocked = row.status === 'Tepat Waktu' || row.status === 'Terlambat';

                  return (
                    <tr key={row.id}>
                      <td className="num">
                        <div className="font-bold">Jam {row.slot_jadwal} WIB</div>
                        <div className="text-xs text-muted">Shift {formatDate(row.tanggal_shift)}</div>
                      </td>
                      <td className="num text-xs">
                        <div className="font-bold">
                          {row.waktu_checkin === '-' ? 'Belum Check-In' : `${row.waktu_checkin} WIB`}
                        </div>
                        <div className="text-muted">
                          {row.status === 'Tepat Waktu'
                            ? `Selisih +${row.selisih_menit} menit`
                            : `Selisih +${row.selisih_menit} menit`}
                        </div>
                      </td>
                      <td>
                        <div className="font-bold">{row.nama_security}</div>
                        <div className="text-xs text-muted">{row.area_patroli}</div>
                      </td>
                      <td className="num text-xs">
                        {rowPhotos.length > 0 ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact whitespace-nowrap"
                            onClick={() => setZoomPhoto(rowPhotos[0])}
                          >
                            <Camera size={13} aria-hidden="true" />
                            <span>{rowPhotos.length} Foto</span>
                          </button>
                        ) : (
                          <span className="text-muted">0 Foto</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={row.status} />
                          {isLocked && (
                            <span className="text-xs text-muted flex items-center gap-1">
                              <Lock size={11} aria-hidden="true" />
                              <span>Terkunci</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-xs">{row.catatan}</td>
                      {isAdmin && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact whitespace-nowrap"
                            onClick={() => {
                              setAdminEditRow(row);
                              setAdminOfficerDraft(row.nama_security);
                            }}
                          >
                            <Pencil size={13} aria-hidden="true" />
                            <span>Ubah Nama</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Jendela Check-In Kamera Live + Stamp Lokasi Otomatis (TANPA UPLOAD GALERI) */}
      <AccessibleModal
        open={Boolean(activeCheckInSlot)}
        title={
          activeCheckInSlot
            ? `Jendela Check-In Ronda Jam ${activeCheckInSlot} WIB (Kamera Live)`
            : 'Jendela Check-In Ronda'
        }
        wide
        onClose={() => setActiveCheckInSlot(null)}
      >
        {activeCheckInSlot && (
          <form onSubmit={handleConfirmPermanentCheckIn} className="space-y-4">
            <div className="soft-well p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>Keamanan Anti-Manipulasi Aktif:</strong> Tanpa unggah file galeri. Foto wajib dijepret langsung dari kamera perangkat dan setelah disimpan tombol jam ronda <strong>terkunci permanen</strong>.
              </div>
              <span className="status-badge badge-green num">
                { currentClockLabel }
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="field-label" htmlFor="chk-officer-name">
                  Nama Petugas Security
                </label>
                <input
                  id="chk-officer-name"
                  aria-label="Nama Petugas Security pada Stempel Foto"
                  className="input"
                  value={namaSecurity}
                  onChange={(e) => setNamaSecurity(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="chk-route-point">
                  Titik Lokasi Rute Patroli
                </label>
                <select
                  id="chk-route-point"
                  aria-label="Titik Lokasi Rute Patroli"
                  className="input"
                  value={areaPatroli}
                  onChange={(e) => setAreaPatroli(e.target.value)}
                >
                  <option value="Pos Gerbang Utama">Titik 1: Pos Gerbang Utama</option>
                  <option value="Koridor & Jalur Blok G">Titik 2: Koridor &amp; Jalur Blok G</option>
                  <option value="Koridor & Jalur Blok F">Titik 3: Koridor &amp; Jalur Blok F</option>
                  <option value="Portal Malam & Lampu PJU">Portal Malam &amp; Lampu PJU</option>
                </select>
              </div>
            </div>

            <div className="soft-well p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <MapPin size={15} aria-hidden="true" />
                <span>
                  Koordinat Live: <strong className="num">{gpsStatus}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-compact whitespace-nowrap"
                  onClick={refreshLiveGps}
                  disabled={gpsLoading}
                >
                  <RefreshCw size={13} className={gpsLoading ? 'animate-spin' : ''} aria-hidden="true" />
                  <span>Perbarui GPS</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-compact whitespace-nowrap"
                  onClick={() =>
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                  }
                >
                  <Camera size={13} aria-hidden="true" />
                  <span>Putar Kamera</span>
                </button>
              </div>
            </div>

            {/* Live Video Viewfinder */}
            <div className="surface-card overflow-hidden">
              <div className="relative bg-black flex items-center justify-center min-h-[240px] max-h-[340px]">
                <video ref={videoRef} poster="/icon-portal.svg" autoPlay playsInline muted className="w-full max-h-[340px] object-contain" />
                {cameraError && (
                  <div className="p-5 text-center text-xs text-white max-w-md">
                    {cameraError}
                  </div>
                )}
              </div>
              <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted">
                  Rekomendasi: 3 titik rute per jam ronda (maksimal {MAX_SHIFT_PATROL_PHOTOS} foto per shift).
                </div>
                <button
                  type="button"
                  className="btn btn-primary whitespace-nowrap"
                  disabled={!cameraReady || totalShiftPhotoUsed >= MAX_SHIFT_PATROL_PHOTOS}
                  onClick={handleSnapLiveStampedPhoto}
                >
                  <Camera size={16} aria-hidden="true" />
                  <span>
                    Ambil Foto Live + Stamp Lokasi ({totalShiftPhotoUsed}/{MAX_SHIFT_PATROL_PHOTOS})
                  </span>
                </button>
              </div>
            </div>

            {draftPhotos.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold">
                  Hasil Jepretan Jendela Ini ({draftPhotos.length} Foto Siap Dikunci):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {draftPhotos.map((dp, idx) => (
                    <div key={`${dp.waktu_foto}-${idx}`} className="soft-well overflow-hidden">
                      <img
                        src={dp.data_url}
                        alt={`Pratinjau foto live ${idx + 1}`}
                        className="w-full h-32 object-cover block"
                      />
                      <div className="p-2 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-semibold">{dp.titik_lokasi}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-compact whitespace-nowrap"
                          aria-label={`Hapus draf foto ${idx + 1} sebelum dikunci`}
                          onClick={() =>
                            setDraftPhotos((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          <span>Ulangi</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="field-label" htmlFor="chk-extra-note">
                Catatan Situasi Pos &amp; Blok G-F (Opsional)
              </label>
              <input
                id="chk-extra-note"
                aria-label="Catatan Situasi Pos dan Blok G-F"
                className="input"
                placeholder="Contoh: Portal terkunci, lampu jalan menyala normal…"
                value={catatanPatroli}
                onChange={(e) => setCatatanPatroli(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-secondary whitespace-nowrap"
                onClick={() => setActiveCheckInSlot(null)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-primary whitespace-nowrap">
                <Lock size={15} aria-hidden="true" />
                <span>Simpan &amp; Kunci Permanen {activeCheckInSlot}</span>
              </button>
            </div>
          </form>
        )}
      </AccessibleModal>

      {/* Zoom Lightbox Modal for Stamped Live Photo */}
      <AccessibleModal
        open={Boolean(zoomPhoto)}
        title={
          zoomPhoto
            ? `Dokumentasi Foto Live Ronda Jam ${zoomPhoto.slot_jadwal} WIB`
            : 'Dokumentasi Foto Live'
        }
        wide
        onClose={() => setZoomPhoto(null)}
      >
        {zoomPhoto && (
          <div className="space-y-3">
            <div className="soft-well overflow-hidden">
              <img
                src={zoomPhoto.data_url}
                alt={`Dokumentasi penuh ronda jam ${zoomPhoto.slot_jadwal}`}
                className="w-full max-h-[68vh] object-contain mx-auto block"
              />
            </div>
            <div className="soft-well p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <strong>Perumahan &amp; Slot:</strong> Portal Layanan Digital Warga - Blok G &amp; F (Jam {zoomPhoto.slot_jadwal} WIB)
              </div>
              <div>
                <strong>Petugas Security:</strong> {zoomPhoto.nama_security}
              </div>
              <div>
                <strong>Titik Lokasi:</strong> {zoomPhoto.titik_lokasi}
              </div>
              <div className="num">
                <strong>Koordinat &amp; Waktu:</strong> {zoomPhoto.koordinat_gps} · {zoomPhoto.waktu_foto} WIB
              </div>
            </div>
          </div>
        )}
      </AccessibleModal>

      {/* Admin Officer Name Correction Modal */}
      <AccessibleModal
        open={Boolean(adminEditRow)}
        title="Koreksi Nama Petugas Patroli (Otoritas Admin)"
        onClose={() => setAdminEditRow(null)}
      >
        <form onSubmit={handleAdminSaveOfficerName} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="adm-ptr-officer">
              Nama Lengkap Petugas Security
            </label>
            <input
              id="adm-ptr-officer"
              aria-label="Nama Lengkap Petugas Security"
              className="input"
              value={adminOfficerDraft}
              onChange={(e) => setAdminOfficerDraft(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary whitespace-nowrap"
              onClick={() => setAdminEditRow(null)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Simpan Nama
            </button>
          </div>
        </form>
      </AccessibleModal>
    </div>
  );
};

export const GuestbookView: React.FC<{
  autoOpenForm?: boolean;
  onConsumedAutoOpen?: () => void;
  onNavigate?: (mod: ModuleId) => void;
}> = ({ autoOpenForm, onConsumedAutoOpen, onNavigate }) => {
  const { session } = useAppStore();
  const { notify } = useToast();
  const role = session?.role;

  const isSecurity = role === 'security';
  const isAdmin = role === 'admin';
  const canCreateGuest = hasPermission(role, 'tamu', 'create');
  const canCheckoutGuest = hasPermission(role, 'tamu', 'update');

  const scopedGuests = appStore.getScopedGuestbook();
  const minimalHouses = appStore.getMinimalHouseDirectory();

  const [formOpen, setFormOpen] = useState(false);
  const [adminEditGuest, setAdminEditGuest] = useState<GuestbookEntry | null>(null);
  const [adminGuestDraft, setAdminGuestDraft] = useState({
    nama_tamu: '',
    keperluan: '',
    status: 'Aktif' as GuestbookEntry['status']
  });

  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const [guestForm, setGuestForm] = useState({
    nama_tamu: '',
    no_identitas: '',
    resident_id: minimalHouses[0]?.resident_id ?? 'RES-001',
    tgl_masuk: todayISO(),
    jam_masuk: defaultTime,
    keperluan: ''
  });

  useEffect(() => {
    appStore.refreshGuestExpirations(false);
  }, []);

  useEffect(() => {
    if (autoOpenForm && canCreateGuest) {
      setFormOpen(true);
      onConsumedAutoOpen?.();
    }
  }, [autoOpenForm, canCreateGuest, onConsumedAutoOpen]);

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const targetResId = guestForm.resident_id || minimalHouses[0]?.resident_id || '';
    if (!targetResId || !guestForm.nama_tamu.trim() || !guestForm.keperluan.trim()) {
      notify('Mohon lengkapi Nama Tamu, Rumah Tujuan, dan Keperluan.', 'red');
      return;
    }
    try {
      appStore.createGuestEntry({
        nama_tamu: guestForm.nama_tamu.trim(),
        no_identitas: guestForm.no_identitas.trim() || '-',
        resident_id: targetResId,
        tgl_masuk: guestForm.tgl_masuk,
        jam_masuk: guestForm.jam_masuk,
        keperluan: guestForm.keperluan.trim()
      });
      setGuestForm({ ...guestForm, nama_tamu: '', no_identitas: '', keperluan: '' });
      setFormOpen(false);
      notify('Tamu tercatat berstatus Aktif ke sheet Guestbook (berlaku 1x24 jam).');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mencatat tamu.', 'red');
    }
  };

  const activeCount = scopedGuests.filter((g) => g.status === 'Aktif').length;
  const expiredCount = scopedGuests.filter((g) => g.status === 'Kedaluwarsa').length;

  return (
    <div className="space-y-5">
      <SecurityThreeTabHeader activeTab="tamu" onNavigate={onNavigate} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Buku Tamu Wajib Lapor 1x24 Jam</h1>
          <p className="text-sm text-muted mt-1">
            {isSecurity
              ? `Pencatatan tamu keluar-masuk pos Security (menampilkan tamu Aktif hari ini, ${formatDate(todayISO())}).`
              : 'Daftar kunjungan tamu wajib lapor 1x24 jam yang tersinkron ke sheet Guestbook.'}
          </p>
        </div>

        {canCreateGuest && (
          <button
            type="button"
            className="btn btn-primary whitespace-nowrap"
            onClick={() => {
              setGuestForm((prev) => ({
                ...prev,
                resident_id: minimalHouses[0]?.resident_id ?? prev.resident_id,
                tgl_masuk: todayISO()
              }));
              setFormOpen(true);
            }}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Catat Tamu</span>
            <CtaArrowBadge />
          </button>
        )}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Ringkasan status buku tamu">
        <div className="surface-card p-4">
          <div className="text-xs font-semibold text-muted">
            {isSecurity ? 'Tamu Aktif Hari Ini' : 'Tamu Aktif (<24 Jam)'}
          </div>
          <div className="text-2xl font-bold num mt-1">{activeCount}</div>
        </div>
        {!isSecurity && (
          <div className="surface-card p-4">
            <div className="text-xs font-semibold text-muted">Melewati 24 Jam (Kedaluwarsa)</div>
            <div className="text-2xl font-bold num mt-1">{expiredCount}</div>
          </div>
        )}
        <div className="surface-card p-4">
          <div className="text-xs font-semibold text-muted">Total Catatan Buku Tamu</div>
          <div className="text-2xl font-bold num mt-1">{scopedGuests.length}</div>
        </div>
      </section>

      <section className="surface-card overflow-hidden" aria-label="Tabel buku tamu">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Tamu</th>
                <th>Tujuan Hunian</th>
                <th>Keperluan</th>
                <th>Waktu Masuk &amp; Batas 24 Jam</th>
                <th>Status</th>
                {canCheckoutGuest && <th>Tindakan</th>}
              </tr>
            </thead>
            <tbody>
              {scopedGuests.length === 0 ? (
                <EmptyStateRow
                  colSpan={canCheckoutGuest ? 6 : 5}
                  text={
                    isSecurity
                      ? 'Belum ada tamu aktif yang masuk hari ini.'
                      : 'Belum ada catatan buku tamu pada cakupan akun Anda.'
                  }
                />
              ) : (
                scopedGuests.map((g) => {
                  const host = appStore.getLimitedResidentLookup(g.resident_id);
                  return (
                    <tr key={g.id}>
                      <td>
                        <div className="font-bold">{g.nama_tamu}</div>
                        {!isSecurity && (
                          <div className="text-xs text-muted num">
                            ID: {`${g.no_identitas.slice(0, 4)}********${g.no_identitas.slice(-4)}`}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="font-bold">{g.no_rumah}</div>
                        <div className="text-xs text-muted">
                          {host?.nama ?? `Blok ${g.tujuan_blok}`}
                        </div>
                      </td>
                      <td>{g.keperluan}</td>
                      <td className="num text-xs">
                        <div>
                          Masuk: {formatDate(g.tgl_masuk)} {g.jam_masuk}
                        </div>
                        <div className="text-muted">Batas: {formatDateTime(g.expired_at)}</div>
                      </td>
                      <td>
                        <StatusBadge status={g.status} />
                      </td>
                      {canCheckoutGuest && (
                        <td>
                          <div className="flex flex-wrap gap-1.5">
                            {g.status !== 'Selesai' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-compact whitespace-nowrap"
                                onClick={() => {
                                  appStore.checkoutGuestEntry(g.id);
                                  notify('Kunjungan tamu ditandai Selesai.');
                                }}
                              >
                                Lapor Keluar
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-compact whitespace-nowrap"
                                onClick={() => {
                                  setAdminEditGuest(g);
                                  setAdminGuestDraft({
                                    nama_tamu: g.nama_tamu,
                                    keperluan: g.keperluan,
                                    status: g.status
                                  });
                                }}
                              >
                                <Pencil size={13} aria-hidden="true" />
                                <span>Ubah Nama</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AccessibleModal
        open={Boolean(adminEditGuest)}
        title="Ubah Nama & Data Tamu (Otoritas Admin)"
        onClose={() => setAdminEditGuest(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!adminEditGuest) return;
            try {
              appStore.updateGuestEntryByAdmin(adminEditGuest.id, adminGuestDraft);
              setAdminEditGuest(null);
              notify('Nama & detail tamu berhasil diperbarui.');
            } catch (err) {
              notify(err instanceof Error ? err.message : 'Gagal memperbarui tamu.', 'red');
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="field-label" htmlFor="adm-gst-nama">
              Nama Lengkap Tamu
            </label>
            <input
              id="adm-gst-nama"
              aria-label="Nama Lengkap Tamu"
              className="input"
              value={adminGuestDraft.nama_tamu}
              onChange={(e) =>
                setAdminGuestDraft({ ...adminGuestDraft, nama_tamu: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="adm-gst-kep">
              Keperluan Kunjungan
            </label>
            <input
              id="adm-gst-kep"
              aria-label="Keperluan Kunjungan Tamu"
              className="input"
              value={adminGuestDraft.keperluan}
              onChange={(e) =>
                setAdminGuestDraft({ ...adminGuestDraft, keperluan: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="adm-gst-st">
              Status Kunjungan
            </label>
            <select
              id="adm-gst-st"
              aria-label="Status Kunjungan Tamu"
              className="input"
              value={adminGuestDraft.status}
              onChange={(e) =>
                setAdminGuestDraft({
                  ...adminGuestDraft,
                  status: e.target.value as GuestbookEntry['status']
                })
              }
            >
              <option value="Aktif">Aktif</option>
              <option value="Kedaluwarsa">Kedaluwarsa</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary whitespace-nowrap"
              onClick={() => setAdminEditGuest(null)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Simpan Perubahan
            </button>
          </div>
        </form>
      </AccessibleModal>

      <AccessibleModal
        open={formOpen}
        title="Registrasi Tamu Wajib Lapor 1x24 Jam"
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={handleAddGuest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="gst-nama">
                Nama Lengkap Tamu
              </label>
              <input
                id="gst-nama"
                aria-label="Nama Lengkap Tamu"
                className="input"
                value={guestForm.nama_tamu}
                onChange={(e) => setGuestForm({ ...guestForm, nama_tamu: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="gst-id">
                Nomor KTP / SIM / Identitas (Opsional)
              </label>
              <input
                id="gst-id"
                aria-label="Nomor KTP SIM atau Identitas Tamu Opsional"
                className="input num"
                placeholder="Kosongkan apabila tidak dicatat"
                value={guestForm.no_identitas}
                onChange={(e) => setGuestForm({ ...guestForm, no_identitas: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="gst-host">
                Rumah Warga Tujuan
              </label>
              <select
                id="gst-host"
                aria-label="Rumah Warga Tujuan"
                className="input"
                value={guestForm.resident_id}
                onChange={(e) => setGuestForm({ ...guestForm, resident_id: e.target.value })}
              >
                {minimalHouses.map((hh) => (
                  <option key={hh.resident_id} value={hh.resident_id}>
                    {hh.no_rumah} - {hh.nama_kepala}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="gst-date">
                Tanggal &amp; Jam Masuk
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="gst-date"
                  aria-label="Tanggal masuk tamu"
                  type="date"
                  className="input num"
                  value={guestForm.tgl_masuk}
                  onChange={(e) => setGuestForm({ ...guestForm, tgl_masuk: e.target.value })}
                  required
                />
                <input
                  id="gst-time"
                  type="time"
                  aria-label="Jam masuk tamu"
                  className="input num"
                  value={guestForm.jam_masuk}
                  onChange={(e) => setGuestForm({ ...guestForm, jam_masuk: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="gst-kep">
              Keperluan Kunjungan
            </label>
            <textarea
              id="gst-kep"
              aria-label="Keperluan Kunjungan"
              className="input"
              placeholder="Contoh: Kerabat menginap akhir pekan…"
              value={guestForm.keperluan}
              onChange={(e) => setGuestForm({ ...guestForm, keperluan: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Simpan Buku Tamu
            </button>
          </div>
        </form>
      </AccessibleModal>
    </div>
  );
};

export const ComplaintsView: React.FC<{
  onNavigate?: (mod: ModuleId) => void;
}> = ({ onNavigate }) => {
  const { session } = useAppStore();
  const { notify } = useToast();
  const role = session?.role;

  const isWarga = role === 'warga';
  const canCreate = hasPermission(role, 'keluhan', 'create');
  const canRespond = hasPermission(role, 'keluhan', 'update');

  const complaints = appStore.getScopedComplaints();
  const minimalHouses = appStore.getMinimalHouseDirectory();
  const callerScope = appStore.getCallerHouseholdScope();

  const defaultReporter =
    isWarga && callerScope.selfResident
      ? callerScope.selfResident.id
      : callerScope.selfResident?.id || minimalHouses[0]?.resident_id || 'RES-013';

  const [createOpen, setCreateOpen] = useState(false);
  const [respondTarget, setRespondTarget] = useState<ComplaintEntry | null>(null);

  const [cForm, setCForm] = useState({
    resident_id: defaultReporter,
    kategori: 'Keamanan & Pos' as ComplaintCategory,
    prioritas: 'Normal' as 'Normal' | 'Mendesak',
    judul: '',
    deskripsi: ''
  });

  const [rForm, setRForm] = useState({
    status: 'Diproses' as ComplaintStatus,
    petugasNama: role === 'security' ? 'Bapak Heru Purnomo' : session?.displayName || '',
    catatan_tindak_lanjut: ''
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      appStore.createComplaint(cForm);
      setCreateOpen(false);
      setCForm((prev) => ({ ...prev, judul: '', deskripsi: '' }));
      notify('Keluhan warga berhasil dikirim dan langsung muncul di tab Keluhan Security.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengirim keluhan.', 'red');
    }
  };

  const handleRespondSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondTarget) return;
    try {
      appStore.respondComplaintStatus({
        complaintId: respondTarget.id,
        status: rForm.status,
        petugasNama: rForm.petugasNama,
        catatan_tindak_lanjut: rForm.catatan_tindak_lanjut
      });
      setRespondTarget(null);
      notify('Tindak lanjut keluhan warga berhasil disimpan ke Google Sheets.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan tindak lanjut.', 'red');
    }
  };

  const waitingCount = complaints.filter((c) => c.status === 'Menunggu').length;
  const activeCount = complaints.filter((c) => c.status === 'Diproses').length;
  const doneCount = complaints.filter((c) => c.status === 'Selesai').length;

  return (
    <div className="space-y-5">
      <SecurityThreeTabHeader activeTab="keluhan" onNavigate={onNavigate} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Keluhan Warga &amp; Respon Lapangan</h1>
          <p className="text-sm text-muted mt-1">
            {isWarga
              ? 'Sampaikan keluhan keamanan, parkir, lampu jalan, atau lingkungan rumah Anda untuk ditindaklanjuti Security & Pengurus.'
              : 'Daftar laporan keluhan warga Blok G & F beserta status penanganan petugas Security di lapangan.'}
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className="btn btn-primary whitespace-nowrap"
            onClick={() => {
              setCForm((prev) => ({ ...prev, resident_id: defaultReporter }));
              setCreateOpen(true);
            }}
          >
            <MessageSquareWarning size={16} aria-hidden="true" />
            <span>Kirim Keluhan</span>
            <CtaArrowBadge />
          </button>
        )}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Ringkasan status keluhan warga">
        <div className="tile-lavender p-4">
          <div className="text-xs font-semibold">Keluhan Menunggu Respon</div>
          <div className="text-2xl font-bold num mt-1">{waitingCount}</div>
        </div>
        <div className="tile-sky p-4">
          <div className="text-xs font-semibold">Sedang Diproses Lapangan</div>
          <div className="text-2xl font-bold num mt-1">{activeCount}</div>
        </div>
        <div className="tile-mint p-4">
          <div className="text-xs font-semibold">Selesai Ditangani</div>
          <div className="text-2xl font-bold num mt-1">{doneCount}</div>
        </div>
      </section>

      <section className="surface-card overflow-hidden" aria-label="Tabel keluhan warga">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rumah &amp; Tanggal</th>
                <th>Kategori &amp; Prioritas</th>
                <th>Keluhan Warga</th>
                <th>Respon Security / Pengurus</th>
                <th>Status</th>
                {canRespond && <th>Tindakan</th>}
              </tr>
            </thead>
            <tbody>
              {complaints.length === 0 ? (
                <EmptyStateRow
                  colSpan={canRespond ? 6 : 5}
                  text="Belum ada laporan keluhan warga."
                />
              ) : (
                complaints.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="font-bold">{c.no_rumah}</div>
                      <div className="text-xs text-muted">{c.nama_pelapor}</div>
                      <div className="text-xs text-muted num">{formatDate(c.tgl_lapor)}</div>
                    </td>
                    <td>
                      <div className="text-xs font-bold mb-1">{c.kategori}</div>
                      <StatusBadge status={c.prioritas} />
                    </td>
                    <td>
                      <div className="font-bold text-sm">{c.judul}</div>
                      <div className="text-xs text-muted mt-0.5">{c.deskripsi}</div>
                    </td>
                    <td className="text-xs">
                      {c.catatan_tindak_lanjut ? (
                        <div>
                          <div className="font-semibold">{c.ditindaklanjuti_oleh}</div>
                          <div className="text-muted mt-0.5">{c.catatan_tindak_lanjut}</div>
                        </div>
                      ) : (
                        <span className="text-muted">Belum ada catatan respon</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    {canRespond && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact whitespace-nowrap"
                          onClick={() => {
                            setRespondTarget(c);
                            setRForm({
                              status: c.status === 'Menunggu' ? 'Diproses' : 'Selesai',
                              petugasNama:
                                role === 'security'
                                  ? 'Bapak Heru Purnomo'
                                  : session?.displayName || '',
                              catatan_tindak_lanjut: c.catatan_tindak_lanjut
                            });
                          }}
                        >
                          Tindak Lanjuti
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AccessibleModal
        open={createOpen}
        title="Lapor Keluhan Warga"
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="cmp-house">
                Rumah Pelapor
              </label>
              <select
                id="cmp-house"
                aria-label="Rumah Pelapor Keluhan"
                className="input"
                disabled={isWarga}
                value={cForm.resident_id}
                onChange={(e) => setCForm({ ...cForm, resident_id: e.target.value })}
              >
                {minimalHouses.map((hh) => (
                  <option key={hh.resident_id} value={hh.resident_id}>
                    {hh.no_rumah} - {hh.nama_kepala}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="cmp-cat">
                Kategori Keluhan
              </label>
              <select
                id="cmp-cat"
                aria-label="Kategori Keluhan Warga"
                className="input"
                value={cForm.kategori}
                onChange={(e) =>
                  setCForm({ ...cForm, kategori: e.target.value as ComplaintCategory })
                }
              >
                <option value="Keamanan & Pos">Keamanan &amp; Pos</option>
                <option value="Parkir & Akses Jalan">Parkir &amp; Akses Jalan</option>
                <option value="Penerangan & Fasum">Penerangan &amp; Fasum</option>
                <option value="Kebisingan Malam">Kebisingan Malam</option>
                <option value="Kebersihan & Lingkungan">Kebersihan &amp; Lingkungan</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="cmp-prio">
                Tingkat Prioritas
              </label>
              <select
                id="cmp-prio"
                aria-label="Tingkat Prioritas Keluhan"
                className="input"
                value={cForm.prioritas}
                onChange={(e) =>
                  setCForm({ ...cForm, prioritas: e.target.value as 'Normal' | 'Mendesak' })
                }
              >
                <option value="Normal">Normal</option>
                <option value="Mendesak">Mendesak</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="cmp-title">
                Judul Singkat Keluhan
              </label>
              <input
                id="cmp-title"
                aria-label="Judul Singkat Keluhan"
                className="input"
                placeholder="Contoh: Lampu PJU depan G-06 padam"
                value={cForm.judul}
                onChange={(e) => setCForm({ ...cForm, judul: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="cmp-desc">
              Uraian Lokasi &amp; Detail Keluhan
            </label>
            <textarea
              id="cmp-desc"
              aria-label="Uraian Lokasi dan Detail Keluhan"
              className="input"
              placeholder="Jelaskan lokasi blok/nomor rumah dan kondisi yang perlu dicek petugas…"
              value={cForm.deskripsi}
              onChange={(e) => setCForm({ ...cForm, deskripsi: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Kirim Keluhan
            </button>
          </div>
        </form>
      </AccessibleModal>

      <AccessibleModal
        open={Boolean(respondTarget)}
        title={respondTarget ? `Tindak Lanjut Keluhan (${respondTarget.no_rumah})` : 'Tindak Lanjut'}
        onClose={() => setRespondTarget(null)}
      >
        <form onSubmit={handleRespondSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="rsp-status">
                Status Penanganan
              </label>
              <select
                id="rsp-status"
                aria-label="Status Penanganan Keluhan"
                className="input"
                value={rForm.status}
                onChange={(e) => setRForm({ ...rForm, status: e.target.value as ComplaintStatus })}
              >
                <option value="Diproses">Sedang Diproses</option>
                <option value="Selesai">Selesai Ditangani</option>
                <option value="Menunggu">Menunggu</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="rsp-officer">
                Nama Petugas Penindaklanjut
              </label>
              <input
                id="rsp-officer"
                aria-label="Nama Petugas Penindaklanjut"
                className="input"
                value={rForm.petugasNama}
                onChange={(e) => setRForm({ ...rForm, petugasNama: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="rsp-note">
              Catatan Hasil Pengecekan / Tindak Lanjut
            </label>
            <textarea
              id="rsp-note"
              aria-label="Catatan Hasil Pengecekan atau Tindak Lanjut"
              className="input"
              placeholder="Contoh: Sudah dicek ke lokasi pukul 21.15, pengemudi sudah memindahkan kendaraan…"
              value={rForm.catatan_tindak_lanjut}
              onChange={(e) => setRForm({ ...rForm, catatan_tindak_lanjut: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRespondTarget(null)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Simpan Respon
            </button>
          </div>
        </form>
      </AccessibleModal>
    </div>
  );
};

export const SanitationView: React.FC = () => {
  const { session } = useAppStore();
  const { notify } = useToast();
  const role = session?.role;

  const canManage =
    hasPermission(role, 'sanitasi', 'create') && hasPermission(role, 'sanitasi', 'update');
  const rows = appStore.getScopedSanitation();
  const sorted = [...rows].sort((a, b) => b.tgl_jadwal.localeCompare(a.tgl_jadwal));

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SanitationSchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SanitationSchedule | null>(null);
  const [form, setForm] = useState({
    jenis: 'Pembersihan Selokan',
    tgl_jadwal: todayISO(),
    lokasi: 'Blok G & Blok F',
    petugas: '',
    status: 'Terjadwal' as SanitationSchedule['status'],
    catatan: ''
  });

  const openModal = (item: SanitationSchedule | null) => {
    setEditing(item);
    setForm(
      item
        ? {
            jenis: item.jenis,
            tgl_jadwal: item.tgl_jadwal,
            lokasi: item.lokasi,
            petugas: item.petugas,
            status: item.status,
            catatan: item.catatan
          }
        : {
            jenis: 'Pembersihan Selokan',
            tgl_jadwal: todayISO(),
            lokasi: 'Blok G & Blok F',
            petugas: '',
            status: 'Terjadwal',
            catatan: ''
          }
    );
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lokasi.trim() || !form.petugas.trim()) return;
    try {
      appStore.saveSanitationSchedule(form, editing?.id);
      setModalOpen(false);
      notify('Pengumuman jadwal sanitasi berhasil disimpan.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan jadwal sanitasi.', 'red');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {canManage ? 'Kelola Jadwal Sanitasi & Fogging' : 'Pengumuman Sanitasi & Fogging'}
          </h1>
          <p className="text-sm text-muted mt-1">
            {canManage
              ? `Sekretaris menyusun jadwal sanitasi & fogging yang langsung tampil sebagai pengumuman warga ${ORG_SUBTITLE}.`
              : `Pengumuman resmi jadwal pembersihan selokan, kerja bakti, dan fogging pencegahan DBD ${ORG_SUBTITLE} (baca saja).`}
          </p>
        </div>
        {canManage ? (
          <button type="button" className="btn btn-primary" onClick={() => openModal(null)}>
            <Plus size={16} aria-hidden="true" />
            <span>Buat Jadwal Baru</span>
            <CtaArrowBadge />
          </button>
        ) : (
          <span className="status-badge badge-slate">Pengumuman Baca Saja</span>
        )}
      </div>

      <section className="surface-card overflow-hidden" aria-label="Tabel jadwal sanitasi">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kegiatan</th>
                <th>Tanggal</th>
                <th>Lokasi</th>
                <th>Petugas</th>
                <th>Status</th>
                <th>Catatan Pengumuman</th>
                {canManage && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <EmptyStateRow colSpan={canManage ? 7 : 6} text="Belum ada jadwal sanitasi." />
              ) : (
                sorted.map((s) => (
                  <tr key={s.id}>
                    <td className="font-bold">{s.jenis}</td>
                    <td className="num text-xs">{formatDate(s.tgl_jadwal)}</td>
                    <td>{s.lokasi}</td>
                    <td>{s.petugas}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="text-xs text-muted">{s.catatan}</td>
                    {canManage && (
                      <td>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact"
                            onClick={() => openModal(s)}
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-compact"
                            onClick={() => setDeleteTarget(s)}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AccessibleModal
        open={modalOpen}
        title={editing ? 'Ubah Jadwal Sanitasi' : 'Buat Jadwal Sanitasi Baru'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="sn-jenis">
                Jenis Kegiatan
              </label>
              <select
                id="sn-jenis"
                aria-label="Jenis Kegiatan Sanitasi"
                className="input"
                value={form.jenis}
                onChange={(e) => setForm({ ...form, jenis: e.target.value })}
              >
                {[
                  'Pembersihan Selokan',
                  'Fogging DBD',
                  'Kerja Bakti Taman',
                  'Pengangkutan Sampah Besar'
                ].map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="sn-tgl">
                Tanggal Pelaksanaan
              </label>
              <input
                id="sn-tgl"
                aria-label="Tanggal Pelaksanaan Sanitasi"
                type="date"
                className="input num"
                value={form.tgl_jadwal}
                onChange={(e) => setForm({ ...form, tgl_jadwal: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="sn-lok">
                Lokasi Area
              </label>
              <input
                id="sn-lok"
                aria-label="Lokasi Area Sanitasi"
                className="input"
                value={form.lokasi}
                onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="sn-ptg">
                Petugas / Penanggung Jawab
              </label>
              <input
                id="sn-ptg"
                aria-label="Petugas atau Penanggung Jawab Sanitasi"
                className="input"
                value={form.petugas}
                onChange={(e) => setForm({ ...form, petugas: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="sn-st">
                Status
              </label>
              <select
                id="sn-st"
                aria-label="Status Jadwal Sanitasi"
                className="input"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as SanitationSchedule['status'] })
                }
              >
                {(['Terjadwal', 'Selesai', 'Dibatalkan'] as const).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="sn-cat">
              Catatan Pengumuman Warga
            </label>
            <textarea
              id="sn-cat"
              aria-label="Catatan Pengumuman Warga"
              className="input"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Pengumuman
            </button>
          </div>
        </form>
      </AccessibleModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Jadwal Sanitasi"
        message={
          deleteTarget
            ? `Hapus jadwal "${deleteTarget.jenis}" pada ${formatDate(deleteTarget.tgl_jadwal)}?`
            : ''
        }
        confirmLabel="Hapus"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            appStore.deleteSanitationSchedule(deleteTarget.id);
            notify('Jadwal sanitasi dihapus.', 'amber');
          }
        }}
      />
    </div>
  );
};

export const SocialFundView: React.FC = () => {
  const { session, theme } = useAppStore();
  const palette = useChartThemePalette(theme);
  const { notify } = useToast();
  const role = session?.role;

  const canManage =
    hasPermission(role, 'sosial', 'create') && hasPermission(role, 'sosial', 'update');
  const social = appStore.getScopedSocialFund();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SocialFundEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SocialFundEntry | null>(null);

  const categories: SocialFundEntry['tipe'][] = [
    'Donasi Masuk',
    'Kabar Duka',
    'Kabar Sakit',
    'Bantuan Bencana'
  ];

  const [form, setForm] = useState({
    tipe: 'Donasi Masuk' as SocialFundEntry['tipe'],
    nama_terkait: '',
    deskripsi: '',
    nominal: 500000,
    tanggal: todayISO(),
    status: 'Terkumpul' as SocialFundEntry['status']
  });

  const openModal = (item: SocialFundEntry | null) => {
    setEditing(item);
    setForm(
      item
        ? {
            tipe: item.tipe,
            nama_terkait: item.nama_terkait,
            deskripsi: item.deskripsi,
            nominal: item.nominal,
            tanggal: item.tanggal,
            status: item.status
          }
        : {
            tipe: 'Donasi Masuk',
            nama_terkait: '',
            deskripsi: '',
            nominal: 500000,
            tanggal: todayISO(),
            status: 'Terkumpul'
          }
    );
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_terkait.trim() || !form.deskripsi.trim()) return;
    try {
      appStore.saveSocialFundRecord(form, editing?.id);
      setModalOpen(false);
      notify('Catatan Dana Sosial berhasil disimpan.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan Dana Sosial.', 'red');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dana Sosial &amp; Kesetiakawanan Warga</h1>
          <p className="text-sm text-muted mt-1">
            {canManage
              ? 'Bendahara mencatat pemasukan & penyaluran dana sosial; ringkasan total tampil transparan (baca saja) untuk seluruh warga.'
              : 'Ringkasan transparan pemasukan donasi sukarela, santunan duka/sakit, dan saldo dana sosial warga (baca saja).'}
          </p>
        </div>
        {canManage ? (
          <button type="button" className="btn btn-primary" onClick={() => openModal(null)}>
            <Plus size={16} aria-hidden="true" />
            <span>Catat Dana Sosial</span>
            <CtaArrowBadge />
          </button>
        ) : (
          <span className="status-badge badge-slate">Ringkasan Baca Saja</span>
        )}
      </div>

      <section
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
        aria-label="Ringkasan total dana sosial"
      >
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="tile-mint p-5">
            <div className="text-xs font-semibold">Total Donasi Terkumpul</div>
            <div className="text-xl font-bold num mt-1">{formatRupiah(social.totalMasuk)}</div>
          </div>
          <div className="tile-sky p-5">
            <div className="text-xs font-semibold">Total Santunan Disalurkan</div>
            <div className="text-xl font-bold num mt-1">{formatRupiah(social.totalSalur)}</div>
          </div>
          <div className="tile-lavender p-5">
            <div className="text-xs font-semibold">Saldo Dana Sosial Tersedia</div>
            <div className="text-xl font-bold num mt-1">{formatRupiah(social.saldoSosial)}</div>
          </div>
        </div>
        <div className="surface-card p-4 lg:col-span-5">
          <h2 className="text-sm font-bold mb-2">Komposisi per Kategori</h2>
          <ChartCanvas
            ariaLabel="Grafik donat komposisi dana sosial"
            height={160}
            deps={[social.entries.length, social.saldoSosial, theme]}
            configBuilder={() => ({
              type: 'doughnut',
              data: {
                labels: categories,
                datasets: [
                  {
                    data: categories.map((cat) =>
                      social.entries
                        .filter((x) => x.tipe === cat)
                        .reduce((s, x) => s + x.nominal, 0)
                    ),
                    backgroundColor: [palette.olive, palette.petrol, palette.amber, palette.coral],
                    borderWidth: 0
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: palette.ink, boxWidth: 10 } } }
              }
            })}
          />
        </div>
      </section>

      {role !== 'warga' && (
        <section className="surface-card overflow-hidden" aria-label="Rincian catatan dana sosial">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th>Nama Terkait</th>
                  <th>Deskripsi</th>
                  <th>Nominal</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  {canManage && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {social.entries.map((s) => (
                  <tr key={s.id}>
                    <td className="font-bold">{s.tipe}</td>
                    <td>{s.nama_terkait}</td>
                    <td className="text-xs text-muted">{s.deskripsi}</td>
                    <td className="num font-bold">{formatRupiah(s.nominal)}</td>
                    <td className="num text-xs">{formatDate(s.tanggal)}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    {canManage && (
                      <td>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact"
                            onClick={() => openModal(s)}
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-compact"
                            onClick={() => setDeleteTarget(s)}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AccessibleModal
        open={modalOpen}
        title={editing ? 'Ubah Catatan Dana Sosial' : 'Tambah Catatan Dana Sosial'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="soc-tipe">
                Kategori
              </label>
              <select
                id="soc-tipe"
                aria-label="Kategori Dana Sosial"
                className="input"
                value={form.tipe}
                onChange={(e) => setForm({ ...form, tipe: e.target.value as SocialFundEntry['tipe'] })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="soc-st">
                Status
              </label>
              <select
                id="soc-st"
                aria-label="Status Dana Sosial"
                className="input"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as SocialFundEntry['status'] })
                }
              >
                {(['Terkumpul', 'Disalurkan', 'Menunggu'] as const).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="soc-nama">
                Nama Warga / Pihak Terkait
              </label>
              <input
                id="soc-nama"
                aria-label="Nama Warga atau Pihak Terkait"
                className="input"
                value={form.nama_terkait}
                onChange={(e) => setForm({ ...form, nama_terkait: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="soc-nom">
                Nominal (Rp)
              </label>
              <input
                id="soc-nom"
                aria-label="Nominal Dana Sosial Rupiah"
                type="number"
                min={1000}
                step={1000}
                className="input num"
                value={form.nominal}
                onChange={(e) => setForm({ ...form, nominal: Number(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="soc-tgl">
                Tanggal
              </label>
              <input
                id="soc-tgl"
                aria-label="Tanggal Dana Sosial"
                type="date"
                className="input num"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="soc-desc">
              Deskripsi / Keterangan
            </label>
            <textarea
              id="soc-desc"
              aria-label="Deskripsi atau Keterangan Dana Sosial"
              className="input"
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan
            </button>
          </div>
        </form>
      </AccessibleModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Catatan Dana Sosial"
        message={deleteTarget ? `Hapus catatan "${deleteTarget.nama_terkait}"?` : ''}
        confirmLabel="Hapus"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            appStore.deleteSocialFundRecord(deleteTarget.id);
            notify('Catatan dana sosial dihapus.', 'amber');
          }
        }}
      />
    </div>
  );
};
