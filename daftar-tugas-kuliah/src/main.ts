/*
 * main.ts
 * -----------------------------------------------------------------------------
 * Logika utama aplikasi "Daftar Tugas Kuliah".
 *
 * Alur singkat:
 *  1. Ambil data dari localStorage (kalau ada).
 *  2. Render kerangka halaman sekali (header, form, daftar, footer).
 *  3. Setiap kali data berubah -> simpan ke localStorage -> render ulang daftar.
 */

import './style.css';
import type { Task, TaskFilter, TaskFormData, TaskStats, TaskStatus } from './types.ts';
import { COURSES } from './courses.ts';
import { loadData, saveData } from './storage.ts';

// =============================================================================
// [TS-5] PRIMITIVE TYPES: string, number, boolean
// -----------------------------------------------------------------------------
// Semua konstanta di bawah sengaja diberi anotasi tipe eksplisit agar jelas.
// =============================================================================
const STORAGE_KEY: string = 'daftar-tugas-kuliah:tasks';

// Environment variables dari file .env (prefix VITE_).
const APP_NAME: string = import.meta.env.VITE_APP_NAME || 'Daftar Tugas Kuliah';
const APP_VERSION: string = import.meta.env.VITE_APP_VERSION || '0.0.0';
const APP_DESCRIPTION: string = import.meta.env.VITE_DESCRIPTION || 'Aplikasi daftar tugas kuliah.';

const MAX_TITLE_LENGTH: number = 80; // dipakai untuk validasi & atribut maxlength
const DEFAULT_STATUS: TaskStatus = 'Belum Selesai';

// =============================================================================
// [TS-6] ARRAY OF INTERFACE
// -----------------------------------------------------------------------------
// `Task[]` artinya "array yang isinya hanya objek bertipe Task".
// Data awal diambil dari localStorage; kalau kosong pakai array kosong.
// =============================================================================
let tasks: Task[] = loadData<Task[]>(STORAGE_KEY) ?? [];

// State UI (bukan data tugas): id yang sedang diedit dan filter yang aktif.
let editingId: string | null = null;
let activeFilter: TaskFilter = 'semua';

// Referensi elemen DOM yang dipakai berulang kali.
let form: HTMLFormElement;
let titleInput: HTMLInputElement;
let courseSelect: HTMLSelectElement;
let deadlineInput: HTMLInputElement;
let statusSelect: HTMLSelectElement;
let formTitle: HTMLHeadingElement;
let submitButton: HTMLButtonElement;
let cancelButton: HTMLButtonElement;
let formError: HTMLParagraphElement;
let taskList: HTMLUListElement;
let feedback: HTMLParagraphElement;
let statTotal: HTMLElement;
let statPending: HTMLElement;
let statDone: HTMLElement;

// =============================================================================
// HELPER UMUM
// =============================================================================

