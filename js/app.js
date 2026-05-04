// ============================================================
//  app.js — Logic utama PR Scheduler
// ============================================================

// ============================================================
//  DATA DUMMY (hanya dipakai saat mode "local" & data kosong)
// ============================================================
const DUMMY_DATA = [
  {
    id: "PR_DEMO_1", mataPelajaran: "Matematika",
    judul: "Latihan Soal Integral Bab 5", deskripsi: "Kerjakan soal nomor 1-20 di LKS halaman 87.",
    deadline: offsetDate(1), prioritas: "Tinggi", status: "Belum Selesai"
  },
  {
    id: "PR_DEMO_2", mataPelajaran: "Bahasa Indonesia",
    judul: "Rangkuman Cerpen", deskripsi: "Buat rangkuman cerpen 'Robohnya Surau Kami'.",
    deadline: offsetDate(2), prioritas: "Sedang", status: "Belum Selesai"
  },
  {
    id: "PR_DEMO_3", mataPelajaran: "Pemrograman Web",
    judul: "Buat Halaman Login HTML/CSS", deskripsi: "Desain halaman login yang responsive.",
    deadline: offsetDate(5), prioritas: "Tinggi", status: "Sedang Dikerjakan"
  },
  {
    id: "PR_DEMO_4", mataPelajaran: "Basis Data",
    judul: "ERD Sistem Perpustakaan", deskripsi: "Buat ERD lengkap dengan relasi antar tabel.",
    deadline: offsetDate(7), prioritas: "Sedang", status: "Belum Selesai"
  },
  {
    id: "PR_DEMO_5", mataPelajaran: "Fisika",
    judul: "Laporan Praktikum Gerak Lurus", deskripsi: "",
    deadline: offsetDate(10), prioritas: "Rendah", status: "Selesai"
  },
];

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ============================================================
//  STATE
// ============================================================
let allData      = [];
let filteredData = [];
let deleteId     = null;
let currentView  = "list";
let calDate      = new Date();

// ============================================================
//  DOM REFS
// ============================================================
const $ = id => document.getElementById(id);
const prList        = $("prList");
const loading       = $("loading");
const emptyState    = $("emptyState");
const notifBanner   = $("notifBanner");
const modalOverlay  = $("modalOverlay");
const confirmOverlay= $("confirmOverlay");
const prForm        = $("prForm");
const filterMapel   = $("filterMapel");
const filterPrioritas = $("filterPrioritas");
const filterStatus  = $("filterStatus");
const filterDeadline= $("filterDeadline");

// ============================================================
//  INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadData();
  lucide.createIcons();
});

// ============================================================
//  LOAD DATA
// ============================================================
async function loadData() {
  showLoading(true);
  try {
    let data = await API.getAll();

    // Isi dummy data jika mode local & kosong
    if (CONFIG.MODE === "local" && data.length === 0) {
      for (const d of DUMMY_DATA) await API.create(d);
      data = await API.getAll();
    }

    allData = data;
    populateMapelFilter();
    applyFilter();
    checkNotif();
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat data: " + err.message, "error");
  } finally {
    showLoading(false);
  }
}

// ============================================================
//  EVENT BINDING
// ============================================================
function bindEvents() {
  // Header
  $("btnTambah").addEventListener("click", openAddModal);

  // Modal form
  $("btnCloseModal").addEventListener("click", closeModal);
  $("btnCancel").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) closeModal(); });
  prForm.addEventListener("submit", handleSubmit);

  // Konfirmasi hapus
  $("btnCancelDel").addEventListener("click", () => {
    confirmOverlay.classList.add("hidden");
    deleteId = null;
  });
  $("btnConfirmDel").addEventListener("click", doDelete);

  // Filter
  filterMapel.addEventListener("change", applyFilter);
  filterPrioritas.addEventListener("change", applyFilter);
  filterStatus.addEventListener("change", applyFilter);
  filterDeadline.addEventListener("change", applyFilter);
  $("btnReset").addEventListener("click", resetFilter);

  // Tabs
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Kalender navigasi
  $("prevMonth").addEventListener("click", () => {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendar();
  });
  $("nextMonth").addEventListener("click", () => {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendar();
  });
}

// ============================================================
//  FILTER
// ============================================================
function populateMapelFilter() {
  const mapels   = [...new Set(allData.map(d => d.mataPelajaran))].sort();
  const current  = filterMapel.value;
  filterMapel.innerHTML = '<option value="">Semua</option>';
  mapels.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m; opt.textContent = m;
    if (m === current) opt.selected = true;
    filterMapel.appendChild(opt);
  });
}

