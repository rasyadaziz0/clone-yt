# 🎬 CineView: Professional Web Theater

CineView adalah bioskop web minimalis dengan performa tinggi yang dirancang untuk pengalaman menonton yang imersif. Dilengkapi dengan antarmuka kustom YouTube bergaya "Liquid Glass" yang dioptimalkan untuk konten kurasi dan siaran langsung profesional.

## ✨ Fitur Unggulan

- **Liquid Glass UI**: Estetika premium ala iPhone menggunakan *backdrop blur* intensitas tinggi (`backdrop-blur-2xl`), lapisan transparan, dan tepian kaca tipis yang elegan untuk pengalaman visual yang mewah.
- **Resolution Locker (4K Support)**: Pemilih resolusi kelas profesional (144p hingga 4K) yang secara teknis memaksakan (*forced*) kualitas pilihan Anda. Fitur ini mencegah sistem otomatis YouTube menurunkan kualitas secara sepihak saat buffering.
- **Advanced Live Stream Experience**: 
    - **Live Badge**: Indikator animasi berdenyut merah yang cerdas, hanya muncul pada konten siaran langsung.
    - **Manual Sync-to-Live**: Tombol "Liquid Crystal" khusus untuk mengejar titik terbaru siaran langsung jika terjadi keterlambatan transmisi.
- **Cinema Mode Controls**: Kontrol yang menyembunyi otomatis (*auto-hide*) saat tidak digunakan untuk tampilan tanpa gangguan, dilengkapi efek "Cinema Glow" pada latar belakang untuk meningkatkan kontras.
- **Real-time Supabase Config**: Halaman pengaturan khusus (`/setup`) untuk memperbarui URL video dan metadata secara instan tanpa deployment ulang.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) dengan teknik Glassmorphism kustom.
- **Components**: [ShadCN UI](https://ui.shadcn.com/) & [Lucide Icons](https://lucide.dev/).
- **Backend/Data**: [Supabase](https://supabase.com/) untuk autentikasi, penyimpanan data, dan sinkronisasi realtime.
- **Video Integration**: YouTube IFrame API dengan sistem *state-locking* kualitas video.

## 🚀 Panduan Instalasi Lokal

1. **Clone Repositori**:
   ```bash
   git clone https://github.com/Acadgacor/clone-yt.git
   cd clone-yt
   ```

2. **Instalasi Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Supabase**:
   Buat file `.env` berdasarkan `.env.example`, lalu isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `YOUTUBE_API_KEY1..6` (server-side).

4. **Jalankan Server**:
   ```bash
   npm run dev
   ```
   Akses di `http://localhost:9002`.

&copy; 2024 **CineView Labs** • Dirancang untuk pengalaman sinematik tanpa batas.
