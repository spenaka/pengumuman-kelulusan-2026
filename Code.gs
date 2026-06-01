/**
 * ============================================================
 * Code.gs — VERSI API PUBLIK untuk Cloudflare Pages
 * 
 * CARA DEPLOY:
 * 1. Di GAS: klik "Deploy" → "New Deployment"
 * 2. Pilih type: Web App
 * 3. Execute as: Me
 * 4. Who has access: Anyone  ← WAJIB agar bisa diakses publik
 * 5. Klik Deploy → copy URL yang diberikan
 * 6. Paste URL tersebut ke variabel GAS_URL di index.html
 * ============================================================
 */

const SPREADSHEET_ID = '170ZjH1ONRL2Bj7OlyPUTWDzjCTVzswxtQL9SO4y_gms';
const SHEET_NAME     = 'DataKelulusan';

/**
 * Menerima request GET dari Cloudflare Pages
 * Parameter: ?nisn=...&tgl=...  (tgl format: DD/MM/YYYY)
 */
function doGet(e) {
  // Izinkan akses dari domain manapun (CORS)
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const nisn = (e.parameter.nisn || '').toString().trim();
    const tgl = (e.parameter.tgl || '').toString().trim(); // DD/MM/YYYY

    if (!nisn || !tgl) {
      output.setContent(JSON.stringify({
        success: false,
        message: 'Parameter NISN dan tanggal lahir (tgl) diperlukan.'
      }));
      return output;
    }

    const result = searchStudent(nisn, tgl);

    if (result) {
      output.setContent(JSON.stringify({ success: true, data: result }));
    } else {
      output.setContent(JSON.stringify({
        success: false,
        message: 'Data tidak ditemukan. Periksa kembali NISN dan Tanggal Lahir Anda.'
      }));
    }
  } catch (err) {
    output.setContent(JSON.stringify({
      success: false,
      message: 'Terjadi kesalahan server: ' + err.message
    }));
  }

  return output;
}

/**
 * Mencari siswa berdasarkan NISN dan Tanggal Lahir
 * @param {string} nisn - NISN siswa
 * @param {string} birthDate - Tanggal lahir format DD/MM/YYYY
 * @return {Object|null}
 */
function searchStudent(nisn, birthDate) {
  if (!nisn || !birthDate) return null;

  const nisnInput = nisn.toString().trim();
  const dobInput = birthDate.toString().trim(); // DD/MM/YYYY

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" tidak ditemukan.');

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase().trim());

  const nisnIndex   = headers.indexOf('nisn');
  const dobIndex   = headers.indexOf('tanggal_lahir');
  const namaIndex  = headers.indexOf('nama siswa');
  const kelasIndex = headers.indexOf('kelas');
  const statIndex  = headers.indexOf('status kelulusan');
  const sklIndex   = headers.indexOf('link skl di google drive');

  if (nisnIndex  === -1) throw new Error('Kolom "nisn" tidak ditemukan.');
  if (dobIndex  === -1) throw new Error('Kolom "tanggal_lahir" tidak ditemukan.');

  for (let i = 1; i < data.length; i++) {
    const row      = data[i];
    const sheetNisn = row[nisnIndex].toString().trim();
    const sheetDob = normalizeTanggal(row[dobIndex]); // selalu DD/MM/YYYY

    Logger.log(`Row ${i} → NISN:[${sheetNisn}] DOB:[${sheetDob}] | Input → NISN:[${nisnInput}] DOB:[${dobInput}]`);

    if (sheetNisn === nisnInput && sheetDob === dobInput) {
      return {
        nisn    : sheetNisn,
        nama   : namaIndex  >= 0 ? row[namaIndex].toString()  : '',
        kelas  : kelasIndex >= 0 ? row[kelasIndex].toString()  : '',
        status : statIndex  >= 0 ? row[statIndex].toString()   : '',
        url_skl: sklIndex   >= 0 ? row[sklIndex].toString()    : ''
      };
    }
  }

  return null;
}

/**
 * Normalisasi berbagai format tanggal → DD/MM/YYYY
 */
function normalizeTanggal(raw) {
  if (!raw) return '';

  if (raw instanceof Date) {
    return Utilities.formatDate(raw, 'Asia/Jakarta', 'dd/MM/yyyy');
  }

  let str = raw.toString().trim().replace(/-/g, '/');

  // Format YYYY/MM/DD → DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 3 && parts[0].length === 4) {
    str = parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  return str;
}
