import React, { useState } from 'react';
import { Instagram, ExternalLink, Check } from 'lucide-react';
import { useAnimate } from '../hooks/useAnimate'; // Adjust the import path as necessary

const DiscordIcon = () => (
  <svg viewBox="0 -28.5 256 256" version="1.1" preserveAspectRatio="xMidYMid">
    <g>
      <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" fill="currentColor" fillRule="nonzero">
      </path>
    </g>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
  </svg>
);

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
    icon: DiscordIcon,
    link: 'https://discord.com',
    color: 'from-indigo-500 to-blue-500'
  },
  {
    name: 'X',
    handle: '@VeberJMark',
    icon: XIcon,
    link: 'https://x.com/VeberJMark',
    color: 'from-gray-400 to-black-400'
  }
];

export const Contact = () => {
  const [showNotification, setShowNotification] = useState(false);
  const { ref } = useAnimate({
    animation: 'fadeInUp',
    duration: 800,
    cascade: true,
    when: 'inView'
  });

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
      <div ref={ref as React.RefObject<HTMLDivElement>} className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
        {socialLinks.map((social, index) => (
          <a
            key={index}
            href={social.link}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card hover-card basis-[calc(33.33%-2rem)] min-w-[320px] max-w-md opacity-0"
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
