/*
 * storage.ts
 * -----------------------------------------------------------------------------
 * Pembungkus (wrapper) untuk localStorage.
 *
 * Kenapa dibungkus? Supaya:
 *  1. Kode utama tidak penuh try/catch.
 *  2. Bentuk data tetap aman saat dibaca kembali (JSON.parse bisa gagal).
 *  3. Kita bisa memakai GENERIC supaya fungsi yang sama dipakai untuk tipe
 *     data apa pun, bukan hanya Task[].
 */

// =============================================================================
// [TS-4] GENERIC FUNCTION
// -----------------------------------------------------------------------------
// `<T>` adalah "tipe yang ditentukan saat fungsi dipanggil".
// Contoh: loadData<Task[]>("key") -> hasilnya Task[] | null
//         loadData<string>("key") -> hasilnya string | null
// =============================================================================
export function loadData<T>(key: string): T | null {
  try {
    const raw: string | null = localStorage.getItem(key);

    // Kalau key belum pernah disimpan, kembalikan null (bukan error).
    if (raw === null) {
      return null;
    }

    // JSON.parse menghasilkan `any`, jadi kita "janjikan" tipenya ke T.
    return JSON.parse(raw) as T;
  } catch (error) {
    // Data rusak / bukan JSON yang valid: jangan sampai aplikasi crash.
    console.warn(`[storage] gagal membaca "${key}":`, error);
    return null;
  }
}

export function saveData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Contoh penyebab: kuota localStorage penuh atau mode private browser.
    console.warn(`[storage] gagal menyimpan "${key}":`, error);
  }
}
