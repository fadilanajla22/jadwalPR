// ============================================================
//  api.js — Layer komunikasi data
//  Mendukung dua mode: Google Sheets API & LocalStorage
// ============================================================

// ============================================================
//  GOOGLE SHEETS API (via Apps Script Web App)
// ============================================================
const SheetsAPI = {
  url: () => CONFIG.APPS_SCRIPT_URL,

  // GET semua data
  async getAll() {
    const res  = await fetch(`${this.url()}?action=getAll`, { redirect: "follow" });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error("Response bukan JSON. Cek deploy Apps Script. Response: " + text.slice(0, 200)); }
    if (!json.success) throw new Error(json.error || "Gagal mengambil data");
    return json.data;
  },

  // Helper POST — Apps Script hanya terima body tanpa Content-Type header
  // (Content-Type: application/json menyebabkan preflight CORS yang gagal)
  async _post(payload) {
    const res = await fetch(this.url(), {
      method     : "POST",
      // Tidak set Content-Type agar browser tidak kirim preflight OPTIONS
      // Apps Script membaca body via e.postData.contents
      body       : JSON.stringify(payload),
      redirect   : "follow",
    });
    // Apps Script kadang return teks biasa jika ada error deploy
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Response bukan JSON. Cek apakah Web App sudah di-deploy ulang. Response: " + text.slice(0, 200));
    }
  },

  // POST create
  async create(data) {
    const json = await this._post({ action: "create", data });
    if (!json.success) throw new Error(json.error || "Gagal menyimpan data");
    return json;
  },

  // POST update
  async update(id, data) {
    const json = await this._post({ action: "update", id, data });
    if (!json.success) throw new Error(json.error || "Gagal memperbarui data");
    return json;
  },

  // POST delete
  async delete(id) {
    const json = await this._post({ action: "delete", id });
    if (!json.success) throw new Error(json.error || "Gagal menghapus data");
    return json;
  },
};

// ============================================================
//  LOCAL STORAGE API (fallback / mode offline)
// ============================================================
const LocalAPI = {
  KEY: "pr_scheduler_data",

  _load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },
  _save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },
  _id() {
    return "PR_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  },

  async getAll() {
    return this._load();
  },

  async create(data) {
    const list = this._load();
    const id   = this._id();
    list.push({ id, ...data, status: data.status || "Belum Selesai" });
    this._save(list);
    return { success: true, id };
  },

  async update(id, data) {
    const list = this._load();
    const idx  = list.findIndex(d => d.id === id);
    if (idx === -1) throw new Error("Data tidak ditemukan");
    list[idx] = { id, ...data };
    this._save(list);
    return { success: true };
  },

  async delete(id) {
    const list = this._load().filter(d => d.id !== id);
    this._save(list);
    return { success: true };
  },
};

// ============================================================
//  API — pilih mode berdasarkan CONFIG.MODE
// ============================================================
const API = {
  _driver() {
    return CONFIG.MODE === "sheets" ? SheetsAPI : LocalAPI;
  },
  getAll()        { return this._driver().getAll(); },
  create(data)    { return this._driver().create(data); },
  update(id, data){ return this._driver().update(id, data); },
  delete(id)      { return this._driver().delete(id); },
};
