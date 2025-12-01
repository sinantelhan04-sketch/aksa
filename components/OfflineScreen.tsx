
import React from 'react';
import { ClockIcon } from './icons';

const OfflineScreen: React.FC = () => {
    return (
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <ClockIcon />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Sistem Çevrimdışı</h2>
            <div className="text-gray-600 dark:text-gray-400 mt-4 text-left space-y-2">
                <p className="font-medium text-center mb-2">Tesisat Sorgulama sistemi şu anda kullanıma kapalıdır.</p>
                <p>Erişim Kuralları:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Hizmet süresi her ayın <strong>1'i ile 20'si</strong> arasındadır.</li>
                    <li>Çalışma saatleri hafta içi <strong>08:00 - 18:00</strong> arasındadır.</li>
                    <li>Hafta sonları ve resmi tatillerde hizmet verilmemektedir.</li>
                </ul>
            </div>
        </div>
    );
};

export default OfflineScreen;
