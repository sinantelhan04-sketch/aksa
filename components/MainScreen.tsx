
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
        <div className="w-full max-w-5xl mx-auto space-y-4 pb-16 px-2 sm:px-4">
            
            {/* Sadeleştirilmiş Üst Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <img src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" alt="Logo" className="h-6 w-auto" />
                    <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Personel</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">{username}</span>
                    </div>
                 </div>
                 <button 
                    onClick={onLogout}
                    className="text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors border border-red-100 dark:border-red-900/30"
                >
                    Çıkış Yap
                </button>
            </div>

            {/* Sadeleştirilmiş Arama Alanı */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <span className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                        <SearchIcon />
                    </span>
                    Tesisat Sorgulama
                </h2>
                
                <div className="relative">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-grow">
                             <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowRecents(true);
                                }}
                                onFocus={() => setShowRecents(true)}
                                onBlur={() => setTimeout(() => setShowRecents(false), 200)}
                                placeholder="Tesisat numarasını girin..."
                                disabled={loading}
                                className="w-full pl-4 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium text-base h-12"
                            />
                        </div>
                        
                        <div className="flex gap-2 h-12">
                            {(searchTerm || foundCustomer) && (
                                <button 
                                    onClick={handleClear}
                                    className="px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm"
                                >
                                    Temizle
                                </button>
                            )}
                            <button
                                onClick={handleSearchClick}
                                disabled={loading || !searchTerm.trim()}
                                className="flex-1 sm:flex-none px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wide"
                            >
                                {loading ? '...' : 'SORGULA'}
                            </button>
                        </div>
                    </div>

                    {/* Dropdown Menu */}
                    {showRecents && recentSearches.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-30">
                            <div className="max-h-48 overflow-y-auto">
                                {recentSearches.map((term, i) => (
                                    <button 
                                        key={i}
                                        onMouseDown={() => handleRecentClick(term)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                                    >
                                        <ClockIcon className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-700 dark:text-gray-200">{term}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hata Mesajı */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/30 flex items-center gap-2 animate-shake">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {error}
                </div>
            )}

            {/* Sonuç Alanı */}
            {!loading && foundCustomer && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up">
                    
                    {/* Abone Bilgi Kartı */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-l-4 border-blue-500 overflow-hidden p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Tesisat No</p>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono tracking-tight">{foundCustomer.installationNumber}</p>
                                </div>
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-full">
                                    <UserIcon />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Abone Adı</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{maskName(foundCustomer.name)}</p>
                                </div>
                                
                                <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                                        <MapPinIcon /> Adres
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                                        {foundCustomer.address}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                             <a 
                                href={`tel:${String(foundCustomer.phone).replace(/\s/g, "")}`}
                                className="flex flex-col items-center justify-center gap-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm active:scale-95"
                            >
                                <PhoneIconSolid />
                                <span className="text-xs font-bold uppercase">Ara</span>
                            </a>
                            <a 
                                href={`sms:${String(foundCustomer.phone).replace(/\s/g, "")}?body=${encodeURIComponent(`Sayın ${maskName(foundCustomer.name)}, Aksa Doğalgaz tesisat kontrolü için adresinize geldik ancak size ulaşamadık.`)}`}
                                className="flex flex-col items-center justify-center gap-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm active:scale-95"
                            >
                                <MessageIcon />
                                <span className="text-xs font-bold uppercase">SMS</span>
                            </a>
                        </div>
                    </div>

                    {/* Harita Kartı */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex flex-col h-[300px] lg:h-auto border border-gray-100 dark:border-gray-700">
                        {mapEmbedUrl ? (
                            <>
                                <iframe
                                    src={mapEmbedUrl}
                                    width="100%"
                                    height="100%"
                                    className="flex-grow border-0"
                                    allowFullScreen={false}
                                    loading="lazy"
                                    title="Google Maps"
                                ></iframe>
                                {externalMapUrl && (
                                    <a 
                                        href={externalMapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-gray-50 dark:bg-gray-700 text-center py-3 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors border-t border-gray-200 dark:border-gray-600"
                                    >
                                        Harita Uygulamasında Aç ↗
                                    </a>
                                )}
                            </>
                        ) : (
                             <div className="flex-grow flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-400 p-6 text-center">
                                <div className="mb-2 opacity-50"><MapPinIcon /></div>
                                <span className="text-sm font-medium">Harita konumu bulunamadı.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .animate-fade-in-up {
                    animation: fadeInUp 0.4s ease-out forwards;
                }
                .animate-shake {
                     animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; 
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
            `}</style>
        </div>
    );
};

export default MainScreen;
