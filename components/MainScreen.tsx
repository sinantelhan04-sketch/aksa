
import React, { useState, useCallback, useEffect } from 'react';
import type { Customer } from '../types';
import * as sheetService from '../services/sheetService';
import { MapPinIcon, PhoneIcon, UserIcon, PhoneIconSolid, MessageIcon, ClockIcon, SearchIcon, TrashIcon } from './icons';

interface MainScreenProps {
    onLogout: () => void;
    username: string;
    isUnrestricted: boolean;
}

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;

const MainScreen: React.FC<MainScreenProps> = ({ onLogout, username, isUnrestricted }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null);
    const [externalMapUrl, setExternalMapUrl] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [showRecents, setShowRecents] = useState(false);

    // Load recent searches on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Geçmiş yüklenirken hata:", e);
        }
    }, []);

    const saveToRecents = (term: string) => {
        let updated = [term, ...recentSearches.filter(s => s !== term)];
        if (updated.length > MAX_RECENT_SEARCHES) {
            updated = updated.slice(0, MAX_RECENT_SEARCHES);
        }
        setRecentSearches(updated);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    const clearRecents = () => {
        setRecentSearches([]);
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    const handleClear = useCallback(() => {
        setSearchTerm('');
        setFoundCustomer(null);
        setLoading(false);
        setError('');
        setMapEmbedUrl(null);
        setExternalMapUrl(null);
        setSearchPerformed(false);
    }, []);

    const performSearch = async (term: string) => {
        if (!term.trim()) return;

        setSearchPerformed(true);
        setError('');
        setLoading(true);
        setFoundCustomer(null);
        setMapEmbedUrl(null);
        setExternalMapUrl(null);
        setShowRecents(false); // Hide recents dropdown

        try {
            const customer = await sheetService.findCustomerByInstallationNumber(term.trim());
            
            setFoundCustomer(customer);
            saveToRecents(term.trim()); // Save to history on success

            // Harita URL oluşturma işlemleri
            let gmapsEmbedUrl = '';
            let extMapUrl = '';

            // Koordinat temizleme ve parse işlemi
            const cleanLat = String(customer.latitude || '').replace(',', '.').trim();
            const cleanLon = String(customer.longitude || '').replace(',', '.').trim();
            
            const lat = parseFloat(cleanLat);
            const lon = parseFloat(cleanLon);

            if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                // Koordinat varsa
                gmapsEmbedUrl = `https://maps.google.com/maps?q=${lat},${lon}&t=&z=17&ie=UTF8&iwloc=&output=embed`;
                extMapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            } else if (customer.address && customer.address.trim() !== '') {
                // Adres varsa
                const encodedAddress = encodeURIComponent(customer.address);
                gmapsEmbedUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
                extMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            }

            if (gmapsEmbedUrl) setMapEmbedUrl(gmapsEmbedUrl);
            if (extMapUrl) setExternalMapUrl(extMapUrl);
            
            // Loglama (Fire and forget)
            sheetService.logSearchQuery(username, term.trim()).catch(e => console.warn("Loglama uyarısı:", e));

        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu.');
            sheetService.logSearchQuery(username, term.trim()).catch(e => console.warn("Log hatası:", e));
        } finally {
            setLoading(false);
        }
    };

    const handleSearchClick = () => {
        performSearch(searchTerm);
    };

    const handleRecentClick = (term: string) => {
        setSearchTerm(term);
        performSearch(term);
    };

    // İsim maskeleme fonksiyonu
    const maskName = (fullName: string) => {
        // Eğer kullanıcı unrestricted (Serbest Giriş / Admin) ise ismin tamamını göster
        if (isUnrestricted) return fullName;

        // Normal kullanıcılar için maskele
        return fullName.split(' ').map(part => {
            // "ilk 2 harften sonra yıldızlı olsun"
            if (part.length <= 2) return part;
            return part.substring(0, 2) + '***';
        }).join(' ');
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            
            {/* Üst Bar (Logo ve Çıkış) */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl">
                        <img src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" alt="Aksa Logo" className="h-8 w-auto mix-blend-multiply dark:mix-blend-normal" />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 dark:text-white leading-tight">Tesisat Sorgulama</h1>
                        <p className="text-[10px] text-gray-500 font-medium tracking-wide">
                            YETKİLİ PERSONEL: <span className="text-blue-600 dark:text-blue-400 font-bold">{username}</span>
                            {isUnrestricted && <span className="ml-2 text-green-600 dark:text-green-400 font-bold text-[9px] bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">TAM ERİŞİM</span>}
                        </p>
                    </div>
                 </div>
                 <button 
                    onClick={onLogout}
                    className="group flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-300 rounded-lg transition-all text-sm font-medium border border-red-100 dark:border-red-900/50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:inline">Çıkış</span>
                </button>
            </div>

            {/* Arama Alanı (Hero Section) */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 sm:p-10 relative overflow-hidden">
                {/* Dekoratif Arkaplan Efektleri */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                        Tesisat <span className="text-blue-600 dark:text-blue-400">Sorgulama</span>
                    </h2>
                    
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                        <div className="relative flex shadow-2xl rounded-2xl bg-white dark:bg-gray-900">
                            <div className="pl-6 flex items-center pointer-events-none text-gray-400">
                                <SearchIcon />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowRecents(true);
                                }}
                                onFocus={() => setShowRecents(true)}
                                onBlur={() => setTimeout(() => setShowRecents(false), 200)}
                                placeholder="Tesisat numarasını girin (Örn: 100123456)"
                                disabled={loading}
                                className="w-full py-5 px-4 text-lg bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                            />
                            <div className="p-2 flex gap-2">
                                {(searchTerm || foundCustomer) && (
                                    <button 
                                        onClick={handleClear}
                                        className="px-4 rounded-xl font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-300 transition-colors"
                                    >
                                        Temizle
                                    </button>
                                )}
                                <button
                                    onClick={handleSearchClick}
                                    disabled={loading || !searchTerm.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/30 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : 'Sorgula'}
                                </button>
                            </div>
                        </div>

                        {/* Dropdown Menu */}
                        {showRecents && recentSearches.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-30 animate-fade-in-up origin-top">
                                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Son Aramalar</span>
                                    <button onClick={clearRecents} className="text-xs text-red-500 hover:text-red-600 font-medium">Temizle</button>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {recentSearches.map((term, i) => (
                                        <button 
                                            key={i}
                                            onMouseDown={() => handleRecentClick(term)}
                                            className="w-full text-left px-5 py-3.5 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                                        >
                                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-1.5 rounded-lg">
                                                <ClockIcon className="h-4 w-4" />
                                            </span>
                                            <span className="font-mono text-gray-700 dark:text-gray-200 font-medium">{term}</span>
                                            <span className="ml-auto text-gray-300">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hata Mesajı */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl animate-shake flex items-start gap-4 shadow-sm">
                    <div className="bg-red-100 dark:bg-red-800/30 p-2 rounded-full text-red-600 dark:text-red-300">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-red-800 dark:text-red-200">Sorgulama Başarısız</h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Sonuç Alanı */}
            {!loading && foundCustomer && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
                    
                    {/* Sol: Abone Bilgi Kartı */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 flex items-center justify-between text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                    <UserIcon />
                                </div>
                                <div>
                                    <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Tesisat No</p>
                                    <p className="text-2xl font-bold font-mono tracking-tight">{foundCustomer.installationNumber}</p>
                                </div>
                            </div>
                            <div className="bg-green-400/20 text-green-100 px-3 py-1 rounded-full text-xs font-bold border border-green-400/30">
                                AKTİF
                            </div>
                        </div>

                        <div className="p-6 sm:p-8 space-y-8 flex-grow">
                            {/* İsim */}
                            <div className="relative group">
                                <div className="absolute left-0 top-1 bottom-1 w-1 bg-blue-500 rounded-full"></div>
                                <div className="pl-5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ad Soyad</label>
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {maskName(foundCustomer.name)}
                                    </p>
                                </div>
                            </div>

                            {/* Telefon ve Aksiyonlar */}
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">İletişim</label>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <PhoneIcon />
                                        <span className="text-lg font-bold text-gray-800 dark:text-gray-200 font-mono tracking-tight">{foundCustomer.phone}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <a 
                                            href={`tel:${String(foundCustomer.phone).replace(/\s/g, "")}`}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-md shadow-green-200 dark:shadow-none transition-transform active:scale-95"
                                        >
                                            <PhoneIconSolid />
                                            <span>Ara</span>
                                        </a>
                                        <a 
                                            href={`sms:${String(foundCustomer.phone).replace(/\s/g, "")}?body=${encodeURIComponent(`Sayın ${maskName(foundCustomer.name)}, Aksa Doğalgaz tesisat kontrolü için adresinize geldik ancak size ulaşamadık.`)}`}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-200 dark:shadow-none transition-transform active:scale-95"
                                        >
                                            <MessageIcon />
                                            <span>SMS</span>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Adres */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Adres</label>
                                <div className="flex items-start gap-3 p-4 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800">
                                    <div className="text-blue-500 mt-1">
                                        <MapPinIcon />
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                        {foundCustomer.address}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sağ: Harita */}
                    <div className="flex flex-col h-full min-h-[400px]">
                         <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex-grow flex flex-col">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/20">
                                <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    Konum Bilgisi
                                </h3>
                                {externalMapUrl && (
                                    <a 
                                        href={externalMapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs font-bold bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors shadow-sm text-gray-700 dark:text-gray-200"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        Navigasyonu Aç
                                    </a>
                                )}
                            </div>
                            
                            <div className="flex-grow relative bg-gray-200 dark:bg-gray-900">
                                {mapEmbedUrl ? (
                                    <iframe
                                        src={mapEmbedUrl}
                                        width="100%"
                                        height="100%"
                                        className="absolute inset-0"
                                        style={{ border: 0 }}
                                        allowFullScreen={false}
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        title="Google Maps"
                                    ></iframe>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                                            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                        </div>
                                        <p className="font-medium">Harita verisi oluşturulamadı.</p>
                                        <p className="text-xs mt-2">Koordinat veya adres bilgisi eksik olabilir.</p>
                                    </div>
                                )}
                            </div>
                         </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !foundCustomer && !error && !searchPerformed && (
                <div className="text-center py-16 opacity-40">
                    <div className="inline-block p-6 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                        <SearchIcon />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Sorgulama yapmak için yukarıdaki alanı kullanın.</p>
                </div>
            )}

             <style>{`
                .animate-fade-in-up {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-shake {
                     animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; 
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
            `}</style>
        </div>
    );
};

export default MainScreen;
