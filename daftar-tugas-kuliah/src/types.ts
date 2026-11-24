/*
 * types.ts
 * -----------------------------------------------------------------------------
 * Kumpulan tipe data untuk aplikasi "Daftar Tugas Kuliah".
 *
 * Tujuan file ini: memisahkan "bentuk data" dari "logika aplikasi", supaya tipe
 * yang sama bisa dipakai berulang di beberapa file (cukup `import type`).
 */

// =============================================================================
// [TS-1] TYPE ALIAS + UNION TYPE
// -----------------------------------------------------------------------------
// `TaskStatus` hanya boleh berisi salah satu dari dua teks di bawah ini.
// Kalau kita salah tulis (misal "Selesaii"), TypeScript langsung menolak.
// =============================================================================
export type TaskStatus = 'Belum Selesai' | 'Selesai';

// [TS-1b] Union type untuk filter daftar tugas di UI.
export type TaskFilter = 'semua' | 'belum-selesai' | 'selesai';

// =============================================================================
// [TS-2] INTERFACE
// -----------------------------------------------------------------------------
// Interface mendeskripsikan "bentuk" satu objek tugas.
// =============================================================================
export interface Task {
  id: string; // [TS-3a] tipe primitif: string
  title: string;
  course: string;
  deadline: string; // format "YYYY-MM-DD" (dari <input type="date">)
  status: TaskStatus;
  createdAt: string; // timestamp ISO, contoh: "2026-11-24T13:00:00.000Z"
}

// [TS-2b] Interface untuk data mentah yang datang dari form.
// Bedanya dengan Task: belum punya `id` dan `createdAt` karena dibuat aplikasi.
export interface TaskFormData {
  title: string;
  course: string;
  deadline: string;
  status: TaskStatus;
}

// [TS-2c] Interface untuk ringkasan statistik di bagian atas halaman.
export interface TaskStats {
  total: number; // [TS-3b] tipe primitif: number
  done: number;
  pending: number;
  isAllDone: boolean; // [TS-3c] tipe primitif: boolean
}
