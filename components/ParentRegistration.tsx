import React, { useState, useEffect } from 'react';
import { User, Phone, Users, Plus, Trash2, CheckCircle2, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { AppSettings, Outlet } from '../types';
import { saveRegistration, getRegistrationCount } from '../services/dbService';

interface Kid {
  id: string;
  name: string;
  age: string;
}

interface ParentRegistrationProps {
  onBack: () => void;
  settings: AppSettings;
}

const ParentRegistration: React.FC<ParentRegistrationProps> = ({ onBack, settings }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentName, setParentName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [outlet, setOutlet] = useState<Outlet>('Melaka');
  const [kids, setKids] = useState<Kid[]>([{ id: '1', name: '', age: '' }]);
  
  const [currentCount, setCurrentCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(true);

  useEffect(() => {
    setIsLoadingCount(true);
    getRegistrationCount(outlet).then(count => {
      setCurrentCount(count);
      setIsLoadingCount(false);
    });
  }, [outlet]);

  const handleAddKid = () => {
    setKids([...kids, { id: Date.now().toString(), name: '', age: '' }]);
  };

  const handleRemoveKid = (id: string) => {
    if (kids.length > 1) {
      setKids(kids.filter(kid => kid.id !== id));
    }
  };

  const handleKidChange = (id: string, field: keyof Kid, value: string) => {
    setKids(kids.map(kid => kid.id === id ? { ...kid, [field]: value } : kid));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await saveRegistration(parentName, phoneNumber, kids, outlet);
      setIsSubmitted(true);
    } catch (error) {
      alert('Failed to submit registration. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLimit = settings.registrationLimits?.[outlet] || 20;
  const isFull = currentCount >= currentLimit;
  const remaining = Math.max(0, currentLimit - currentCount);

  if (isLoadingCount) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Thanks for Registration!</h2>
          <p className="text-lg text-gray-600 mb-8">
            {isFull 
              ? "You've been added to the waitlist. We will notify you when the next slot or info is available."
              : "We're excited to welcome your child to the AI Entrepreneur Workshop."}
          </p>
          
          {!isFull && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
              <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">Your Class Time Slot</h3>
              <p className="text-xl font-medium text-blue-900">
                {settings.classTimeSlots?.[outlet] || 'To be announced soon'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Workshop Registration</h1>
        <p className="text-gray-500">Register for the AI Entrepreneur Workshop</p>
      </div>

      {isFull ? (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-orange-900 mb-1">Sorry, the workshop slot is full today.</h3>
            <p className="text-orange-800">But you can register below to know about the next slot or get more info.</p>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Available Slots Today</span>
          </div>
          <div className="bg-white px-4 py-1.5 rounded-full font-bold text-blue-700 shadow-sm">
            {remaining} left
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-8">
        
        {/* Outlet Selection */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
            <MapPin className="text-blue-500" /> Select Outlet
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['Melaka', 'Kuala Terengganu'] as Outlet[]).map((o) => (
              <label 
                key={o}
                className={`flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  outlet === o 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' 
                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 text-gray-600 font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="outlet"
                  value={o}
                  checked={outlet === o}
                  onChange={() => setOutlet(o)}
                  className="sr-only"
                />
                {o}
              </label>
            ))}
          </div>
        </div>

        {/* Parent Details */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
            <User className="text-blue-500" /> Parent Details
          </h2>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Parent Name</label>
            <input
              type="text"
              required
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="e.g. 0123456789"
              />
            </div>
          </div>
        </div>

        {/* Kids Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-purple-500" /> Kids Details
            </h2>
            <button
              type="button"
              onClick={handleAddKid}
              className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1"
            >
              <Plus size={16} /> Add Kid
            </button>
          </div>

          <div className="space-y-4">
            {kids.map((kid, index) => (
              <div key={kid.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative group">
                {kids.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKid(kid.id)}
                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200"
                    title="Remove kid"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Kid {index + 1} Name</label>
                    <input
                      type="text"
                      required
                      value={kid.name}
                      onChange={(e) => handleKidChange(kid.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter kid's name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Age</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="18"
                      value={kid.age}
                      onChange={(e) => handleKidChange(kid.id, 'age', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Age"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            isFull ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-blue-600 to-purple-600'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Submitting...
            </>
          ) : isFull ? (
            'Join Waitlist / Get Notified'
          ) : (
            'Complete Registration'
          )}
        </button>
      </form>
    </div>
  );
};

export default ParentRegistration;
