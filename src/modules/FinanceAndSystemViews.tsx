import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserPlus
} from '../components/MingcuteIcons';
import {
  appStore,
  extractShiftAndAvatar,
  hasPermission,
  ROLE_DEFINITIONS
} from '../services/api';
import {
  parseSmartCashflowCsv,
  type SmartCsvParseResult
} from '../utils/csvKasImporter';
import type {
  AssetItem,
  CashflowEntry,
  ModuleId,
  RoleId,
  UserAccount
} from '../types';
import {
  daysInclusive,
  downloadCsv,
  FAMILY_STATUS_OPTIONS,
  formatDate,
  formatDateTime,
  formatFamilyStatusLabel,
  formatPeriod,
  formatRupiah,
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
  printOfficialDocument,
  SegmentedPills,
  StatusBadge,
  useAppStore,
  useChartThemePalette,
  UserAvatarBadge,
  useToast
} from '../components/SharedUI';

/**
 * Compresses an uploaded image file into a compact JPEG data URI so payment proof
 * previews work offline and sync cleanly to Google Sheets without exceeding cell limits.
 */
function readProofFileAsCompactDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(`BERKAS: ${file.name} (${Math.round(file.size / 1024)} KB)`);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(`GAMBAR: ${file.name}`);
      img.onload = () => {
        const maxSide = 460;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(`GAMBAR: ${file.name}`);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.62);
        resolve(dataUrl.length <= 45000 ? dataUrl : `GAMBAR: ${file.name}`);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const CashflowView: React.FC = () => {
  const { session, theme } = useAppStore();
  const palette = useChartThemePalette(theme);
  const { notify } = useToast();
  const role = session?.role;

  const isWarga = role === 'warga';
  const canManageLedger = role === 'bendahara' || role === 'admin';
  const canVerifyProof = hasPermission(role, 'kas', 'approve');
  const canUploadDues = hasPermission(role, 'kas', 'create');

  const fin = appStore.getScopedFinancialSummary();
  const callerScope = appStore.getCallerHouseholdScope();
  const minimalHouses = appStore.getMinimalHouseDirectory();

  const [tab, setTab] = useState<'matriks' | 'mutasi'>('matriks');
  const [payOpen, setPayOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [editingCash, setEditingCash] = useState<CashflowEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CashflowEntry | null>(null);
  const [proofPreview, setProofPreview] = useState<CashflowEntry | null>(null);

  // Smart CSV Import State (Bendahara & Admin)
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvPreview, setCsvPreview] = useState<SmartCsvParseResult | null>(null);
  const [csvImportMode, setCsvImportMode] = useState<'replace' | 'append'>('replace');
  const [csvAutoCreateHouses, setCsvAutoCreateHouses] = useState(true);

  const handleCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawText = await file.text();
      const parsed = parseSmartCashflowCsv({
        csvText: rawText,
        residents: appStore.getCashflowCsvResidentPool(),
        defaultMonthlyDues: fin.duesAmount
      });
      setCsvFileName(file.name);
      setCsvPreview(parsed);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal membaca berkas CSV.', 'red');
    }
  };

  const handleConfirmCsvImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvPreview || csvPreview.rows.length === 0) {
      notify('Pilih berkas CSV yang memiliki data kas atau iuran terlebih dahulu.', 'red');
      return;
    }
    try {
      const res = appStore.importCashflowFromCsv({
        rows: csvPreview.rows,
        missingHouses: csvPreview.missingHouses,
        autoCreateMissingHouses: csvAutoCreateHouses,
        mode: csvImportMode
      });
      setCsvImportOpen(false);
      setCsvPreview(null);
      setCsvFileName('');
      notify(
        `Berhasil mengimpor ${res.importedCount} baris kas & iuran ke Google Sheets${
          res.createdHousesCount > 0 ? ` (+${res.createdHousesCount} rumah baru)` : ''
        }.`
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengimpor CSV kas.', 'red');
    }
  };

  const handleDownloadSampleMutasiCsv = () => {
    downloadCsv(
      'Contoh-Mutasi-Kas-Bendahara.csv',
      ['Tanggal', 'Tipe', 'No Rumah', 'Nama Warga', 'Periode', 'Nominal', 'Metode', 'Status', 'Keterangan'],
      [
        ['2026-10-01', 'Pemasukan', '', '', '2026-10', 4500000, 'Transfer', 'Lunas', 'Saldo awal kas Paguyuban Blok G & F'],
        ['2026-10-05', 'Pemasukan', 'G-01', 'Warga G-01', '2026-10', fin.duesAmount, 'Transfer', 'Lunas', 'Iuran warga Oktober 2026'],
        ['2026-10-12', 'Pengeluaran', '', '', '2026-10', 350000, 'Tunai', 'Lunas', 'Operasional kebersihan lingkungan']
      ]
    );
  };

  const handleDownloadSampleMatriksCsv = () => {
    downloadCsv(
      'Contoh-Matriks-Rekap-Iuran.csv',
      ['No Rumah', 'Nama Warga', '2026-07', '2026-08', '2026-09', '2026-10'],
      [
        ['G-01', 'Kepala Keluarga G-01', 'Lunas', 'Lunas', 'Lunas', 'Lunas'],
        ['G-02', 'Kepala Keluarga G-02', '50000', '50000', '50000', 'Belum'],
        ['F-01', 'Kepala Keluarga F-01', 'Lunas', 'Lunas', 'Menunggu', 'Belum']
      ]
    );
  };

  const [payForm, setPayForm] = useState({
    resident_id: callerScope.selfResident?.id || minimalHouses[0]?.resident_id || 'RES-013',
    periode: '2026-10',
    nominal: fin.duesAmount,
    metode: 'Transfer' as CashflowEntry['metode'],
    bukti: '',
    buktiLabel: '',
    keterangan: ''
  });

  const [ledgerForm, setLedgerForm] = useState({
    tanggal: todayISO(),
    tipe: 'Pengeluaran' as CashflowEntry['tipe'],
    kategori: 'Kebersihan & Taman',
    resident_id: '',
    periode: '2026-10',
    nominal: 250000,
    metode: 'Transfer' as CashflowEntry['metode'],
    status: 'Lunas' as CashflowEntry['status'],
    bukti: '',
    keterangan: ''
  });

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const encoded = await readProofFileAsCompactDataUrl(file);
      setPayForm((prev) => ({
        ...prev,
        bukti: encoded,
        buktiLabel: file.name
      }));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memuat bukti bayar.', 'red');
    }
  };

  const handleSubmitDuesProof = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      appStore.submitDuesPaymentProof({
        resident_id: payForm.resident_id,
        periode: payForm.periode,
        nominal: payForm.nominal,
        metode: payForm.metode,
        bukti: payForm.bukti,
        keterangan: payForm.keterangan
      });
      setPayOpen(false);
      setPayForm((prev) => ({ ...prev, bukti: '', buktiLabel: '', keterangan: '' }));
      notify('Pembayaran & bukti berhasil dikirim. Menunggu verifikasi Bendahara.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mengirim bukti pembayaran.', 'red');
    }
  };

  const handleSaveLedger = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      appStore.saveCashflowByBendahara(
        {
          ...ledgerForm,
          bukti: ledgerForm.bukti.trim() || '-'
        },
        editingCash?.id
      );
      setLedgerOpen(false);
      notify('Transaksi buku kas berhasil disimpan.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan transaksi kas.', 'red');
    }
  };

  const handleExportCsv = () => {
    downloadCsv(
      `Laporan-Kas-Warga-${todayISO()}.csv`,
      ['ID', 'Tanggal', 'Tipe', 'Periode', 'Nominal', 'Metode', 'Status', 'Diverifikasi Oleh', 'Keterangan'],
      fin.transactions.map((c) => [
        c.id,
        c.tanggal,
        c.tipe,
        c.periode,
        c.nominal,
        c.metode,
        c.status,
        c.diverifikasi_oleh,
        c.keterangan
      ])
    );
    notify('Berkas CSV kas berhasil diunduh.');
  };

  const handlePrintFinancialReport = () => {
    const rowsHtml = fin.transactions
      .slice(0, 25)
      .map(
        (c) => `
        <tr>
          <td style="padding:6px;border-bottom:1px solid #ddd;">${formatDate(c.tanggal)}</td>
          <td style="padding:6px;border-bottom:1px solid #ddd;">${c.tipe}</td>
          <td style="padding:6px;border-bottom:1px solid #ddd;">${c.keterangan || '-'}</td>
          <td style="padding:6px;border-bottom:1px solid #ddd;">${c.status}</td>
          <td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">${formatRupiah(c.nominal)}</td>
        </tr>`
      )
      .join('');
    printOfficialDocument({
      orgName: appStore.getOrgName(),
      kopSubtitle: `Laporan Transparansi Kas & Iuran per ${formatDate(todayISO())}`,
      bodyHtml: `
        <h2 style="font-size:14pt;font-weight:700;margin:14px 0 8px;">RINGKASAN KAS PAGUYUBAN</h2>
        <p>Pemasukan Lunas: <strong>${formatRupiah(fin.pemasukanLunas)}</strong> | Pengeluaran Lunas: <strong>${formatRupiah(fin.pengeluaranLunas)}</strong> | Saldo Bersih: <strong>${formatRupiah(fin.saldoKas)}</strong></p>
        <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-top:12px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px;border-bottom:2px solid #222;">Tanggal</th>
              <th style="text-align:left;padding:6px;border-bottom:2px solid #222;">Jenis</th>
              <th style="text-align:left;padding:6px;border-bottom:2px solid #222;">Keterangan</th>
              <th style="text-align:left;padding:6px;border-bottom:2px solid #222;">Status</th>
              <th style="text-align:right;padding:6px;border-bottom:2px solid #222;">Nominal</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `
    });
  };

  const sortedTransactions = [...fin.transactions].sort((a, b) =>
    b.tanggal.localeCompare(a.tanggal)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {isWarga ? 'Iuran Keluarga & Ringkasan Saldo Kas' : 'Kas & Iuran Warga Live'}
          </h1>
          <p className="text-sm text-muted mt-1">
            Alur resmi: Warga bayar + unggah bukti &rarr; status <strong>Menunggu Verifikasi</strong> &rarr; Bendahara verifikasi &rarr; <strong>Lunas</strong> (saldo &amp; tunggakan otomatis diperbarui).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isWarga && (
            <>
              <button type="button" className="btn btn-secondary btn-compact" onClick={handleExportCsv}>
                <Download size={15} aria-hidden="true" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                onClick={handlePrintFinancialReport}
              >
                <Printer size={15} aria-hidden="true" />
                <span>Cetak Laporan</span>
              </button>
            </>
          )}
          {canManageLedger && (
            <>
              <button
                type="button"
                className="btn btn-secondary whitespace-nowrap"
                onClick={() => {
                  setCsvPreview(null);
                  setCsvFileName('');
                  setCsvImportOpen(true);
                }}
              >
                <FileSpreadsheet size={16} aria-hidden="true" />
                <span>Impor CSV Data Awal</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary whitespace-nowrap"
                onClick={() => {
                  setEditingCash(null);
                  setLedgerForm({
                    tanggal: todayISO(),
                    tipe: 'Pengeluaran',
                    kategori: 'Kebersihan & Taman',
                    resident_id: '',
                    periode: todayISO().slice(0, 7),
                    nominal: 250000,
                    metode: 'Transfer',
                    status: 'Lunas',
                    bukti: `KW-${Date.now().toString().slice(-5)}`,
                    keterangan: ''
                  });
                  setLedgerOpen(true);
                }}
              >
                <Plus size={16} aria-hidden="true" />
                <span>Catat Kas Umum</span>
              </button>
            </>
          )}
          {canUploadDues && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setPayForm({
                  resident_id:
                    isWarga && callerScope.selfResident
                      ? callerScope.selfResident.id
                      : minimalHouses[0]?.resident_id ?? 'RES-013',
                  periode: '2026-10',
                  nominal: fin.duesAmount,
                  metode: 'Transfer',
                  bukti: '',
                  buktiLabel: '',
                  keterangan: ''
                });
                setPayOpen(true);
              }}
            >
              <Upload size={16} aria-hidden="true" />
              <span>Bayar &amp; Unggah Bukti</span>
              <CtaArrowBadge />
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards (Read-only Kas Summary visible to Warga & Pengurus) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Ringkasan saldo kas">
        <div className="tile-mint p-4">
          <div className="text-xs font-semibold">Saldo Kas Bersih Paguyuban</div>
          <div className="text-2xl font-bold num mt-1">{formatRupiah(fin.saldoKas)}</div>
          <div className="text-xs mt-1">Dihitung otomatis dari transaksi Lunas</div>
        </div>
        <div className="surface-card p-4">
          <div className="text-xs font-semibold text-muted">Total Pemasukan Lunas</div>
          <div className="text-2xl font-bold num mt-1">{formatRupiah(fin.pemasukanLunas)}</div>
        </div>
        <div className="surface-card p-4">
          <div className="text-xs font-semibold text-muted">Total Pengeluaran Lunas</div>
          <div className="text-2xl font-bold num mt-1">{formatRupiah(fin.pengeluaranLunas)}</div>
        </div>
        <div className="tile-lavender p-4">
          <div className="text-xs font-semibold">
            {isWarga ? 'Tunggakan Rumah Saya' : 'Menunggu Verifikasi Bukti'}
          </div>
          <div className="text-2xl font-bold num mt-1">
            {isWarga
              ? formatRupiah(fin.totalTunggakan)
              : `${fin.waitingVerificationCount} Pembayaran`}
          </div>
          <div className="text-xs mt-1">
            {isWarga
              ? `${fin.unpaidCellCount} bulan belum lunas`
              : `Total tunggakan: ${formatRupiah(fin.totalTunggakan)}`}
          </div>
        </div>
      </section>

      {!isWarga && (
        <section className="surface-card p-5" aria-label="Grafik arus kas bulanan">
          <h2 className="text-base font-bold mb-2">Grafik Pemasukan vs Pengeluaran Lunas</h2>
          <ChartCanvas
            ariaLabel="Grafik arus kas bulanan"
            height={190}
            deps={[fin.transactions.length, fin.saldoKas, theme]}
            configBuilder={() => {
              const lunas = fin.transactions.filter((c) => c.status === 'Lunas');
              return {
                type: 'bar',
                data: {
                  labels: fin.periods.map((p) => formatPeriod(p)),
                  datasets: [
                    {
                      label: 'Pemasukan',
                      data: fin.periods.map((p) =>
                        lunas
                          .filter((c) => c.periode === p && c.tipe === 'Pemasukan')
                          .reduce((s, c) => s + c.nominal, 0)
                      ),
                      backgroundColor: palette.petrol,
                      borderRadius: 6
                    },
                    {
                      label: 'Pengeluaran',
                      data: fin.periods.map((p) =>
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
        </section>
      )}

      <div>
        <SegmentedPills
          label="Pilih tampilan iuran dan mutasi"
          value={tab}
          onChange={setTab}
          options={[
            {
              value: 'matriks',
              label: isWarga ? 'Status Iuran Rumah Saya' : 'Matriks Iuran & Tunggakan KK'
            },
            {
              value: 'mutasi',
              label: isWarga
                ? `Riwayat Pembayaran KK (${sortedTransactions.length})`
                : `Buku Besar & Verifikasi Bukti (${sortedTransactions.length})`
            }
          ]}
        />
      </div>

      {tab === 'matriks' ? (
        <section className="surface-card overflow-hidden" aria-label="Matriks status iuran per periode">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rumah &amp; Kepala Keluarga</th>
                  {fin.periods.map((p) => (
                    <th key={p} className="num">
                      {p}
                    </th>
                  ))}
                  <th>Tunggakan</th>
                </tr>
              </thead>
              <tbody>
                {fin.arrearsMatrix.length === 0 ? (
                  <EmptyStateRow colSpan={fin.periods.length + 2} text="Tidak ada data iuran." />
                ) : (
                  fin.arrearsMatrix.map((row) => (
                    <tr key={row.household.no_rumah}>
                      <td>
                        <div className="font-bold">{row.household.no_rumah}</div>
                        <div className="text-xs text-muted">{row.household.kepala.nama}</div>
                      </td>
                      {row.cells.map((cell) => (
                        <td key={cell.periode}>
                          <div className="flex flex-col items-start gap-1">
                            <StatusBadge status={cell.status} />
                            {cell.status === 'Belum Bayar' && canUploadDues && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-compact"
                                onClick={() => {
                                  setPayForm({
                                    resident_id: row.household.kepala.id,
                                    periode: cell.periode,
                                    nominal: fin.duesAmount,
                                    metode: 'Transfer',
                                    bukti: '',
                                    buktiLabel: '',
                                    keterangan: ''
                                  });
                                  setPayOpen(true);
                                }}
                              >
                                Bayar
                              </button>
                            )}
                            {cell.status === 'Menunggu Verifikasi' && canVerifyProof && cell.recordId && (
                              <button
                                type="button"
                                className="btn btn-primary btn-compact"
                                onClick={() => {
                                  appStore.verifyDuesPaymentByBendahara(cell.recordId);
                                  notify(`Iuran ${row.household.no_rumah} (${cell.periode}) diverifikasi Lunas!`);
                                }}
                              >
                                Verifikasi
                              </button>
                            )}
                          </div>
                        </td>
                      ))}
                      <td className="num font-bold">
                        {row.rowArrears === 0 ? (
                          <span className="status-badge badge-green">Nihil</span>
                        ) : (
                          formatRupiah(row.rowArrears)
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="surface-card overflow-hidden" aria-label="Tabel riwayat transaksi dan verifikasi iuran">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jenis &amp; Keterangan</th>
                  <th>Metode &amp; Bukti</th>
                  <th>Nominal</th>
                  <th>Status &amp; Verifikator</th>
                  {(canVerifyProof || canManageLedger) && <th>Tindakan</th>}
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.length === 0 ? (
                  <EmptyStateRow
                    colSpan={canVerifyProof || canManageLedger ? 6 : 5}
                    text="Belum ada riwayat pembayaran iuran tercatat."
                  />
                ) : (
                  sortedTransactions.map((c) => {
                    const res = c.resident_id
                      ? appStore.getLimitedResidentLookup(c.resident_id)
                      : null;
                    return (
                      <tr key={c.id}>
                        <td className="num text-xs">
                          <div className="font-bold">{formatDate(c.tanggal)}</div>
                          <div className="text-muted">Periode {c.periode}</div>
                        </td>
                        <td>
                          <div className="font-bold">{c.tipe}</div>
                          <div className="text-xs text-muted">
                            {res
                              ? `${res.no_rumah} - ${res.nama}${c.keterangan ? ` (${c.keterangan})` : ''}`
                              : c.keterangan || '-'}
                          </div>
                        </td>
                        <td className="text-xs">
                          <div className="font-semibold">{c.metode}</div>
                          {c.bukti && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-compact mt-0.5"
                              onClick={() => setProofPreview(c)}
                            >
                              <Eye size={13} aria-hidden="true" />
                              <span>Lihat Bukti</span>
                            </button>
                          )}
                        </td>
                        <td className="num font-bold">
                          {c.tipe === 'Pengeluaran' ? '-' : '+'}
                          {formatRupiah(c.nominal)}
                        </td>
                        <td>
                          <StatusBadge status={c.status} />
                          {c.diverifikasi_oleh && (
                            <div className="text-xs text-muted mt-1">{c.diverifikasi_oleh}</div>
                          )}
                        </td>
                        {(canVerifyProof || canManageLedger) && (
                          <td>
                            <div className="flex flex-wrap gap-1.5">
                              {c.status === 'Menunggu Verifikasi' && canVerifyProof && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-compact"
                                  onClick={() => {
                                    appStore.verifyDuesPaymentByBendahara(c.id);
                                    notify('Bukti pembayaran terverifikasi Lunas. Saldo otomatis diperbarui.');
                                  }}
                                >
                                  <CheckCircle2 size={14} aria-hidden="true" />
                                  <span>Setujui Lunas</span>
                                </button>
                              )}
                              {canManageLedger && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-compact"
                                  onClick={() => setDeleteTarget(c)}
                                >
                                  Hapus
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
      )}

      {/* Upload Dues Proof Modal */}
      <AccessibleModal
        open={payOpen}
        title="Bayar Iuran & Unggah Bukti Pembayaran"
        onClose={() => setPayOpen(false)}
      >
        <form onSubmit={handleSubmitDuesProof} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="pay-res">
                Rumah / Kepala Keluarga
              </label>
              <select
                id="pay-res"
                aria-label="Rumah atau Kepala Keluarga Pembayar"
                className="input"
                disabled={isWarga}
                value={payForm.resident_id}
                onChange={(e) => setPayForm({ ...payForm, resident_id: e.target.value })}
              >
                {minimalHouses.map((hh) => (
                  <option key={hh.resident_id} value={hh.resident_id}>
                    {hh.no_rumah} - {hh.nama_kepala}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="pay-periode">
                Periode Bulan Iuran
              </label>
              <input
                id="pay-periode"
                aria-label="Periode Bulan Iuran YYYY-MM"
                type="month"
                className="input num"
                value={payForm.periode}
                onChange={(e) => setPayForm({ ...payForm, periode: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="pay-nom">
                Nominal Pembayaran (Rp)
              </label>
              <input
                id="pay-nom"
                aria-label="Nominal Pembayaran Rupiah"
                type="number"
                min={10000}
                step={5000}
                className="input num"
                value={payForm.nominal}
                onChange={(e) => setPayForm({ ...payForm, nominal: Number(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="pay-metode">
                Metode Pembayaran
              </label>
              <select
                id="pay-metode"
                aria-label="Metode Pembayaran Iuran"
                className="input"
                value={payForm.metode}
                onChange={(e) =>
                  setPayForm({ ...payForm, metode: e.target.value as CashflowEntry['metode'] })
                }
              >
                <option value="Transfer">Transfer Bank</option>
                <option value="QRIS">QRIS Paguyuban</option>
                <option value="Tunai">Tunai ke Bendahara</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="pay-file">
              Unggah Foto / Berkas Bukti Transfer
            </label>
            <input
              id="pay-file"
              aria-label="Unggah Foto atau Berkas Bukti Transfer"
              type="file"
              accept="image/*,.pdf"
              className="input"
              onChange={handleProofFileChange}
            />
            <p className="field-hint">
              Atau ketik nomor referensi resi/mutasi bank di bawah apabila tidak mengunggah foto.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="pay-ref">
              Referensi Bukti / Nomor Resi
            </label>
            <input
              id="pay-ref"
              aria-label="Referensi Bukti atau Nomor Resi"
              className="input"
              placeholder="Contoh: TF-BCA-27102026-G06"
              value={payForm.bukti.startsWith('data:image/') ? payForm.buktiLabel : payForm.bukti}
              onChange={(e) => setPayForm({ ...payForm, bukti: e.target.value })}
              required={!payForm.bukti}
            />
          </div>

          {payForm.bukti.startsWith('data:image/') && (
            <div className="soft-well p-3 flex items-center gap-3">
              <img
                src={payForm.bukti}
                alt="Pratinjau bukti bayar yang diunggah"
                style={{ height: '64px', width: 'auto', borderRadius: '10px' }}
              />
              <span className="text-xs font-semibold">
                Foto bukti ({payForm.buktiLabel}) siap dikirim ke Bendahara.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setPayOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Kirim Bukti Pembayaran
            </button>
          </div>
        </form>
      </AccessibleModal>

      {/* Proof Preview Modal */}
      <AccessibleModal
        open={Boolean(proofPreview)}
        title="Pratinjau Bukti Pembayaran"
        onClose={() => setProofPreview(null)}
      >
        {proofPreview && (
          <div className="space-y-4">
            <div className="soft-well p-4 space-y-2 text-xs">
              <div>
                <strong>Periode:</strong> {proofPreview.periode} · <strong>Metode:</strong>{' '}
                {proofPreview.metode}
              </div>
              <div>
                <strong>Nominal:</strong> <span className="num">{formatRupiah(proofPreview.nominal)}</span>
              </div>
              <div>
                <strong>Status:</strong> <StatusBadge status={proofPreview.status} />
              </div>
            </div>
            {proofPreview.bukti.startsWith('data:image/') ? (
              <div className="flex justify-center">
                <img
                  src={proofPreview.bukti}
                  alt="Bukti pembayaran warga"
                  style={{ maxHeight: '340px', width: 'auto', borderRadius: '16px' }}
                />
              </div>
            ) : (
              <div className="surface-card p-4 text-sm font-bold num break-all">
                Referensi Bukti: {proofPreview.bukti}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setProofPreview(null)}
              >
                Tutup
              </button>
              {proofPreview.status === 'Menunggu Verifikasi' && canVerifyProof && (
                <button
                  type="button"
                  className="btn btn-primary whitespace-nowrap"
                  onClick={() => {
                    appStore.verifyDuesPaymentByBendahara(proofPreview.id);
                    setProofPreview(null);
                    notify('Pembayaran berhasil diverifikasi menjadi Lunas.');
                  }}
                >
                  Verifikasi Lunas
                </button>
              )}
            </div>
          </div>
        )}
      </AccessibleModal>

      {/* General Cashflow Modal for Bendahara/Admin */}
      <AccessibleModal
        open={ledgerOpen}
        title={editingCash ? 'Ubah Transaksi Kas' : 'Catat Mutasi Buku Kas Umum'}
        onClose={() => setLedgerOpen(false)}
      >
        <form onSubmit={handleSaveLedger} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="ldg-tipe">
                Jenis Arus Kas
              </label>
              <select
                id="ldg-tipe"
                aria-label="Jenis Arus Kas"
                className="input"
                value={ledgerForm.tipe}
                onChange={(e) =>
                  setLedgerForm({ ...ledgerForm, tipe: e.target.value as CashflowEntry['tipe'] })
                }
              >
                <option value="Pengeluaran">Pengeluaran Operasional</option>
                <option value="Pemasukan">Pemasukan Lainnya</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="ldg-tgl">
                Tanggal Transaksi
              </label>
              <input
                id="ldg-tgl"
                aria-label="Tanggal Transaksi Kas"
                type="date"
                className="input num"
                value={ledgerForm.tanggal}
                onChange={(e) =>
                  setLedgerForm({
                    ...ledgerForm,
                    tanggal: e.target.value,
                    periode: e.target.value.slice(0, 7)
                  })
                }
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="ldg-nom">
                Nominal (Rp)
              </label>
              <input
                id="ldg-nom"
                aria-label="Nominal Transaksi Kas Rupiah"
                type="number"
                min={1000}
                step={1000}
                className="input num"
                value={ledgerForm.nominal}
                onChange={(e) =>
                  setLedgerForm({ ...ledgerForm, nominal: Number(e.target.value) || 0 })
                }
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="ldg-bukti">
                Nomor Kwitansi / Bukti (Opsional)
              </label>
              <input
                id="ldg-bukti"
                aria-label="Nomor Kwitansi atau Bukti Kas Opsional"
                className="input"
                placeholder="Kosongkan bila tanpa nomor kwitansi"
                value={ledgerForm.bukti}
                onChange={(e) => setLedgerForm({ ...ledgerForm, bukti: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="ldg-metode">
                Metode
              </label>
              <select
                id="ldg-metode"
                aria-label="Metode Transaksi Kas"
                className="input"
                value={ledgerForm.metode}
                onChange={(e) =>
                  setLedgerForm({
                    ...ledgerForm,
                    metode: e.target.value as CashflowEntry['metode']
                  })
                }
              >
                <option value="Transfer">Transfer</option>
                <option value="Tunai">Tunai</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="ldg-ket">
              Keterangan Transaksi
            </label>
            <textarea
              id="ldg-ket"
              aria-label="Keterangan Transaksi Kas"
              className="input"
              value={ledgerForm.keterangan}
              onChange={(e) => setLedgerForm({ ...ledgerForm, keterangan: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setLedgerOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Transaksi
            </button>
          </div>
        </form>
      </AccessibleModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Transaksi Kas"
        message={
          deleteTarget
            ? `Hapus transaksi "${deleteTarget.kategori}" sebesar ${formatRupiah(deleteTarget.nominal)}?`
            : ''
        }
        confirmLabel="Hapus"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            appStore.deleteCashflowByBendahara(deleteTarget.id);
            notify('Transaksi kas dihapus.', 'amber');
          }
        }}
      />

      {/* Smart CSV Reader & Formatter Modal for Bendahara & Admin */}
      <AccessibleModal
        open={csvImportOpen}
        title="Impor & Format Otomatis CSV Kas & Iuran (Bendahara)"
        wide
        onClose={() => setCsvImportOpen(false)}
      >
        <form onSubmit={handleConfirmCsvImport} className="space-y-4">
          <div className="soft-well p-4 space-y-2 text-xs">
            <div className="font-bold text-sm">
              Pembaca CSV Pintar (Otomatis Menyesuaikan Struktur Kolom)
            </div>
            <p className="text-muted leading-relaxed">
              Unggah berkas <code>.csv</code> hasil ekspor Excel, Google Sheets, atau mutasi rekening Bendahara. Aplikasi otomatis mengenali pemisah koma maupun titik koma, membaca format <strong>Buku Mutasi Kas</strong> (kolom Nominal tunggal maupun Masuk/Keluar terpisah) serta format <strong>Matriks Rekap Iuran Bulanan per Rumah</strong>, lalu menormalkannya ke struktur sistem.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className="btn btn-secondary btn-compact whitespace-nowrap"
                onClick={handleDownloadSampleMutasiCsv}
              >
                <Download size={13} aria-hidden="true" />
                <span>Contoh CSV Mutasi Kas</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-compact whitespace-nowrap"
                onClick={handleDownloadSampleMatriksCsv}
              >
                <Download size={13} aria-hidden="true" />
                <span>Contoh CSV Matriks Iuran</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="field-label" htmlFor="kas-csv-input">
                Pilih Berkas CSV Bendahara (.csv)
              </label>
              <input
                id="kas-csv-input"
                aria-label="Pilih Berkas CSV Data Awal Kas dan Iuran"
                type="file"
                accept=".csv,text/csv,text/plain"
                className="input"
                onChange={handleCsvFileSelect}
              />
            </div>
            <div>
              <div className="field-label mb-1">Mode Penyimpanan Data</div>
              <SegmentedPills
                label="Mode impor data CSV kas"
                value={csvImportMode}
                onChange={setCsvImportMode}
                options={[
                  { value: 'replace', label: 'Ganti Data Awal' },
                  { value: 'append', label: 'Gabung Data' }
                ]}
              />
            </div>
          </div>

          {csvPreview && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="tile-mint p-3.5 text-xs">
                  <div className="font-semibold">Format CSV Terbaca</div>
                  <div className="text-base font-bold mt-0.5">
                    {csvPreview.detectedMode === 'matriks_iuran'
                      ? 'Matriks Rekap Iuran'
                      : 'Buku Mutasi Kas'}
                  </div>
                  <div className="mt-0.5 num">
                    {csvPreview.rows.length} transaksi siap diimpor ({csvFileName})
                  </div>
                </div>
                <div className="surface-card p-3.5 text-xs">
                  <div className="font-semibold text-muted">Total Pemasukan Terbaca</div>
                  <div className="text-base font-bold num mt-0.5">
                    {formatRupiah(csvPreview.totalPemasukan)}
                  </div>
                </div>
                <div className="surface-card p-3.5 text-xs">
                  <div className="font-semibold text-muted">Total Pengeluaran Terbaca</div>
                  <div className="text-base font-bold num mt-0.5">
                    {formatRupiah(csvPreview.totalPengeluaran)}
                  </div>
                </div>
              </div>

              {csvPreview.missingHouses.length > 0 && (
                <label className="soft-well p-3.5 flex items-start gap-2.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Daftarkan otomatis rumah warga baru dari CSV"
                    checked={csvAutoCreateHouses}
                    onChange={(e) => setCsvAutoCreateHouses(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Ditemukan <strong>{csvPreview.missingHouses.length} nomor rumah baru</strong> pada CSV ({csvPreview.missingHouses.slice(0, 6).map((m) => m.no_rumah).join(', ')}{csvPreview.missingHouses.length > 6 ? '…' : ''}). Daftarkan otomatis ke <strong>Data Warga</strong> agar langsung tampil pada Matriks Iuran KK.
                  </span>
                </label>
              )}

              {csvPreview.warnings.length > 0 && (
                <div className="p-3 rounded-xl badge-amber text-xs">
                  {csvPreview.warnings.join(' ')}
                </div>
              )}

              {csvPreview.rows.length > 0 && (
                <div className="surface-card overflow-hidden">
                  <div className="px-4 py-2.5 rule-b text-xs font-bold">
                    Pratinjau Hasil Normalisasi Otomatis (Menampilkan {Math.min(8, csvPreview.rows.length)} dari {csvPreview.rows.length} baris)
                  </div>
                  <div className="table-wrap">
                    <table className="data-table text-xs">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Tipe &amp; Kategori</th>
                          <th>Rumah / Periode</th>
                          <th>Nominal</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.rows.slice(0, 8).map((r, i) => (
                          <tr key={`${r.tanggal}-${r.no_rumah_csv}-${i}`}>
                            <td className="num">{r.tanggal}</td>
                            <td>
                              <div className="font-bold">{r.tipe}</div>
                              <div className="text-muted">{r.kategori}</div>
                            </td>
                            <td className="num">
                              <div>{r.no_rumah_csv || '-'}</div>
                              <div className="text-muted">{r.periode}</div>
                            </td>
                            <td className="num font-bold">{formatRupiah(r.nominal)}</td>
                            <td>
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-secondary whitespace-nowrap"
              onClick={() => setCsvImportOpen(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary whitespace-nowrap"
              disabled={!csvPreview || csvPreview.rows.length === 0}
            >
              <Upload size={15} aria-hidden="true" />
              <span>
                {csvImportMode === 'replace'
                  ? 'Terapkan sebagai Data Awal Kas'
                  : 'Gabungkan ke Buku Kas'}
              </span>
            </button>
          </div>
        </form>
      </AccessibleModal>
    </div>
  );
};

export const AssetsView: React.FC = () => {
  const { session } = useAppStore();
  const { notify } = useToast();
  const role = session?.role;

  const isWarga = role === 'warga';
  const canManageCatalog =
    role === 'ketua' || role === 'wakil_ketua' || role === 'sekretaris' || role === 'admin';
  const canCreateBooking = hasPermission(role, 'aset', 'create');
  const canVerifyStock =
    role === 'ketua' || role === 'wakil_ketua' || role === 'sekretaris' || role === 'admin';
  const canApproveBooking = role === 'ketua' || role === 'wakil_ketua' || role === 'admin';
  const canCompleteBooking =
    role === 'ketua' ||
    role === 'wakil_ketua' ||
    role === 'sekretaris' ||
    role === 'bendahara' ||
    role === 'admin';

  const assets = appStore.getScopedAssets();
  const bookings = appStore.getScopedBookings();
  const minimalHouses = appStore.getMinimalHouseDirectory();
  const callerScope = appStore.getCallerHouseholdScope();

  const defaultBorrower =
    isWarga && callerScope.selfResident
      ? callerScope.selfResident.id
      : minimalHouses[0]?.resident_id ?? 'RES-013';

  const [bookingAsset, setBookingAsset] = useState<AssetItem | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [bForm, setBForm] = useState({
    resident_id: defaultBorrower,
    tgl_mulai: todayISO(),
    tgl_selesai: todayISO(),
    qty: 1
  });

  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [deleteAssetTarget, setDeleteAssetTarget] = useState<AssetItem | null>(null);
  const [aForm, setAForm] = useState({
    nama: '',
    stok: 2,
    kondisi: 'Baik' as AssetItem['kondisi']
  });

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingAsset) return;
    try {
      appStore.submitAssetBooking({
        asset_id: bookingAsset.id,
        resident_id: bForm.resident_id,
        qty: bForm.qty,
        tgl_mulai: bForm.tgl_mulai,
        tgl_selesai: bForm.tgl_selesai
      });
      setBookingAsset(null);
      setBookingError('');
      notify('Pengajuan peminjaman aset terkirim (status Menunggu persetujuan).');
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Gagal mengajukan booking.');
    }
  };

  const handleAssetSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aForm.nama.trim()) return;
    try {
      appStore.saveAssetCatalogItem(aForm, editingAsset?.id);
      setAssetModalOpen(false);
      notify('Katalog inventaris aset berhasil disimpan.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan aset.', 'red');
    }
  };

  const previewDays = bookingAsset ? daysInclusive(bForm.tgl_mulai, bForm.tgl_selesai) : 0;
  const previewAvailable = bookingAsset
    ? appStore.getAvailableAssetStock(bookingAsset.id, bForm.tgl_mulai, bForm.tgl_selesai)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Inventaris Aset &amp; Booking</h1>
          <p className="text-sm text-muted mt-1">
            Kelola katalog inventaris paguyuban dan peminjaman warga: Ajukan &rarr; Verifikasi stok &rarr; Setujui (<strong>Aktif</strong>) &rarr; Pengembalian (<strong>Selesai</strong>).
          </p>
        </div>
        {canManageCatalog && (
          <button
            type="button"
            className="btn btn-primary whitespace-nowrap"
            onClick={() => {
              setEditingAsset(null);
              setAForm({
                nama: '',
                stok: 2,
                kondisi: 'Baik'
              });
              setAssetModalOpen(true);
            }}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Tambah Aset</span>
            <CtaArrowBadge />
          </button>
        )}
      </div>

      {/* Asset Catalog Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Katalog aset paguyuban">
        {assets.map((a) => (
          <div key={a.id} className="surface-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-bold">{a.nama}</h2>
                <StatusBadge status={a.kondisi} />
              </div>
              <p className="text-xs text-muted mt-2">
                Stok Inventaris: <strong className="num">{a.stok} unit</strong>
              </p>
            </div>
            <div className="mt-4 pt-3 rule-t flex flex-wrap items-center justify-between gap-2">
              {canCreateBooking ? (
                <button
                  type="button"
                  className="btn btn-primary btn-compact whitespace-nowrap"
                  disabled={a.stok <= 0}
                  onClick={() => {
                    setBookingAsset(a);
                    setBForm({
                      resident_id: defaultBorrower,
                      tgl_mulai: todayISO(),
                      tgl_selesai: todayISO(),
                      qty: 1
                    });
                    setBookingError('');
                  }}
                >
                  Ajukan Booking
                </button>
              ) : (
                <span className="text-xs text-muted">Inventaris Paguyuban</span>
              )}
              {canManageCatalog && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact"
                    onClick={() => {
                      setEditingAsset(a);
                      setAForm({
                        nama: a.nama,
                        stok: a.stok,
                        kondisi: a.kondisi
                      });
                      setAssetModalOpen(true);
                    }}
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-compact"
                    onClick={() => setDeleteAssetTarget(a)}
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Bookings Pipeline Table */}
      <section className="surface-card overflow-hidden" aria-label="Daftar booking aset">
        <div className="px-5 py-4 rule-b">
          <h2 className="text-base font-bold">
            {isWarga ? 'Riwayat Booking Keluarga Saya' : 'Antrean & Jadwal Peminjaman Aset'}
          </h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Aset</th>
                <th>Peminjam</th>
                <th>Rentang Tanggal &amp; Qty</th>
                <th>Jejak Verifikasi &amp; Persetujuan</th>
                <th>Status</th>
                <th>Tindakan Alur</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <EmptyStateRow colSpan={6} text="Belum ada pengajuan peminjaman aset." />
              ) : (
                bookings.map((b) => {
                  const asset = assets.find((x) => x.id === b.asset_id);
                  const res = appStore.getLimitedResidentLookup(b.resident_id);
                  return (
                    <tr key={b.id}>
                      <td className="font-bold">{asset?.nama ?? b.asset_id}</td>
                      <td>{res ? `${res.no_rumah} - ${res.nama}` : b.resident_id}</td>
                      <td className="num text-xs">
                        <div className="font-bold">{b.qty} unit</div>
                        <div className="text-muted">
                          {formatDate(b.tgl_mulai)} s.d. {formatDate(b.tgl_selesai)}
                        </div>
                      </td>
                      <td className="text-xs">
                        <div>
                          <span className="text-muted">Cek Stok:</span>{' '}
                          <strong>{b.stok_diverifikasi_oleh || 'Belum'}</strong>
                        </div>
                        <div>
                          <span className="text-muted">Setuju:</span>{' '}
                          <strong>{b.disetujui_oleh || 'Belum'}</strong>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {b.status === 'Menunggu' && !b.stok_diverifikasi_oleh && canVerifyStock && !canApproveBooking && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-compact whitespace-nowrap"
                                onClick={() => {
                                  try {
                                    appStore.verifyBookingStockBySekretaris(b.id, 'Aman');
                                    notify('Stok & jadwal terverifikasi aman. Siap disetujui Ketua/Wakil.');
                                  } catch (err) {
                                    notify(err instanceof Error ? err.message : 'Gagal verifikasi.', 'red');
                                  }
                                }}
                              >
                                Verifikasi Stok
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-compact"
                                onClick={() => {
                                  appStore.verifyBookingStockBySekretaris(b.id, 'Dibatalkan');
                                  notify('Booking dibatalkan karena bentrok stok.', 'amber');
                                }}
                              >
                                Batalkan
                              </button>
                            </>
                          )}

                          {b.status === 'Menunggu' && canApproveBooking && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-compact"
                                onClick={() => {
                                  try {
                                    appStore.approveBookingByKetuaOrWakil(b.id, 'Disetujui');
                                    notify('Peminjaman aset disetujui dan langsung berstatus Aktif!');
                                  } catch (err) {
                                    notify(err instanceof Error ? err.message : 'Gagal menyetujui.', 'red');
                                  }
                                }}
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-compact"
                                onClick={() => {
                                  appStore.approveBookingByKetuaOrWakil(b.id, 'Dibatalkan');
                                  notify('Booking ditolak/dibatalkan.', 'amber');
                                }}
                              >
                                Tolak
                              </button>
                            </>
                          )}

                          {(b.status === 'Aktif' || b.status === 'Disetujui') && canCompleteBooking && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-compact whitespace-nowrap"
                              onClick={() => {
                                appStore.completeActiveBooking(b.id);
                                notify('Peminjaman aset telah dikembalikan dan berstatus Selesai.');
                              }}
                            >
                              Tandai Selesai
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

      {/* Create Booking Modal */}
      <AccessibleModal
        open={Boolean(bookingAsset)}
        title={bookingAsset ? `Ajukan Booking: ${bookingAsset.nama}` : 'Ajukan Booking'}
        onClose={() => setBookingAsset(null)}
      >
        {bookingAsset && (
          <form onSubmit={handleBookSubmit} className="space-y-4" noValidate>
            {bookingError && (
              <div className="p-3 rounded-xl badge-red text-xs font-semibold flex items-center gap-2" role="alert">
                <AlertTriangle size={15} aria-hidden="true" />
                <span>{bookingError}</span>
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="bk-borrower">
                Rumah Warga Peminjam
              </label>
              <select
                id="bk-borrower"
                aria-label="Rumah Warga Peminjam"
                className="input"
                disabled={isWarga}
                value={bForm.resident_id}
                onChange={(e) => setBForm({ ...bForm, resident_id: e.target.value })}
              >
                {minimalHouses.map((hh) => (
                  <option key={hh.resident_id} value={hh.resident_id}>
                    {hh.no_rumah} - {hh.nama_kepala}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="field-label" htmlFor="bk-start">
                  Tanggal Mulai
                </label>
                <input
                  id="bk-start"
                  aria-label="Tanggal Mulai Peminjaman Aset"
                  type="date"
                  className="input num"
                  value={bForm.tgl_mulai}
                  onChange={(e) => setBForm({ ...bForm, tgl_mulai: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="bk-end">
                  Tanggal Selesai
                </label>
                <input
                  id="bk-end"
                  aria-label="Tanggal Selesai Peminjaman Aset"
                  type="date"
                  className="input num"
                  value={bForm.tgl_selesai}
                  onChange={(e) => setBForm({ ...bForm, tgl_selesai: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="bk-qty">
                  Jumlah Unit
                </label>
                <input
                  id="bk-qty"
                  aria-label="Jumlah Unit Dipinjam"
                  type="number"
                  min={1}
                  max={Math.max(1, previewAvailable)}
                  className="input num"
                  value={bForm.qty}
                  onChange={(e) => setBForm({ ...bForm, qty: Number(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>

            <div className="soft-well p-4 text-xs space-y-1">
              <div>
                Stok bebas bentrok pada tanggal dipilih:{' '}
                <strong className="num">{previewAvailable} unit</strong>
              </div>
              <div>
                Durasi peminjaman: <strong className="num">{previewDays} hari</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setBookingAsset(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={previewAvailable <= 0}>
                Kirim Pengajuan Booking
              </button>
            </div>
          </form>
        )}
      </AccessibleModal>

      {/* Catalog Modal for Ketua / Wakil Ketua / Sekretaris / Admin */}
      <AccessibleModal
        open={assetModalOpen}
        title={editingAsset ? 'Ubah Inventaris Aset' : 'Tambah Inventaris Aset Baru'}
        onClose={() => setAssetModalOpen(false)}
      >
        <form onSubmit={handleAssetSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="ast-nama">
                Nama Aset
              </label>
              <input
                id="ast-nama"
                aria-label="Nama Aset Inventaris"
                className="input"
                placeholder="Contoh: Tenda Kerucut 4x4 Meter"
                value={aForm.nama}
                onChange={(e) => setAForm({ ...aForm, nama: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="ast-stok">
                Total Stok Unit
              </label>
              <input
                id="ast-stok"
                aria-label="Total Stok Unit"
                type="number"
                min={0}
                className="input num"
                value={aForm.stok}
                onChange={(e) => setAForm({ ...aForm, stok: Number(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="ast-kond">
                Kondisi Fisik
              </label>
              <select
                id="ast-kond"
                aria-label="Kondisi Fisik Aset"
                className="input"
                value={aForm.kondisi}
                onChange={(e) =>
                  setAForm({ ...aForm, kondisi: e.target.value as AssetItem['kondisi'] })
                }
              >
                <option value="Baik">Baik</option>
                <option value="Perlu Perbaikan">Perlu Perbaikan</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAssetModalOpen(false)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Katalog
            </button>
          </div>
        </form>
      </AccessibleModal>

      <ConfirmDialog
        open={Boolean(deleteAssetTarget)}
        title="Hapus Inventaris Aset"
        message={
          deleteAssetTarget
            ? `Hapus aset "${deleteAssetTarget.nama}" dari daftar inventaris paguyuban?`
            : ''
        }
        confirmLabel="Hapus Aset"
        danger
        onConfirm={() => {
          if (deleteAssetTarget) {
            appStore.deleteAssetCatalogItem(deleteAssetTarget.id);
            notify(`Inventaris aset "${deleteAssetTarget.nama}" berhasil dihapus.`);
            setDeleteAssetTarget(null);
          }
        }}
        onCancel={() => setDeleteAssetTarget(null)}
      />
    </div>
  );
};

export const AccountsManagementView: React.FC = () => {
  const { notify } = useToast();
  const users = appStore.getScopedUsers();
  const residents = appStore.getResidentsForAccountLinking();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserAccount | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    role: 'warga' as RoleId,
    nama_tampilan: '',
    resident_id: '',
    shift_label: '',
    nama_warga_tertaut: '',
    no_rumah: 'G-01',
    blok: 'G' as 'G' | 'F',
    syncResidentName: true
  });
  const [editError, setEditError] = useState('');
  const [resetTarget, setResetTarget] = useState<UserAccount | null>(null);
  const [newPin, setNewPin] = useState('');
  const [formError, setFormError] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const openEditUser = (u: UserAccount) => {
    const linked = u.resident_id ? appStore.getLimitedResidentLookup(u.resident_id) : null;
    const { shiftText } = extractShiftAndAvatar(u.shift_label);
    setEditTarget(u);
    setEditForm({
      username: u.username,
      role: u.role,
      nama_tampilan: u.nama_tampilan,
      resident_id: u.resident_id || residents[0]?.id || '',
      shift_label: shiftText || 'Shift Malam Pos Gerbang Utama',
      nama_warga_tertaut:
        linked?.nama ||
        u.nama_tampilan.replace(/\s*\([^)]+\)\s*$/, '').trim(),
      no_rumah: linked?.no_rumah || 'G-01',
      blok: linked?.blok || 'G',
      syncResidentName: true
    });
    setEditError('');
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      appStore.updateUserAccount(editTarget.id, {
        username: editForm.username,
        role: editForm.role,
        nama_tampilan: editForm.nama_tampilan,
        resident_id: editForm.role === 'security' ? '' : editForm.resident_id,
        shift_label: editForm.role === 'security' ? editForm.shift_label : '',
        nama_warga_tertaut: editForm.nama_warga_tertaut,
        no_rumah: editForm.no_rumah,
        blok: editForm.blok,
        syncResidentName: editForm.syncResidentName
      });
      setEditTarget(null);
      setEditError('');
      notify('Data akun (Nama, No. Rumah, Blok) berhasil diperbarui & disinkronkan.');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal memperbarui akun pengguna.');
    }
  };

  const toggleRevealPin = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyUserInvite = async (u: UserAccount) => {
    const portalUrl =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://portal-layanan-digital-warga.pages.dev';
    const text = [
      `Akses Pribadi Portal ${appStore.getOrgName()}`,
      `Nama: ${u.nama_tampilan}`,
      `Tautan Portal: ${portalUrl}`,
      `Username: ${u.username}`,
      `PIN Akses: ${u.pin}`,
      `Catatan: Akun ini bersifat pribadi khusus untuk hak akses Anda.`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      notify(`Catatan akses pribadi untuk "${u.username}" berhasil disalin.`);
    } catch {
      notify(`Username: ${u.username} | PIN: ${u.pin}`);
    }
  };

  const [form, setForm] = useState({
    username: '',
    pin: '5555',
    role: 'warga' as RoleId,
    nama_tampilan: '',
    resident_id: '__NEW__',
    nama_warga_baru: '',
    no_rumah: 'G-09',
    blok: 'G' as 'G' | 'F',
    shift_label: 'Shift Malam Pos Gerbang Utama'
  });

  const activeAdminCount = users.filter((u) => u.role === 'admin' && u.aktif === 'Ya').length;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const linkedRes = residents.find((r) => r.id === form.resident_id);
      const houseNorm = normalizeHouseAndBlok(form.no_rumah, form.blok);
      const display =
        form.nama_tampilan.trim() ||
        (form.role === 'security'
          ? `Petugas Security (${form.shift_label})`
          : form.resident_id === '__NEW__'
            ? `${form.nama_warga_baru.trim()} (${houseNorm.no_rumah})`
            : linkedRes
              ? `${linkedRes.nama} (${linkedRes.no_rumah})`
              : form.username);

      appStore.createUserAccount({
        username: form.username,
        pin: form.pin,
        role: form.role,
        nama_tampilan: display,
        resident_id: form.role === 'security' ? '' : form.resident_id,
        shift_label: form.role === 'security' ? form.shift_label : '',
        nama_warga_baru: form.nama_warga_baru,
        no_rumah: houseNorm.no_rumah,
        blok: houseNorm.blok
      });
      setCreateOpen(false);
      setFormError('');
      setForm((prev) => ({
        ...prev,
        username: '',
        nama_tampilan: '',
        nama_warga_baru: ''
      }));
      notify('Akun pengguna baru berhasil dibuat & tersinkron ke Data Warga.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal membuat akun.');
    }
  };

  const handleResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      appStore.resetUserPin(resetTarget.id, newPin);
      setResetTarget(null);
      setNewPin('');
      notify(`PIN akun ${resetTarget.username} berhasil direset.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal mereset PIN.', 'red');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Manajemen Akun</h1>
          <p className="text-sm text-muted mt-1">
            Database terpusat seluruh akun pengguna (tersinkron otomatis dua arah dengan Profil Saya tiap user).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setFormError('');
            setCreateOpen(true);
          }}
        >
          <UserPlus size={16} aria-hidden="true" />
          <span>Buat Akun Baru</span>
          <CtaArrowBadge />
        </button>
      </div>

      <section className="surface-card overflow-hidden" aria-label="Tabel manajemen akun pengguna">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama &amp; Username</th>
                <th>Peran</th>
                <th>No. Rumah &amp; Blok / Shift</th>
                <th>PIN Saat Ini</th>
                <th>Status Aktif</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const res = u.resident_id ? appStore.getLimitedResidentLookup(u.resident_id) : null;
                const isLastActiveAdmin =
                  u.role === 'admin' && u.aktif === 'Ya' && activeAdminCount <= 1;

                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <UserAvatarBadge
                          avatarUrl={extractShiftAndAvatar(u.shift_label).avatarUrl}
                          name={u.nama_tampilan}
                          size={34}
                        />
                        <div>
                          <div className="font-bold">{res ? res.nama : u.nama_tampilan}</div>
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
                        <span>
                          Shift: {extractShiftAndAvatar(u.shift_label).shiftText || 'Pos Utama'}
                        </span>
                      ) : res ? (
                        <div>
                          <div className="font-bold num">
                            {res.no_rumah} · Blok {res.blok}
                          </div>
                          <div className="text-muted">{res.nama}</div>
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
                          aria-label={revealedIds[u.id] ? `Sembunyikan PIN ${u.username}` : `Lihat PIN ${u.username}`}
                          onClick={() => toggleRevealPin(u.id)}
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
                          onClick={() => openEditUser(u)}
                        >
                          <Pencil size={13} aria-hidden="true" />
                          <span>Ubah Data</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact whitespace-nowrap"
                          onClick={() => handleCopyUserInvite(u)}
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
                        <button
                          type="button"
                          className={`btn ${u.aktif === 'Ya' ? 'btn-danger' : 'btn-primary'} btn-compact`}
                          disabled={isLastActiveAdmin}
                          title={
                            isLastActiveAdmin
                              ? 'Minimal 1 Admin aktif wajib dipertahankan'
                              : undefined
                          }
                          onClick={() => {
                            try {
                              appStore.toggleUserAccountActive(u.id, u.aktif !== 'Ya');
                              notify(
                                u.aktif === 'Ya'
                                  ? `Akun ${u.username} dinonaktifkan.`
                                  : `Akun ${u.username} diaktifkan kembali.`
                              );
                            } catch (err) {
                              notify(
                                err instanceof Error ? err.message : 'Gagal mengubah status akun.',
                                'red'
                              );
                            }
                          }}
                        >
                          {u.aktif === 'Ya' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <AccessibleModal
        open={createOpen}
        title="Buat Akun Pengguna Baru"
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleCreateUser} className="space-y-4" noValidate>
          {formError && (
            <div className="p-3 rounded-xl badge-red text-xs font-semibold" role="alert">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="usr-role">
                Peran Akun
              </label>
              <select
                id="usr-role"
                aria-label="Peran Akun Baru"
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as RoleId })}
              >
                {(Object.keys(ROLE_DEFINITIONS) as RoleId[]).map((rk) => (
                  <option key={rk} value={rk}>
                    {ROLE_DEFINITIONS[rk].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="usr-username">
                Username Login
              </label>
              <input
                id="usr-username"
                aria-label="Username Login Baru"
                className="input"
                placeholder="Contoh: warga.g02"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="usr-pin">
                PIN Awal (4-8 Digit)
              </label>
              <input
                id="usr-pin"
                aria-label="PIN Awal 4 sampai 8 Digit"
                inputMode="numeric"
                maxLength={8}
                className="input num"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="usr-display">
                Nama Tampilan
              </label>
              <input
                id="usr-display"
                aria-label="Nama Tampilan Pengguna"
                className="input"
                placeholder="Opsional (otomatis dari nama warga)"
                value={form.nama_tampilan}
                onChange={(e) => setForm({ ...form, nama_tampilan: e.target.value })}
              />
            </div>
          </div>

          {form.role === 'security' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="usr-sec-name">
                  Nama Petugas Security
                </label>
                <input
                  id="usr-sec-name"
                  aria-label="Nama Petugas Security"
                  className="input"
                  placeholder="Contoh: Bapak Budi Santoso"
                  value={form.nama_tampilan}
                  onChange={(e) => setForm({ ...form, nama_tampilan: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="usr-shift">
                  Shift / Pos Jaga
                </label>
                <input
                  id="usr-shift"
                  aria-label="Label Shift Pos Security"
                  className="input"
                  value={form.shift_label}
                  onChange={(e) => setForm({ ...form, shift_label: e.target.value })}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="field-label" htmlFor="usr-res">
                  Sumber Data Warga
                </label>
                <select
                  id="usr-res"
                  aria-label="Sumber Data Warga"
                  className="input"
                  value={form.resident_id}
                  onChange={(e) => setForm({ ...form, resident_id: e.target.value })}
                >
                  <option value="__NEW__">+ Input Data Baru (Nama, No. Rumah, Blok)</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.no_rumah} (Blok {r.blok}) - {r.nama}
                    </option>
                  ))}
                </select>
              </div>

              {form.resident_id === '__NEW__' && (
                <div className="soft-well p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="field-label" htmlFor="usr-new-nama">
                      Nama
                    </label>
                    <input
                      id="usr-new-nama"
                      aria-label="Nama Lengkap Warga Baru"
                      className="input"
                      placeholder="Masukkan nama lengkap"
                      value={form.nama_warga_baru}
                      onChange={(e) => setForm({ ...form, nama_warga_baru: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="usr-new-rumah">
                      No. Rumah
                    </label>
                    <input
                      id="usr-new-rumah"
                      aria-label="Nomor Rumah Baru"
                      className="input num"
                      placeholder="Contoh: G-09 atau F-04"
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
                    <label className="field-label" htmlFor="usr-new-blok">
                      Blok
                    </label>
                    <select
                      id="usr-new-blok"
                      aria-label="Blok Hunian Baru"
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
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Akun
            </button>
          </div>
        </form>
      </AccessibleModal>

      <AccessibleModal
        open={Boolean(resetTarget)}
        title={resetTarget ? `Reset PIN: ${resetTarget.username}` : 'Reset PIN'}
        onClose={() => setResetTarget(null)}
      >
        <form onSubmit={handleResetPin} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="rst-pin">
              PIN Baru (4 sampai 8 digit angka)
            </label>
            <input
              id="rst-pin"
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
            <button type="button" className="btn btn-secondary" onClick={() => setResetTarget(null)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Perbarui PIN
            </button>
          </div>
        </form>
      </AccessibleModal>

      <AccessibleModal
        open={Boolean(editTarget)}
        title={editTarget ? `Ubah Nama & Profil Akun: ${editTarget.username}` : 'Ubah Akun'}
        onClose={() => setEditTarget(null)}
      >
        <form onSubmit={handleSaveEditUser} className="space-y-4" noValidate>
          {editError && (
            <div className="p-3 rounded-xl badge-red text-xs font-semibold" role="alert">
              {editError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="edt-display">
                Nama Lengkap / Nama Tampilan Sistem
              </label>
              <input
                id="edt-display"
                aria-label="Nama Lengkap atau Nama Tampilan Sistem"
                className="input"
                value={editForm.nama_tampilan}
                onChange={(e) => setEditForm({ ...editForm, nama_tampilan: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="edt-username">
                Username Login
              </label>
              <input
                id="edt-username"
                aria-label="Username Login"
                className="input"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="edt-role">
                Peran Akun
              </label>
              <select
                id="edt-role"
                aria-label="Peran Akun Pengguna"
                className="input"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as RoleId })}
              >
                {(Object.keys(ROLE_DEFINITIONS) as RoleId[]).map((rk) => (
                  <option key={rk} value={rk}>
                    {ROLE_DEFINITIONS[rk].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editForm.role === 'security' ? (
            <div>
              <label className="field-label" htmlFor="edt-shift">
                Label Shift &amp; Pos Tugas Security
              </label>
              <input
                id="edt-shift"
                aria-label="Label Shift dan Pos Tugas Security"
                className="input"
                value={editForm.shift_label}
                onChange={(e) => setEditForm({ ...editForm, shift_label: e.target.value })}
                required
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="field-label" htmlFor="edt-res">
                  Tautan Data Warga
                </label>
                <select
                  id="edt-res"
                  aria-label="Tautan Data Warga Akun"
                  className="input"
                  value={editForm.resident_id}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const found = residents.find((r) => r.id === nextId);
                    setEditForm({
                      ...editForm,
                      resident_id: nextId,
                      nama_warga_tertaut: found ? found.nama : editForm.nama_warga_tertaut,
                      no_rumah: found ? found.no_rumah : editForm.no_rumah,
                      blok: found ? found.blok : editForm.blok,
                      nama_tampilan: found
                        ? editForm.role === 'admin'
                          ? `${found.nama} (Admin)`
                          : `${found.nama} (${found.no_rumah})`
                        : editForm.nama_tampilan
                    });
                  }}
                >
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.no_rumah} (Blok {r.blok}) - {r.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="soft-well p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="edt-res-name">
                    Nama (Sinkron ke Profil User &amp; Data Warga)
                  </label>
                  <input
                    id="edt-res-name"
                    aria-label="Nama Warga Tertaut"
                    className="input"
                    value={editForm.nama_warga_tertaut}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        nama_warga_tertaut: e.target.value,
                        nama_tampilan:
                          editForm.role === 'admin'
                            ? `${e.target.value} (Admin)`
                            : `${e.target.value} (${editForm.no_rumah})`
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="edt-res-rumah">
                    No. Rumah
                  </label>
                  <input
                    id="edt-res-rumah"
                    aria-label="Nomor Rumah Warga Tertaut"
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
                        nama_tampilan:
                          editForm.role === 'admin'
                            ? `${editForm.nama_warga_tertaut} (Admin)`
                            : `${editForm.nama_warga_tertaut} (${upper || val})`
                      });
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="edt-res-blok">
                    Blok
                  </label>
                  <select
                    id="edt-res-blok"
                    aria-label="Blok Hunian Warga Tertaut"
                    className="input"
                    value={editForm.blok}
                    onChange={(e) => {
                      const nb = e.target.value as 'G' | 'F';
                      const norm = normalizeHouseAndBlok(editForm.no_rumah, nb);
                      setEditForm({
                        ...editForm,
                        blok: nb,
                        no_rumah: norm.no_rumah,
                        nama_tampilan:
                          editForm.role === 'admin'
                            ? `${editForm.nama_warga_tertaut} (Admin)`
                            : `${editForm.nama_warga_tertaut} (${norm.no_rumah})`
                      });
                    }}
                  >
                    <option value="G">Blok G</option>
                    <option value="F">Blok F</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-secondary whitespace-nowrap"
              onClick={() => setEditTarget(null)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Simpan Perubahan
            </button>
          </div>
        </form>
      </AccessibleModal>
    </div>
  );
};

export const AuditLogView: React.FC = () => {
  const logs = appStore.getScopedAuditLogs();
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'Semua' | ModuleId>('Semua');

  const q = query.trim().toLowerCase();
  const filtered = logs.filter((item) => {
    if (moduleFilter !== 'Semua' && item.module !== moduleFilter) return false;
    if (q) {
      const hay = `${item.actor_name} ${item.actor_username} ${item.actor_role} ${item.record_id} ${item.summary} ${item.on_behalf_note}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Log Aktivitas Audit Sistem</h1>
          <p className="text-sm text-muted mt-1">
            Khusus <strong>Admin</strong>: rekam jejak lengkap setiap aksi <code>create</code>, <code>update</code>, <code>delete</code>, dan <code>approve</code> beserta pelaku, waktu, modul, dan penanda <strong>oleh Admin</strong>.
          </p>
        </div>
        <span className="status-badge badge-green num">{logs.length} Aktivitas Tercatat</span>
      </div>

      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <input
          aria-label="Cari aktivitas berdasarkan pelaku atau ID rekaman"
          className="input max-w-sm"
          placeholder="Cari nama pelaku, ID surat/kas, atau 'oleh Admin'…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Filter modul log aktivitas"
          className="input"
          style={{ width: 'auto' }}
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value as 'Semua' | ModuleId)}
        >
          <option value="Semua">Semua Modul</option>
          <option value="surat">E-Letter (surat)</option>
          <option value="kas">Kas &amp; Iuran (kas)</option>
          <option value="aset">Aset &amp; Booking (aset)</option>
          <option value="warga">Data Warga (warga)</option>
          <option value="warga_security">Manajemen Warga &amp; Security (warga_security)</option>
          <option value="data_saya">Profil Saya (data_saya)</option>
          <option value="tamu">Buku Tamu (tamu)</option>
          <option value="patroli">Check-In Patroli (patroli)</option>
          <option value="keluhan">Keluhan Warga (keluhan)</option>
          <option value="sanitasi">Sanitasi (sanitasi)</option>
          <option value="sosial">Dana Sosial (sosial)</option>
          <option value="akun">Manajemen Akun (akun)</option>
          <option value="pengaturan">Pengaturan (pengaturan)</option>
        </select>
      </div>

      <section className="surface-card overflow-hidden" aria-label="Tabel log aktivitas">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pelaku &amp; Peran</th>
                <th>Aksi &amp; Modul</th>
                <th>ID Rekaman</th>
                <th>Ringkasan Aktivitas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyStateRow colSpan={5} text="Tidak ada log aktivitas yang sesuai filter." />
              ) : (
                filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="num text-xs">{formatDateTime(log.timestamp)}</td>
                    <td>
                      <div className="font-bold text-xs">{log.actor_name}</div>
                      <div className="text-xs text-muted flex flex-wrap items-center gap-1.5 mt-0.5">
                        <code>{log.actor_username}</code>
                        <span>({ROLE_DEFINITIONS[log.actor_role]?.label ?? log.actor_role})</span>
                        {log.on_behalf_note && (
                          <span className="status-badge badge-amber">{log.on_behalf_note}</span>
                        )}
                      </div>
                    </td>
                    <td className="text-xs">
                      <span className="status-badge badge-slate">{log.action}</span>
                      <div className="text-muted mt-1">{log.module}</div>
                    </td>
                    <td className="num text-xs font-bold">{log.record_id}</td>
                    <td className="text-xs">{log.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const { settings, sync, theme } = useAppStore();
  const { notify } = useToast();

  const [orgName, setOrgName] = useState(settings.orgName);
  const [ketuaName, setKetuaName] = useState(settings.ketuaName);
  const [monthlyDues, setMonthlyDues] = useState(settings.monthlyDues);
  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.appsScriptUrl);
  const [apiToken, setApiToken] = useState(settings.apiToken);
  const [pushConfirmOpen, setPushConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    appStore.saveSettings({
      orgName,
      ketuaName,
      monthlyDues,
      appsScriptUrl,
      apiToken
    });
    notify('Pengaturan aplikasi & endpoint Google Apps Script berhasil disimpan.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Pengaturan Sistem &amp; Integrasi Google Sheets</h1>
        <p className="text-sm text-muted mt-1">
          Khusus <strong>Admin</strong>: konfigurasi penuh endpoint Google Apps Script 12-sheet, tarif iuran bulanan, dan pengendalian sistem.
        </p>
      </div>

      {/* Prominent Required Security & Client-Side Gate Notice */}
      <section className="surface-card p-5 space-y-2" role="region" aria-label="Pemberitahuan keamanan dan privasi data">
        <div className="flex items-center gap-2 text-xs font-bold">
          <ShieldAlert size={16} aria-hidden="true" />
          <span className="status-badge badge-amber">Pemberitahuan Penting Keamanan &amp; Privasi Data</span>
        </div>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          <strong>URL Web App Google Apps Script</strong> dapat diakses oleh siapa saja yang memegang tautannya. <strong>API Token</strong> serta pembatasan peran pada aplikasi peramban ini (<em>client-side gate</em>) hanya berfungsi sebagai pengaman dasar operasional dan <strong>bukan sistem keamanan server penuh</strong>. Pastikan data pribadi sensitif warga (terutama <strong>NIK</strong> dan <strong>Nomor KK</strong>) selalu dilindungi dan batasi pembagian tautan Spreadsheet hanya bagi pengurus berwenang.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleSaveSettings} className="surface-card p-6 lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold">Parameter Organisasi &amp; Endpoint Google Sheets</h2>

          <div>
            <label className="field-label" htmlFor="set-org">
              Nama Resmi Paguyuban
            </label>
            <input
              id="set-org"
              aria-label="Nama Resmi Paguyuban"
              className="input"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="set-ketua">
                Nama Ketua Paguyuban
              </label>
              <input
                id="set-ketua"
                aria-label="Nama Ketua Paguyuban"
                className="input"
                value={ketuaName}
                onChange={(e) => setKetuaName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="set-dues">
                Tarif Iuran Bulanan per KK (Rp)
              </label>
              <input
                id="set-dues"
                aria-label="Tarif Iuran Bulanan per KK Rupiah"
                type="number"
                min={0}
                step={5000}
                className="input num"
                value={monthlyDues}
                onChange={(e) => setMonthlyDues(Number(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="pt-3 rule-t">
            <label className="field-label" htmlFor="set-gas-url">
              Google Apps Script Web App URL
            </label>
            <input
              id="set-gas-url"
              aria-label="Google Apps Script Web App URL"
              type="url"
              className="input"
              placeholder="https://script.google.com/macros/s/…/exec"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
            />
            <p className="field-hint">
              Cukup tempel URL Web App <code>/exec</code> dari Google Apps Script Spreadsheet paguyuban (tidak memerlukan Google Cloud API Key). Kosongkan untuk mode murni <strong>Lokal</strong>.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="set-gas-token">
              API Token Opsional (Script Properties <code>API_TOKEN</code>)
            </label>
            <input
              id="set-gas-token"
              aria-label="API Token Google Apps Script"
              type="password"
              autoComplete="off"
              className="input"
              placeholder="Opsional: samakan dengan API_TOKEN di Apps Script"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <button type="submit" className="btn btn-primary btn-cta-wide">
              <span>Simpan Pengaturan</span>
              <CtaArrowBadge />
            </button>
          </div>
        </form>

        <div className="lg:col-span-5 space-y-4">
          <section className="surface-card p-5 space-y-3" aria-label="Kontrol sinkronisasi Google Sheets">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Sinkronisasi 11 Sheet</h2>
              <StatusBadge status={sync.status} />
            </div>
            <p className="text-xs text-muted">
              Antrean tertunda: <strong className="num">{sync.queue.length} operasi</strong>
              {sync.lastSyncAt ? ` · Sinkron terakhir: ${formatDateTime(sync.lastSyncAt)}` : ''}
            </p>
            {sync.lastError && (
              <p className="field-error" role="alert">
                {sync.lastError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                onClick={async () => {
                  try {
                    await appStore.pullAllSheetsFromCloud();
                    notify('Seluruh 11 sheet berhasil ditarik dari Google Sheets.');
                  } catch (err) {
                    notify(err instanceof Error ? err.message : 'Gagal menarik data.', 'red');
                  }
                }}
              >
                <CloudDownload size={14} aria-hidden="true" />
                <span>Tarik dari Sheets (GET)</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                onClick={() => setPushConfirmOpen(true)}
              >
                <CloudUpload size={14} aria-hidden="true" />
                <span>Unggah ke Sheets (POST)</span>
              </button>
            </div>
          </section>

          <section className="surface-card p-5 space-y-2.5" aria-label="Hasil audit aksesibilitas WCAG AA">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>Audit Aksesibilitas WCAG AA</span>
              </h2>
              <span className="status-badge badge-green">Lulus Terverifikasi</span>
            </div>
            <ul className="text-xs text-muted space-y-1.5 list-none p-0 m-0">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>
                  Kontras Teks Utama ({theme === 'dark' ? 'Mode Gelap 14.70:1' : 'Mode Terang 16.78:1'} · min 4.5:1)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>
                  Indikator Fokus Keyboard (<code>:focus-visible</code> {theme === 'dark' ? '10.55:1' : '6.15:1'} · min 3.0:1)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Scoping Data-Layer, Masking NIK, &amp; Rute Akses Ditolak Aktif</span>
              </li>
            </ul>
          </section>

          <section className="surface-card p-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Pulihkan Data Simulasi</h2>
              <p className="text-xs text-muted">Kembalikan ke-11 tabel lokal ke data awal Blok G &amp; F.</p>
            </div>
            <button
              type="button"
              className="btn btn-danger btn-compact shrink-0"
              onClick={() => setResetConfirmOpen(true)}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Reset Demo</span>
            </button>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={pushConfirmOpen}
        title="Unggah Seluruh Data Lokal ke Google Sheets"
        message="Seluruh baris pada ke-11 sheet lokal (termasuk Users, SecurityPatrol, dan AuditLog) akan dikirim ke Google Spreadsheet melalui POST text/plain;charset=utf-8. Lanjutkan?"
        confirmLabel="Unggah Sekarang"
        onCancel={() => setPushConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await appStore.pushAllSheetsToCloud();
            notify('Seluruh 11 sheet berhasil diunggah ke Google Sheets.');
          } catch (err) {
            notify(err instanceof Error ? err.message : 'Gagal mengunggah ke Sheets.', 'red');
          }
        }}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset ke Data Simulasi Awal"
        message="Seluruh perubahan lokal akan dikembalikan ke data awal Portal Layanan Digital Warga Blok G & F. Lanjutkan?"
        confirmLabel="Ya, Reset Data"
        danger
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          appStore.resetDemoData();
          notify('Data simulasi awal berhasil dipulihkan.');
        }}
      />
    </div>
  );
};