function applyFilter() {
  const mapel     = filterMapel.value;
  const prioritas = filterPrioritas.value;
  const status    = filterStatus.value;
  const deadline  = filterDeadline.value;

  filteredData = allData.filter(pr => {
    if (mapel     && pr.mataPelajaran !== mapel)     return false;
    if (prioritas && pr.prioritas     !== prioritas) return false;
    if (status    && pr.status        !== status)    return false;
    if (deadline  && pr.deadline      !== deadline)  return false;
    return true;
  });

  renderList();
  updateDashboard();
  if (currentView === "calendar") renderCalendar();
}

function resetFilter() {
  filterMapel.value = "";
  filterPrioritas.value = "";
  filterStatus.value = "";
  filterDeadline.value = "";
  applyFilter();
}

// ============================================================
//  DASHBOARD
// ============================================================
function updateDashboard() {
  const aktif    = allData.filter(d => d.status !== "Selesai").length;
  const selesai  = allData.filter(d => d.status === "Selesai").length;
  const mendekat = allData.filter(d => {
    if (d.status === "Selesai") return false;
    const diff = daysDiff(d.deadline);
    return diff >= 0 && diff <= 3;
  }).length;

  $("statAktif").textContent   = aktif;
  $("statSelesai").textContent = selesai;
  $("statMendekat").textContent= mendekat;
}

// ============================================================
//  NOTIFIKASI BANNER
// ============================================================
function checkNotif() {
  const urgent = allData.filter(d => {
    if (d.status === "Selesai") return false;
    const diff = daysDiff(d.deadline);
    return diff >= 0 && diff <= 3;
  });

  if (urgent.length === 0) { notifBanner.classList.add("hidden"); return; }

  const names = urgent.map(d => `"${d.judul}"`).join(", ");
  notifBanner.textContent = `⚠️ ${urgent.length} PR mendekati deadline (≤3 hari): ${names}`;
  notifBanner.classList.remove("hidden");
}

