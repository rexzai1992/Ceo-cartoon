import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, ArrowRight, MessageCircle, Phone, X, Send, FileText, Crown } from 'lucide-react';
import { AppStatus, AppSettings, CartoonRequest } from '../types';

interface ResultCardProps {
  status: AppStatus;
  resultUrl: string | null;
  onReset: () => void;
  settings: AppSettings;
  request: CartoonRequest;
}

const ResultCard: React.FC<ResultCardProps> = ({ status, resultUrl, onReset, settings, request }) => {
  const PROMO_URL = "https://aigenius.com.my";
  const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(PROMO_URL)}`;
  const PROXY_URL = "https://corsproxy.io/?";

  const [showPhoneInput, setShowPhoneInput] = useState(false);
  // Initialize with '6' as mandatory prefix
  const [phoneNumber, setPhoneNumber] = useState('6');
  
  // Initialize message with variable replacement
  const [whatsappMessage] = useState(() => {
    let msg = settings.whatsappMessageTemplate || 
      `Hello! Here is your generated CEO Cartoon. You can view your result and start your business journey at ${PROMO_URL}. Thank you!`;
    
    // Replace variables
    if (request) {
        msg = msg.replace(/{{personName}}/g, request.personName || '')
                 .replace(/{{gender}}/g, request.gender || '')
                 .replace(/{{businessName}}/g, request.businessName || '')
                 .replace(/{{businessType}}/g, request.businessType || '')
                 .replace(/{{style}}/g, request.style || '');
    }
    return msg;
  });
  
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const uploadToTmpFiles = async (base64Image: string): Promise<string> => {
      // 1. Convert Base64 to Blob
      const res = await fetch(base64Image);
      const blob = await res.blob();
      
      const formData = new FormData();
      // Use timestamp to ensure unique filename and avoid proxy caching
      const filename = `ceo-cartoon-${Date.now()}.png`;
      formData.append('file', blob, filename);
      
      // 2. Upload to TmpFiles.org (Free, no key) via Proxy
      const targetUrl = 'https://tmpfiles.org/api/v1/upload';
      const proxyUrl = `${PROXY_URL}${targetUrl}`;
      
      const response = await fetch(proxyUrl, {
          method: 'POST',
          body: formData
          // Note: Do NOT set Content-Type header manually, let fetch set the boundary
      });

      if (!response.ok) throw new Error("Temporary host upload failed");
      
      const data = await response.json();
      if (data.status !== 'success') throw new Error("Host returned error status");
      
      // 3. Convert to Direct Link
      // TmpFiles returns: https://tmpfiles.org/12345/image.png
      // Direct link is:   https://tmpfiles.org/dl/12345/image.png
      return data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
  };

  const handleSendWhatsApp = async () => {
    // Check if number is valid (at least 6 + some digits)
    if (!phoneNumber || phoneNumber.length < 5) {
        alert("Please enter a valid phone number");
        return;
    }
    
    // Check if configuration exists
    if (!settings.whatsappApiKey || !settings.whatsappSender) {
        alert("WhatsApp API is not configured in Admin Settings.");
        return;
    }

    setSending(true);
    setStatusMessage("Preparing...");

    try {
        let finalImageUrl = resultUrl;
        let isMediaSupported = resultUrl && resultUrl.startsWith('http');

        // Check if we need to upload Base64 first
        if (resultUrl && resultUrl.startsWith('data:')) {
            try {
                setStatusMessage("Uploading temp image...");
                finalImageUrl = await uploadToTmpFiles(resultUrl);
                isMediaSupported = true; // Now we have a public URL
            } catch (err) {
                console.error("Image host upload failed, falling back to text", err);
                isMediaSupported = false;
            }
        }

        const targetUrl = isMediaSupported 
            ? 'https://ustazai.my/send-media'
            : 'https://ustazai.my/send-message';
            
        // Use proxy if enabled in settings to bypass CORS
        const finalUrl = settings.useCorsProxy ? `${PROXY_URL}${targetUrl}` : targetUrl;

        const messageText = whatsappMessage;

        // Construct body based on API type
        const body = isMediaSupported ? {
            api_key: settings.whatsappApiKey,
            sender: settings.whatsappSender,
            number: phoneNumber,
            media_type: 'image',
            caption: messageText,
            url: finalImageUrl
        } : {
            api_key: settings.whatsappApiKey,
            sender: settings.whatsappSender,
            number: phoneNumber,
            message: messageText
        };

        setStatusMessage("Sending to WhatsApp...");

        const response = await fetch(finalUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (response.ok) {
            const successMsg = isMediaSupported 
                ? "Image sent successfully!" 
                : "Text sent successfully! (Note: Image was skipped because temporary upload failed)";
            alert(successMsg);
            setShowPhoneInput(false);
            setPhoneNumber('6'); // Reset to mandatory prefix
        } else {
            console.error(data);
            alert(`Failed to send message: ${data.message || JSON.stringify(data) || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("WhatsApp Send Error:", error);
        alert("Failed to connect to messaging server (CORS/Network Error). Ensure 'Use CORS Proxy' is enabled in settings.");
    } finally {
        setSending(false);
        setStatusMessage("");
    }
  };

  const openWhatsAppModal = () => {
      if (!phoneNumber.startsWith('6')) setPhoneNumber('6');
      setShowPhoneInput(true);
  };

  const handlePhoneNumberChange = (val: string) => {
      // Enforce leading '6'
      if (val === '' || !val.startsWith('6')) {
          setPhoneNumber('6');
      } else {
          setPhoneNumber(val);
      }
  };

  if (status === AppStatus.IDLE) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-gray-400">
        <div className="w-24 h-24 bg-gray-100 rounded-full mb-6 flex items-center justify-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Create Magic?</h3>
        <p className="max-w-xs mx-auto text-sm">Fill in your details and upload a selfie to generate your CEO cartoon.</p>
      </div>
    );
  }

  if (status === AppStatus.GENERATING) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white border border-gray-200 rounded-2xl p-8 text-center relative overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 via-white to-purple-50 opacity-50" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl animate-pulse">🎨</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mt-6 mb-2">Creating Masterpiece for Boss {request.personName}</h3>
        </div>
      </div>
    );
  }

  if (status === AppStatus.ERROR) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <RefreshCw className="text-red-500 w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Generation Failed</h3>
        <p className="text-gray-600 mb-6">Something went wrong while communicating with the AI. Please try again.</p>
        <button
          onClick={onReset}
          className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
    {/* Phone Number Modal - Rendered via Portal to be on top of everything */}
    {showPhoneInput && createPortal(
        <div className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
               <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50">
                   <div className="flex items-center gap-2">
                      <div className="bg-[#25D366] p-1.5 rounded-full text-white">
                        <MessageCircle size={16} />
                      </div>
                      <h3 className="font-bold text-gray-800">Send to WhatsApp</h3>
                   </div>
                   <button onClick={() => setShowPhoneInput(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                       <X size={24} />
                   </button>
               </div>
               
               <div className="p-6">
                   <label className="block text-sm font-bold text-gray-700 mb-2">Recipient Phone Number</label>
                   <div className="relative mb-2">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <Phone size={20} className="text-gray-400" />
                       </div>
                       <input 
                         type="tel" 
                         value={phoneNumber}
                         onChange={(e) => handlePhoneNumberChange(e.target.value)}
                         placeholder="e.g. 60123456789"
                         className="block w-full pl-10 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-[#25D366] focus:border-[#25D366] transition-colors text-xl font-medium tracking-wide"
                       />
                   </div>
                   <p className="text-xs text-gray-500 mb-6">
                      * Country code 60 is required and automatically added.
                   </p>
                   
                   <button 
                     onClick={handleSendWhatsApp}
                     disabled={sending || phoneNumber.length < 5}
                     className="w-full py-4 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#20bd5a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5"
                   >
                     {sending ? (
                         <>
                           <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                           {statusMessage || 'Sending...'}
                         </>
                     ) : (
                         <>
                           <Send size={20} />
                           Send Now
                         </>
                     )}
                   </button>
               </div>
           </div>
        </div>,
        document.body
    )}

    <div className="relative flex flex-col lg:flex-row bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xl animate-fade-in min-h-[700px]">
      
      {/* Left Column: Image Preview */}
      <div className="flex-[3] bg-gray-900 relative flex items-center justify-center p-4 lg:p-8 overflow-hidden group">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
        
        {/* NOTE: Badge removed per user request */}

        {resultUrl && (
          <img 
            src={resultUrl} 
            alt="Generated CEO" 
            className="w-full h-full object-contain max-h-[75vh] shadow-2xl rounded-lg transform transition-transform duration-500 group-hover:scale-[1.01]"
          />
        )}
      </div>
      
      {/* Right Column: Actions */}
      <div className="flex-[2] bg-white p-6 lg:p-10 flex flex-col border-l border-gray-100 relative overflow-y-auto">
        
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-green-600 font-bold uppercase tracking-wider text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Generation Complete
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3 leading-tight capitalize">
            {request.businessName || 'Business'} By {request.personName || 'CEO'}
          </h2>
          <p className="text-gray-500">
            Send your new look to WhatsApp or start your business journey.
          </p>
        </div>

        {/* Primary Actions (Send & Reset) */}
        <div className="space-y-3 mb-8">
           
           <button 
             onClick={openWhatsAppModal}
             className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#25D366] text-white font-bold text-lg rounded-xl hover:bg-[#20bd5a] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
           >
             <MessageCircle size={24} className="fill-current" />
             Send to WhatsApp
           </button>

           <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-gray-200 text-gray-600 font-bold text-lg rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <RefreshCw size={20} />
              Create New
            </button>
        </div>

        {/* CTA Section - "At last" */}
        <div className="mt-auto pt-8 border-t border-gray-100">
           <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center border border-blue-100">
              <h3 className="text-gray-900 font-bold text-xl mb-2">Turn This Into Reality?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Scan to download your picture and register your store on AiGenius.
              </p>
              
              <div className="flex justify-center mb-5">
                 <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                    <img src={QR_CODE_URL} alt="Scan to Launch" className="w-32 h-32 mix-blend-multiply" />
                 </div>
              </div>
              
              <a 
                href={PROMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 animate-pulse-slow"
              >
                Launch Your Business Now <ArrowRight size={20} />
              </a>
           </div>
        </div>

      </div>
    </div>
    </>
  );
};

export default ResultCard;