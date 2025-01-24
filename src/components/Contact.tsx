import React, { useState } from 'react';
import { Instagram, Disc as Discord, Twitter, ExternalLink, Check } from 'lucide-react';

const socialLinks = [
  {
    name: 'Instagram',
    handle: '@markvebeer',
    icon: Instagram,
    link: 'https://www.instagram.com/markvebeer/',
    color: 'from-pink-500 to-purple-500'
  },
  {
    name: 'Discord',
    handle: 'markveber',
    icon: Discord,
    link: 'https://discordapp.com/users/JaneDoe',
    color: 'from-indigo-500 to-blue-500'
  },
  {
    name: 'x.com',
    handle: '@VeberJMark',
    icon: Twitter,
    link: 'https://x.com/VeberJMark',
    color: 'from-blue-400 to-cyan-400'
  }
];

export const Contact = () => {
  const [showNotification, setShowNotification] = useState(false);

  const handleCopy = async (handle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(handle);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  return (
    <section id="contact" className="py-20 px-[10%] relative">
      <h2 className="text-5xl font-bold text-center mb-4 gradient-text">Connect With Me</h2>
      <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
        Let's collaborate and create something amazing together
      </p>
      <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
        {socialLinks.map((social, index) => (
          <a
            key={index}
            href={social.link}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card hover-card basis-[calc(33.33%-2rem)] min-w-[320px] max-w-md"
          >
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${social.color} p-3 flex items-center justify-center`}>
                <social.icon className="w-full h-full text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  {social.name}
                  <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p 
                  onClick={(e) => handleCopy(social.handle, e)}
                  className="text-gray-300 mt-1 cursor-pointer hover:text-white transition-colors"
                >
                  {social.handle}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Floating Notification */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500/20 backdrop-blur-lg border border-green-500/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${
          showNotification 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <Check size={18} className="text-green-400" />
        <span>Copied to clipboard!</span>
      </div>
    </section>
  );
}