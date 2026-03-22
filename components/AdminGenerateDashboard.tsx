import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, UserPlus, Search, Calendar, Phone, Trash2, Loader2, MapPin } from 'lucide-react';
import { getRegistrations, deleteRegistration } from '../services/dbService';
import { Outlet } from '../types';

interface Kid {
  id: string;
  name: string;
  age: string;
}

interface Registration {
  id: string;
  parentName: string;
  phoneNumber: string;
  kids: Kid[];
  date: string;
  outlet?: Outlet;
}

interface AdminGenerateDashboardProps {
  onBack: () => void;
  onSelectKid: (kidName: string, outlet?: Outlet) => void;
}

const AdminGenerateDashboard: React.FC<AdminGenerateDashboardProps> = ({ onBack, onSelectKid }) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | 'All'>('All');

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    setIsLoading(true);
    try {
      const data = await getRegistrations();
      setRegistrations(data);
    } catch (error) {
      console.error('Failed to load registrations', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this registration?')) {
      try {
        await deleteRegistration(id);
        setRegistrations(registrations.filter(r => r.id !== id));
      } catch (error) {
        alert('Failed to delete registration');
      }
    }
  };

  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch = r.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phoneNumber.includes(searchTerm) ||
      r.kids.some(k => k.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesOutlet = selectedOutlet === 'All' || r.outlet === selectedOutlet;
    
    return matchesSearch && matchesOutlet;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-32">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-blue-600" />
              Generation Dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Registered Kids</h2>
            <p className="text-gray-500">Select a kid to start generating their cartoon.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {(['All', 'Melaka', 'Kuala Terengganu'] as const).map((outlet) => (
                <button
                  key={outlet}
                  onClick={() => setSelectedOutlet(outlet)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedOutlet === outlet
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {outlet}
                </button>
              ))}
            </div>
            
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Search names or phone..."
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center p-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No registrations found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Wait for parents to register their kids.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRegistrations.map((reg) => (
              <div key={reg.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{reg.parentName}</h3>
                    <div className="flex flex-col gap-1 mt-1 text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Phone size={12} /> {reg.phoneNumber}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(reg.date).toLocaleDateString()}</span>
                      </div>
                      {reg.outlet && (
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <MapPin size={12} /> {reg.outlet}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(reg.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete registration"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="p-4 flex-1 flex flex-col gap-3">
                  {reg.kids.map((kid, idx) => (
                    <div key={kid.id} className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/30">
                      <div>
                        <div className="font-bold text-gray-900">{kid.name}</div>
                        <div className="text-xs text-gray-500">Age: {kid.age}</div>
                      </div>
                      <button
                        onClick={() => onSelectKid(kid.name, reg.outlet)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <UserPlus size={16} />
                        Generate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminGenerateDashboard;
