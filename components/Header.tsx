import React from 'react';
import { Sparkles, Settings, Image as ImageIcon, Users } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenGallery: () => void;
  onOpenAdminGenerate: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenGallery, onOpenAdminGenerate }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a 
          href="https://aigenius.com.my" 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img 
            src="https://i.ibb.co/kVN6QFT9/aigenius-finallogo-aug2025-ai-1.png" 
            alt="AiGenius" 
            className="h-10 md:h-12 w-auto object-contain"
          />
        </a>
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenAdminGenerate}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            title="Admin Generation Dashboard"
          >
            <Users size={20} />
            <span className="hidden sm:inline font-medium">Kids</span>
          </button>
          <button 
            onClick={onOpenGallery}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            title="Gallery"
          >
            <ImageIcon size={20} />
            <span className="hidden sm:inline font-medium">Gallery</span>
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Admin Settings"
          >
            <Settings size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            <Sparkles size={16} />
            <span className="hidden sm:inline">Professional Edition</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;