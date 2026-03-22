import React from 'react';
import { Sparkles, ArrowRight, Briefcase, Rocket, Star, Palette, Crown, Heart } from 'lucide-react';

interface HeroProps {
  onStart: () => void;
  onRegister: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart, onRegister }) => {
  return (
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 overflow-hidden bg-gradient-to-b from-blue-50 via-purple-50 to-white font-sans">
      
      {/* Custom Animations Style */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>

      {/* Background Decorative Elements - Playful & Colorful */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Blobs */}
        <div className="absolute top-10 left-[10%] w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" />
        <div className="absolute top-10 right-[10%] w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000" />
        <div className="absolute bottom-10 left-[20%] w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000" />
        <div className="absolute bottom-20 right-[20%] w-60 h-60 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-3000" />

        {/* Floating Icons for 'Kids' Vibe */}
        <div className="absolute top-1/4 left-4 md:left-20 text-yellow-400 animate-bounce delay-700 opacity-80">
            <Star size={40} fill="currentColor" className="drop-shadow-md" />
        </div>
        <div className="absolute bottom-1/3 right-4 md:right-20 text-pink-400 animate-pulse delay-300 opacity-80">
            <Heart size={36} fill="currentColor" className="drop-shadow-md" />
        </div>
        <div className="absolute top-1/3 right-[10%] text-blue-400 animate-bounce delay-1000 opacity-70">
            <Rocket size={32} className="drop-shadow-md" />
        </div>
        <div className="absolute bottom-20 left-[10%] text-purple-400 animate-pulse delay-500 opacity-70">
            <Palette size={36} className="drop-shadow-md" />
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8 py-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border-2 border-indigo-100 shadow-lg text-indigo-600 text-sm font-bold tracking-wide animate-fade-in-up hover:scale-105 transition-transform cursor-default">
          <Crown size={20} className="text-yellow-500 fill-current" />
          <span>Malaysia's First AI Simulator for kids</span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 tracking-tight leading-none animate-fade-in-up delay-100 drop-shadow-sm">
          FREE AI PHOTO <br className="hidden md:block" />
          <span className="relative inline-block mx-2 mt-2 text-4xl md:text-6xl lg:text-7xl">
             <span className="absolute -inset-2 bg-yellow-300 transform -skew-y-2 rounded-xl opacity-40 blur-sm"></span>
             <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
               BE FUTURE BOSS
             </span>
          </span>
          <span className="text-4xl md:text-6xl lg:text-7xl align-top ml-2 animate-bounce inline-block">🚀</span>
        </h1>

        {/* Subtitle - Enhanced Size */}
        <p className="text-2xl md:text-3xl lg:text-4xl text-gray-700 max-w-4xl mx-auto animate-fade-in-up delay-200 font-bold leading-relaxed px-4">
          Start your AI Preneur journey with <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg inline-block transform -rotate-2 border border-indigo-100 shadow-sm">FREE SELFIE</span> and see your very own Business come to life.
        </p>

        {/* Hero Image: Clean Photo Display with CTA Inside */}
        <div className="mt-8 relative w-full max-w-[320px] md:max-w-[800px] mx-auto animate-fade-in-up delay-300 flex justify-center pb-8">
           <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white transform hover:scale-[1.01] transition-transform duration-500 group">
              
              {/* Young CEO Badge Overlay */}
              <div className="absolute top-6 left-6 z-20 animate-fade-in-down pointer-events-none">
                  <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-2xl px-4 py-2 rounded-full flex items-center gap-2">
                      <Crown size={16} className="text-yellow-400 fill-current drop-shadow-sm" />
                      <span className="font-bold text-white text-xs tracking-widest uppercase">Young CEO</span>
                  </div>
              </div>

              <img 
                src="https://i.ibb.co/vvrCwdQY/Untitled-design.jpg" 
                alt="Future CEO"
                className="w-full h-auto object-cover rounded-3xl" 
              />
              
              {/* Gradient Overlay for Button Visibility */}
              <div className="absolute inset-x-0 bottom-0 h-32 md:h-48 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"></div>

              {/* CTA Button Positioned at Bottom Middle */}
              <div className="absolute bottom-5 md:bottom-8 left-0 right-0 flex justify-center z-20">
                <button 
                  onClick={onStart}
                  className="group/btn relative inline-flex items-center justify-center gap-2 md:gap-3 px-8 py-3 md:px-10 md:py-5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-lg md:text-xl font-black rounded-full overflow-hidden transition-all shadow-xl hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-1 hover:scale-105 active:scale-95 active:translate-y-0 border-2 border-white/80 backdrop-blur-sm"
                >
                  {/* Texture Overlay */}
                  <div className="absolute inset-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                  {/* Shine Effect */}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                  
                  <Briefcase className="w-5 h-5 md:w-7 md:h-7 fill-white/20" />
                  <span className="tracking-wide drop-shadow-sm">Start Now</span>
                  <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
           </div>
        </div>

        {/* Workshop Registration CTA */}
        <div className="mt-4 animate-fade-in-up delay-400">
          <button
            onClick={onRegister}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-indigo-600 border-2 border-indigo-100 rounded-full font-bold text-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm"
          >
            <Star size={20} className="fill-indigo-600" />
            Register for AI Workshop
          </button>
        </div>

      </div>
    </div>
  );
};

export default Hero;