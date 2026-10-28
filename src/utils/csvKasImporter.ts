import type { CashflowEntry, LimitedResidentInfo } from '../types';
import { todayISO } from './format';

export interface ParsedKasRowDraft {
  tanggal: string;
  tipe: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  resident_id: string;
  no_rumah_csv: string;
  nama_warga_csv: string;
  periode: string;
  nominal: number;
  metode: CashflowEntry['metode'];
  status: CashflowEntry['status'];
  bukti: string;
  keterangan: string;
}

export interface MissingHouseDraft {
  no_rumah: string;
  blok: 'G' | 'F';
  nama: string;
}

export interface SmartCsvParseResult {
  detectedMode: 'matriks_iuran' | 'mutasi_kas';
  delimiter: string;
  totalRawRows: number;
  rows: ParsedKasRowDraft[];
  missingHouses: MissingHouseDraft[];
  totalPemasukan: number;
  totalPengeluaran: number;
  warnings: string[];
}

const MONTH_NAME_MAP: Record<string, string> = {
  jan: '01',
  januari: '01',
  january: '01',
  feb: '02',
  februari: '02',
  february: '02',
  mar: '03',
  maret: '03',
  march: '03',
  apr: '04',
  april: '04',
  mei: '05',
  may: '05',
  jun: '06',
  juni: '06',
  june: '06',
  jul: '07',
  juli: '07',
  july: '07',
  agu: '08',
  ags: '08',
  agust: '08',
  agustus: '08',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  okt: '10',
  oktober: '10',
  oct: '10',
  october: '10',
  nov: '11',
  nop: '11',
  november: '11',
  des: '12',
  desember: '12',
  dec: '12',
  december: '12'
};

function detectDelimiter(sampleLine: string): string {
  const candidates = [';', ',', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const delim of candidates) {
    let inQuotes = false;
    let count = 0;
    for (let i = 0; i < sampleLine.length; i++) {
      const ch = sampleLine[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (!inQuotes && ch === delim) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = delim;
    }
  }
  return best;
}

function parseDelimitedText(rawText: string): { grid: string[][]; delimiter: string } {
  const cleaned = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const firstNonEmpty =
    cleaned
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0 && (l.includes(',') || l.includes(';') || l.includes('\t'))) ?? '';
  const delimiter = detectDelimiter(firstNonEmpty);

  const rows: string[][] = [];
  let curRow: string[] = [];
  let curField = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          curField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        curField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      curRow.push(curField.trim());
      curField = '';
    } else if (ch === '\n') {
      curRow.push(curField.trim());
      if (curRow.some((cell) => cell !== '')) {
        rows.push(curRow);
      }
      curRow = [];
      curField = '';
    } else {
      curField += ch;
    }
  }
  curRow.push(curField.trim());
  if (curRow.some((cell) => cell !== '')) {
    rows.push(curRow);
  }

  return { grid: rows, delimiter };
}

export function normalizeHouseCode(raw: string): { no_rumah: string; blok: 'G' | 'F' } | null {
  const clean = raw.trim().toUpperCase();
  if (!clean) return null;
  const match = clean.match(/\b(?:BLOK\s*)?([GF])\s*[-./\sNoNO]*\s*(\d{1,3})\b/);
  if (!match) return null;
  const blok = match[1] as 'G' | 'F';
  const num = String(parseInt(match[2], 10)).padStart(2, '0');
  return { no_rumah: `${blok}-${num}`, blok };
}

export function parseIndonesianAmount(raw: string): number {
  if (!raw) return 0;
  let s = raw
    .trim()
    .replace(/rp\.?/gi, '')
    .replace(/idr/gi, '')
    .replace(/\s+/g, '');

  const isNegative = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')'));
  s = s.replace(/[()+-]/g, '');

  // Handle decimal ending like ,00 or .00
  if (/,\d{1,2}$/.test(s) && s.includes('.')) {
    s = s.replace(/\./g, '').replace(/,\d{1,2}$/, '');
  } else if (/\.\d{1,2}$/.test(s) && s.includes(',')) {
    s = s.replace(/,/g, '').replace(/\.\d{1,2}$/, '');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  } else if (/^\d{1,3}(,\d{3})+$/.test(s)) {
    s = s.replace(/,/g, '');
  } else {
    s = s.replace(/[^\d]/g, '');
  }

  const val = Number(s);
  if (!Number.isFinite(val)) return 0;
  return isNegative ? -val : val;
}

