// Türkiye için 2024 - 2030 resmi tatil günleri (YYYY-MM-DD formatında)
const publicHolidays: Set<string> = new Set([
    // --- 2024 ---
    "2024-01-01", // Yılbaşı
    "2024-04-09", // Ramazan Bayramı Arifesi
    "2024-04-10", "2024-04-11", "2024-04-12", // Ramazan Bayramı
    "2024-04-23", // Ulusal Egemenlik ve Çocuk Bayramı
    "2024-05-01", // Emek ve Dayanışma Günü
    "2024-05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
    "2024-06-15", // Kurban Bayramı Arifesi
    "2024-06-16", "2024-06-17", "2024-06-18", "2024-06-19", // Kurban Bayramı
    "2024-07-15", // Demokrasi ve Milli Birlik Günü
    "2024-08-30", // Zafer Bayramı
    "2024-10-29", // Cumhuriyet Bayramı

    // --- 2025 ---
    "2025-01-01", // Yılbaşı
    "2025-03-29", // Ramazan Bayramı Arifesi
    "2025-03-30", "2025-03-31", "2025-04-01", // Ramazan Bayramı
    "2025-04-23", // Ulusal Egemenlik ve Çocuk Bayramı
    "2025-05-01", // Emek ve Dayanışma Günü
    "2025-05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
    "2025-06-05", // Kurban Bayramı Arifesi
    "2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09", // Kurban Bayramı
    "2025-07-15", // Demokrasi ve Milli Birlik Günü
    "2025-08-30", // Zafer Bayramı
    "2025-10-29", // Cumhuriyet Bayramı

    // --- 2026 ---
    "2026-01-01", // Yılbaşı
    "2026-03-19", // Ramazan Bayramı Arifesi
    "2026-03-20", "2026-03-21", "2026-03-22", // Ramazan Bayramı
    "2026-04-23", // Ulusal Egemenlik ve Çocuk Bayramı
    "2026-05-01", // Emek ve Dayanışma Günü
    "2026-05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
    "2026-05-26", // Kurban Bayramı Arifesi
    "2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", // Kurban Bayramı
    "2026-07-15", // Demokrasi ve Milli Birlik Günü
    "2026-08-30", // Zafer Bayramı
    "2026-10-29", // Cumhuriyet Bayramı

    // --- 2027 ---
    "2027-01-01", // Yılbaşı
    "2027-03-08", // Ramazan Bayramı Arifesi
    "2027-03-09", "2027-03-10", "2027-03-11", // Ramazan Bayramı
    "2027-04-23", // Ulusal Egemenlik ve Çocuk Bayramı
    "2027-05-01", // Emek ve Dayanışma Günü
    "2027-05-15", // Kurban Bayramı Arifesi
    "2027-05-16", "2027-05-17", "2027-05-18", "2027-05-19", // Kurban Bayramı
    "2027-07-15", // Demokrasi ve Milli Birlik Günü
    "2027-08-30", // Zafer Bayramı
    "2027-10-29", // Cumhuriyet Bayramı

    // --- 2028 ---
    "2028-01-01", // Yılbaşı
    "2028-02-26", // Ramazan Bayramı Arifesi
    "2028-02-27", "2028-02-28", // Ramazan Bayramı
    "2028-04-23", // Ulusal Egemenlik ve Çocuk Bayramı
    "2028-05-01", // Emek ve Dayanışma Günü
    "2028-05-05", // Kurban Bayramı Arifesi
    "2028-05-06", "2028-05-07", "2028-05-08", "2028-05-09", // Kurban Bayramı
    "2028-05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
    "2028-07-15", // Demokrasi ve Milli Birlik Günü
    "2028-08-30", // Zafer Bayramı
    "2028-10-29", // Cumhuriyet Bayramı

    // --- 2029 ---
    "2029-01-01", // Yılbaşı
    "2029-02-14", // Ramazan Bayramı Arifesi
    "2029-02-15", "2029-02-16", "2029-02-17", // Ramazan Bayramı
    "2029-04-23", // Ulusal Egemenlik ve Çocuk Bayramı
    "2029-04-24", // Kurban Bayramı Arifesi
    "2029-04-25", "2029-04-26", "2029-04-27", "2029-04-28", // Kurban Bayramı
    "2029-05-01", // Emek ve Dayanışma Günü
    "2029-05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
    "2029-07-15", // Demokrasi ve Milli Birlik Günü
    "2029-08-30", // Zafer Bayramı
    "2029-10-29", // Cumhuriyet Bayramı

    // --- 2030 ---
    "2030-01-01", // Yılbaşı
    "2030-02-03", // Ramazan Bayramı Arifesi
    "2030-02-04", "2030-02-05", "2030-02-06", // Ramazan Bayramı
    "2030-04-13", // Kurban Bayramı Arifesi
    "2030-04-14", "2030-04-15", "2030-04-16", "2030-04-17", // Kurban Bayramı
    "2030-04-23", // Ulusal Egemenlik ve Çocuk Bayramı
    "2030-05-01", // Emek ve Dayanışma Günü
    "2030-05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
    "2030-07-15", // Demokrasi ve Milli Birlik Günü
    "2030-08-30", // Zafer Bayramı
    "2030-10-29", // Cumhuriyet Bayramı
]);

/**
 * Mevcut zamanın çalışma saatleri içinde olup olmadığını kontrol eder.
 * Kurallar:
 * - Her ayın 20'sinden sonra kapalı.
 * - Hafta içi (Pzt-Cum) 08:00 ile 18:00 arası.
 * - Hafta sonları (Cmt, Pzr) kapalı.
 * - Resmi tatillerde kapalı.
 */
export const isWithinWorkingHours = (): boolean => {
    const now = new Date();

    // 1. Ayın 20'sinden sonra kontrolü
    if (now.getDate() > 20) {
        return false;
    }

    // 2. Hafta sonu kontrolü (0: Pazar, 6: Cumartesi)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }

    // 3. Saat kontrolü (08:00 - 18:00 arası açık)
    const hour = now.getHours();
    if (hour < 8 || hour >= 18) {
        return false;
    }

    // 4. Resmi tatil kontrolü
    // Tarihi YYYY-MM-DD formatına çevir
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    if (publicHolidays.has(formattedDate)) {
        return false;
    }

    return true;
};
