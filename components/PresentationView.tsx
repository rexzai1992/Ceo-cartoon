import React, { useEffect, useState } from 'react';
import { Generation } from '../types';
import { getBeforeImageForGeneration } from '../services/presentationStorage';

const PresentationView: React.FC = () => {
  const [presentationItem, setPresentationItem] = useState<Generation | null>(null);
  const [showGenerated, setShowGenerated] = useState(false);

  useEffect(() => {
    // Check initial state
    const stored = localStorage.getItem('presentation_data');
    if (stored) {
      try {
        const storedItem = JSON.parse(stored);
        const beforeImage = storedItem?.id ? getBeforeImageForGeneration(storedItem.id) : null;
        const hydratedItem = beforeImage
          ? { ...storedItem, before_image_url: beforeImage }
          : storedItem;
        setPresentationItem(hydratedItem);
        // Start transition after a short delay
        setTimeout(() => setShowGenerated(true), 1000);
      } catch (e) {
        console.error(e);
      }
    }

    // Listen for changes from the controller (Gallery)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'presentation_data') {
        if (e.newValue) {
          try {
            const newItem = JSON.parse(e.newValue);
            const beforeImage = newItem?.id ? getBeforeImageForGeneration(newItem.id) : null;
            const hydratedItem = beforeImage
              ? { ...newItem, before_image_url: beforeImage }
              : newItem;
            setPresentationItem(hydratedItem);
            setShowGenerated(false); // Reset to "before" state
            
            // Trigger the slow fade to generated photo
            setTimeout(() => {
              setShowGenerated(true);
            }, 2000); // Wait 2 seconds before starting the fade
          } catch (err) {
            console.error(err);
          }
        } else {
          setPresentationItem(null);
          setShowGenerated(false);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!presentationItem) {
    // Default state when nothing is being presented
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-[#4169E1] to-indigo-900 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-400/20 rounded-full blur-[120px] pointer-events-none"></div>
        
        <img 
          src="https://i.ibb.co/kVN6QFT9/aigenius-finallogo-aug2025-ai-1.png" 
          alt="AI Genius Logo" 
          className="h-32 md:h-48 object-contain drop-shadow-2xl animate-pulse"
        />
        <h1 className="mt-8 text-3xl md:text-5xl font-black text-white tracking-widest uppercase drop-shadow-lg">
          Ready to Present
        </h1>
      </div>
    );
  }

  const beforeImageSrc =
    presentationItem.before_image_url ||
    "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800&auto=format&fit=crop";

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-[#4169E1] to-indigo-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-400/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Bottom Left Logo */}
      <div className="absolute bottom-6 left-6 z-30 pointer-events-none">
        <img 
          src="https://i.ibb.co/kVN6QFT9/aigenius-finallogo-aug2025-ai-1.png" 
          alt="AI Genius Logo" 
          className="h-10 md:h-16 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Bottom Right Logo */}
      <div className="absolute bottom-6 right-6 z-30 pointer-events-none">
        <div className="h-10 md:h-16 flex items-center justify-center px-4 md:px-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl md:rounded-2xl shadow-2xl">
          <span className="text-white font-black text-lg md:text-3xl tracking-widest uppercase drop-shadow-md">
            Wonderpark
          </span>
        </div>
      </div>
      
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 md:p-12 lg:p-16 z-20">
        <div className="relative flex-1 min-h-0 w-full flex items-center justify-center mb-6 md:mb-8">
          
          {/* "Before" Picture (Demo Picture for testing) */}
          <div 
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-[3000ms] ease-in-out ${showGenerated ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <img 
              src={beforeImageSrc}
              alt="Before" 
              className="max-w-full max-h-full object-contain rounded-2xl md:rounded-3xl shadow-2xl border-4 border-white/20"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* "After" Picture (Generated) */}
          <img 
            src={presentationItem.image_url} 
            alt={presentationItem.person_name} 
            className={`max-w-full max-h-full object-contain rounded-2xl md:rounded-3xl shadow-2xl border-4 border-white/10 transition-opacity duration-[3000ms] ease-in-out ${showGenerated ? 'opacity-100' : 'opacity-0'}`}
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className={`text-center shrink-0 mb-16 md:mb-0 max-w-4xl mx-auto px-4 transition-all duration-[2000ms] ${showGenerated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight drop-shadow-2xl">
            {presentationItem.person_name}
          </h2>
          {presentationItem.business_name && presentationItem.business_name !== 'N/A' && (
            <p className="text-xl md:text-3xl text-blue-100 mt-2 md:mt-4 font-medium drop-shadow-lg">
              {presentationItem.business_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresentationView;
