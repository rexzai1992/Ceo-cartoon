import React, { useState } from 'react';
import { MessageCircle, X, MessageSquare, Loader2, Headphones } from 'lucide-react';
import { AppSettings } from '../types';

interface SupportButtonProps {
  settings: AppSettings;
}

const SupportButton: React.FC<SupportButtonProps> = ({ settings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContact = async () => {
    // Check configuration
    if (!settings.whatsappApiKey || !settings.whatsappSender) {
      alert("Please configure WhatsApp Sender in Admin Dashboard first.");
      return;
    }

    setLoading(true);
    const PROXY_URL = "https://corsproxy.io/?";
    const targetUrl = 'https://ustazai.my/send-message';
    const finalUrl = settings.useCorsProxy ? `${PROXY_URL}${targetUrl}` : targetUrl;

    try {
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: settings.whatsappApiKey,
          sender: settings.whatsappSender,
          number: '601111171350',
          message: 'Customer Need help'
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("Help request sent! Our support team will contact you shortly.");
        setIsOpen(false);
      } else {
        console.error("API Error:", data);
        throw new Error(data.message || 'Failed to send');
      }
    } catch (error) {
      console.error("Support API Error:", error);
      alert("Failed to send help request. Please check your internet connection or settings.");
    } finally {
      setLoading(false);
    }
  };

  // Adjust position based on keyboard state
  const positionClass = 'bottom-6';
  const zIndexClass = 'z-50';

  return (
    <div className={`fixed right-6 ${positionClass} ${zIndexClass} flex flex-col items-end gap-4 transition-all duration-300 ease-in-out`}>
      {/* Popup Card */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 mb-2 animate-fade-in-up origin-bottom-right w-80">
           <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                 <Headphones className="text-blue-600 w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 leading-tight">Customer Support</h4>
                <p className="text-xs text-gray-500 mt-1">We typically reply within a few minutes.</p>
              </div>
           </div>
           
           <div className="bg-gray-50 rounded-xl rounded-tl-none p-3 text-sm text-gray-600 mb-5 border border-gray-100 shadow-sm">
             <p>👋 Hi there! Having trouble creating your cartoon? Click below to request help via WhatsApp.</p>
           </div>

           <button 
             onClick={handleContact}
             disabled={loading}
             className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-bold hover:bg-[#20bd5a] transition-all transform active:scale-95 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
           >
             {loading ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
             {loading ? 'Sending Request...' : 'Get Help on WhatsApp'}
           </button>
        </div>
      )}
      
      {/* Main Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-white
          ${isOpen ? 'bg-gray-900 rotate-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/40'}
        `}
        aria-label="Toggle support menu"
      >
        {/* Pulse effect only when closed */}
        {!isOpen && (
          <span className="absolute -inset-1 rounded-full bg-blue-400 opacity-20 animate-ping pointer-events-none"></span>
        )}
        
        <div className="relative text-white">
          {isOpen ? <X size={24} /> : <MessageSquare size={24} className="fill-current" />}
        </div>

        {/* Tooltip on hover (only when closed and on desktop) */}
        {!isOpen && (
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg hidden md:block">
            Need Help?
          </span>
        )}
      </button>
    </div>
  );
};

export default SupportButton;