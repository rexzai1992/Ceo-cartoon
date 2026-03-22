import React, { useState, useEffect } from 'react';
import { X, Delete } from 'lucide-react';

interface VirtualKeyboardProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onEnter?: () => void;
  title?: string;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
  onEnter,
  title = 'Keyboard',
}) => {
  const [isShift, setIsShift] = useState(false);
  const [isCaps, setIsCaps] = useState(false);

  // Reset shift after typing a character unless caps lock is on
  const handleKeyPress = (key: string) => {
    onChange(value + key);
    if (isShift && !isCaps) {
      setIsShift(false);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const handleSpace = () => {
    onChange(value + ' ');
  };

  const handleClear = () => {
    onChange('');
  };

  // Keyboard Layouts
  const keys = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  if (!isOpen) return null;

  const isUpperCase = isShift || isCaps;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-gray-100 border-t border-gray-300 shadow-2xl animate-fade-in-up pb-4 sm:pb-6">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-200 border-b border-gray-300">
        <span className="font-semibold text-gray-700">{title}</span>
        <button
          onClick={onClose}
          className="p-2 text-gray-600 hover:bg-gray-300 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-2 sm:p-4 max-w-4xl mx-auto space-y-2">
        {/* Row 1: Numbers */}
        <div className="flex justify-center gap-1 sm:gap-2">
          {keys[0].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="flex-1 h-12 sm:h-14 bg-white rounded-lg shadow-sm border border-gray-200 text-lg sm:text-xl font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-200 transition-colors"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Row 2: QWERTY */}
        <div className="flex justify-center gap-1 sm:gap-2">
          {keys[1].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(isUpperCase ? key.toUpperCase() : key)}
              className="flex-1 h-12 sm:h-14 bg-white rounded-lg shadow-sm border border-gray-200 text-lg sm:text-xl font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-200 transition-colors"
            >
              {isUpperCase ? key.toUpperCase() : key}
            </button>
          ))}
        </div>

        {/* Row 3: ASDFG */}
        <div className="flex justify-center gap-1 sm:gap-2 px-4 sm:px-8">
          {keys[2].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(isUpperCase ? key.toUpperCase() : key)}
              className="flex-1 h-12 sm:h-14 bg-white rounded-lg shadow-sm border border-gray-200 text-lg sm:text-xl font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-200 transition-colors"
            >
              {isUpperCase ? key.toUpperCase() : key}
            </button>
          ))}
        </div>

        {/* Row 4: ZXCVB + Shift + Delete */}
        <div className="flex justify-center gap-1 sm:gap-2">
          <button
            onClick={() => setIsShift(!isShift)}
            onDoubleClick={() => setIsCaps(!isCaps)}
            className={`flex-[1.5] h-12 sm:h-14 rounded-lg shadow-sm border border-gray-200 text-sm sm:text-base font-medium transition-colors ${
              isCaps ? 'bg-blue-500 text-white border-blue-600' : isShift ? 'bg-gray-300 text-gray-800' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {isCaps ? 'CAPS' : 'Shift'}
          </button>
          {keys[3].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(isUpperCase ? key.toUpperCase() : key)}
              className="flex-1 h-12 sm:h-14 bg-white rounded-lg shadow-sm border border-gray-200 text-lg sm:text-xl font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-200 transition-colors"
            >
              {isUpperCase ? key.toUpperCase() : key}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="flex-[1.5] h-12 sm:h-14 bg-gray-200 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center text-gray-800 hover:bg-gray-300 active:bg-gray-400 transition-colors"
          >
            <Delete size={24} />
          </button>
        </div>

        {/* Row 5: Space + Enter */}
        <div className="flex justify-center gap-1 sm:gap-2 pt-1">
          <button
            onClick={handleClear}
            className="flex-1 h-12 sm:h-14 bg-gray-200 rounded-lg shadow-sm border border-gray-200 text-sm sm:text-base font-medium text-gray-800 hover:bg-gray-300 active:bg-gray-400 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleSpace}
            className="flex-[4] h-12 sm:h-14 bg-white rounded-lg shadow-sm border border-gray-200 text-lg sm:text-xl font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-200 transition-colors"
          >
            Space
          </button>
          <button
            onClick={() => {
              onClose();
              if (onEnter) onEnter();
            }}
            className="flex-[2] h-12 sm:h-14 bg-blue-600 rounded-lg shadow-sm border border-blue-700 text-sm sm:text-base font-bold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default VirtualKeyboard;
