import type {
  AllSheetsData,
  AuditLogEntry,
  CashflowEntry,
  GuestbookEntry,
  Resident,
  UserAccount
} from '../types';
import { addDaysISO, todayISO } from '../utils/format';

export function buildSeedSheets(): AllSheetsData {
  const today = todayISO();
  const nowMs = Date.now();

  const makeGuest = (
    idx: number,
    nama_tamu: string,
    no_identitas: string,
    tujuan_blok: 'G' | 'F',
    no_rumah: string,
    resident_id: string,
    keperluan: string,
    hoursAgo: number,
    forcedStatus?: GuestbookEntry['status'],
    forceTodayDate?: boolean
  ): GuestbookEntry => {
    const dt = new Date(nowMs - hoursAgo * 3600000);
    const exp = new Date((forceTodayDate ? nowMs : dt.getTime()) + 86400000 - (forceTodayDate ? 2 * 3600000 : 0));
    const tgl_masuk = forceTodayDate
      ? today
      : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const jam_masuk = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    return {
      id: `GST-${String(idx).padStart(3, '0')}`,
      nama_tamu,
      no_identitas,
      tujuan_blok,
      no_rumah,
      resident_id,
      keperluan,
      tgl_masuk,
      jam_masuk,
      expired_at: exp.toISOString(),
      status: forcedStatus ?? (exp.getTime() <= nowMs ? 'Kedaluwarsa' : 'Aktif')
    };
  };

  const residentTuples: Array<[string, string, string, string, string, string, 'G' | 'F', string, string, Resident['status'], string]> = [
    ['RES-001', '3515181204780001', 'Ir. Hendra Wijaya, M.T.', '3515180101150001', 'Kepala Keluarga', '1978-04-12', 'G', 'G-01', '081230445101', 'Tetap', '2026-01-10T08:00:00.000Z'],
    ['RES-002', '3515185408800002', 'Ratna Kusumawati, S.E.', '3515180101150001', 'Istri', '1980-08-14', 'G', 'G-01', '081230445102', 'Tetap', '2026-01-10T08:02:00.000Z'],
    ['RES-003', '3515180505090003', 'Dimas Arya Wijaya', '3515180101150001', 'Anak', '2009-05-05', 'G', 'G-01', '081230445103', 'Tetap', '2026-01-10T08:04:00.000Z'],
    ['RES-004', '3515186102560004', 'Hj. Sumarni Wignyo', '3515180101150001', 'Orang Tua', '1956-02-21', 'G', 'G-01', '081230445104', 'Tetap', '2026-01-10T08:05:00.000Z'],
    ['RES-005', '3515181907880001', 'Bagus Prasetyo', '3515180101180002', 'Kepala Keluarga', '1988-07-19', 'G', 'G-02', '081332110201', 'Tetap', '2026-01-11T09:00:00.000Z'],
    ['RES-006', '3515184911900002', 'Nadia Puspitasari', '3515180101180002', 'Istri', '1990-11-09', 'G', 'G-02', '081332110202', 'Tetap', '2026-01-11T09:03:00.000Z'],
    ['RES-007', '3515181403240003', 'Arka Rafael Prasetyo', '3515180101180002', 'Anak', '2024-03-14', 'G', 'G-02', '081332110201', 'Tetap', '2026-01-11T09:06:00.000Z'],
    ['RES-008', '3515180803610001', 'Drs. Bambang Sudibyo', '3515180101120003', 'Kepala Keluarga', '1961-03-08', 'G', 'G-03', '081134090301', 'Tetap', '2026-01-12T10:00:00.000Z'],
    ['RES-009', '3515184306640002', 'Sri Wahyuni', '3515180101120003', 'Istri', '1964-06-03', 'G', 'G-03', '081134090302', 'Tetap', '2026-01-12T10:05:00.000Z'],
    ['RES-010', '3515182209910001', 'Rizky Firmansyah', '3515180101230004', 'Kepala Keluarga', '1991-09-22', 'G', 'G-05', '085731220501', 'Kontrak', '2026-02-01T08:30:00.000Z'],
    ['RES-011', '3515186501930002', 'Ayu Lestari Putri', '3515180101230004', 'Istri', '1993-01-25', 'G', 'G-05', '085731220502', 'Kontrak', '2026-02-01T08:32:00.000Z'],
    ['RES-012', '3515185808230003', 'Kirana Senja Firmansyah', '3515180101230004', 'Anak', '2023-08-18', 'G', 'G-05', '085731220501', 'Kontrak', '2026-02-01T08:35:00.000Z'],
    ['RES-013', '3515181112830001', 'Antonius Wahyu Nugroho', '3515180101190005', 'Kepala Keluarga', '1983-12-11', 'G', 'G-06', '081235880601', 'Tetap', '2026-02-03T11:00:00.000Z'],
    ['RES-014', '3515185004860002', 'Maria Fransiska Halim', '3515180101190005', 'Istri', '1986-04-10', 'G', 'G-06', '081235880602', 'Tetap', '2026-02-03T11:04:00.000Z'],
    ['RES-015', '3515182705850001', 'Muhammad Ilham Syahputra', '3515180101200006', 'Kepala Keluarga', '1985-05-27', 'G', 'G-07', '082143190701', 'Tetap', '2026-02-08T09:15:00.000Z'],
    ['RES-016', '3515186910870002', 'Siti Nurhaliza Zahra', '3515180101200006', 'Istri', '1987-10-29', 'G', 'G-07', '082143190702', 'Tetap', '2026-02-08T09:18:00.000Z'],
    ['RES-017', '3515181502940001', 'Dedi Kurnia Saputra', '3515180101220007', 'Kepala Keluarga', '1994-02-15', 'G', 'G-08', '081938770801', 'Pindah', '2026-02-10T13:00:00.000Z'],
    ['RES-018', '3515180409740001', 'H. Achmad Fauzi, S.H.', '3515180201160008', 'Kepala Keluarga', '1974-09-04', 'F', 'F-01', '081231660101', 'Tetap', '2026-02-14T08:00:00.000Z'],
    ['RES-019', '3515184712770002', 'Hj. Lilik Handayani', '3515180201160008', 'Istri', '1977-12-07', 'F', 'F-01', '081231660102', 'Tetap', '2026-02-14T08:03:00.000Z'],
    ['RES-020', '3515180906490003', 'H. Abdul Karim', '3515180201160008', 'Orang Tua', '1949-06-09', 'F', 'F-01', '081231660101', 'Meninggal', '2026-02-14T08:06:00.000Z'],
    ['RES-021', '3515182101820001', 'Eko Prasetyawan, S.T.', '3515180201170009', 'Kepala Keluarga', '1982-01-21', 'F', 'F-02', '081330770201', 'Tetap', '2026-02-18T10:20:00.000Z'],
    ['RES-022', '3515186203840002', 'Dewi Anggraini, S.Ak.', '3515180201170009', 'Istri', '1984-03-22', 'F', 'F-02', '081330770202', 'Tetap', '2026-02-18T10:22:00.000Z'],
    ['RES-023', '3515181108130003', 'Naufal Rafif Prasetyawan', '3515180201170009', 'Anak', '2013-08-11', 'F', 'F-02', '081330770201', 'Tetap', '2026-02-18T10:24:00.000Z'],
    ['RES-024', '3515185211220004', 'Alya Nadhira Prasetyawan', '3515180201170009', 'Anak', '2022-11-12', 'F', 'F-02', '081330770202', 'Tetap', '2026-02-18T10:26:00.000Z'],
    ['RES-025', '3515183009920001', 'Yusuf Maulana', '3515180201240010', 'Kepala Keluarga', '1992-09-30', 'F', 'F-03', '085648110301', 'Kontrak', '2026-03-02T14:00:00.000Z'],
    ['RES-026', '3515184405940002', 'Intan Permatasari', '3515180201240010', 'Istri', '1994-05-04', 'F', 'F-03', '085648110302', 'Kontrak', '2026-03-02T14:02:00.000Z'],
    ['RES-027', '3515181612890001', 'dr. Rendra Pratama', '3515180201210011', 'Kepala Keluarga', '1989-12-16', 'F', 'F-05', '081131550501', 'Tetap', '2026-03-10T08:10:00.000Z'],
    ['RES-028', '3515185904910002', 'drg. Karina Widyasari', '3515180201210011', 'Istri', '1991-04-19', 'F', 'F-05', '081131550502', 'Tetap', '2026-03-10T08:12:00.000Z'],
    ['RES-029', '3515180407230003', 'Bima Sakti Pratama', '3515180201210011', 'Anak', '2023-07-04', 'F', 'F-05', '081131550501', 'Tetap', '2026-03-10T08:14:00.000Z'],
    ['RES-030', '3515180210590001', 'Ir. Sutrisno Hadi', '3515180201130012', 'Kepala Keluarga', '1959-10-02', 'F', 'F-06', '081232880601', 'Tetap', '2026-03-12T09:40:00.000Z']
  ];

  const Residents: Resident[] = residentTuples.map(
    ([id, nik, nama, no_kk, hubungan_keluarga, tgl_lahir, blok, no_rumah, no_hp, status, created_at]) => ({
      id,
      nik,
      nama,
      no_kk,
      hubungan_keluarga,
      tgl_lahir,
      blok,
      no_rumah,
      no_hp,
      status,
      created_at
    })
  );

  const Users: UserAccount[] = [
    {
      id: 'USR-001',
      username: 'admin',
      pin: '1111',
      role: 'admin',
      nama_tampilan: 'dr. Rendra Pratama (Admin)',
      resident_id: 'RES-027',
      shift_label: '',
      aktif: 'Ya',
      created_at: '2026-01-10T08:00:00.000Z'
    },
    {
      id: 'USR-002',
      username: 'ketua',
      pin: '1212',
      role: 'ketua',
      nama_tampilan: 'Ir. Hendra Wijaya, M.T.',
      resident_id: 'RES-001',
      shift_label: '',
      aktif: 'Ya',
      created_at: '2026-01-10T08:05:00.000Z'
    },
    {
      id: 'USR-003',
      username: 'wakil',
      pin: '1313',
      role: 'wakil_ketua',
      nama_tampilan: 'H. Achmad Fauzi, S.H.',
      resident_id: 'RES-018',
      shift_label: '',
      aktif: 'Ya',
      created_at: '2026-01-10T08:10:00.000Z'
    },
    {
      id: 'USR-004',
      username: 'sekretaris',
      pin: '1414',
      role: 'sekretaris',
      nama_tampilan: 'Rizky Firmansyah',
      resident_id: 'RES-010',
      shift_label: '',
      aktif: 'Ya',
      created_at: '2026-01-10T08:15:00.000Z'
    },
    {
      id: 'USR-005',
      username: 'bendahara',
      pin: '2222',
      role: 'bendahara',
      nama_tampilan: 'Eko Prasetyawan, S.T.',
      resident_id: 'RES-021',
      shift_label: '',
      aktif: 'Ya',
      created_at: '2026-01-10T08:20:00.000Z'
    },
    {
      id: 'USR-006',
      username: 'security',
      pin: '3333',
      role: 'security',
      nama_tampilan: 'Bapak Heru Purnomo (Shift Pos)',
      resident_id: '',
      shift_label: 'Shift Malam Pos Gerbang Utama',
      aktif: 'Ya',
      created_at: '2026-01-10T08:25:00.000Z'
    },
    {
      id: 'USR-007',
      username: 'warga',
      pin: '4444',
      role: 'warga',
      nama_tampilan: 'Antonius Wahyu Nugroho (G-06)',
      resident_id: 'RES-013',
      shift_label: '',
      aktif: 'Ya',
      created_at: '2026-02-03T11:05:00.000Z'
    },
    {
      id: 'USR-008',
      username: 'warga.f03',
      pin: '4545',
      role: 'warga',
      nama_tampilan: 'Yusuf Maulana (F-03)',
      resident_id: 'RES-025',
      shift_label: '',
      aktif: 'Ya',
      created_at: '2026-03-02T14:05:00.000Z'
    }
  ];

  const activeKks: Array<[string, string, CashflowEntry['metode']]> = [
    ['RES-001', 'G-01', 'Transfer'],
    ['RES-005', 'G-02', 'QRIS'],
    ['RES-008', 'G-03', 'Tunai'],
    ['RES-010', 'G-05', 'Transfer'],
    ['RES-013', 'G-06', 'Transfer'],
    ['RES-015', 'G-07', 'QRIS'],
    ['RES-018', 'F-01', 'Tunai'],
    ['RES-021', 'F-02', 'Transfer'],
    ['RES-025', 'F-03', 'QRIS'],
    ['RES-027', 'F-05', 'Transfer'],
    ['RES-030', 'F-06', 'Tunai']
  ];

  const Cashflow: CashflowEntry[] = [
    {
      id: 'CSH-001',
      tanggal: '2026-07-01',
      tipe: 'Pemasukan',
      kategori: 'Saldo Awal',
      resident_id: '',
      periode: '2026-07',
      nominal: 8500000,
      metode: 'Transfer',
      status: 'Lunas',
      bukti: 'BA-SERAHTERIMA-2026',
      keterangan: 'Saldo kas paguyuban semester I 2026',
      diverifikasi_oleh: 'Eko Prasetyawan, S.T. (Bendahara)',
      tgl_verifikasi: '2026-07-01'
    }
  ];

  let cshIdx = 2;
  const pushCash = (entry: Omit<CashflowEntry, 'id'>) => {
    Cashflow.push({ id: `CSH-${String(cshIdx++).padStart(3, '0')}`, ...entry });
  };

  (
    [
      ['2026-07', 'Juli'],
      ['2026-08', 'Agustus']
    ] as const
  ).forEach(([periode, bln], mIdx) => {
    activeKks.forEach(([resident_id, rmh, metode], idx) => {
      pushCash({
        tanggal: `${periode}-${String(3 + (idx % 7)).padStart(2, '0')}`,
        tipe: 'Pemasukan',
        kategori: 'Iuran Bulanan',
        resident_id,
        periode,
        nominal: 50000,
        metode,
        status: 'Lunas',
        bukti: `INV-${periode.slice(5)}-${rmh.replace('-', '')}`,
        keterangan: `Iuran ${bln} Blok ${rmh}`,
        diverifikasi_oleh: 'Eko Prasetyawan, S.T. (Bendahara)',
        tgl_verifikasi: `${periode}-${String(4 + (idx % 7)).padStart(2, '0')}`
      });
    });
    pushCash({
      tanggal: `${periode}-18`,
      tipe: 'Pengeluaran',
      kategori: 'Keamanan & Ketertiban',
      resident_id: '',
      periode,
      nominal: 1200000,
      metode: 'Transfer',
      status: 'Lunas',
      bukti: `KW-SEC-0${mIdx + 7}`,
      keterangan: `Insentif pos jaga malam & listrik gerbang ${bln}`,
      diverifikasi_oleh: 'Eko Prasetyawan, S.T. (Bendahara)',
      tgl_verifikasi: `${periode}-18`
    });
    pushCash({
      tanggal: `${periode}-25`,
      tipe: 'Pengeluaran',
      kategori: 'Kebersihan & Taman',
      resident_id: '',
      periode,
      nominal: 650000,
      metode: 'Tunai',
      status: 'Lunas',
      bukti: `KW-KBR-0${mIdx + 7}`,
      keterangan: `Pemangkasan taman boulevard & angkut sampah ${bln}`,
      diverifikasi_oleh: 'Eko Prasetyawan, S.T. (Bendahara)',
      tgl_verifikasi: `${periode}-25`
    });
  });

  activeKks.forEach(([resident_id, rmh, metode], idx) => {
    if (rmh === 'F-03') return;
    const status: CashflowEntry['status'] = rmh === 'G-05' ? 'Menunggu Verifikasi' : 'Lunas';
    pushCash({
      tanggal: `2026-09-${String(3 + (idx % 8)).padStart(2, '0')}`,
      tipe: 'Pemasukan',
      kategori: 'Iuran Bulanan',
      resident_id,
      periode: '2026-09',
      nominal: 50000,
      metode,
      status,
      bukti: `BUKTI-TF-09-${rmh.replace('-', '')}.jpg`,
      keterangan:
        status === 'Menunggu Verifikasi'
          ? 'Bukti transfer diunggah warga, menunggu verifikasi Bendahara'
          : `Iuran September Blok ${rmh}`,
      diverifikasi_oleh: status === 'Lunas' ? 'Eko Prasetyawan, S.T. (Bendahara)' : '',
      tgl_verifikasi: status === 'Lunas' ? '2026-09-10' : ''
    });
  });
  pushCash({
    tanggal: '2026-09-14',
    tipe: 'Pemasukan',
    kategori: 'Sewa Aset',
    resident_id: 'RES-021',
    periode: '2026-09',
    nominal: 250000,
    metode: 'Transfer',
    status: 'Lunas',
    bukti: 'SEWA-AST-09',
    keterangan: 'Sewa tenda kerucut & kursi lipat acara keluarga F-02',
    diverifikasi_oleh: 'Eko Prasetyawan, S.T. (Bendahara)',
    tgl_verifikasi: '2026-09-14'
  });
  pushCash({
    tanggal: '2026-09-20',
    tipe: 'Pengeluaran',
    kategori: 'Keamanan & Ketertiban',
    resident_id: '',
    periode: '2026-09',
    nominal: 1200000,
    metode: 'Transfer',
    status: 'Lunas',
    bukti: 'KW-SEC-09',
    keterangan: 'Insentif pos jaga malam & listrik gerbang September',
    diverifikasi_oleh: 'Eko Prasetyawan, S.T. (Bendahara)',
    tgl_verifikasi: '2026-09-20'
  });
  pushCash({
    tanggal: '2026-09-27',
    tipe: 'Pengeluaran',
    kategori: 'Perbaikan Fasilitas',
    resident_id: '',
    periode: '2026-09',
    nominal: 480000,
    metode: 'Tunai',
    status: 'Lunas',
    bukti: 'KW-LMP-09',
    keterangan: 'Penggantian 6 lampu PJU LED jalur Blok G & F',
    diverifikasi_oleh: 'Eko Prasetyawan, S.T. (Bendahara)',
    tgl_verifikasi: '2026-09-27'
  });

  activeKks.forEach(([resident_id, rmh, metode], idx) => {
    if (rmh === 'G-06' || rmh === 'F-03' || rmh === 'F-06') return;
    const status: CashflowEntry['status'] = rmh === 'G-05' || rmh === 'G-07' ? 'Menunggu Verifikasi' : 'Lunas';
    pushCash({
      tanggal: `2026-10-${String(2 + (idx % 8)).padStart(2, '0')}`,
      tipe: 'Pemasukan',
      kategori: 'Iuran Bulanan',
      resident_id,
      periode: '2026-10',
      nominal: 50000,
      metode,
      status,
      bukti: `BUKTI-TF-10-${rmh.replace('-', '')}.jpg`,
      keterangan:
        status === 'Menunggu Verifikasi'
          ? 'Bukti pembayaran diunggah warga, menunggu verifikasi Bendahara'
          : `Iuran Oktober Blok ${rmh}`,
      diverifikasi_oleh: status === 'Lunas' ? 'Eko Prasetyawan, S.T. (Bendahara)' : '',
      tgl_verifikasi: status === 'Lunas' ? '2026-10-10' : ''
    });
  });
  pushCash({
    tanggal: '2026-10-15',
    tipe: 'Pengeluaran',
    kategori: 'Kebersihan & Taman',
    resident_id: '',
    periode: '2026-10',
    nominal: 700000,
    metode: 'Tunai',
    status: 'Lunas',
    bukti: 'KW-KBR-10',
    keterangan: 'Pengangkutan sedimen drainase Blok F & perawatan taman',
    diverifikasi_oleh: 'Eko Prasetyawan, S.T. (Bendahara)',
    tgl_verifikasi: '2026-10-15'
  });

  const AuditLog: AuditLogEntry[] = [
    {
      id: 'LOG-001',
      timestamp: '2026-10-25T09:15:00.000Z',
      actor_user_id: 'USR-004',
      actor_username: 'sekretaris',
      actor_name: 'Rizky Firmansyah',
      actor_role: 'sekretaris',
      on_behalf_note: '',
      action: 'update',
      module: 'surat',
      record_id: 'LTR-006',
      summary: 'Sekretaris memverifikasi kelengkapan data pengajuan Surat Keterangan Domisili (LTR-006).'
    },
    {
      id: 'LOG-002',
      timestamp: '2026-10-26T10:30:00.000Z',
      actor_user_id: 'USR-002',
      actor_username: 'ketua',
      actor_name: 'Ir. Hendra Wijaya, M.T.',
      actor_role: 'ketua',
      on_behalf_note: '',
      action: 'approve',
      module: 'aset',
      record_id: 'BKG-004',
      summary: 'Ketua menyetujui pengajuan sewa Sound System Portable (BKG-004) untuk Blok G-06.'
    },
    {
      id: 'LOG-003',
      timestamp: '2026-10-26T14:20:00.000Z',
      actor_user_id: 'USR-001',
      actor_username: 'admin',
      actor_name: 'dr. Rendra Pratama (Admin)',
      actor_role: 'admin',
      on_behalf_note: 'oleh Admin',
      action: 'create',
      module: 'sanitasi',
      record_id: 'SAN-001',
      summary: 'Menjadwalkan pengumuman Fogging DBD seluruh jalur Blok G & F (oleh Admin).'
    }
  ];

  return {
    Residents,
    Users,
    Letters: [
      {
        id: 'LTR-001',
        no_surat: '001/PWSJR/VIII/2026',
        resident_id: 'RES-003',
        nama: 'Dimas Arya Wijaya',
        jenis: 'Pengantar KTP',
        keperluan: 'Perekaman KTP elektronik pemula usia 17 tahun di Lingkungan Sekitar',
        tgl_pengajuan: '2026-08-12',
        status: 'Disetujui',
        diverifikasi_oleh: 'Rizky Firmansyah (Sekretaris)',
        tgl_diverifikasi: '2026-08-12',
        disetujui_oleh: 'Ir. Hendra Wijaya, M.T. (Ketua)',
        tgl_disetujui: '2026-08-13'
      },
      {
        id: 'LTR-002',
        no_surat: '002/PWSJR/IX/2026',
        resident_id: 'RES-013',
        nama: 'Antonius Wahyu Nugroho',
        jenis: 'Surat Keterangan Domisili',
        keperluan: 'Kelengkapan administrasi perbankan keluarga Blok G-06',
        tgl_pengajuan: '2026-09-04',
        status: 'Disetujui',
        diverifikasi_oleh: 'Rizky Firmansyah (Sekretaris)',
        tgl_diverifikasi: '2026-09-04',
        disetujui_oleh: 'Ir. Hendra Wijaya, M.T. (Ketua)',
        tgl_disetujui: '2026-09-05'
      },
      {
        id: 'LTR-003',
        no_surat: '003/PWSJR/IX/2026',
        resident_id: 'RES-016',
        nama: 'Siti Nurhaliza Zahra',
        jenis: 'Surat Keterangan Usaha',
        keperluan: 'Pengurusan NIB usaha katering rumahan Dapur Zahra Blok G-07',
        tgl_pengajuan: '2026-09-18',
        status: 'Disetujui',
        diverifikasi_oleh: 'Rizky Firmansyah (Sekretaris)',
        tgl_diverifikasi: '2026-09-18',
        disetujui_oleh: 'H. Achmad Fauzi, S.H. (Wakil Ketua)',
        tgl_disetujui: '2026-09-19'
      },
      {
        id: 'LTR-004',
        no_surat: '',
        resident_id: 'RES-017',
        nama: 'Dedi Kurnia Saputra',
        jenis: 'Surat Keterangan Usaha',
        keperluan: 'Pengajuan izin bengkel las di garasi hunian Blok G-08',
        tgl_pengajuan: '2026-09-25',
        status: 'Ditolak',
        diverifikasi_oleh: 'Rizky Firmansyah (Sekretaris)',
        tgl_diverifikasi: '2026-09-25',
        disetujui_oleh: 'Ir. Hendra Wijaya, M.T. (Ketua)',
        tgl_disetujui: '2026-09-26'
      },
      {
        id: 'LTR-005',
        no_surat: '',
        resident_id: 'RES-025',
        nama: 'Yusuf Maulana',
        jenis: 'Surat Keterangan Domisili',
        keperluan: 'Administrasi perpanjangan STNK kendaraan sesuai domisili Blok F-03',
        tgl_pengajuan: '2026-10-24',
        status: 'Terverifikasi',
        diverifikasi_oleh: 'Rizky Firmansyah (Sekretaris)',
        tgl_diverifikasi: '2026-10-25',
        disetujui_oleh: '',
        tgl_disetujui: ''
      },
      {
        id: 'LTR-006',
        no_surat: '',
        resident_id: 'RES-014',
        nama: 'Maria Fransiska Halim',
        jenis: 'Pengantar Kartu Keluarga',
        keperluan: 'Pembaruan data pekerjaan anggota keluarga pada KK Blok G-06',
        tgl_pengajuan: '2026-10-26',
        status: 'Menunggu Verifikasi',
        diverifikasi_oleh: '',
        tgl_diverifikasi: '',
        disetujui_oleh: '',
        tgl_disetujui: ''
      }
    ],
    Guestbook: [
      makeGuest(1, 'Haryanto Wibowo', '3578101405800002', 'G', 'G-01', 'RES-001', 'Kunjungan adik kandung menginap akhir pekan', 1, 'Aktif', true),
      makeGuest(2, 'Suryadi Pratama', '3515130701870004', 'G', 'G-06', 'RES-013', 'Kerabat keluarga menginap 1 malam di G-06', 2, 'Aktif', true),
      makeGuest(3, 'Teguh Santoso', '3515082209840005', 'F', 'F-02', 'RES-021', 'Kerabat dari Malang menghadiri acara keluarga', 16),
      makeGuest(4, 'Endang Sulistyowati', '3517094806680002', 'G', 'G-02', 'RES-005', 'Kunjungan keluarga dari Jombang (melewati 24 jam)', 28),
      makeGuest(5, 'Kevin Alexander Tan', '3578182504900001', 'G', 'G-06', 'RES-013', 'Tamu kerabat dari Jakarta minggu lalu', 54),
      makeGuest(6, 'Agus Setiabudi', '3515181102770009', 'F', 'F-06', 'RES-030', 'Tamu keluarga menginap sudah lapor keluar di pos', 18, 'Selesai')
    ],
    SecurityPatrol: [
      {
        id: 'PTR-001',
        tanggal_shift: addDaysISO(today, -1),
        slot_jadwal: '21.00',
        waktu_target: `${addDaysISO(today, -1)} 21:00`,
        waktu_checkin: `${addDaysISO(today, -1)} 21:04`,
        selisih_menit: 4,
        nama_security: 'Bapak Heru Purnomo',
        area_patroli: 'Pos Gerbang Utama & Jalur Blok G',
        status: 'Tepat Waktu',
        catatan: 'Hadir tepat waktu pada jam kontrol 21.00. Gerbang utama & portal aman.'
      },
      {
        id: 'PTR-002',
        tanggal_shift: addDaysISO(today, -1),
        slot_jadwal: '23.00',
        waktu_target: `${addDaysISO(today, -1)} 23:00`,
        waktu_checkin: `${addDaysISO(today, -1)} 23:07`,
        selisih_menit: 7,
        nama_security: 'Bapak Heru Purnomo',
        area_patroli: 'Keliling Blok G-01 s.d. F-06',
        status: 'Tepat Waktu',
        catatan: 'Hadir tepat waktu pada jam kontrol 23.00. Lampu PJU menyala normal.'
      },
      {
        id: 'PTR-003',
        tanggal_shift: addDaysISO(today, -1),
        slot_jadwal: '01.00',
        waktu_target: `${today} 01:00`,
        waktu_checkin: `${today} 01:36`,
        selisih_menit: 36,
        nama_security: 'Bapak Slamet Riyanto',
        area_patroli: 'Pos Gerbang Utama & Blok F',
        status: 'Terlambat',
        catatan: 'TERLAMBAT CHECK-IN (+36 menit dari jadwal 01.00): Indikasi security ketiduran/lupa kontrol pos.'
      },
      {
        id: 'PTR-004',
        tanggal_shift: addDaysISO(today, -1),
        slot_jadwal: '03.00',
        waktu_target: `${today} 03:00`,
        waktu_checkin: `${today} 03:05`,
        selisih_menit: 5,
        nama_security: 'Bapak Heru & Bapak Slamet',
        area_patroli: 'Keliling Blok G & Blok F',
        status: 'Tepat Waktu',
        catatan: 'Hadir tepat waktu pada jam kontrol 03.00. Lingkungan kondusif.'
      },
      {
        id: 'PTR-005',
        tanggal_shift: addDaysISO(today, -1),
        slot_jadwal: '05.00',
        waktu_target: `${today} 05:00`,
        waktu_checkin: `${today} 05:03`,
        selisih_menit: 3,
        nama_security: 'Bapak Slamet Riyanto',
        area_patroli: 'Pembukaan Portal Pagi Blok G & F',
        status: 'Tepat Waktu',
        catatan: 'Hadir tepat waktu pada jam kontrol 05.00. Serah terima shift pagi.'
      }
    ],
    Complaints: [
      {
        id: 'CMP-001',
        resident_id: 'RES-013',
        no_rumah: 'G-06',
        blok: 'G',
        nama_pelapor: 'Antonius Wahyu Nugroho',
        kategori: 'Penerangan & Fasum',
        judul: 'Lampu jalan depan G-06 berkedip padam saat malam',
        deskripsi: 'Lampu PJU tiang ke-3 di jalur Blok G berkedip sejak pukul 20.00 sehingga jalan agak gelap saat kontrol malam.',
        prioritas: 'Mendesak',
        tgl_lapor: today,
        status: 'Menunggu',
        ditindaklanjuti_oleh: '',
        catatan_tindak_lanjut: '',
        tgl_update: today
      },
      {
        id: 'CMP-002',
        resident_id: 'RES-021',
        no_rumah: 'F-02',
        blok: 'F',
        nama_pelapor: 'Eko Prasetyawan, S.T.',
        kategori: 'Parkir & Akses Jalan',
        judul: 'Kendaraan tamu parkir di tikungan taman Blok F',
        deskripsi: 'Mohon bantuan petugas Security mengarahkan mobil tamu di tikungan F-02 agar akses keluar masuk warga tetap lega.',
        prioritas: 'Normal',
        tgl_lapor: today,
        status: 'Diproses',
        ditindaklanjuti_oleh: 'Bapak Heru Purnomo (Security)',
        catatan_tindak_lanjut: 'Petugas pos sudah mengarahkan pengemudi ke kantong parkir tamu dekat taman.',
        tgl_update: today
      },
      {
        id: 'CMP-003',
        resident_id: 'RES-007',
        no_rumah: 'G-03',
        blok: 'G',
        nama_pelapor: 'Bambang Suryono',
        kategori: 'Keamanan & Pos',
        judul: 'Penutupan portal gang samping tepat pukul 22.00',
        deskripsi: 'Usul agar portal akses samping dikunci rutin pukul 22.00 WIB dan keluar-masuk satu pintu melalui Pos Utama.',
        prioritas: 'Normal',
        tgl_lapor: addDaysISO(today, -2),
        status: 'Selesai',
        ditindaklanjuti_oleh: 'Bapak Slamet Riyanto (Security)',
        catatan_tindak_lanjut: 'Portal samping sudah dikunci rutin pukul 22.00 WIB setiap malam dan dicek saat patroli 23.00.',
        tgl_update: addDaysISO(today, -1)
      }
    ],
    Sanitation: [
      { id: 'SAN-001', jenis: 'Fogging DBD', tgl_jadwal: addDaysISO(today, 2), lokasi: 'Seluruh Jalur Blok G & Blok F', petugas: 'Tim Puskesmas Sedati & Seksi Lingkungan', status: 'Terjadwal', catatan: 'Warga dimohon menutup makanan dan membuka ventilasi pukul 07.30 WIB.' },
      { id: 'SAN-002', jenis: 'Pembersihan Selokan', tgl_jadwal: addDaysISO(today, 5), lokasi: 'Saluran Drainase Utama Blok G-01 s.d. G-08', petugas: 'Pak Slamet, Pak Roni, & Kerja Bakti Warga', status: 'Terjadwal', catatan: 'Pengerukan endapan lumpur menjelang puncak musim hujan.' },
      { id: 'SAN-003', jenis: 'Kerja Bakti Taman', tgl_jadwal: addDaysISO(today, 14), lokasi: 'Taman Bermain & Boulevard Blok F', petugas: 'Seksi Kebersihan & Warga Blok F', status: 'Terjadwal', catatan: 'Pemangkasan dahan pohon pelindung dekat jaringan lampu jalan.' },
      { id: 'SAN-004', jenis: 'Pembersihan Selokan', tgl_jadwal: '2026-10-12', lokasi: 'Saluran Drainase Blok F-01 s.d. F-06', petugas: 'Pak Slamet & Tim Kebersihan', status: 'Selesai', catatan: '4 karung sedimen dan sampah daun telah diangkut ke TPS.' },
      { id: 'SAN-005', jenis: 'Fogging DBD', tgl_jadwal: '2026-09-20', lokasi: 'Area Taman Tengah & Blok G', petugas: 'Tim Kesehatan Lingkungan', status: 'Selesai', catatan: 'Pelaksanaan lancar untuk pencegahan jentik nyamuk.' },
      { id: 'SAN-006', jenis: 'Pembersihan Selokan', tgl_jadwal: '2026-09-06', lokasi: 'Gorong-gorong Pos Gerbang Utama', petugas: 'Pak Roni & Security', status: 'Selesai', catatan: 'Aliran air ke saluran induk resort lancar kembali.' }
    ],
    SocialFund: [
      { id: 'SOC-001', tipe: 'Donasi Masuk', nama_terkait: 'Kolektif Warga Blok G & F', deskripsi: 'Saldo awal dan donasi sukarela kotak sosial triwulan III', nominal: 3500000, tanggal: '2026-07-05', status: 'Terkumpul' },
      { id: 'SOC-002', tipe: 'Donasi Masuk', nama_terkait: 'H. Achmad Fauzi (Blok F-01)', deskripsi: 'Infak sosial warga untuk kas santunan paguyuban', nominal: 1500000, tanggal: '2026-08-10', status: 'Terkumpul' },
      { id: 'SOC-003', tipe: 'Kabar Duka', nama_terkait: 'Kel. H. Achmad Fauzi (Alm. H. Abdul Karim)', deskripsi: 'Santunan duka cita dan karangan bunga paguyuban Blok F-01', nominal: 1250000, tanggal: '2026-08-19', status: 'Disalurkan' },
      { id: 'SOC-004', tipe: 'Kabar Sakit', nama_terkait: 'Ibu Sri Wahyuni (Blok G-03)', deskripsi: 'Bingkisan dan santunan rawat inap RS Mitra Keluarga Waru', nominal: 500000, tanggal: '2026-09-08', status: 'Disalurkan' },
      { id: 'SOC-005', tipe: 'Donasi Masuk', nama_terkait: 'dr. Rendra Pratama (Blok F-05)', deskripsi: 'Donasi dana sosial peduli kesehatan warga', nominal: 1200000, tanggal: '2026-09-15', status: 'Terkumpul' },
      { id: 'SOC-006', tipe: 'Bantuan Bencana', nama_terkait: 'Posko Banjir Rob Lingkungan Sekitar', deskripsi: 'Penyaluran paket sembako dan air bersih atas nama warga lingkungan', nominal: 1000000, tanggal: '2026-09-28', status: 'Disalurkan' },
      { id: 'SOC-007', tipe: 'Kabar Sakit', nama_terkait: 'Ananda Bima Sakti (Blok F-05)', deskripsi: 'Kunjungan perwakilan pengurus dan buah tangan pemulihan', nominal: 350000, tanggal: '2026-10-11', status: 'Disalurkan' },
      { id: 'SOC-008', tipe: 'Bantuan Bencana', nama_terkait: 'Perbaikan Atap Pos Jaga Angin Kencang', deskripsi: 'Usulan bantuan darurat perbaikan talang pos security warga', nominal: 600000, tanggal: '2026-10-25', status: 'Menunggu' }
    ],
    Cashflow,
    Assets: [
      { id: 'AST-001', nama: 'Tenda Kerucut 4x4 Meter', kategori: 'Tenda & Panggung', stok: 2, kondisi: 'Baik', tarif_sewa: 150000, deposit: 200000 },
      { id: 'AST-002', nama: 'Kursi Lipat Chitose (Paket 25 Unit)', kategori: 'Meja & Kursi', stok: 4, kondisi: 'Baik', tarif_sewa: 50000, deposit: 100000 },
      { id: 'AST-003', nama: 'Meja Prasmanan Lipat', kategori: 'Meja & Kursi', stok: 6, kondisi: 'Baik', tarif_sewa: 25000, deposit: 50000 },
      { id: 'AST-004', nama: 'Sound System Portable & 2 Mic Wireless', kategori: 'Elektronik', stok: 2, kondisi: 'Baik', tarif_sewa: 100000, deposit: 250000 },
      { id: 'AST-005', nama: 'Mesin Fogging Thermal Tasco', kategori: 'Sanitasi', stok: 1, kondisi: 'Baik', tarif_sewa: 0, deposit: 150000 },
      { id: 'AST-006', nama: 'Tangga Aluminium Teleskopik 5 Meter', kategori: 'Perkakas', stok: 2, kondisi: 'Baik', tarif_sewa: 20000, deposit: 50000 },
      { id: 'AST-007', nama: 'Gerobak Dorong Kerja Bakti', kategori: 'Kebersihan', stok: 3, kondisi: 'Baik', tarif_sewa: 0, deposit: 0 },
      { id: 'AST-008', nama: 'Lampu Sorot LED Darurat 100W', kategori: 'Elektronik', stok: 4, kondisi: 'Perlu Perbaikan', tarif_sewa: 15000, deposit: 50000 }
    ],
    Bookings: [
      {
        id: 'BKG-001',
        asset_id: 'AST-001',
        resident_id: 'RES-021',
        qty: 1,
        tgl_mulai: '2026-09-14',
        tgl_selesai: '2026-09-14',
        status: 'Selesai',
        total_biaya: 350000,
        stok_diverifikasi_oleh: 'Rizky Firmansyah (Sekretaris)',
        disetujui_oleh: 'Ir. Hendra Wijaya, M.T. (Ketua)',
        tgl_disetujui: '2026-09-12',
        biaya_dicatat_oleh: 'Eko Prasetyawan, S.T. (Bendahara)',
        cashflow_id: 'CSH-038'
      },
      {
        id: 'BKG-002',
        asset_id: 'AST-001',
        resident_id: 'RES-001',
        qty: 1,
        tgl_mulai: addDaysISO(today, 1),
        tgl_selesai: addDaysISO(today, 2),
        status: 'Aktif',
        total_biaya: 500000,
        stok_diverifikasi_oleh: 'Rizky Firmansyah (Sekretaris)',
        disetujui_oleh: 'H. Achmad Fauzi, S.H. (Wakil Ketua)',
        tgl_disetujui: today,
        biaya_dicatat_oleh: 'Eko Prasetyawan, S.T. (Bendahara)',
        cashflow_id: 'CSH-001'
      },
      {
        id: 'BKG-003',
        asset_id: 'AST-004',
        resident_id: 'RES-013',
        qty: 1,
        tgl_mulai: addDaysISO(today, 4),
        tgl_selesai: addDaysISO(today, 5),
        status: 'Disetujui',
        total_biaya: 450000,
        stok_diverifikasi_oleh: 'Rizky Firmansyah (Sekretaris)',
        disetujui_oleh: 'Ir. Hendra Wijaya, M.T. (Ketua)',
        tgl_disetujui: today,
        biaya_dicatat_oleh: '',
        cashflow_id: ''
      },
      {
        id: 'BKG-004',
        asset_id: 'AST-006',
        resident_id: 'RES-025',
        qty: 1,
        tgl_mulai: addDaysISO(today, 6),
        tgl_selesai: addDaysISO(today, 7),
        status: 'Menunggu',
        total_biaya: 90000,
        stok_diverifikasi_oleh: 'Rizky Firmansyah (Sekretaris)',
        disetujui_oleh: '',
        tgl_disetujui: '',
        biaya_dicatat_oleh: '',
        cashflow_id: ''
      },
      {
        id: 'BKG-005',
        asset_id: 'AST-003',
        resident_id: 'RES-013',
        qty: 2,
        tgl_mulai: addDaysISO(today, 8),
        tgl_selesai: addDaysISO(today, 8),
        status: 'Menunggu',
        total_biaya: 100000,
        stok_diverifikasi_oleh: '',
        disetujui_oleh: '',
        tgl_disetujui: '',
        biaya_dicatat_oleh: '',
        cashflow_id: ''
      }
    ],
    AuditLog
  };
}
