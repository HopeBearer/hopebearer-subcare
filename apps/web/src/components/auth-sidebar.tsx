import { Globe, Music, CreditCard, Cloud } from 'lucide-react';

export function AuthSidebar() {
  return (
    <div className="hidden lg:flex lg:w-40pct bg-gradient-to-br from-[#FDFDFF] to-[#EAEAFE] relative overflow-hidden flex-col justify-center z-10">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {/* Decorative Transition Overlay - Smooths the edge between left/right panels */}
      <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white/80 to-transparent z-0 pointer-events-none"></div>
      {/* Decorative Circle overlapping the edge */}
      <div className="absolute top-1/2 -right-16 transform -translate-y-1/2 w-32 h-32 bg-white/20 backdrop-blur-md rounded-full z-20"></div>

      {/* 3D Icons Composition (Simulated with standard icons and CSS effects) */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Central Card */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center border border-white/50 animate-float z-20">
            <CreditCard className="w-12 h-12 text-primary" />
          </div>
          
          {/* Floating Icons */}
          <div className="absolute top-0 right-10 w-20 h-20 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
            <Music className="w-8 h-8 text-pink-400" />
          </div>
          <div className="absolute bottom-10 left-0 w-24 h-24 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center animate-float" style={{ animationDelay: '3s' }}>
            <Cloud className="w-10 h-10 text-blue-400" />
          </div>
          <div className="absolute top-20 left-10 w-16 h-16 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center animate-float" style={{ animationDelay: '1.5s' }}>
            <Globe className="w-6 h-6 text-green-400" />
          </div>
        </div>
      </div>

      {/* Slogan */}
      <div className="p-12 bottom-12 left-12 right-12 z-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Master Your Subscriptions</h2>
        <p className="text-lg text-gray-600">Take control of every subscription, organize your life.</p>
      </div>
    </div>
  );
}
