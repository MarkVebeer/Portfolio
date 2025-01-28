import React from 'react';
import { Hero } from './components/Hero';
import { Projects } from './components/Projects';
import { Workspace } from './components/Workspace';
import { Contact } from './components/Contact';
import { GlitchBackground } from './components/GlitchBackground';
import { BlurEffect } from './components/BlurEffect';

function App() {
  return (
    <div className="min-h-screen bg-[#111] text-white relative">
      <GlitchBackground />
      <BlurEffect />
      <Hero />
      <Projects />
      <Workspace />
      <Contact />
    </div>
  );
}

export default App;