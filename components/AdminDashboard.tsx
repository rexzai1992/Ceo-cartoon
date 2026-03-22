import React, { useState, useEffect } from 'react';
import { X, Save, Key, Box, Settings, AlertTriangle, Ratio, Globe, CheckCircle2, RotateCcw, MessageCircle, Phone, Image as ImageIcon } from 'lucide-react';
import { AppSettings, AiProvider, AspectRatio } from '../types';
import { DEFAULT_PROMPT_TEMPLATE } from '../services/aiService';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const MODEL_PRESETS: Record<AiProvider, string[]> = {
  gemini: [
    'gemini-2.5-flash-image',
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash',
  ],
  openai: [
    'gpt-image-1',
    'gpt-image-1.5',
    'gpt-image-1-mini',
    'dall-e-3',
    'dall-e-2'
  ],
  replicate: [
    'black-forest-labs/flux-schnell',
    'black-forest-labs/flux-dev',
    'stability-ai/sdxl',
    'recraft-ai/recraft-v3'
  ]
};

const ASPECT_RATIOS: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isCustomModel, setIsCustomModel] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
      // Check if current model is in presets
      const isPreset = MODEL_PRESETS[settings.provider].includes(settings.model);
      setIsCustomModel(!isPreset);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleProviderChange = (provider: AiProvider) => {
    const defaultModel = MODEL_PRESETS[provider][0];
    setFormData({ ...formData, provider, model: defaultModel });
    setIsCustomModel(false);
  };

  const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setIsCustomModel(true);
      setFormData({ ...formData, model: '' });
    } else {
      setIsCustomModel(false);
      setFormData({ ...formData, model: value });
    }
  };

  const handleResetPrompt = () => {
    if (confirm('Reset prompt to default?')) {
      setFormData({ ...formData, promptTemplate: DEFAULT_PROMPT_TEMPLATE });
    }
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const isOpenAIGptImageModel = formData.provider === 'openai' && formData.model.startsWith('gpt-image');
  const isOpenAIDalleModel = formData.provider === 'openai' && formData.model.startsWith('dall-e');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-2 text-gray-800">
            <Settings className="w-5 h-5" />
            <h2 className="font-bold text-lg">Admin Dashboard</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Connection Settings */}
            <div className="space-y-6">
                
                {/* Provider Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    AI Model Provider
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['gemini', 'openai', 'replicate'] as AiProvider[]).map((provider) => (
                      <button
                        key={provider}
                        onClick={() => handleProviderChange(provider)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium capitalize border transition-all
                          ${formData.provider === provider 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                  
                  {isOpenAIGptImageModel && (
                    <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                      <span>GPT Image models support reference images. Selfie and artwork inputs will be sent as image edits.</span>
                    </div>
                  )}

                  {isOpenAIDalleModel && (
                    <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>OpenAI DALL-E models do not support reference images. The selfie/artwork inputs will be ignored.</span>
                    </div>
                  )}
                  
                  {formData.provider === 'replicate' && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-blue-900 cursor-pointer">
                            <Globe size={16} />
                            Enable CORS Proxy
                          </label>
                          <div 
                            onClick={() => setFormData({...formData, useCorsProxy: !formData.useCorsProxy})}
                            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${formData.useCorsProxy ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${formData.useCorsProxy ? 'translate-x-5' : ''}`} />
                          </div>
                        </div>
                        <p className="text-xs text-blue-700">
                          Required when running in a browser to bypass Replicate's CORS restrictions. Uses <code>corsproxy.io</code>.
                        </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                        className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder={formData.provider === 'gemini' ? "Optional (Uses default env key)" : "Required"}
                      />
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model Configuration
                    </label>
                    <div className="space-y-2">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Box className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                          value={isCustomModel ? 'custom' : formData.model}
                          onChange={handleModelSelect}
                          className="block w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none"
                        >
                          {MODEL_PRESETS[formData.provider].map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                          <option value="custom">Custom...</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>

                      {isCustomModel && (
                        <input
                          type="text"
                          value={formData.model}
                          onChange={(e) => setFormData({...formData, model: e.target.value})}
                          className="block w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter Custom Model ID"
                          autoFocus
                        />
                      )}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                     <label className="text-sm font-medium text-gray-700 mb-1 block">Aspect Ratio</label>
                     <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Ratio className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                          value={formData.aspectRatio}
                          onChange={(e) => setFormData({...formData, aspectRatio: e.target.value as any})}
                          className="block w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        >
                          {ASPECT_RATIOS.map(ratio => (
                            <option key={ratio} value={ratio}>{ratio}</option>
                          ))}
                        </select>
                     </div>
                  </div>
                </div>
            </div>

            {/* Right Column: Prompt Engineering & Integration */}
            <div className="space-y-6">
                
                {/* Workshop Settings */}
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 space-y-4">
                    <div className="flex items-center gap-2 text-purple-800 font-semibold text-sm">
                       <Settings size={16} />
                       <h3>Workshop Settings</h3>
                    </div>
                    
                    {/* Melaka Settings */}
                    <div className="space-y-3 p-3 bg-white rounded-lg border border-purple-100">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Melaka Outlet</h4>
                      <div className="grid grid-cols-2 gap-3">
                           <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Class Time Slot</label>
                            <input 
                              type="text"
                              value={formData.classTimeSlots?.['Melaka'] || ''}
                              onChange={(e) => setFormData({...formData, classTimeSlots: { ...formData.classTimeSlots, 'Melaka': e.target.value }})}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="e.g. Saturday 10:00 AM - 12:00 PM"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Daily Registration Limit</label>
                            <input 
                              type="number"
                              min="1"
                              value={formData.registrationLimits?.['Melaka'] || 20}
                              onChange={(e) => setFormData({...formData, registrationLimits: { ...formData.registrationLimits, 'Melaka': parseInt(e.target.value) || 0 }})}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="e.g. 20"
                            />
                          </div>
                      </div>
                    </div>

                    {/* Kuala Terengganu Settings */}
                    <div className="space-y-3 p-3 bg-white rounded-lg border border-purple-100">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Kuala Terengganu Outlet</h4>
                      <div className="grid grid-cols-2 gap-3">
                           <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Class Time Slot</label>
                            <input 
                              type="text"
                              value={formData.classTimeSlots?.['Kuala Terengganu'] || ''}
                              onChange={(e) => setFormData({...formData, classTimeSlots: { ...formData.classTimeSlots, 'Kuala Terengganu': e.target.value }})}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="e.g. Saturday 10:00 AM - 12:00 PM"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Daily Registration Limit</label>
                            <input 
                              type="number"
                              min="1"
                              value={formData.registrationLimits?.['Kuala Terengganu'] || 20}
                              onChange={(e) => setFormData({...formData, registrationLimits: { ...formData.registrationLimits, 'Kuala Terengganu': parseInt(e.target.value) || 0 }})}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="e.g. 20"
                            />
                          </div>
                      </div>
                    </div>
                </div>

                {/* WhatsApp Integration Section */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-100 space-y-3">
                    <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                       <MessageCircle size={16} />
                       <h3>WhatsApp Integration</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        
                         <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Sender Number</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                              <Phone className="h-3 w-3 text-gray-400" />
                            </div>
                            <input 
                              type="text"
                              value={formData.whatsappSender}
                              onChange={(e) => setFormData({...formData, whatsappSender: e.target.value})}
                              className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="e.g. 60162888xxxx"
                            />
                          </div>
                        </div>

                         <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Default Message Template</label>
                          <textarea 
                            value={formData.whatsappMessageTemplate}
                            onChange={(e) => setFormData({...formData, whatsappMessageTemplate: e.target.value})}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm min-h-[80px]"
                            placeholder="Hello! Here is your generated CEO Cartoon..."
                          />
                          <p className="text-[10px] text-gray-500 mt-1">
                            Variables: <span className="font-mono text-blue-600">{'{{personName}}'}</span>, <span className="font-mono text-blue-600">{'{{businessName}}'}</span>, <span className="font-mono text-blue-600">{'{{businessType}}'}</span>, <span className="font-mono text-blue-600">{'{{style}}'}</span>
                          </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        System Prompt Template
                      </label>
                      <button 
                        onClick={handleResetPrompt}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        title="Reset to default prompt"
                      >
                        <RotateCcw size={12} /> Reset
                      </button>
                    </div>
                    
                    <div className="relative">
                      <textarea
                        value={formData.promptTemplate || DEFAULT_PROMPT_TEMPLATE}
                        onChange={(e) => setFormData({...formData, promptTemplate: e.target.value})}
                        className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm font-mono leading-relaxed resize-none"
                        placeholder="Enter your prompt template here..."
                      />
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                      <p className="font-semibold mb-1">Available Variables:</p>
                      <div className="flex flex-wrap gap-2">
                          {['{{personName}}', '{{gender}}', '{{businessName}}', '{{businessType}}', '{{style}}'].map(v => (
                            <code key={v} className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-blue-600">{v}</code>
                          ))}
                      </div>
                    </div>
                </div>
            </div>

          </div>

        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end flex-shrink-0">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
          >
            <Save size={18} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
