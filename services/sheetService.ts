
import { supabase } from './supabaseClient';
import type { Credential, Customer, UserActivityStat } from '../types';

// --- Types ---
// Supabase tablolarına karşılık gelen tipler
interface SupabaseCustomer {
  id?: number;
  installation_number: string;
  name: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface SupabaseUser {
  id: number;
  username: string;
  password: string;
  allowed_device_id: string;
}

// --- Caching System (Persistent) ---
const CACHE_PREFIX = 'qs_cache_v1_';
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // 24 Saat (Supabase hızlı olduğu için cache süresini uzatabiliriz)

const getFromCache = (key: string): Customer | null => {
    try {
        const stored = localStorage.getItem(CACHE_PREFIX + key);
        if (!stored) return null;
        
        const record = JSON.parse(stored);
        if (Date.now() - record.timestamp > CACHE_DURATION_MS) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return record.data;
    } catch (e) {
        return null;
    }
};

const saveToCache = (key: string, data: Customer) => {
    try {
        const record = { data, timestamp: Date.now() };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(record));
    } catch (e) {
        console.error("Cache saving failed", e);
    }
};

// --- Helper Functions ---

// Müşteri verisi dönüştürücü (Supabase DB formatından Uygulama formatına)
const mapSupabaseCustomerToApp = (data: SupabaseCustomer): Customer => ({
    installationNumber: data.installation_number,
    name: data.name,
    phone: data.phone,
    address: data.address,
    latitude: data.latitude?.toString(),
    longitude: data.longitude?.toString()
});