// ============================================================
//  RENDER LIST
// ============================================================
function renderList() {
  prList.innerHTML = "";

  if (filteredData.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  // Urutkan: deadline terdekat dulu, lalu prioritas
  const pOrder = { Tinggi: 0, Sedang: 1, Rendah: 2 };
  const sorted = [...filteredData].sort((a, b) => {
    if (a.deadline < b.deadline) return -1;
    if (a.deadline > b.deadline) return  1;
    return (pOrder[a.prioritas] ?? 1) - (pOrder[b.prioritas] ?? 1);
  });

  sorted.forEach(pr => prList.appendChild(buildCard(pr)));
  lucide.createIcons();
}

function buildCard(pr) {
  const diff    = daysDiff(pr.deadline);
  const isDone  = pr.status === "Selesai";

  // Kelas highlight deadline
  let dlClass = "";
  if (!isDone) {
    if (diff < 0)       dlClass = "";       // sudah lewat (ditangani di label)
    else if (diff <= 1) dlClass = "dl-h1";  // H-1 → merah soft
    else if (diff <= 2) dlClass = "dl-h2";  // H-2 → kuning soft
  }

  const card = document.createElement("div");
  card.className = `pr-card p-${pr.prioritas} ${dlClass} ${isDone ? "done" : ""}`.trim();
  card.dataset.id = pr.id;

  card.innerHTML = `
    <input type="checkbox" class="pr-check" title="Tandai selesai"
           ${isDone ? "checked" : ""} aria-label="Tandai selesai" />
    <div class="pr-body">
      <div class="pr-top">
        <h3 class="${isDone ? "strikethrough" : ""}">${esc(pr.judul)}</h3>
        <span class="badge badge-mapel">${esc(pr.mataPelajaran)}</span>
        <span class="badge badge-${pr.prioritas}">${pr.prioritas}</span>
        <span class="badge badge-status-${pr.status}">${pr.status}</span>
      </div>
      ${pr.deskripsi ? `<p class="pr-desc">${esc(pr.deskripsi)}</p>` : ""}
      <div class="pr-meta">
        <span class="${deadlineClass(diff, isDone)}">
          <i data-lucide="calendar"></i>
          ${formatDate(pr.deadline)} ${deadlineLabel(diff, isDone)}
        </span>
      </div>
    </div>
    <div class="pr-actions">
      <button class="btn btn-ghost btn-icon-only" data-action="edit"  title="Edit">
        <i data-lucide="pencil"></i>
      </button>
      <button class="btn btn-ghost btn-icon-only" data-action="delete" title="Hapus">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;

  // Checkbox toggle selesai
  card.querySelector(".pr-check").addEventListener("change", async e => {
    const newStatus = e.target.checked ? "Selesai" : "Belum Selesai";
    await quickUpdateStatus(pr.id, newStatus);
  });

  // Edit
  card.querySelector('[data-action="edit"]').addEventListener("click", () => {
    const data = allData.find(d => d.id === pr.id);
    if (data) openEditModal(data);
  });

  // Hapus
  card.querySelector('[data-action="delete"]').addEventListener("click", () => {
    deleteId = pr.id;
    confirmOverlay.classList.remove("hidden");
    lucide.createIcons();
  });

  return card;
}

// Toggle status cepat via checkbox
async function quickUpdateStatus(id, newStatus) {
  const pr = allData.find(d => d.id === id);
  if (!pr) return;
  try {
    await API.update(id, { ...pr, status: newStatus });
    await loadData();
  } catch (err) {
    showToast("Gagal update status: " + err.message, "error");
  }
}

// ============================================================
//  RENDER CALENDAR
// ============================================================
function switchTab(tab) {
  currentView = tab;
  document.querySelectorAll(".tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === tab)
  );
  $("viewList").classList.toggle("hidden", tab !== "list");
  $("viewCalendar").classList.toggle("hidden", tab !== "calendar");
  if (tab === "calendar") renderCalendar();
}

function renderCalendar() {
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();
  const today = new Date(); today.setHours(0,0,0,0);

  $("calTitle").textContent = calDate.toLocaleDateString("id-ID", {
    month: "long", year: "numeric"
  });

  const grid = $("calGrid");
  grid.innerHTML = "";

  // Header hari
  const wdRow = document.createElement("div");
  wdRow.className = "cal-weekdays";
  ["Min","Sen","Sel","Rab","Kam","Jum","Sab"].forEach(d => {
    const s = document.createElement("span"); s.textContent = d;
    wdRow.appendChild(s);
  });
  grid.appendChild(wdRow);

  // Grid hari
  const daysRow = document.createElement("div");
  daysRow.className = "cal-days";

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Sel kosong sebelum hari pertama
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement("div");
    el.className = "cal-day other-month";
    daysRow.appendChild(el);
  }

  // Isi hari
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
    const isToday = today.getFullYear() === year &&
                    today.getMonth()    === month &&
                    today.getDate()     === d;

    const dayEl = document.createElement("div");
    dayEl.className = "cal-day" + (isToday ? " is-today" : "");

    const numEl = document.createElement("div");
    numEl.className = "cal-day-num";
    numEl.textContent = d;
    dayEl.appendChild(numEl);

    // PR yang deadline-nya hari ini
    const dayPRs = filteredData.filter(pr => pr.deadline === dateStr);
    if (dayPRs.length > 0) dayEl.classList.add("has-event");

    dayPRs.forEach(pr => {
      const ev = document.createElement("div");
      ev.className = `cal-event p-${pr.prioritas}`;
      ev.textContent = pr.judul;
      ev.title = `${pr.mataPelajaran} — ${pr.judul}`;
      ev.addEventListener("click", () => openEditModal(pr));
      dayEl.appendChild(ev);
    });

    daysRow.appendChild(dayEl);
  }

  grid.appendChild(daysRow);
  lucide.createIcons();
}

// ============================================================
//  MODAL FORM
// ============================================================
function openAddModal() {
  $("modalTitle").textContent = "Tambah PR";
  $("editId").value = "";
  prForm.reset();
  clearErrors();
  modalOverlay.classList.remove("hidden");
  lucide.createIcons();
  setTimeout(() => $("mataPelajaran").focus(), 100);
}

function openEditModal(pr) {
  $("modalTitle").textContent = "Edit PR";
  $("editId").value           = pr.id;
  $("mataPelajaran").value    = pr.mataPelajaran;
  $("judul").value            = pr.judul;
  $("deskripsi").value        = pr.deskripsi;
  $("deadline").value         = pr.deadline;
  $("prioritas").value        = pr.prioritas;
  $("status").value           = pr.status;
  clearErrors();
  modalOverlay.classList.remove("hidden");
  lucide.createIcons();
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  prForm.reset();
  clearErrors();
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const id   = $("editId").value;
  const data = {
    mataPelajaran: $("mataPelajaran").value.trim(),
    judul        : $("judul").value.trim(),
    deskripsi    : $("deskripsi").value.trim(),
    deadline     : $("deadline").value,
    prioritas    : $("prioritas").value,
    status       : $("status").value,
  };

  const btn = $("btnSubmit");
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader"></i> Menyimpan...';
  lucide.createIcons();

  try {
    if (id) await API.update(id, data);
    else    await API.create(data);

    closeModal();
    await loadData();
    showToast(id ? "PR berhasil diperbarui!" : "PR berhasil ditambahkan!");
  } catch (err) {
    showToast("Gagal menyimpan: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save"></i> Simpan';
    lucide.createIcons();
  }
}

// ============================================================
//  DELETE
// ============================================================
async function doDelete() {
  if (!deleteId) return;
  const btn = $("btnConfirmDel");
  btn.disabled = true;

  try {
    await API.delete(deleteId);
    confirmOverlay.classList.add("hidden");
    deleteId = null;
    await loadData();
    showToast("PR berhasil dihapus.");
  } catch (err) {
    showToast("Gagal menghapus: " + err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

// ============================================================
//  VALIDASI FORM
// ============================================================
function validateForm() {
  clearErrors();
  let valid = true;

  if (!$("mataPelajaran").value.trim()) {
    showError("errMapel", "Mata pelajaran wajib diisi", "mataPelajaran");
    valid = false;
  }
  if (!$("judul").value.trim()) {
    showError("errJudul", "Judul tugas wajib diisi", "judul");
    valid = false;
  }
  if (!$("deadline").value) {
    showError("errDeadline", "Deadline wajib diisi", "deadline");
    valid = false;
  }
  if (!$("prioritas").value) {
    showError("errPrioritas", "Prioritas wajib dipilih", "prioritas");
    valid = false;
  }

  return valid;
}

function showError(errId, msg, fieldId) {
  $(errId).textContent = msg;
  if (fieldId) $(fieldId).classList.add("invalid");
}

function clearErrors() {
  ["errMapel","errJudul","errDeadline","errPrioritas"].forEach(id => {
    $(id).textContent = "";
  });
  ["mataPelajaran","judul","deadline","prioritas"].forEach(id => {
    $(id).classList.remove("invalid");
  });
}

// ============================================================
//  TOAST NOTIFICATION
// ============================================================
function showToast(msg, type = "success") {
  // Hapus toast lama jika ada
  document.querySelectorAll(".toast").forEach(t => t.remove());

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  // Style inline agar tidak perlu tambah CSS terpisah
  Object.assign(toast.style, {
    position    : "fixed",
    bottom      : "24px",
    right       : "24px",
    background  : type === "error" ? "#C0392B" : "#333333",
    color       : "#fff",
    padding     : "12px 20px",
    borderRadius: "8px",
    fontSize    : "0.875rem",
    fontFamily  : "inherit",
    boxShadow   : "0 4px 16px rgba(0,0,0,0.15)",
    zIndex      : "999",
    animation   : "slideUp 0.25s ease",
    maxWidth    : "320px",
  });

  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
//  HELPERS
// ============================================================
function showLoading(show) {
  loading.classList.toggle("hidden", !show);
  if (show) emptyState.classList.add("hidden");
}

// Selisih hari dari hari ini ke deadline (negatif = sudah lewat)
function daysDiff(dateStr) {
  if (!dateStr) return Infinity;
  const today = new Date(); today.setHours(0,0,0,0);
  const dl    = new Date(dateStr + "T00:00:00");
  return Math.ceil((dl - today) / 86400000);
}

function deadlineClass(diff, isDone) {
  if (isDone) return "";
  if (diff < 0)  return "dl-late";
  if (diff <= 1) return "dl-alert";
  if (diff <= 3) return "dl-warn";
  return "";
}

function deadlineLabel(diff, isDone) {
  if (isDone) return "";
  if (diff < 0)  return `(Terlambat ${Math.abs(diff)} hari!)`;
  if (diff === 0) return "(Hari ini!)";
  if (diff === 1) return "(Besok!)";
  if (diff <= 3)  return `(${diff} hari lagi)`;
  return "";
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function pad(n) { return String(n).padStart(2, "0"); }

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
