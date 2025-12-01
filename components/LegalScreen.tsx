
import React from 'react';

interface LegalScreenProps {
  onAccept: () => void;
  onDecline: () => void;
}

const LegalScreen: React.FC<LegalScreenProps> = ({ onAccept, onDecline }) => {
  return (
    <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-center">
      <div className="flex justify-center items-center mb-4">
        <img 
          src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" 
          alt="Aksa Doğalgaz Logo" 
          className="h-12 sm:h-16"
        />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Yasal Uyarı ve Gizlilik Taahhüdü</h2>
      <p className="text-gray-600 dark:text-gray-300 text-left leading-relaxed text-sm sm:text-base">
        Program kapsamında tarafıma sunulan tüm bilgi ve verilerin gizli olduğunu, 
        bu bilgileri yalnızca belirlenen amaçlar doğrultusunda kullanacağımı, 
        üçüncü kişilerle paylaşmayacağımı ve farklı herhangi bir amaçla kullanmayacağımı 
        kabul, beyan ve taahhüt ederim.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button
          onClick={onAccept}
          className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          Kabul Ediyorum
        </button>
        <button
          onClick={onDecline}
          className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
        >
          Kabul Etmiyorum
        </button>
      </div>
    </div>
  );
};

export default LegalScreen;
