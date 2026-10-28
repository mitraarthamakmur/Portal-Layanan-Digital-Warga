const SHEET_SCHEMAS = {
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
  Sanitation: [
    'id', 'jenis', 'tgl_jadwal', 'lokasi', 'petugas', 'status', 'catatan'
  ],
  SocialFund: [
    'id', 'tipe', 'nama_terkait', 'deskripsi', 'nominal', 'tanggal', 'status'
  ],
  Cashflow: [
    'id', 'tanggal', 'tipe', 'kategori', 'resident_id', 'periode',
    'nominal', 'metode', 'status', 'bukti', 'keterangan',
    'diverifikasi_oleh', 'tgl_verifikasi'
  ],
  Assets: [
    'id', 'nama', 'kategori', 'stok', 'kondisi', 'tarif_sewa', 'deposit'
  ],
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

// Keep identifier and phone columns formatted as plain text so Sheets never
// strips leading zeros or rounds 16-digit NIK/KK numbers to float precision.
const TEXT_COLUMNS = {
  Residents: ['id', 'nik', 'no_kk', 'no_hp', 'no_rumah'],
  Users: ['id', 'username', 'pin', 'resident_id'],
  Letters: ['id', 'no_surat', 'resident_id'],
  Guestbook: ['id', 'no_identitas', 'no_rumah', 'resident_id', 'jam_masuk'],
  SecurityPatrol: ['id', 'tanggal_shift', 'slot_jadwal', 'waktu_target', 'waktu_checkin'],
  Complaints: ['id', 'resident_id', 'no_rumah', 'tgl_lapor', 'tgl_update'],
  Sanitation: ['id'],
  SocialFund: ['id'],
  Cashflow: ['id', 'resident_id', 'periode'],
  Assets: ['id'],
  Bookings: ['id', 'asset_id', 'resident_id', 'cashflow_id'],
  AuditLog: ['id', 'timestamp', 'actor_user_id', 'record_id']
};

const NUMERIC_COLUMNS = {
  SecurityPatrol: ['selisih_menit'],
  SocialFund: ['nominal'],
  Cashflow: ['nominal'],
  Assets: ['stok', 'tarif_sewa', 'deposit'],
  Bookings: ['qty', 'total_biaya']
};

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const created = [];

  Object.keys(SHEET_SCHEMAS).forEach(function (sheetName) {
    const headers = SHEET_SCHEMAS[sheetName];
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      created.push(sheetName);
    }

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      const mismatch = headers.some(function (h, idx) {
        return String(existing[idx] || '').trim() !== h;
      });
      if (mismatch) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }

    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    applyTextColumnFormats_(sheet, sheetName, headers);
  });

  SpreadsheetApp.flush();
  Logger.log('Setup 12 sheet berhasil: ' + Object.keys(SHEET_SCHEMAS).join(', '));
  return {
    ok: true,
    created: created,
    sheets: Object.keys(SHEET_SCHEMAS)
  };
}

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const token = String(params.token || '');

    if (!isAuthorized_(token)) {
      return jsonResponse_({ ok: false, error: 'Unauthorized' });
    }

    const action = String(params.action || 'list').toLowerCase();
    if (action === 'setup' || action === 'ping') {
      return jsonResponse_(setup());
    }

    const sheetName = String(params.sheet || '');

    if (action !== 'list') {
      return jsonResponse_({ ok: false, error: 'Unsupported GET action: ' + action });
    }

    if (! isValidSheet_(sheetName)) {
      return jsonResponse_({ ok: false, error: 'Invalid sheet name: ' + sheetName });
    }

    const sheet = ensureSheet_(sheetName);
    const rows = readRows_(sheet, SHEET_SCHEMAS[sheetName], sheetName);
    return jsonResponse_({ ok: true, data: rows, rows: rows });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || typeof e.postData.contents !== 'string') {
      return jsonResponse_({ ok: false, error: 'Missing request body' });
    }

    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse_({ ok: false, error: 'Invalid JSON payload' });
    }

    const token = String(body.token || '');
    if (!isAuthorized_(token)) {
      return jsonResponse_({ ok: false, error: 'Unauthorized' });
    }

    const action = String(body.action || '').toLowerCase();
    const sheetName = String(body.sheet || '');

    if (!isValidSheet_(sheetName)) {
      return jsonResponse_({ ok: false, error: 'Invalid sheet name: ' + sheetName });
    }

    const headers = SHEET_SCHEMAS[sheetName];

    if (action === 'list') {
      const readSheet = ensureSheet_(sheetName);
      return jsonResponse_({ ok: true, data: readRows_(readSheet, headers, sheetName) });
    }

    if (['create', 'update', 'delete'].indexOf(action) === -1) {
      return jsonResponse_({ ok: false, error: 'Unsupported action: ' + action });
    }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) {
      return jsonResponse_({ ok: false, error: 'Server sedang memproses perubahan lain. Coba sesaat lagi.' });
    }

    try {
      const sheet = ensureSheet_(sheetName);
      const data = (body.data && typeof body.data === 'object') ? body.data : {};
      const recordId = String(body.id || data.id || '').trim();

      if (!recordId) {
        return jsonResponse_({ ok: false, error: 'Field id wajib diisi' });
      }

      if (action === 'create') {
        const existingRow = findRowIndexById_(sheet, recordId);
        const normalized = Object.assign({}, data, { id: recordId });
        const rowValues = toRowValues_(headers, normalized, sheetName);

        // Upsert when retrying a queued create that already landed on an earlier attempt.
        if (existingRow !== -1) {
          writeRowAsTyped_(sheet, existingRow, headers, rowValues, sheetName);
        } else {
          const targetRow = sheet.getLastRow() + 1;
          writeRowAsTyped_(sheet, targetRow, headers, rowValues, sheetName);
        }
        return jsonResponse_({ ok: true, data: rowObjectFromValues_(headers, rowValues, sheetName) });
      }

      if (action === 'update') {
        const updateRow = findRowIndexById_(sheet, recordId);
        const mergedPayload = Object.assign({}, data, { id: recordId });

        if (updateRow === -1) {
          const newRow = sheet.getLastRow() + 1;
          const createVals = toRowValues_(headers, mergedPayload, sheetName);
          writeRowAsTyped_(sheet, newRow, headers, createVals, sheetName);
          return jsonResponse_({ ok: true, data: rowObjectFromValues_(headers, createVals, sheetName) });
        }

        const currentRaw = sheet.getRange(updateRow, 1, 1, headers.length).getValues()[0];
        const currentObj = rowObjectFromValues_(headers, currentRaw, sheetName);
        const updatedObj = Object.assign({}, currentObj, mergedPayload, { id: recordId });
        const updatedVals = toRowValues_(headers, updatedObj, sheetName);
        writeRowAsTyped_(sheet, updateRow, headers, updatedVals, sheetName);
        return jsonResponse_({ ok: true, data: rowObjectFromValues_(headers, updatedVals, sheetName) });
      }

      if (action === 'delete') {
        const deleteRow = findRowIndexById_(sheet, recordId);
        if (deleteRow === -1) {
          return jsonResponse_({ ok: true, data: { id: recordId, deleted: false } });
        }
        sheet.deleteRow(deleteRow);
        return jsonResponse_({ ok: true, data: { id: recordId, deleted: true } });
      }

      return jsonResponse_({ ok: false, error: 'Unhandled action' });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function isAuthorized_(providedToken) {
  const rawExpected = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  const expected = rawExpected ? String(rawExpected).trim() : '';
  // Jika Script Property API_TOKEN tidak diisi, izinkan akses langsung lewat URL /exec
  if (!expected) return true;
  if (!providedToken || expected.length !== providedToken.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ providedToken.charCodeAt(i);
  }
  return diff === 0;
}

function isValidSheet_(sheetName) {
  return Object.prototype.hasOwnProperty.call(SHEET_SCHEMAS, sheetName);
}

function ensureSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    applyTextColumnFormats_(sheet, sheetName, headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function applyTextColumnFormats_(sheet, sheetName, headers) {
  const textCols = TEXT_COLUMNS[sheetName] || [];
  const rowCount = Math.min(Math.max(sheet.getMaxRows() - 1, 1), 300);
  textCols.forEach(function (colName) {
    const colIdx = headers.indexOf(colName);
    if (colIdx !== -1) {
      sheet.getRange(2, colIdx + 1, rowCount, 1).setNumberFormat('@');
    }
  });
}

function findRowIndexById_(sheet, targetId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < idColumnValues.length; i++) {
    if (String(idColumnValues[i][0]).trim() === targetId) {
      return i + 2;
    }
  }
  return -1;
}

function readRows_(sheet, headers, sheetName) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rawMatrix = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const rows = [];

  for (let r = 0; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    const idVal = String(row[0] === null || row[0] === undefined ? '' : row[0]).trim();
    if (!idVal) continue;
    rows.push(rowObjectFromValues_(headers, row, sheetName));
  }
  return rows;
}

