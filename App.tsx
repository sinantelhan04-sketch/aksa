
import React, { useState, useCallback, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import MainScreen from './components/MainScreen';
import LegalScreen from './components/LegalScreen';
import OfflineScreen from './components/OfflineScreen';
import { AdminScreen } from './components/AdminScreen';
import { isWithinWorkingHours } from './utils/time';
import * as sheetService from './services/sheetService';
import { SUPABASE_URL, SUPABASE_KEY } from './config';


const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isUnrestrictedUser, setIsUnrestrictedUser] = useState<boolean>(false); // Serbest giriş yapan kullanıcılar için flag
  const [legalAccepted, setLegalAccepted] = useState<boolean>(false);
  const [isWorkingTime, setIsWorkingTime] = useState(isWithinWorkingHours());
  const [appError, setAppError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');


  useEffect(() => {
     // 1. URL Kontrolü (Supabase)
     if (!SUPABASE_URL || SUPABASE_URL.includes("PROJECT_ID") || !SUPABASE_KEY) {
        setAppError("Yapılandırma Eksik: Lütfen config.ts dosyasına Supabase URL ve Key bilgilerinizi girin.");
        return;
    }

    // 2. Sunucu Bağlantı Kontrolü
    const checkConnection = async () => {
        setServerStatus('checking');
        const isOnline = await sheetService.checkServerConnection();
        setServerStatus(isOnline ? 'online' : 'offline');
    };
    checkConnection();

    const interval = setInterval(() => {
        setIsWorkingTime(isWithinWorkingHours());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogin = useCallback(async (username: string, password: string, deviceId: string) => {
    // Admin login is a local check
    if (username === 'admin' && password === 'admin123') {
        setIsAuthenticated(true);
        setIsAdmin(true);
        setCurrentUser('admin');
        setIsUnrestrictedUser(true); // Admin is always unrestricted
        setLegalAccepted(true); // Admin doesn't need legal screen
        return;
    }
   
    // Authentication
    // authenticateUser now returns true if user is unrestricted (ANY_DEVICE), false otherwise
    const isUnrestricted = await sheetService.authenticateUser(username, password, deviceId);
    
    setIsAuthenticated(true);
    setIsAdmin(false);
    setCurrentUser(username);
    setIsUnrestrictedUser(isUnrestricted);
    setLegalAccepted(false); // Always show legal screen for normal users
  }, []);
  
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setIsUnrestrictedUser(false);
    setLegalAccepted(false);
  }, []);

  const handleAcceptLegal = useCallback(() => {
    setLegalAccepted(true);
  }, []);

  const handleDeclineLegal = useCallback(() => {
    handleLogout(); // Log out if legal is declined
  }, [handleLogout]);


  const renderContent = () => {
      if (appError) {
          return (
              <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6 text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900">
                      <svg className="h-8 w-8 text-red-600 dark:text-red-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kurulum Gerekli</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Veritabanı bağlantı ayarları yapılmamış.</p>
                  </div>
                  <div className="text-left text-sm text-gray-600 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800 font-mono text-xs overflow-x-auto">
                    {appError}
                  </div>
              </div>
          );
      }
      if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center gap-6 w-full max-w-md">
                <LoginScreen onLogin={handleLogin} />
                
                {/* Sunucu Durum Barı */}
                <div className={`w-full max-w-[90%] mx-auto backdrop-blur-sm rounded-full py-1.5 px-4 flex items-center justify-between text-[10px] sm:text-xs font-medium transition-colors border shadow-sm ${
                    serverStatus === 'online' ? 'bg-white/80 border-green-200 text-green-700 dark:bg-gray-800/80 dark:border-green-900 dark:text-green-300' :
                    serverStatus === 'offline' ? 'bg-white/80 border-red-200 text-red-700 dark:bg-gray-800/80 dark:border-red-900 dark:text-red-300' :
                    'bg-white/80 border-yellow-200 text-yellow-700 dark:bg-gray-800/80 dark:border-yellow-900 dark:text-yellow-300'
                }`}>
                    <div className="flex items-center gap-2">
                        <span className={`relative flex h-2 w-2`}>
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              serverStatus === 'online' ? 'bg-green-400' : serverStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
                          }`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${
                              serverStatus === 'online' ? 'bg-green-500' : serverStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}></span>
                        </span>
                        <span>
                            {serverStatus === 'online' && "Sistem Çevrimiçi"}
                            {serverStatus === 'offline' && "Sunucuya Erişilemiyor"}
                            {serverStatus === 'checking' && "Bağlantı Kontrolü..."}
                        </span>
                    </div>
                    
                    {serverStatus === 'offline' && (
                        <button 
                            onClick={async () => {
                                setServerStatus('checking');
                                const isOnline = await sheetService.checkServerConnection();
                                setServerStatus(isOnline ? 'online' : 'offline');
                            }}
                            className="underline hover:text-red-800"
                        >
                            Yenile
                        </button>
                    )}
                </div>
            </div>
        );
      }
      if (isAdmin) {
          return <AdminScreen onLogout={handleLogout} />;
      }
      if (!legalAccepted) {
          return <LegalScreen onAccept={handleAcceptLegal} onDecline={handleDeclineLegal} />;
      }
      if (!isWorkingTime) {
          return <OfflineScreen />;
      }
      
      return <MainScreen 
                onLogout={handleLogout} 
                username={currentUser!}
                isUnrestricted={isUnrestrictedUser}
             />;
  }


  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-900 dark:to-black text-gray-900 dark:text-gray-100 flex items-center justify-center p-4 font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
      {renderContent()}
    </div>
  );
};

export default App;