export function parseFlexiblePeriod(raw: string, fallbackYear = 2026): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  const iso = s.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (iso) {
    const m = Number(iso[2]);
    if (m >= 1 && m <= 12) return `${iso[1]}-${String(m).padStart(2, '0')}`;
  }

  const rev = s.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (rev) {
    const m = Number(rev[1]);
    if (m >= 1 && m <= 12) return `${rev[2]}-${String(m).padStart(2, '0')}`;
  }

  const cleanedTokens = s.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/);
  for (const tok of cleanedTokens) {
    if (MONTH_NAME_MAP[tok]) {
      const yearTok = cleanedTokens.find((t) => /^\d{2,4}$/.test(t));
      let yr = fallbackYear;
      if (yearTok) {
        yr = yearTok.length === 2 ? 2000 + Number(yearTok) : Number(yearTok);
      }
      return `${yr}-${MONTH_NAME_MAP[tok]}`;
    }
  }

  return null;
}

export function parseFlexibleDateISO(raw: string, fallbackPeriode?: string): string {
  const s = raw.trim();
  if (!s) {
    if (fallbackPeriode && /^\d{4}-\d{2}$/.test(fallbackPeriode)) {
      return `${fallbackPeriode}-05`;
    }
    return todayISO();
  }

  const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmy) {
    const yr = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    const m = Number(dmy[2]);
    const d = Number(dmy[1]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${yr}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const named = s
    .toLowerCase()
    .replace(/[,]/g, ' ')
    .match(/(\d{1,2})\s+([a-z]+)\s+(\d{2,4})/);
  if (named && MONTH_NAME_MAP[named[2]]) {
    const yr = named[3].length === 2 ? `20${named[3]}` : named[3];
    return `${yr}-${MONTH_NAME_MAP[named[2]]}-${named[1].padStart(2, '0')}`;
  }

  if (fallbackPeriode && /^\d{4}-\d{2}$/.test(fallbackPeriode)) {
    return `${fallbackPeriode}-05`;
  }
  return todayISO();
}

function normalizeHeaderKey(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findHeaderRowIndex(grid: string[][]): number {
  const headerKeywords = [
    'tanggal',
    'tgl',
    'date',
    'tipe',
    'jenis',
    'kategori',
    'nominal',
    'jumlah',
    'masuk',
    'keluar',
    'pemasukan',
    'pengeluaran',
    'debit',
    'kredit',
    'rumah',
    'no_rumah',
    'blok',
    'nama',
    'warga',
    'periode',
    'bulan',
    'keterangan',
    'uraian'
  ];

  const maxScan = Math.min(grid.length, 10);
  let bestIdx = 0;
  let bestScore = -1;

  for (let r = 0; r < maxScan; r++) {
    const row = grid[r];
    let score = 0;
    for (const cell of row) {
      const nk = normalizeHeaderKey(cell);
      if (headerKeywords.some((kw) => nk === kw || nk.includes(kw))) score += 2;
      if (parseFlexiblePeriod(cell)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = r;
    }
  }
  return bestIdx;
}

function matchResident(
  residents: LimitedResidentInfo[],
  noRumahRaw: string,
  namaRaw: string
): { resident_id: string; normalizedHouse: { no_rumah: string; blok: 'G' | 'F' } | null } {
  const houseInfo = normalizeHouseCode(noRumahRaw) ?? normalizeHouseCode(namaRaw);
  if (houseInfo) {
    const byHouse = residents.find(
      (r) => r.no_rumah.toUpperCase() === houseInfo.no_rumah.toUpperCase()
    );
    if (byHouse) return { resident_id: byHouse.id, normalizedHouse: houseInfo };
  }

  const cleanName = namaRaw.trim().toLowerCase();
  if (cleanName.length >= 3) {
    const byName = residents.find(
      (r) =>
        r.nama.toLowerCase() === cleanName ||
        r.nama.toLowerCase().includes(cleanName) ||
        cleanName.includes(r.nama.toLowerCase())
    );
    if (byName) {
      return {
        resident_id: byName.id,
        normalizedHouse: houseInfo ?? { no_rumah: byName.no_rumah, blok: byName.blok }
      };
    }
  }

  return { resident_id: '', normalizedHouse: houseInfo };
}

export function parseSmartCashflowCsv(params: {
  csvText: string;
  residents: LimitedResidentInfo[];
  defaultMonthlyDues: number;
}): SmartCsvParseResult {
  const { csvText, residents, defaultMonthlyDues } = params;
  const { grid, delimiter } = parseDelimitedText(csvText);

  if (grid.length < 2) {
    return {
      detectedMode: 'mutasi_kas',
      delimiter,
      totalRawRows: 0,
      rows: [],
      missingHouses: [],
      totalPemasukan: 0,
      totalPengeluaran: 0,
      warnings: ['Berkas CSV kosong atau hanya berisi satu baris judul.']
    };
  }

  const headerIdx = findHeaderRowIndex(grid);
  const rawHeaders = grid[headerIdx];
  const normHeaders = rawHeaders.map(normalizeHeaderKey);
  const dataRows = grid.slice(headerIdx + 1);

  // Check if this is a Monthly Dues Matrix CSV (>= 2 columns parse as YYYY-MM periods)
  const periodColumns: Array<{ colIdx: number; periode: string }> = [];
  rawHeaders.forEach((h, idx) => {
    const p = parseFlexiblePeriod(h);
    if (p) periodColumns.push({ colIdx: idx, periode: p });
  });

  const missingMap = new Map<string, MissingHouseDraft>();
  const parsedDrafts: ParsedKasRowDraft[] = [];
  const warnings: string[] = [];

  const registerMissingHouseIfNeeded = (
    house: { no_rumah: string; blok: 'G' | 'F' } | null,
    residentId: string,
    namaCsv: string
  ) => {
    if (!residentId && house && !missingMap.has(house.no_rumah)) {
      missingMap.set(house.no_rumah, {
        no_rumah: house.no_rumah,
        blok: house.blok,
        nama: namaCsv.trim() || `Warga ${house.no_rumah}`
      });
    }
  };

  if (periodColumns.length >= 2) {
    // MODE A: MATRIKS REKAP IURAN BULANAN PER RUMAH
    const houseCol = normHeaders.findIndex((h) =>
      ['no_rumah', 'rumah', 'nomor_rumah', 'kavling', 'blok_rumah', 'unit', 'blok'].some((k) =>
        h.includes(k)
      )
    );
    const nameCol = normHeaders.findIndex((h) =>
      ['nama', 'warga', 'kepala_keluarga', 'kk', 'penghuni', 'pemilik'].some((k) => h.includes(k))
    );

    for (const row of dataRows) {
      const rawHouse = houseCol >= 0 ? (row[houseCol] ?? '') : (row[0] ?? '');
      const rawName = nameCol >= 0 ? (row[nameCol] ?? '') : (row[1] ?? '');

      if (/^(total|jumlah|subtotal|grand\s*total)/i.test(`${rawHouse} ${rawName}`.trim())) {
        continue;
      }

      const matched = matchResident(residents, rawHouse, rawName);
      if (!matched.resident_id && !matched.normalizedHouse) continue;

      registerMissingHouseIfNeeded(matched.normalizedHouse, matched.resident_id, rawName);
      const houseLabel = matched.normalizedHouse?.no_rumah || rawHouse.trim();

      for (const pc of periodColumns) {
        const cellRaw = (row[pc.colIdx] ?? '').trim();
        if (!cellRaw) continue;
        const lower = cellRaw.toLowerCase();

        if (
          ['-', '0', 'belum', 'belum bayar', 'tunggak', 'menunggak', 'x', 'tidak', 'no'].includes(
            lower
          )
        ) {
          continue;
        }

        const isPending = ['menunggu', 'pending', 'verifikasi', 'proses'].some((k) =>
          lower.includes(k)
        );
        const isPaidWord = ['lunas', 'sudah', 'ya', 'ok', 'paid', 'v', '✓', '✔', '1'].includes(
          lower
        );
        const amountVal = parseIndonesianAmount(cellRaw);

        if (!isPending && !isPaidWord && amountVal <= 0) continue;

        const finalNominal =
          amountVal >= 1000 ? amountVal : Number(defaultMonthlyDues) || 50000;

        parsedDrafts.push({
          tanggal: `${pc.periode}-05`,
          tipe: 'Pemasukan',
          kategori: 'Iuran Bulanan',
          resident_id: matched.resident_id,
          no_rumah_csv: houseLabel,
          nama_warga_csv: rawName.trim() || `Warga ${houseLabel}`,
          periode: pc.periode,
          nominal: finalNominal,
          metode: 'Transfer',
          status: isPending ? 'Menunggu Verifikasi' : 'Lunas',
          bukti: 'IMPOR-CSV-BENDAHARA',
          keterangan: `Data awal iuran ${pc.periode} rumah ${houseLabel}${rawName.trim() ? ` (${rawName.trim()})` : ''}`
        });
      }
    }

    const totalPemasukan = parsedDrafts
      .filter((d) => d.status === 'Lunas' && d.tipe === 'Pemasukan')
      .reduce((s, d) => s + d.nominal, 0);

    return {
      detectedMode: 'matriks_iuran',
      delimiter,
      totalRawRows: dataRows.length,
      rows: parsedDrafts,
      missingHouses: Array.from(missingMap.values()),
      totalPemasukan,
      totalPengeluaran: 0,
      warnings
    };
  }

  // MODE B: TABEL MUTASI BUKU KAS / DAFTAR TRANSAKSI
  const findCol = (keywords: string[]) =>
    normHeaders.findIndex((h) => keywords.some((k) => h === k || h.includes(k)));

  const colTanggal = findCol(['tanggal', 'tgl', 'date', 'waktu']);
  const colTipe = findCol(['tipe', 'jenis', 'arus', 'type', 'dk', 'd_k']);
  const colKategori = findCol(['kategori', 'pos', 'jenis_transaksi', 'akun']);
  const colRumah = findCol(['no_rumah', 'rumah', 'nomor_rumah', 'kavling', 'unit', 'blok']);
  const colNama = findCol(['nama', 'warga', 'penyetor', 'pembayar', 'kepala_keluarga']);
  const colPeriode = findCol(['periode', 'bulan', 'masa', 'thn_bln']);
  const colNominal = findCol(['nominal', 'jumlah', 'nilai', 'rupiah', 'total', 'bayar', 'amount']);
  const colMasuk = findCol(['pemasukan', 'masuk', 'debit', 'debet', 'terima', 'in']);
  const colKeluar = findCol(['pengeluaran', 'keluar', 'kredit', 'credit', 'biaya', 'out']);
  const colMetode = findCol(['metode', 'cara_bayar', 'via', 'channel', 'bank']);
  const colStatus = findCol(['status', 'ket_bayar']);
  const colBukti = findCol(['bukti', 'referensi', 'no_bukti', 'kwitansi', 'ref']);
  const colKet = findCol(['keterangan', 'uraian', 'deskripsi', 'catatan', 'memo', 'perihal']);

  for (const row of dataRows) {
    const joined = row.join(' ').trim();
    if (!joined) continue;
    if (/^(total|jumlah\s+akhir|saldo\s+akhir|subtotal)/i.test(row[0] ?? '')) continue;

    const rawTgl = colTanggal >= 0 ? (row[colTanggal] ?? '') : '';
    const rawTipe = colTipe >= 0 ? (row[colTipe] ?? '') : '';
    const rawKat = colKategori >= 0 ? (row[colKategori] ?? '') : '';
    const rawRumah = colRumah >= 0 ? (row[colRumah] ?? '') : '';
    const rawNama = colNama >= 0 ? (row[colNama] ?? '') : '';
    const rawPer = colPeriode >= 0 ? (row[colPeriode] ?? '') : '';
    const rawKet = colKet >= 0 ? (row[colKet] ?? '') : '';

    let nominal = 0;
    let tipe: 'Pemasukan' | 'Pengeluaran' = 'Pemasukan';

    const masukVal = colMasuk >= 0 ? Math.abs(parseIndonesianAmount(row[colMasuk] ?? '')) : 0;
    const keluarVal = colKeluar >= 0 ? Math.abs(parseIndonesianAmount(row[colKeluar] ?? '')) : 0;

    if (masukVal > 0 && keluarVal === 0) {
      nominal = masukVal;
      tipe = 'Pemasukan';
    } else if (keluarVal > 0 && masukVal === 0) {
      nominal = keluarVal;
      tipe = 'Pengeluaran';
    } else if (colNominal >= 0) {
      const signed = parseIndonesianAmount(row[colNominal] ?? '');
      nominal = Math.abs(signed);
      if (signed < 0) tipe = 'Pengeluaran';
    } else {
      // Fallback: scan cells for a currency-looking number
      for (let c = 0; c < row.length; c++) {
        if (c === colTanggal || c === colPeriode || c === colRumah) continue;
        const candidate = parseIndonesianAmount(row[c] ?? '');
        if (Math.abs(candidate) >= 1000) {
          nominal = Math.abs(candidate);
          if (candidate < 0) tipe = 'Pengeluaran';
          break;
        }
      }
    }

    if (nominal <= 0) continue;

    if (rawTipe) {
      const lt = rawTipe.toLowerCase();
      if (['pengeluaran', 'keluar', 'kredit', 'credit', 'beban', 'biaya', 'out', 'k'].includes(lt) || lt.includes('keluar')) {
        tipe = 'Pengeluaran';
      } else if (['pemasukan', 'masuk', 'debit', 'debet', 'terima', 'iuran', 'in', 'd'].includes(lt) || lt.includes('masuk')) {
        tipe = 'Pemasukan';
      }
    } else if (/pengeluaran|pembelian|biaya|bayar\s+listrik|perbaikan|konsumsi|honor|gaji/i.test(`${rawKat} ${rawKet}`)) {
      tipe = 'Pengeluaran';
    }

    const matched = matchResident(residents, `${rawRumah} ${rawKet}`, rawNama);
    registerMissingHouseIfNeeded(matched.normalizedHouse, matched.resident_id, rawNama);
    const houseLabel = matched.normalizedHouse?.no_rumah || normalizeHouseCode(rawRumah)?.no_rumah || '';

    const parsedPeriode =
      parseFlexiblePeriod(rawPer) ??
      (rawTgl ? parseFlexibleDateISO(rawTgl).slice(0, 7) : todayISO().slice(0, 7));

    const tanggalISO = parseFlexibleDateISO(rawTgl, parsedPeriode);

    const isIuranLikely =
      tipe === 'Pemasukan' &&
      (/iuran|ipl|kas\s*warga|bulanan/i.test(`${rawKat} ${rawKet}`) ||
        Boolean(houseLabel || matched.resident_id));

    const kategori = isIuranLikely
      ? 'Iuran Bulanan'
      : rawKat.trim() || (tipe === 'Pemasukan' ? 'Saldo & Pemasukan Kas' : 'Operasional Paguyuban');

    const rawMetode = (colMetode >= 0 ? (row[colMetode] ?? '') : '').toLowerCase();
    const metode: CashflowEntry['metode'] = rawMetode.includes('qris')
      ? 'QRIS'
      : rawMetode.includes('tunai') || rawMetode.includes('cash')
        ? 'Tunai'
        : 'Transfer';

    const rawStatus = (colStatus >= 0 ? (row[colStatus] ?? '') : '').toLowerCase();
    if (['belum', 'belum bayar', 'tunggak', 'batal'].includes(rawStatus)) {
      continue;
    }
    const status: CashflowEntry['status'] =
      rawStatus.includes('menunggu') || rawStatus.includes('pending') || rawStatus.includes('verifikasi')
        ? 'Menunggu Verifikasi'
        : 'Lunas';

    const bukti = (colBukti >= 0 ? (row[colBukti] ?? '').trim() : '') || 'IMPOR-CSV-BENDAHARA';
    const keterangan =
      rawKet.trim() ||
      (isIuranLikely && houseLabel
        ? `Iuran bulanan ${parsedPeriode} rumah ${houseLabel}${rawNama ? ` (${rawNama.trim()})` : ''}`
        : `${kategori} (${tanggalISO})`);

    parsedDrafts.push({
      tanggal: tanggalISO,
      tipe,
      kategori,
      resident_id: matched.resident_id,
      no_rumah_csv: houseLabel,
      nama_warga_csv: rawNama.trim(),
      periode: parsedPeriode,
      nominal,
      metode,
      status,
      bukti,
      keterangan
    });
  }

  if (parsedDrafts.length === 0) {
    warnings.push(
      'Tidak ditemukan baris nominal transaksi yang valid. Pastikan kolom jumlah/nominal atau kolom bulan iuran terisi angka atau status Lunas.'
    );
  }

  const totalPemasukan = parsedDrafts
    .filter((d) => d.status === 'Lunas' && d.tipe === 'Pemasukan')
    .reduce((s, d) => s + d.nominal, 0);
  const totalPengeluaran = parsedDrafts
    .filter((d) => d.status === 'Lunas' && d.tipe === 'Pengeluaran')
    .reduce((s, d) => s + d.nominal, 0);

  return {
    detectedMode: 'mutasi_kas',
    delimiter,
    totalRawRows: dataRows.length,
    rows: parsedDrafts,
    missingHouses: Array.from(missingMap.values()),
    totalPemasukan,
    totalPengeluaran,
    warnings
  };
}