const handleSupabaseError = (error: any, context: string): never => {
    // Hata nesnesini konsola detaylı bas (Debugging için)
    try {
        console.error(`Supabase Error (${context}):`, JSON.stringify(error, null, 2));
    } catch (e) {
        console.error(`Supabase Error (${context}):`, error);
    }

    let errorMessage = "Bilinmeyen bir veritabanı hatası oluştu.";

    if (error) {
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (typeof error === 'object') {
            if (error.message) {
                errorMessage = error.message;
                // PostgreSQL hataları için ek detaylar
                if (error.details) errorMessage += ` (${error.details})`;
                if (error.hint) errorMessage += `\nİpucu: ${error.hint}`;
            } else if (error.error_description) {
                 errorMessage = error.error_description;
            } else {
                 // Mesaj yoksa objeyi string'e çevirmeyi dene
                 try {
                     errorMessage = JSON.stringify(error);
                 } catch (e) {
                     errorMessage = "Hata detayı okunamadı.";
                 }
            }
        }
    }

    // Özel Hata Kodları Kontrolü
    if (error?.code === '42501' || errorMessage.includes('row-level security')) {
        throw new Error("Veritabanı İzin Hatası: Supabase 'Row Level Security' politikaları eksik. Lütfen SQL Editor üzerinden tablolara erişim izni verin.");
    }

    // Tablo silinmişse veya yoksa (Postgres Error 42P01: undefined_table)
    if (error?.code === '42P01') {
        throw new Error("Veritabanı Tablosu Bulunamadı: 'users' veya 'customers' tablosu silinmiş olabilir. Lütfen SQL Editor kullanarak tabloları yeniden oluşturun.");
    }
    
    if (errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('failed to fetch')) {
        throw new Error("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    }

    throw new Error(errorMessage);
};

// --- Public Methods ---

export const checkServerConnection = async (): Promise<boolean> => {
    try {
        // Basit bir bağlantı testi: customers tablosundan 1 satır çekmeyi dene
        // head: true sadece metaveri çeker, veriyi indirmez, çok hızlıdır.
        const { error } = await supabase.from('customers').select('*', { count: 'exact', head: true });
        if (error) {
            console.warn("Bağlantı kontrolü hatası:", error.message);
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
};

export const getCredentials = async (): Promise<Credential[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('username, password, allowed_device_id');
    
    if (error) handleSupabaseError(error, 'getCredentials');

    return data.map(u => ({
        username: u.username,
        password: u.password,
        allowedDeviceId: u.allowed_device_id
    }));
};

export const findCustomerByInstallationNumber = async (installationNumber: string): Promise<Customer> => {
    // 1. Önce Cache Kontrolü
    const cachedData = getFromCache(installationNumber);
    if (cachedData) {
        return cachedData;
    }

    // 2. Supabase Sorgusu
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('installation_number', installationNumber)
        .single(); // Tek kayıt bekle

    if (error) {
        if (error.code === 'PGRST116') { // Kayıt bulunamadı kodu
             throw new Error("Bu tesisat numarasına ait kayıt bulunamadı.");
        }
        handleSupabaseError(error, 'findCustomer');
    }

    if (!data) throw new Error("Kayıt bulunamadı.");

    const customer = mapSupabaseCustomerToApp(data);

    // 3. Cache'e Yaz
    saveToCache(installationNumber, customer);

    return customer;
};

// Returns boolean: true if user is unrestricted (ANY_DEVICE), false otherwise
export const authenticateUser = async (username: string, password: string, deviceId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
             // PGRST116: Sonuç dönmedi (Kullanıcı yok)
             throw new Error("Kullanıcı adı veya şifre hatalı.");
        }
        // Diğer hatalar için (örn. bağlantı hatası)
        handleSupabaseError(error, 'authenticateUser');
    }
    
    if (!data) {
        throw new Error("Kullanıcı adı veya şifre hatalı.");
    }

    // Basit şifre kontrolü
    if (data.password !== password) {
        throw new Error("Kullanıcı adı veya şifre hatalı.");
    }

    // SERBEST GİRİŞ KONTROLÜ
    // Eğer allowed_device_id 'ANY_DEVICE' ise, cihaz kontrolünü atla ve true döndür.
    if (data.allowed_device_id === 'ANY_DEVICE') {
        return true; // Unrestricted access
    }

    // Cihaz Kilidi Kontrolü
    if (data.allowed_device_id && data.allowed_device_id !== deviceId) {
        throw new Error("Bu hesaba giriş yapmaya yetkili cihaz bu değil. Lütfen yöneticinizle görüşün.");
    }

    // Eğer cihaz ID boşsa, ilk giriş yapan cihaza kilitle (Opsiyonel özellik)
    if (!data.allowed_device_id && deviceId) {
        const { error: updateError } = await supabase
            .from('users')
            .update({ allowed_device_id: deviceId })
            .eq('username', username);
            
        if (updateError) console.warn("Cihaz ID güncellenemedi:", updateError);
    }

    return false; // Restricted (normal) access
};

export const logSearchQuery = async (username: string, installationNumber: string): Promise<void> => {
    // Loglama hatası kullanıcıyı durdurmamalı, bu yüzden catch bloğu sessiz
    try {
        await supabase.from('search_logs').insert({
            username: username,
            installation_number: installationNumber
        });
    } catch (e) {
        console.warn("Loglama yapılamadı:", e);
    }
};

export const getUserActivityStats = async (): Promise<UserActivityStat[]> => {
    // 1. Önce hazır Görünümden (View) çekmeyi dene (En performanslı yol)
    const { data, error } = await supabase
        .from('user_stats_view')
        .select('*');

    // Eğer view başarılıysa dön
    if (!error && data) {
        return data.map((stat: any) => {
            let formattedDate = 'Giriş Yapmadı';
            if (stat.last_login) {
                const date = new Date(stat.last_login);
                formattedDate = date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});
            }

            return {
                username: stat.username,
                queryCount: stat.query_count || 0,
                lastLogin: formattedDate
            };
        });
    }

    // Hata varsa konsola düzgün şekilde bas (Object Object hatasını önle)
    if (error) {
        try {
            console.warn("İstatistik Görünümü (View) okunamadı, manuel hesaplama moduna geçiliyor. Hata:", JSON.stringify(error));
        } catch (e) {
            console.warn("İstatistik Görünümü hatası:", error);
        }
    }

    // 2. FALLBACK: View yoksa veya bozuksa, manuel hesaplama yap
    // Bu kısım "View not found (42P01)" veya izin hatası durumunda sistemi kurtarır.
    
    // search_logs tablosundan ham veriyi çek
    const { data: logs, error: logError } = await supabase
        .from('search_logs')
        .select('username, created_at');

    if (logError) {
        // Loglar da okunamıyorsa boş dön
        try {
             console.error("Manuel log okuma hatası:", JSON.stringify(logError));
        } catch(e) { console.error("Manuel log okuma hatası:", logError); }
        return [];
    }

    if (!logs) return [];

    // JavaScript tarafında veriyi grupla ve hesapla
    const stats: Record<string, { count: number, lastLoginDate: Date | null }> = {};

    logs.forEach((log: any) => {
        const username = log.username;
        if (!username) return;

        if (!stats[username]) {
            stats[username] = { count: 0, lastLoginDate: null };
        }
        
        stats[username].count++;
        
        const logDate = new Date(log.created_at);
        if (!stats[username].lastLoginDate || logDate > stats[username].lastLoginDate!) {
             stats[username].lastLoginDate = logDate;
        }
    });

    // Sonuç dizisine dönüştür
    return Object.keys(stats).map(username => {
        const item = stats[username];
        let formattedDate = 'Giriş Yapmadı';
        if (item.lastLoginDate) {
             formattedDate = item.lastLoginDate.toLocaleDateString('tr-TR') + ' ' + item.lastLoginDate.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});
        }

        return {
            username: username,
            queryCount: item.count,
            lastLogin: formattedDate
        };
    });
};

// --- Data Import/Export Operations ---

