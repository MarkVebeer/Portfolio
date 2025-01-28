import React from 'react';

export const BlurEffect = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1]">
      {/* Top */}
      <div className="absolute top-0 left-0 right-0 h-[100px] bg-[#111]/20 backdrop-blur-xl" 
        style={{ 
          maskImage: 'linear-gradient(to bottom, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)'
        }} 
      />
      
      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[100px] bg-[#111]/20 backdrop-blur-xl"
        style={{ 
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)'
        }}
      />
    </div>
  );
};