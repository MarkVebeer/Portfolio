import React from 'react';
import { useAnimate } from '../hooks/useAnimate';
import { Laptop, Keyboard, Headphones, Monitor, Mouse, Mic } from 'lucide-react';

const workspaceItems = {
  'Main Setup': [
    { title: 'PC', specs: 'R7 5700x • 32GB RAM • RX 6700', icon: Laptop },
    { title: 'LG UltraWide', specs: '34-inch • 160Hz', icon: Monitor }
  ],
  'Peripherals': [
    { title: 'Keychron Q2', specs: 'Silver • Brown Switches • JM-68', icon: Keyboard },
    { title: 'Logitech G502', specs: 'Hero 25K • 800 DPI', icon: Mouse }
  ],
  'Audio': [
    { title: '7hz x Crinacle: Zero 2', specs: 'IEM Earphones', icon: Headphones },
    { title: 'Razer Seiren Mini', specs: 'USB Microphone', icon: Mic }
  ]
};

export const Workspace = () => {
  const { ref } = useAnimate({
    animation: 'fadeInUp',
    duration: 800,
    cascade: true,
    when: 'inView'
  });

  return (
    <section id="setup" className="py-20 px-[10%] relative">
      {/* A h2 elem stabilan marad, nincs rá animáció */}
      <h2 className="text-5xl font-bold text-center mb-4 gradient-text">My Workspace</h2>
      <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
      </p>
      {/* Az animáció csak erre a div-re vonatkozik */}
      <div ref={ref as React.RefObject<HTMLDivElement>} className="flex flex-wrap justify-center gap-12 max-w-6xl mx-auto">
        {Object.entries(workspaceItems).map(([category, items], index) => (
          <div key={index} className="flex flex-col space-y-6 w-full max-w-md opacity-0">
            <h3 className="text-2xl font-semibold gradient-text text-center">{category}</h3>
            <div className="flex-1 grid grid-rows-2 gap-6">
              {items.map((item, itemIndex) => (
                <div key={itemIndex} className="glass-card hover-card h-[160px] flex items-center p-6">
                  <div className="flex items-center gap-6 w-full">
                    <div className="min-w-[3rem] w-12 h-12 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                      <p className="text-gray-300 mt-1">{item.specs}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}