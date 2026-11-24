/*
 * courses.ts
 * -----------------------------------------------------------------------------
 * Daftar mata kuliah untuk dropdown pada form "Tambah Tugas".
 *
 * Sumber data: tabel Akademik pada website portofolio
 * (Semester 5 - Teknik Informatika, UIN Sunan Gunung Djati Bandung).
 *
 * Kalau nanti mata kuliah berubah, cukup ubah array di bawah ini.
 */

export const COURSES = [
  'Manajemen Basis Data',
  'Manajemen Proyek Perangkat Lunak',
  'Intelegensia Buatan',
  'Interaksi Manusia dan Komputer',
  'Jaringan Komputer',
  'Pengembangan Aplikasi Mobile',
  'Pengembangan Aplikasi Web',
] as const;

// =============================================================================
// [TS-8] INDEXED ACCESS TYPE + `as const`
// -----------------------------------------------------------------------------
// `as const` membuat isi array menjadi literal (tidak bisa diubah dan tipenya
// sempit). `(typeof COURSES)[number]` mengambil tipe tiap elemen, sehingga
// `Course` otomatis menjadi union dari 7 nama mata kuliah di atas.
// Kalau kita salah menulis nama mata kuliah, TypeScript langsung menolak.
// =============================================================================
export type Course = (typeof COURSES)[number];
