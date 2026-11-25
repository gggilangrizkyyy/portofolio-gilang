/// <reference types="vite/client" />

/*
 * vite-env.d.ts
 * -----------------------------------------------------------------------------
 * File deklarasi tipe untuk environment variables Vite.
 *
 * Vite mengubah isi file .env menjadi `import.meta.env.VITE_NAMA_VARIABEL`.
 * Dengan interface di bawah, TypeScript tahu variabel apa saja yang tersedia
 * sehingga salah tulis nama variabel langsung ketahuan saat ngoding.
 *
 * PENTING: semua variabel berawalan VITE_ akan ikut ter-bundle ke browser.
 * Jadi isinya hanya boleh data non-rahasia (nama app, versi, dsb).
 */
interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_DESCRIPTION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
