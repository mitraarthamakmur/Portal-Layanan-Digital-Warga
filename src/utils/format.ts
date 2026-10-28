export const ORG_NAME_DEFAULT = 'Portal Layanan Digital Warga';
export const ORG_SUBTITLE = 'Blok G & F';
export const LOGO_URL = '/logo-portal.svg';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const rupiahFormatter = new Intl.NumberFormat('id-ID');

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysISO(iso: string, days: number): string {
  const parts = String(iso).split('-').map(Number);
  const d = new Date(parts[0], (parts[1] || 1) - 1, (parts[2] || 1) + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatRupiah(amount: number | string | null | undefined): string {
  const n = Number(amount) || 0;
  return `${n < 0 ? '-Rp ' : 'Rp '}${rupiahFormatter.format(Math.round(Math.abs(n)))}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const s = String(value).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    return `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1]} ${m[1]}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
}

export function formatPeriod(ym: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
  if (!m) return String(ym || '-');
  return `${MONTHS_LONG[Number(m[2]) - 1]} ${m[1]}`;
}

export const FAMILY_STATUS_OPTIONS = ['Kepala Keluarga', 'Istri', 'Anak', 'Keluarga'] as const;
export type FamilyStatusOption = (typeof FAMILY_STATUS_OPTIONS)[number];

export function normalizeFamilyStatus(raw: string | null | undefined): FamilyStatusOption {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'suami' || v === 'kepala keluarga') return 'Kepala Keluarga';
  if (v === 'istri') return 'Istri';
  if (v === 'anak') return 'Anak';
  return 'Keluarga';
}

export function formatFamilyStatusLabel(raw: string | null | undefined): string {
  const v = String(raw || '').trim();
  if (!v) return 'Keluarga';
  if (v.toLowerCase() === 'suami' || v.toLowerCase() === 'kepala keluarga') {
    return 'Kepala Keluarga';
  }
  if (v === 'Orang Tua' || v === 'Famili Lain') return 'Keluarga';
  return v;
}

export function isHeadOfHouseholdStatus(raw: string | null | undefined): boolean {
  const v = String(raw || '').trim().toLowerCase();
  return v === 'suami' || v === 'kepala keluarga';
}

export function normalizeHouseAndBlok(
  rawNoRumah: string | null | undefined,
  rawBlok?: 'G' | 'F' | string | null
): { no_rumah: string; blok: 'G' | 'F' } {
  const cleanRumah = String(rawNoRumah || '').trim().toUpperCase();
  const explicitBlok: 'G' | 'F' =
    String(rawBlok || '').trim().toUpperCase() === 'F' ? 'F' : 'G';

  if (!cleanRumah) {
    return { no_rumah: `${explicitBlok}-01`, blok: explicitBlok };
  }

  const prefixed = /^([GF])[-\s]?(\d+[A-Z]?)$/.exec(cleanRumah);
  if (prefixed) {
    const detectedBlok = (rawBlok ? explicitBlok : (prefixed[1] as 'G' | 'F'));
    const numPart = /^\d$/.test(prefixed[2]) ? `0${prefixed[2]}` : prefixed[2];
    return { no_rumah: `${detectedBlok}-${numPart}`, blok: detectedBlok };
  }

  if (/^\d+[A-Z]?$/.test(cleanRumah)) {
    const numPart = /^\d$/.test(cleanRumah) ? `0${cleanRumah}` : cleanRumah;
    return { no_rumah: `${explicitBlok}-${numPart}`, blok: explicitBlok };
  }

  const finalBlok: 'G' | 'F' = cleanRumah.startsWith('F')
    ? 'F'
    : cleanRumah.startsWith('G')
      ? 'G'
      : explicitBlok;
  return { no_rumah: cleanRumah, blok: finalBlok };
}

export function calcAge(dobISO: string | null | undefined): number {
  if (!dobISO) return 0;
  const s = String(dobISO).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  let y = 0;
  let mo = 0;
  let da = 0;
  if (m) {
    y = Number(m[1]);
    mo = Number(m[2]);
    da = Number(m[3]);
  } else {
    const parsed = new Date(s);
    if (Number.isNaN(parsed.getTime())) return 0;
    y = parsed.getFullYear();
    mo = parsed.getMonth() + 1;
    da = parsed.getDate();
  }
  if (y < 1900) return 0;
  const now = new Date();
  let age = now.getFullYear() - y;
  const curMd = (now.getMonth() + 1) * 100 + now.getDate();
  const dobMd = mo * 100 + da;
  if (curMd < dobMd) age -= 1;
  return Math.max(0, age);
}

export function daysInclusive(startISO: string, endISO: string): number {
  const a = new Date(`${String(startISO).slice(0, 10)}T00:00:00`);
  const b = new Date(`${String(endISO).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export function datesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return String(s1).slice(0, 10) <= String(e2).slice(0, 10) && String(s2).slice(0, 10) <= String(e1).slice(0, 10);
}

export function isValidSixteenDigits(value: string): boolean {
  return /^\d{16}$/.test(String(value || '').trim());
}

export function isValidIndonesianPhone(value: string): boolean {
  return /^(?:\+62|62|0)8\d{7,12}$/.test(String(value || '').replace(/[\s-]/g, ''));
}

export function isValidOptionalIndonesianPhone(value: string | null | undefined): boolean {
  const cleaned = String(value || '').replace(/[\s-]/g, '');
  if (!cleaned || cleaned === '-') return true;
  return /^(?:\+62|62|0)8\d{7,12}$/.test(cleaned);
}

export function generateNextId(prefix: string, items: Array<{ id: string }>): string {
  let max = 0;
  items.forEach((item) => {
    const m = /(\d+)$/.exec(String(item.id || ''));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export function generateNextLetterNumber(letters: Array<{ no_surat: string }>): string {
  const now = new Date();
  const roman = ROMAN[now.getMonth()];
  const year = now.getFullYear();
  let max = 0;
  letters.forEach((l) => {
    const m = /^(\d+)\/PWSJR\//.exec(String(l.no_surat || ''));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `${String(max + 1).padStart(3, '0')}/PWSJR/${roman}/${year}`;
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const escapeCell = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