function toRowValues_(headers, obj, sheetName) {
  const numCols = NUMERIC_COLUMNS[sheetName] || [];
  return headers.map(function (key) {
    const val = obj[key];
    if (val === undefined || val === null) return '';
    if (val instanceof Date) return val.toISOString();
    if (numCols.indexOf(key) !== -1) {
      const parsed = Number(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return String(val);
  });
}

function writeRowAsTyped_(sheet, rowNumber, headers, values, sheetName) {
  const textCols = TEXT_COLUMNS[sheetName] || [];
  headers.forEach(function (colName, idx) {
    if (textCols.indexOf(colName) !== -1) {
      sheet.getRange(rowNumber, idx + 1).setNumberFormat('@');
    }
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
}

function rowObjectFromValues_(headers, rowValues, sheetName) {
  const numCols = NUMERIC_COLUMNS[sheetName] || [];
  const item = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i];
    const raw = rowValues[i];
    if (raw instanceof Date) {
      item[key] = raw.toISOString();
    } else if (raw === null || raw === undefined) {
      item[key] = '';
    } else if (numCols.indexOf(key) !== -1 && raw !== '') {
      const parsed = Number(raw);
      item[key] = isNaN(parsed) ? 0 : parsed;
    } else {
      item[key] = String(raw);
    }
  }
  return item;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
