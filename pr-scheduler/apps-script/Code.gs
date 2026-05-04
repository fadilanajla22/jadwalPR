// ============================================================
//  PR Scheduler — Google Apps Script Backend
//  Deploy: Extensions > Apps Script > Deploy > Web App
//  Execute as: Me | Who has access: Anyone
// ============================================================

const SHEET_NAME = "PR_Data";
const HEADERS    = ["ID", "Mata Pelajaran", "Judul", "Deskripsi", "Deadline", "Prioritas", "Status"];

// ----------------------------------------------------------
// Ambil atau buat sheet dengan header otomatis
// ----------------------------------------------------------
function getSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    // Style header
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold")
               .setBackground("#EAE0D5")
               .setFontColor("#333333");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ----------------------------------------------------------
// Generate ID unik berbasis timestamp
// ----------------------------------------------------------
function generateId() {
  return "PR_" + new Date().getTime();
}

// ----------------------------------------------------------
// CORS helper — response JSON dengan header yang benar
// ----------------------------------------------------------
function buildResponse(data) {
  // Apps Script otomatis handle CORS untuk GET
  // Untuk POST, kita perlu pastikan output type JSON
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Tambahan: handle OPTIONS preflight (kadang dibutuhkan browser)
function doOptions(e) {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
//  GET  — ambil semua data atau berdasarkan ID
//  Contoh URL: ?action=getAll
//              ?action=getById&id=PR_1234567890
// ============================================================
function doGet(e) {
  try {
    const action = e.parameter.action || "getAll";
    const id     = e.parameter.id     || null;

    if (action === "getAll")   return buildResponse(getAllData());
    if (action === "getById")  return buildResponse(getById(id));

    return buildResponse({ success: false, error: "Action tidak dikenal" });
  } catch (err) {
    return buildResponse({ success: false, error: err.message });
  }
}

// ============================================================
//  POST — create / update / delete
//  Body JSON: { action: "create"|"update"|"delete", id?, data? }
//  Catatan: frontend mengirim tanpa Content-Type header
//           agar tidak trigger CORS preflight
// ============================================================
function doPost(e) {
  try {
    // e.postData bisa null jika request tidak punya body
    if (!e.postData || !e.postData.contents) {
      return buildResponse({ success: false, error: "Body request kosong" });
    }

    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === "create") return buildResponse(createData(body.data));
    if (action === "update") return buildResponse(updateData(body.id, body.data));
    if (action === "delete") return buildResponse(deleteData(body.id));

    return buildResponse({ success: false, error: "Action tidak dikenal: " + action });
  } catch (err) {
    // Log error ke Apps Script execution log untuk debugging
    console.error("doPost error:", err.message);
    return buildResponse({ success: false, error: err.message });
  }
}

// ============================================================
//  CRUD FUNCTIONS
// ============================================================

// READ ALL
function getAllData() {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();

  if (rows.length <= 1) return { success: true, data: [] };

  const data = rows.slice(1)
    .filter(row => row[0] !== "")   // skip baris kosong
    .map(row => ({
      id:            row[0],
      mataPelajaran: row[1],
      judul:         row[2],
      deskripsi:     row[3],
      deadline:      row[4],
      prioritas:     row[5],
      status:        row[6]
    }));

  return { success: true, data };
}

// READ BY ID
function getById(id) {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();
  const row   = rows.find(r => r[0] === id);

  if (!row) return { success: false, error: "Data tidak ditemukan" };

  return {
    success: true,
    data: {
      id: row[0], mataPelajaran: row[1], judul: row[2],
      deskripsi: row[3], deadline: row[4], prioritas: row[5], status: row[6]
    }
  };
}

// CREATE
function createData(data) {
  const sheet = getSheet();
  const id    = generateId();

  sheet.appendRow([
    id,
    data.mataPelajaran || "",
    data.judul         || "",
    data.deskripsi     || "",
    data.deadline      || "",
    data.prioritas     || "Sedang",
    data.status        || "Belum Selesai"
  ]);

  return { success: true, id };
}

// UPDATE
function updateData(id, data) {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const r = i + 1; // nomor baris di sheet (1-indexed)
      sheet.getRange(r, 2).setValue(data.mataPelajaran);
      sheet.getRange(r, 3).setValue(data.judul);
      sheet.getRange(r, 4).setValue(data.deskripsi);
      sheet.getRange(r, 5).setValue(data.deadline);
      sheet.getRange(r, 6).setValue(data.prioritas);
      sheet.getRange(r, 7).setValue(data.status);
      return { success: true };
    }
  }

  return { success: false, error: "Data tidak ditemukan" };
}

// DELETE
function deleteData(id) {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: "Data tidak ditemukan" };
}
