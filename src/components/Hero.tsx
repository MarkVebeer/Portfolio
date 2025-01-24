import React from 'react';
import DecryptedText from './DecryptedText';

export const Hero = () => {
  return (
    <section className="min-h-screen flex flex-col justify-center items-center px-8 py-24 relative z-10">
      <div className="max-w-[90vw] w-full text-center">
        <h1 className="text-7xl lg:text-[7rem] font-bold mb-6 px-4 pl-8 whitespace-nowrap">
          <DecryptedText
            text="Véber-Jurassa Márk"
            speed={60}
            sequential={true}
            revealDirection="center"
            animateOn="view"
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*"
            className="gradient-text tracking-wide"
            encryptedClassName="text-white"
          />
        </h1>
      </div>
      
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
        <div className="w-4 h-4 opacity-30">
          <div className="w-full h-full border-r-2 border-b-2 border-white/60 rotate-45 transform origin-center"></div>
        </div>
      </div>
    </section>
  );
};