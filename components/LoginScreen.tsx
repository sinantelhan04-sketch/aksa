
import React, { useState, useEffect } from 'react';
import { UserIcon, LockIcon, EditIcon, EyeIcon, EyeOffIcon } from './icons';

interface LoginScreenProps {
  onLogin: (username: string, password: string, deviceId: string) => Promise<void>;
}

const STORAGE_KEY = 'device_uuid_v2';

// Cihaz Kimliğini kalıcı hale getiren yardımcı fonksiyon
const getPersistentDeviceId = (): string => {
    let id = '';

    // 1. Önce LocalStorage kontrol et
    try {
        id = localStorage.getItem(STORAGE_KEY) || '';
    } catch (e) {
        console.warn("LocalStorage erişimi engellendi, Cookie denenecek.");
    }

    // 2. Eğer yoksa Cookie kontrol et
    if (!id) {
        try {
            const match = document.cookie.match(new RegExp('(^| )' + STORAGE_KEY + '=([^;]+)'));
            if (match) id = match[2];
        } catch (e) {}
    }

    // 3. Hala yoksa yeni oluştur
    if (!id) {
        try {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                id = crypto.randomUUID();
            }
        } catch (e) {}

        if (!id) {
            id = 'dev-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        }
        
        // Oluşturulan ID'yi sakla
        try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
        try { document.cookie = `${STORAGE_KEY}=${id}; path=/; max-age=315360000; SameSite=Strict`; } catch (e) {}
    }

    return id;
};

let GLOBAL_DEVICE_ID = '';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Edit Mode
  const [isEditingId, setIsEditingId] = useState(false);
  const [tempId, setTempId] = useState('');
  const [copied, setCopied] = useState(false);

  const [deviceId, setDeviceId] = useState(() => {
      if (!GLOBAL_DEVICE_ID) {
          GLOBAL_DEVICE_ID = getPersistentDeviceId();
      }
      return GLOBAL_DEVICE_ID;
  });

  useEffect(() => {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
        await onLogin(username, password, deviceId);
        
        if (rememberMe) {
            localStorage.setItem('rememberedUsername', username);
        } else {
            localStorage.removeItem('rememberedUsername');
        }
    } catch (err: any) {
        let errorMsg = 'Giriş başarısız.';
        if (typeof err === 'string') {
            errorMsg = err;
        } else if (err?.message) {
             if (typeof err.message === 'object') {
                try { errorMsg = JSON.stringify(err.message); } catch(e) { errorMsg = String(err.message); }
            } else {
                errorMsg = String(err.message);
            }
        }
        setError(errorMsg);
        setIsLoggingIn(false);
    }
  };

  const copyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEditing = () => {
      setTempId(deviceId);
      setIsEditingId(true);
  };

  const saveDeviceId = () => {
      if (!tempId.trim()) {
          setIsEditingId(false);
          return;
      }
      const newId = tempId.trim();
      setDeviceId(newId);
      GLOBAL_DEVICE_ID = newId;
      
      try { localStorage.setItem(STORAGE_KEY, newId); } catch (e) {}
      try { document.cookie = `${STORAGE_KEY}=${newId}; path=/; max-age=315360000; SameSite=Strict`; } catch (e) {}
      
      setIsEditingId(false);
  };

  return (
    <div className="w-full max-w-sm mx-auto perspective-1000">
      
      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-white/50 dark:border-gray-700/50 p-8 relative overflow-hidden animate-fade-in-up">
        
        {/* Decorative Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600"></div>
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
                 <img src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" alt="Logo" className="h-12 w-auto object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Personel Paneli</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Lütfen kimlik bilgilerinizle giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div className="group">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 uppercase tracking-wider">Sicil Numarası</label>
                <div className="relative flex items-center">
                    <div className="absolute left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <UserIcon />
                    </div>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                        placeholder="Örn: 12345"
                        required
                    />
                </div>
            </div>

            {/* Password Input */}
            <div className="group">
                 <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 uppercase tracking-wider">Şifre</label>
                 <div className="relative flex items-center">
                    <div className="absolute left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <LockIcon />
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                        placeholder="••••••••"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                 </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
                <label className="flex items-center cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="sr-only"
                        />
                        <div className={`w-4 h-4 border-2 rounded transition-colors ${rememberMe ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800'}`}>
                            {rememberMe && <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                    </div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white transition-colors">Beni hatırla</span>
                </label>
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 animate-pulse flex items-center">
                     <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                     {error}
                </div>
            )}

            {/* Login Button */}
            <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full relative overflow-hidden group bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
                <span className="relative z-10 flex items-center justify-center font-bold text-sm tracking-wide">
                    {isLoggingIn ? (
                         <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Giriş Yapılıyor...
                         </>
                    ) : 'GÜVENLİ GİRİŞ'}
                </span>
                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer"></div>
            </button>
        </form>
      </div>

      {/* Security Device ID Token */}
      <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-xl border border-white/40 dark:border-gray-700/40 p-3 shadow-sm flex items-center justify-between gap-3 group">
             <div className="flex items-center overflow-hidden">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors ${isEditingId ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cihaz Güvenlik Kimliği</span>
                    {isEditingId ? (
                         <input 
                            type="text" 
                            value={tempId}
                            onChange={(e) => setTempId(e.target.value)}
                            className="text-xs font-mono font-bold bg-white dark:bg-gray-900 border border-blue-300 rounded px-1 py-0.5 w-full outline-none text-gray-800 dark:text-gray-200"
                            placeholder="Cihaz İsmi"
                            autoFocus
                        />
                    ) : (
                        <code className="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 truncate" title={deviceId}>
                            {deviceId}
                        </code>
                    )}
                </div>
             </div>
             
             <div className="flex items-center gap-1">
                {isEditingId ? (
                    <button 
                        onClick={saveDeviceId}
                        className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
                        title="Kaydet"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={copyDeviceId}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title={copied ? "Kopyalandı" : "Kopyala"}
                        >
                            {copied ? (
                                <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2v2h-4V5z" /></svg>
                            )}
                        </button>
                        <button 
                            onClick={startEditing}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Düzenle"
                        >
                            <EditIcon />
                        </button>
                    </>
                )}
             </div>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-2">Bu ID, hesabınıza yetki tanımlanması için gereklidir.</p>
      </div>

      <style>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-shimmer {
            animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
