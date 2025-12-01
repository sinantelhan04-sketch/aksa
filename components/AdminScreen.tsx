
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as sheetService from '../services/sheetService';
import type { Credential, UserActivityStat, Customer } from '../types';
import { TrashIcon, EditIcon, SearchIcon, RefreshIcon, UserGroupIcon, ChartBarIcon, LightningIcon } from './icons';

type AdminUserData = Credential & Omit<UserActivityStat, 'username'>;
type SortableKeys = 'username' | 'queryCount' | 'lastLogin';

interface AdminScreenProps {
  onLogout: () => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Forms
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [isNewDeviceUnrestricted, setIsNewDeviceUnrestricted] = useState(false); // New Flag
  
  const [editingUser, setEditingUser] = useState<AdminUserData | null>(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', allowedDeviceId: '', isUnrestricted: false });
  
  // Import State
  const [importLog, setImportLog] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: 0 });
  
  const [showPasswords, setShowPasswords] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'lastLogin', direction: 'descending' });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [creds, stats, customerCount] = await Promise.all([
        sheetService.getCredentials(),
        sheetService.getUserActivityStats(),
        sheetService.getCustomerCount()
      ]);

      setTotalCustomers(customerCount);

      const statsMap = new Map<string, Omit<UserActivityStat, 'username'>>();
      stats.forEach(stat => {
        statsMap.set(String(stat.username), { 
            queryCount: stat.queryCount, 
            lastLogin: stat.lastLogin 
        });
      });

      const mergedData: AdminUserData[] = creds.map(cred => ({
        ...cred,
        queryCount: statsMap.get(String(cred.username))?.queryCount ?? 0,
        lastLogin: statsMap.get(String(cred.username))?.lastLogin ?? 'Giriş Yapmadı',
      }));

      setUsers(mergedData);

    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Dashboard İstatistikleri
  const dashboardStats = useMemo(() => {
      const totalUsers = users.length;
      const totalQueries = users.reduce((acc, user) => acc + user.queryCount, 0);
      const activeUser = [...users].sort((a, b) => b.queryCount - a.queryCount)[0];
      
      return { totalUsers, totalQueries, activeUser };
  }, [users]);

  // Sıralama Mantığı
  const sortedUsers = useMemo(() => {
    let sortableItems = [...users];
    if (sortConfig.key) {
        sortableItems.sort((a, b) => {
            if (sortConfig.key === 'lastLogin') {
                // Tarih formatı "DD.MM.YYYY HH:mm"
                const parseDate = (dateStr: string | number | undefined) => {
                    const s = String(dateStr);
                    if (!s || s === 'Giriş Yapmadı') return 0;
                    try {
                        const [datePart, timePart] = s.split(' ');
                        if (!datePart || !timePart) return 0;
                        const [day, month, year] = datePart.split('.').map(Number);
                        const [hour, minute] = timePart.split(':').map(Number);
                        return new Date(year, month - 1, day, hour, minute).getTime();
                    } catch (e) {
                        return 0;
                    }
                };
                const aTime = parseDate(a.lastLogin);
                const bTime = parseDate(b.lastLogin);
                return sortConfig.direction === 'ascending' ? aTime - bTime : bTime - aTime;
            }
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }
    return sortableItems;
  }, [users, sortConfig]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return sortedUsers;
    return sortedUsers.filter(user =>
        String(user.username).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedUsers, searchTerm]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortableKeys) => {
    if (sortConfig.key !== key) return <span className="text-gray-300 ml-1">↕</span>;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setError('Sicil Numarası ve Şifre boş olamaz.');
      return;
    }
    try {
        setIsSubmitting(true);
        setError('');
        
        const deviceIdPayload = isNewDeviceUnrestricted ? 'ANY_DEVICE' : newDeviceId.trim();

        await sheetService.addCredential({ 
            username: newUsername.trim(), 
            password: newPassword.trim(),
            allowedDeviceId: deviceIdPayload
        });
        setNewUsername('');
        setNewPassword('');
        setNewDeviceId('');
        setIsNewDeviceUnrestricted(false);
        setIsAddModalOpen(false);
        setSuccessMsg('Kullanıcı başarıyla eklendi.');
        setTimeout(() => setSuccessMsg(''), 3000);
        await fetchData();
    } catch(err: any) {
        setError(err.message || 'Kullanıcı eklenemedi.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (window.confirm(`'${username}' sicil numaralı kullanıcıyı silmek istediğinizden emin misiniz?`)) {
       try {
        setIsLoading(true);
        setError('');
        await sheetService.deleteCredential(username);
        setSuccessMsg('Kullanıcı silindi.');
        setTimeout(() => setSuccessMsg(''), 3000);
        await fetchData();
      } catch (err: any) {
        setError(err.message || 'Kullanıcı silinemedi.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResetStats = async (username: string) => {
      if (window.confirm(`'${username}' için sorgu geçmişini ve istatistikleri sıfırlamak istediğinize emin misiniz?`)) {
          try {
              setIsLoading(true);
              setError('');
              await sheetService.resetUserStats(username);
              setSuccessMsg('İstatistikler sıfırlandı.');
              setTimeout(() => setSuccessMsg(''), 3000);
              await fetchData();
          } catch(err: any) {
              setError(err.message || "Sıfırlama başarısız.");
          } finally {
              setIsLoading(false);
          }
      }
  };
  
  const handleOpenEditModal = (user: AdminUserData) => {
    setEditingUser(user);
    const isAny = String(user.allowedDeviceId) === 'ANY_DEVICE';
    setEditForm({ 
        username: String(user.username), 
        password: String(user.password),
        allowedDeviceId: isAny ? '' : String(user.allowedDeviceId || ''),
        isUnrestricted: isAny
    });
    setIsEditModalOpen(true);
    setError('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const finalUsername = String(editForm.username).trim();
    const finalPassword = String(editForm.password).trim();

    if (!finalUsername || !finalPassword) {
        setError('Alanlar boş olamaz.');
        return;
    }
    try {
        setIsSubmitting(true);
        setError('');
        
        const deviceIdPayload = editForm.isUnrestricted ? 'ANY_DEVICE' : String(editForm.allowedDeviceId).trim();

        await sheetService.updateCredential(editingUser.username, {
            username: finalUsername, 
            password: finalPassword,
            allowedDeviceId: deviceIdPayload
        });
        setIsEditModalOpen(false);
        setEditingUser(null);
        setSuccessMsg('Kullanıcı güncellendi.');
        setTimeout(() => setSuccessMsg(''), 3000);
        await fetchData();
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- CSV Import Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const text = event.target?.result as string;
          if (text) {
              await processCSV(text);
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  const processCSV = async (csvText: string) => {
      setIsImporting(true);
      setImportLog([]);
      setImportProgress({ current: 0, total: 0, errors: 0 });

      const addToLog = (msg: string) => setImportLog(prev => [...prev, msg]);

      try {
          addToLog("Dosya okunuyor...");
          // Handle both CRLF and LF
          const lines = csvText.split(/\r?\n/);
          addToLog(`${lines.length} satır bulundu. Veri ayrıştırılıyor...`);

          const customers: Customer[] = [];
          
          let startIndex = 0;
          // Check header
          if (lines[0].toLowerCase().includes('tesisat') || lines[0].toLowerCase().includes('installation')) {
              startIndex = 1; 
          }

          for (let i = startIndex; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const separator = line.includes(';') ? ';' : ',';
              // Not: Tırnak içi virgül yönetimi basit split ile yapılmaz ama genel kullanım için yeterli.
              const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
              
              if (cols.length < 2) continue; // En az tesisat no ve isim lazım

              customers.push({
                  installationNumber: cols[0],
                  name: cols[1] || '',
                  phone: cols[2] || '',
                  address: cols[3] || '',
                  latitude: cols[4] || '',
                  longitude: cols[5] || ''
              });
          }

          if (customers.length === 0) {
              addToLog("HATA: İşlenecek veri bulunamadı. CSV formatını kontrol edin.");
              setIsImporting(false);
              return;
          }

          addToLog(`${customers.length} müşteri kaydı hazırlandı. Veritabanına parça parça gönderiliyor...`);
          setImportProgress({ current: 0, total: customers.length, errors: 0 });
          
          const result = await sheetService.bulkUpsertCustomers(
              customers, 
              (current, total, errorCount) => {
                  setImportProgress({ current, total, errors: errorCount });
              }
          );
          
          if (result.error && result.success === 0) {
              addToLog(`KRİTİK HATA: ${result.error}`);
          } else {
              addToLog(`İŞLEM TAMAMLANDI.`);
              addToLog(`Başarılı: ${result.success}`);
              addToLog(`Hatalı: ${result.errorCount}`);
              if (result.errorCount > 0) {
                  addToLog(`Son Hata Mesajı: ${result.error}`);
              }
              setSuccessMsg(`${result.success} müşteri başarıyla yüklendi.`);
              await fetchData(); 
          }

      } catch (err: any) {
          addToLog(`BEKLENMEYEN HATA: ${err.message}`);
      } finally {
          setIsImporting(false);
      }
  };

  // --- Yedek Alma (Export) Handler ---
  const handleDownloadBackup = async () => {
      try {
          setIsLoading(true);
          setSuccessMsg('Yedek hazırlanıyor, lütfen bekleyin...');
          const csvContent = await sheetService.exportCustomersAsCSV();
          
          if (!csvContent) {
              setError("İndirilecek veri bulunamadı.");
              return;
          }

          // Blob oluştur ve indir
          // UTF-8 BOM ekle (Excel'in Türkçe karakterleri tanıması için)
          const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `musteri_yedek_${new Date().toISOString().slice(0,10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setSuccessMsg('Yedek dosyası indirildi.');
          setTimeout(() => setSuccessMsg(''), 3000);

      } catch (err: any) {
          setError(err.message || 'Yedek alınamadı.');
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Yönetici Paneli</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistem durumunu ve kullanıcıları yönetin</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <button 
                    onClick={handleDownloadBackup}
                    disabled={isLoading}
                    className="flex-1 md:flex-none justify-center flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Yedek İndir
                </button>
                <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex-1 md:flex-none justify-center flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Veri Yükle
                </button>
                <button 
                    onClick={fetchData} 
                    disabled={isLoading}
                    className="flex-1 md:flex-none justify-center flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium text-sm"
                >
                    <span className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}>
                         <RefreshIcon />
                    </span>
                    Yenile
                </button>
                <button 
                    onClick={onLogout}
                    className="flex-1 md:flex-none justify-center flex items-center px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg transition-colors font-medium border border-red-200 dark:border-red-800 text-sm"
                >
                    Çıkış Yap
                </button>
            </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mr-4">
                    <UserGroupIcon />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Personel</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalUsers}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                 <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Kayıtlı Abone</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCustomers.toLocaleString()}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl mr-4">
                    <ChartBarIcon />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Sorgu</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalQueries}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl mr-4">
                    <LightningIcon />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">En Aktif Personel</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[120px]" title={dashboardStats.activeUser?.username}>
                        {dashboardStats.activeUser ? dashboardStats.activeUser.username : '-'}
                    </p>
                </div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white w-full md:w-auto text-left">Personel Listesi</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="Sicil No ile ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 w-full sm:w-64 transition-shadow"
                        />
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center whitespace-nowrap w-full sm:w-auto"
                    >
                        + Yeni Personel
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {error && <div className="mx-4 sm:mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-lg border-l-4 border-red-500 text-sm">{error}</div>}
            {successMsg && <div className="mx-4 sm:mx-6 mt-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200 rounded-lg border-l-4 border-green-500 text-sm">{successMsg}</div>}

            {/* Mobile Card View (Visible on small screens) */}
            <div className="block md:hidden p-4 space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 italic">Kayıt bulunamadı.</div>
                ) : (
                    filteredUsers.map((user) => (
                        <div key={user.username} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg font-mono">{user.username}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Son Giriş: {user.lastLogin}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.queryCount > 100 ? 'bg-orange-100 text-orange-800' : 'bg-gray-200 text-gray-700'}`}>
                                    {user.queryCount} Sorgu
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                                <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-600">
                                    <p className="text-xs text-gray-400 uppercase">Şifre</p>
                                    <p className="font-mono">{showPasswords ? user.password : '••••••'}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-600">
                                    <p className="text-xs text-gray-400 uppercase">Cihaz</p>
                                    {user.allowedDeviceId === 'ANY_DEVICE' ? (
                                        <p className="text-purple-600 dark:text-purple-400 font-bold text-xs">Kısıtlama Yok</p>
                                    ) : user.allowedDeviceId ? (
                                        <p className="text-green-600 dark:text-green-400 font-bold text-xs truncate">Eşleşmiş</p>
                                    ) : (
                                        <p className="text-yellow-600 dark:text-yellow-400 font-bold text-xs">Bekliyor</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-600 pt-3">
                                <button onClick={() => handleResetStats(user.username)} className="p-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium flex-1">Sıfırla</button>
                                <button onClick={() => handleOpenEditModal(user)} className="p-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium flex-1">Düzenle</button>
                                <button onClick={() => handleDeleteUser(user.username)} className="p-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium flex-1">Sil</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table View (Hidden on small screens) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider">
                        <tr>
                            <th onClick={() => requestSort('username')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                Sicil No {getSortIndicator('username')}
                            </th>
                            <th className="px-6 py-4 flex items-center gap-2">
                                Şifre
                                <input 
                                    type="checkbox" 
                                    checked={showPasswords} 
                                    onChange={(e) => setShowPasswords(e.target.checked)}
                                    className="cursor-pointer h-3 w-3 accent-blue-600"
                                    title="Şifreleri Göster/Gizle"
                                />
                            </th>
                            <th className="px-6 py-4">Cihaz Durumu</th>
                            <th onClick={() => requestSort('queryCount')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-center">
                                Sorgu {getSortIndicator('queryCount')}
                            </th>
                            <th onClick={() => requestSort('lastLogin')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-center">
                                Son Giriş {getSortIndicator('lastLogin')}
                            </th>
                            <th className="px-6 py-4 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                    <p className="mt-2 text-sm">Veriler yükleniyor...</p>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">Kayıt bulunamadı.</td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.username} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-white">
                                        {user.username}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400">
                                        {showPasswords ? (
                                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs select-all">{user.password}</span>
                                        ) : '••••••'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.allowedDeviceId === 'ANY_DEVICE' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                Serbest Erişim
                                            </span>
                                        ) : user.allowedDeviceId ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                Eşleşmiş
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                Bekliyor
                                            </span>
                                        )}
                                        {user.allowedDeviceId && user.allowedDeviceId !== 'ANY_DEVICE' && <div className="text-[10px] text-gray-400 mt-1 font-mono truncate max-w-[100px]">{user.allowedDeviceId.slice(-6)}...</div>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-bold ${user.queryCount > 100 ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {user.queryCount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                        {user.lastLogin}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleResetStats(user.username)}
                                                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                title="İstatistikleri Sıfırla"
                                            >
                                                <RefreshIcon />
                                            </button>
                                            <button 
                                                onClick={() => handleOpenEditModal(user)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Düzenle"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(user.username)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Sil"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      {/* --- MODALS --- */}

      {/* Import Modal */}
      {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => !isImporting && setIsImportModalOpen(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-white border-b pb-4 border-gray-100 dark:border-gray-700">Müşteri Verisi Yükle (Excel/CSV)</h2>
                  
                  <div className="mb-6 space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                          <p className="font-bold mb-2">CSV Formatı Nasıl Olmalı?</p>
                          <p className="mb-2">Excel dosyanızı <strong>Farklı Kaydet &gt; CSV (Virgülle Ayrılmış)</strong> seçeneği ile kaydedin. Sütun sırası şöyle olmalıdır:</p>
                          <code className="block bg-white dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-800 font-mono text-xs">
                              Tesisat No; Ad Soyad; Telefon; Adres; Enlem; Boylam
                          </code>
                      </div>

                      {!isImporting && (
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 hover:border-blue-500 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                    </svg>
                                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Dosya seçmek için tıklayın</span></p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">.CSV dosyaları</p>
                                </div>
                                <input type="file" className="hidden" accept=".csv, .txt" onChange={handleFileUpload} />
                            </label>
                        </div>
                      )}

                      {isImporting && importProgress.total > 0 && (
                          <div className="mb-4">
                              <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  <span>Yükleniyor...</span>
                                  <span>{Math.round((importProgress.current / importProgress.total) * 100)}% ({importProgress.current} / {importProgress.total})</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}></div>
                              </div>
                              {importProgress.errors > 0 && (
                                  <p className="text-xs text-red-500 mt-1 font-bold">{importProgress.errors} adet kayıt hatalı olduğu için atlandı.</p>
                              )}
                          </div>
                      )}

                      {/* Log Area */}
                      <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded-lg h-48 overflow-y-auto shadow-inner">
                          {importLog.length === 0 ? (
                              <span className="text-gray-500">Log kayıtları burada görünecek...</span>
                          ) : (
                              importLog.map((log, i) => <div key={i}>{log}</div>)
                          )}
                          {isImporting && <div className="animate-pulse mt-2">_ İşleniyor...</div>}
                      </div>
                  </div>

                  <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setIsImportModalOpen(false)} 
                        disabled={isImporting}
                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                      >
                          Kapat
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsAddModalOpen(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-4 border-gray-100 dark:border-gray-700">Yeni Personel</h2>
                  <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sicil Numarası</label>
                          <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base" placeholder="Örn: 12345" autoFocus />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şifre</label>
                          <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base" placeholder="Güçlü bir şifre" />
                      </div>
                      
                      {/* Device ID Input Group */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cihaz ID</label>
                          <div className="flex items-center space-x-3 mb-2">
                             <input 
                                type="checkbox" 
                                id="unrestrictedCheck"
                                checked={isNewDeviceUnrestricted}
                                onChange={(e) => setIsNewDeviceUnrestricted(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                             />
                             <label htmlFor="unrestrictedCheck" className="text-sm text-gray-600 dark:text-gray-400">
                                Cihaz Kısıtlaması Olmasın (Serbest Giriş)
                             </label>
                          </div>
                          {!isNewDeviceUnrestricted && (
                            <input 
                                type="text" 
                                value={newDeviceId} 
                                onChange={e => setNewDeviceId(e.target.value)} 
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-xs" 
                                placeholder="Boş bırakılırsa ilk cihaz kilitlenir" 
                            />
                          )}
                      </div>

                      <div className="flex justify-end gap-3 mt-8">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-1 sm:flex-none">İptal</button>
                          <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md disabled:opacity-50 flex-1 sm:flex-none">
                              {isSubmitting ? 'Ekleniyor...' : 'Ekle'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-4 border-gray-100 dark:border-gray-700">Düzenle: {editingUser.username}</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sicil Numarası</label>
                    <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şifre</label>
                    <input type="text" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base" />
                </div>
                
                {/* Device ID Edit Group */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cihaz Ayarları</label>
                    <div className="flex items-center space-x-3 mb-2">
                        <input 
                        type="checkbox" 
                        id="unrestrictedEditCheck"
                        checked={editForm.isUnrestricted}
                        onChange={(e) => setEditForm({...editForm, isUnrestricted: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="unrestrictedEditCheck" className="text-sm text-gray-600 dark:text-gray-400">
                        Cihaz Kısıtlaması Olmasın (Serbest Giriş)
                        </label>
                    </div>

                    {!editForm.isUnrestricted && (
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={editForm.allowedDeviceId} 
                                onChange={e => setEditForm({...editForm, allowedDeviceId: e.target.value})} 
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-xs"
                                placeholder="Cihaz ID"
                            />
                            <button type="button" onClick={() => setEditForm({...editForm, allowedDeviceId: ''})} className="px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg text-xs font-bold">SIFIRLA</button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-1 sm:flex-none">İptal</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md disabled:opacity-50 flex-1 sm:flex-none">
                        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};