export const bulkUpsertCustomers = async (
    customers: Customer[], 
    onProgress?: (processed: number, total: number, errorCount: number) => void
): Promise<{ success: number, errorCount: number, error: any }> => {
    
    if (customers.length === 0) return { success: 0, errorCount: 0, error: null };

    // Verileri Supabase formatına dönüştür
    const dbRows: SupabaseCustomer[] = customers.map(c => ({
        installation_number: c.installationNumber,
        name: c.name,
        phone: c.phone,
        address: c.address,
        latitude: c.latitude ? parseFloat(c.latitude.replace(',', '.')) : null,
        longitude: c.longitude ? parseFloat(c.longitude.replace(',', '.')) : null
    }));

    // Chunk (Parça) boyutu düşürüldü - Timeout'u önlemek için
    const CHUNK_SIZE = 200; 
    let totalSuccess = 0;
    let totalErrors = 0;
    let lastError = null;

    for (let i = 0; i < dbRows.length; i += CHUNK_SIZE) {
        const chunk = dbRows.slice(i, i + CHUNK_SIZE);
        
        try {
            // upsert: Varsa güncelle, yoksa ekle
            const { error } = await supabase
                .from('customers')
                .upsert(chunk, { onConflict: 'installation_number' });

            if (error) {
                console.error(`Chunk error at index ${i}:`, error);
                // Bir chunk başarısız olursa diğerlerine devam etmeye çalış
                totalErrors += chunk.length;
                lastError = error.message;
                
                // Eğer hata RLS ise, tüm işlemi durdurmak daha mantıklı
                if (error.code === '42501' || error.message.includes('row-level security')) {
                    return { 
                        success: totalSuccess, 
                        errorCount: dbRows.length - totalSuccess, 
                        error: "YETKİ HATASI: Supabase'de yazma izni yok. SQL Editor'den izin verin." 
                    };
                }
            } else {
                totalSuccess += chunk.length;
            }
        } catch (e: any) {
            console.error(`Unexpected chunk error at index ${i}:`, e);
            totalErrors += chunk.length;
            lastError = e.message;
        }

        // İlerleme durumunu bildir
        if (onProgress) {
            onProgress(i + chunk.length > dbRows.length ? dbRows.length : i + chunk.length, dbRows.length, totalErrors);
        }

        // THROTTLING: Sunucuyu boğmamak için kısa bir bekleme ekle
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { success: totalSuccess, errorCount: totalErrors, error: lastError };
};

export const exportCustomersAsCSV = async (): Promise<string> => {
    // Tüm müşterileri çek (Limit gerekirse artırılabilir veya loop'a sokulabilir)
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .limit(50000); // Makul bir üst sınır
    
    if (error) handleSupabaseError(error, 'exportCustomers');
    if (!data) return '';

    // CSV Başlıkları (Import formatıyla uyumlu)
    let csvContent = "Tesisat No; Ad Soyad; Telefon; Adres; Enlem; Boylam\n";

    data.forEach(row => {
        const line = [
            row.installation_number,
            `"${row.name || ''}"`, // Tırnak içine al (virgül varsa patlamasın)
            row.phone || '',
            `"${row.address || ''}"`,
            row.latitude || '',
            row.longitude || ''
        ].join(';'); // Noktalı virgül ayırıcı
        
        csvContent += line + "\n";
    });

    return csvContent;
};

export const getCustomerCount = async (): Promise<number> => {
    const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
    
    if (error) return 0;
    return count || 0;
};

// --- Admin Operations ---

export const addCredential = async (credential: Credential): Promise<Credential[]> => {
    // Kullanıcı var mı kontrol et
    const { data: existing, error: checkError } = await supabase.from('users').select('username').eq('username', credential.username).single();
    
    if (checkError && checkError.code !== 'PGRST116') {
         // PGRST116: no rows returned (bu iyi, kullanıcı yok demek)
         // Diğer hatalar (örn. yetki hatası) fırlatılmalı
         handleSupabaseError(checkError, 'addCredential_check');
    }

    if (existing) {
        throw new Error("Bu sicil numarası zaten kayıtlı.");
    }

    const { error } = await supabase.from('users').insert({
        username: credential.username,
        password: credential.password,
        allowed_device_id: credential.allowedDeviceId || null
    });

    if (error) handleSupabaseError(error, 'addCredential_insert');

    return getCredentials();
};

export const deleteCredential = async (username: string): Promise<Credential[]> => {
    const { error } = await supabase.from('users').delete().eq('username', username);
    if (error) handleSupabaseError(error, 'deleteCredential');
    return getCredentials();
};

export const updateCredential = async (originalUsername: string, updatedCredential: Credential): Promise<Credential[]> => {
    const { error } = await supabase
        .from('users')
        .update({
            username: updatedCredential.username,
            password: updatedCredential.password,
            allowed_device_id: updatedCredential.allowedDeviceId || null
        })
        .eq('username', originalUsername);

    if (error) handleSupabaseError(error, 'updateCredential');
    return getCredentials();
};

export const resetUserStats = async (username: string): Promise<void> => {
    const { error } = await supabase
        .from('search_logs')
        .delete()
        .eq('username', username);
    
    if (error) handleSupabaseError(error, 'resetUserStats');
};