/** Mengambil elemen wajib ada, kalau tidak ada langsung lempar error jelas. */
function mustQuery<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Elemen "${selector}" tidak ditemukan di index.html`);
  }
  return element;
}

/** Mengamankan teks user sebelum dimasukkan ke innerHTML (mencegah HTML injection). */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Tanggal hari ini dalam format "YYYY-MM-DD". */
function todayIso(): string {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offsetMinutes * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Mengubah "2026-12-01" menjadi "1 Desember 2026". */
function formatDeadline(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** true kalau tugas belum selesai dan deadline-nya sudah lewat. */
function isOverdue(task: Task): boolean {
  if (task.status === 'Selesai') {
    return false;
  }
  const deadline = new Date(`${task.deadline}T23:59:59`);
  return deadline.getTime() < Date.now();
}

/**
 * Memilih mata kuliah pada dropdown.
 * Kalau nilainya tidak ada di COURSES (mis. data lama dari fase sebelumnya),
 * tambahkan opsi sementara agar data tersebut tidak hilang.
 */
function setCourseValue(value: string): void {
  const isKnown = COURSES.some((course) => course === value);

  if (isKnown || value.length === 0) {
    courseSelect.value = value;
    return;
  }

  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  option.dataset.temporary = 'true';
  courseSelect.append(option);
  courseSelect.value = value;
}

/** Menghapus opsi sementara (mata kuliah lama) dari dropdown. */
function clearTemporaryCourses(): void {
  courseSelect.querySelectorAll('option[data-temporary="true"]').forEach((option) => {
    option.remove();
  });
}

// =============================================================================
// [TS-7] FUNGSI DENGAN TIPE PARAMETER & RETURN
// =============================================================================
function getStats(): TaskStats {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === 'Selesai').length;

  return {
    total,
    done,
    pending: total - done,
    isAllDone: total > 0 && done === total,
  };
}

function getVisibleTasks(): Task[] {
  const filtered = tasks.filter((task) => {
    if (activeFilter === 'belum-selesai') {
      return task.status === 'Belum Selesai';
    }
    if (activeFilter === 'selesai') {
      return task.status === 'Selesai';
    }
    return true;
  });

  // Urutkan berdasarkan deadline terdekat. `localeCompare` aman untuk "YYYY-MM-DD".
  return [...filtered].sort((a, b) => a.deadline.localeCompare(b.deadline));
}

// =============================================================================
// CRUD (Create, Read, Update, Delete)
// =============================================================================

/** Menyimpan seluruh array tugas ke localStorage. */
function persist(): void {
  saveData<Task[]>(STORAGE_KEY, tasks);
}

function createTask(data: TaskFormData): Task {
  return {
    id: crypto.randomUUID(),
    title: data.title.trim(),
    course: data.course,
    deadline: data.deadline,
    status: data.status,
    createdAt: new Date().toISOString(),
  };
}

/** CREATE: menambah tugas baru di urutan paling atas. */
function addTask(data: TaskFormData): void {
  tasks = [createTask(data), ...tasks];
  persist();
  render();
  showFeedback('Tugas baru berhasil ditambahkan.');
}

/** UPDATE: mengubah isi tugas yang sedang diedit. */
function updateTask(id: string, data: TaskFormData): void {
  tasks = tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          title: data.title.trim(),
          course: data.course,
          deadline: data.deadline,
          status: data.status,
        }
      : task,
  );
  persist();
  render();
  showFeedback('Perubahan tugas berhasil disimpan.');
}

/** DELETE: menghapus tugas setelah dikonfirmasi. */
function deleteTask(id: string): void {
  const target = tasks.find((task) => task.id === id);
  if (!target) {
    return;
  }
  const confirmed = window.confirm(`Hapus tugas "${target.title}"?`);
  if (!confirmed) {
    return;
  }

  tasks = tasks.filter((task) => task.id !== id);

  // Kalau tugas yang dihapus sedang diedit, keluar dari mode edit.
  if (editingId === id) {
    resetForm();
  }

  persist();
  render();
  showFeedback('Tugas berhasil dihapus.');
}

/** TOGGLE: membalik status "Belum Selesai" <-> "Selesai". */
function toggleStatus(id: string): void {
  tasks = tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }
    const nextStatus: TaskStatus = task.status === 'Selesai' ? 'Belum Selesai' : 'Selesai';
    return { ...task, status: nextStatus };
  });

  persist();
  render();
}

// =============================================================================
// FORM
// =============================================================================

function showFormError(message: string): void {
  formError.textContent = message;
  formError.hidden = false;
}

function clearFormError(): void {
  formError.textContent = '';
  formError.hidden = true;
}

/** Membaca isi form dan memvalidasi. Mengembalikan null kalau tidak valid. */
function readForm(): TaskFormData | null {
  const formData = new FormData(form);

  const title = String(formData.get('title') ?? '').trim();
  const courseValue = String(formData.get('course') ?? '');
  const deadline = String(formData.get('deadline') ?? '');
  const statusValue = String(formData.get('status') ?? DEFAULT_STATUS);

  // Konversi string bebas menjadi union type yang aman.
  const status: TaskStatus = statusValue === 'Selesai' ? 'Selesai' : 'Belum Selesai';

  if (title.length === 0) {
    showFormError('Judul tugas wajib diisi.');
    titleInput.focus();
    return null;
  }
  if (title.length > MAX_TITLE_LENGTH) {
    showFormError(`Judul tugas maksimal ${MAX_TITLE_LENGTH} karakter.`);
    titleInput.focus();
    return null;
  }

  // `COURSES.find` mengembalikan Course | undefined, jadi hasilnya otomatis
  // bertipe sempit (bukan string biasa) setelah dinyatakan tidak undefined.
  const course = COURSES.find((item) => item === courseValue);
  if (!course) {
    showFormError('Mata kuliah wajib dipilih dari daftar.');
    courseSelect.focus();
    return null;
  }

  if (deadline.length === 0) {
    showFormError('Deadline wajib dipilih.');
    deadlineInput.focus();
    return null;
  }

  clearFormError();
  return { title, course, deadline, status };
}

/** Mengosongkan form dan keluar dari mode edit. */
function resetForm(): void {
  editingId = null;
  form.reset();
  clearTemporaryCourses();
  statusSelect.value = DEFAULT_STATUS;
  clearFormError();
}

/** Mengisi form dengan data tugas yang akan diedit. */
function startEdit(id: string): void {
  const task = tasks.find((item) => item.id === id);
  if (!task) {
    return;
  }

  editingId = id;
  titleInput.value = task.title;
  setCourseValue(task.course);
  deadlineInput.value = task.deadline;
  statusSelect.value = task.status;

  clearFormError();
  render();

  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  titleInput.focus();
}

// =============================================================================
// RENDER
// =============================================================================

function renderTaskItem(task: Task): string {
  const isDone = task.status === 'Selesai';
  const overdue = isOverdue(task);

  return `
    <li class="task-item${isDone ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}">
      <div class="task-main">
        <div class="task-head">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <span class="badge ${isDone ? 'badge-done' : 'badge-pending'}">${task.status}</span>
        </div>
        <p class="task-meta">
          <span class="task-course">${escapeHtml(task.course)}</span>
          <span class="dot" aria-hidden="true">•</span>
          <span>Deadline: ${formatDeadline(task.deadline)}</span>
          ${overdue ? '<span class="overdue-flag">Lewat deadline</span>' : ''}
        </p>
      </div>
      <div class="task-actions">
        <button type="button" class="btn btn-small ${isDone ? 'btn-ghost' : 'btn-success'}"
          data-action="toggle" data-id="${task.id}" aria-pressed="${isDone}">
          ${isDone ? 'Tandai Belum' : 'Tandai Selesai'}
        </button>
        <button type="button" class="btn btn-small btn-ghost" data-action="edit" data-id="${task.id}">
          Edit
        </button>
        <button type="button" class="btn btn-small btn-danger" data-action="delete" data-id="${task.id}">
          Hapus
        </button>
      </div>
    </li>
  `;
}

function renderEmptyState(): string {
  const message =
    tasks.length === 0
      ? 'Belum ada tugas. Tambahkan tugas pertama Anda lewat form di atas.'
      : 'Tidak ada tugas yang cocok dengan filter ini.';

  return `<li class="empty-state">${message}</li>`;
}

function render(): void {
  const stats = getStats();

  statTotal.textContent = String(stats.total);
  statPending.textContent = String(stats.pending);
  statDone.textContent = String(stats.done);

  // Tandai tombol filter yang sedang aktif.
  document.querySelectorAll<HTMLButtonElement>('button[data-filter]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.filter === activeFilter);
  });

  const visibleTasks = getVisibleTasks();
  taskList.innerHTML =
    visibleTasks.length > 0 ? visibleTasks.map(renderTaskItem).join('') : renderEmptyState();

  // Ubah tampilan form sesuai mode (tambah / edit).
  const isEditing = editingId !== null;
  formTitle.textContent = isEditing ? 'Edit Tugas' : 'Tambah Tugas';
  submitButton.textContent = isEditing ? 'Simpan Perubahan' : 'Tambah Tugas';
  cancelButton.hidden = !isEditing;
}

let feedbackTimer: number | undefined;

function showFeedback(message: string): void {
  feedback.textContent = message;
  feedback.classList.add('is-visible');

  window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    feedback.textContent = '';
    feedback.classList.remove('is-visible');
  }, 2500);
}

// =============================================================================
// KERANGKA HALAMAN (dirender sekali)
// =============================================================================

/** Membuat elemen <option> untuk dropdown mata kuliah. */
function courseOptions(): string {
  return COURSES.map(
    (course) => `<option value="${escapeHtml(course)}">${escapeHtml(course)}</option>`,
  ).join('');
}

function appShell(): string {
  return `
    <header class="site-header">
      <div class="container header-inner">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">TK</span>
          <span class="brand-text">
            <strong>${escapeHtml(APP_NAME)}</strong>
            <small>${escapeHtml(APP_DESCRIPTION)}</small>
          </span>
        </div>
        <span class="version-badge">v${escapeHtml(APP_VERSION)}</span>
      </div>
    </header>

    <main class="container">
      <section class="hero">
        <p class="eyebrow">Tugas Pertemuan 6 &middot; TypeScript + Vite</p>
        <h1>Daftar Tugas Kuliah</h1>
        <p class="hero-text">
          Catat tugas kuliah, atur deadline, dan tandai yang sudah selesai.
          Semua data tersimpan otomatis di browser Anda (localStorage).
        </p>
      </section>

      <section class="stats" aria-label="Ringkasan tugas">
        <article class="stat-card">
          <span class="stat-label">Total tugas</span>
          <strong id="stat-total">0</strong>
        </article>
        <article class="stat-card">
          <span class="stat-label">Belum selesai</span>
          <strong id="stat-pending">0</strong>
        </article>
        <article class="stat-card">
          <span class="stat-label">Selesai</span>
          <strong id="stat-done">0</strong>
        </article>
      </section>

      <section class="panel" id="form-panel">
        <h2 id="form-title">Tambah Tugas</h2>
        <form id="task-form" novalidate>
          <div class="field">
            <label for="title">Judul tugas</label>
            <input id="title" name="title" type="text" maxlength="${MAX_TITLE_LENGTH}"
              placeholder="Contoh: Membuat ERD sistem perpustakaan" autocomplete="off" />
          </div>

          <div class="field">
            <label for="course">Mata kuliah</label>
            <select id="course" name="course">
              <option value="" disabled selected>&mdash; Pilih mata kuliah &mdash;</option>
              ${courseOptions()}
            </select>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="deadline">Deadline</label>
              <input id="deadline" name="deadline" type="date" />
            </div>
            <div class="field">
              <label for="status">Status</label>
              <select id="status" name="status">
                <option value="Belum Selesai">Belum Selesai</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
          </div>

          <p class="form-error" id="form-error" role="alert" hidden></p>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="submit-button">Tambah Tugas</button>
            <button type="button" class="btn btn-ghost" id="cancel-button" hidden>Batal Edit</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="list-header">
          <h2>Daftar Tugas</h2>
          <div class="filters" role="group" aria-label="Filter tugas">
            <button type="button" class="filter is-active" data-filter="semua">Semua</button>
            <button type="button" class="filter" data-filter="belum-selesai">Belum selesai</button>
            <button type="button" class="filter" data-filter="selesai">Selesai</button>
          </div>
        </div>

        <p class="feedback" id="feedback" role="status" aria-live="polite"></p>
        <ul class="task-list" id="task-list"></ul>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container footer-inner">
        <p><strong>${escapeHtml(APP_NAME)}</strong> v${escapeHtml(APP_VERSION)}</p>
        <p class="footer-note">
          Dibuat dengan TypeScript + Vite &middot; Data tersimpan di localStorage
        </p>
      </div>
    </footer>
  `;
}

// =============================================================================
// EVENT LISTENER
// =============================================================================

function bindEvents(): void {
  // 1) Submit form: bisa untuk tambah (CREATE) atau simpan hasil edit (UPDATE).
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = readForm();
    if (!data) {
      return;
    }

    if (editingId) {
      updateTask(editingId, data);
      resetForm();
      render();
    } else {
      addTask(data);
      resetForm();
      render();
    }

    // Setelah submit, kembalikan fokus ke judul agar mudah input lagi.
    titleInput.focus();
  });

  // 2) Tombol Batal Edit.
  cancelButton.addEventListener('click', () => {
    resetForm();
    render();
  });

  // 3) Klik di daftar tugas (event delegation):
  //    satu listener menangani tombol toggle / edit / delete untuk semua item.
  taskList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('button[data-action]');
    if (!button) {
      return;
    }

    const id = button.dataset.id;
    if (!id) {
      return;
    }

    const action = button.dataset.action;
    if (action === 'toggle') {
      toggleStatus(id);
    } else if (action === 'edit') {
      startEdit(id);
    } else if (action === 'delete') {
      deleteTask(id);
    }
  });

  // 4) Tombol filter.
  document.querySelectorAll<HTMLButtonElement>('button[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.filter as TaskFilter | undefined;
      if (!value) {
        return;
      }
      activeFilter = value;
      render();
    });
  });
}

// =============================================================================
// INISIALISASI
// =============================================================================

function init(): void {
  const root = mustQuery<HTMLDivElement>('#app');
  root.innerHTML = appShell();

  // Simpan referensi elemen supaya tidak query berulang kali.
  form = mustQuery<HTMLFormElement>('#task-form');
  titleInput = mustQuery<HTMLInputElement>('#title');
  courseSelect = mustQuery<HTMLSelectElement>('#course');
  deadlineInput = mustQuery<HTMLInputElement>('#deadline');
  statusSelect = mustQuery<HTMLSelectElement>('#status');
  formTitle = mustQuery<HTMLHeadingElement>('#form-title');
  submitButton = mustQuery<HTMLButtonElement>('#submit-button');
  cancelButton = mustQuery<HTMLButtonElement>('#cancel-button');
  formError = mustQuery<HTMLParagraphElement>('#form-error');
  taskList = mustQuery<HTMLUListElement>('#task-list');
  feedback = mustQuery<HTMLParagraphElement>('#feedback');
  statTotal = mustQuery<HTMLElement>('#stat-total');
  statPending = mustQuery<HTMLElement>('#stat-pending');
  statDone = mustQuery<HTMLElement>('#stat-done');

  // Set tanggal minimal = hari ini (tetap boleh memilih tanggal lain saat edit).
  deadlineInput.min = todayIso();

  bindEvents();
  render();
}

init();
