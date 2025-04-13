import React from 'react';
import { useAnimate } from '../hooks/useAnimate';
import { Github } from 'lucide-react';

const projects = [
  {
    title: 'Noise Generator',
    description: 'Simple sound generator that runs in the system tray. It generates a continuous tone based on configurable frequency and volume settings.',
    tags: ['Python'],
    github: 'https://github.com/MarkVebeer/Noise-Generator'
  },
  {
    title: 'BattyaBo$$',
    description: 'BattyaBoss is a comprehensive Discord bot designed to handle nearly all aspects of Discord server management and engagement.',
    tags: ['Node.js', 'Discord.js'],
    github: 'https://github.com/MarkVebeer/BattyaBoss'
  },
  {
    title: 'Collection Manager',
    description: 'Simple collection management tool designed for easy scanning, primarily focused on food products like Pringles, utilizing barcodes for convenience.',
    tags: ['PHP'],
    github: 'https://github.com/MarkVebeer/collection_manager'
  }
];

export const Projects = () => {
  const { ref } = useAnimate({
    animation: 'fadeInUp',
    duration: 800,
    cascade: true,
    when: 'inView'
  });

  return (
    <section id="projects" className="py-20 px-[10%]">
      <h2 className="text-5xl font-bold text-center mb-4 gradient-text">Featured Project(s)</h2>
      <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
      </p>
      <div ref={ref as React.RefObject<HTMLDivElement>} className="flex justify-center flex-wrap gap-8">
        {projects.map((project, index) => (
          <div key={index} className="glass-card hover-card flex flex-col w-full max-w-md opacity-0">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-2">{project.title}</h3>
              <p className="text-gray-300 mb-4">{project.description}</p>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="px-3 py-1 bg-black/20 rounded-full text-sm border border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 transition-colors px-4 py-2 rounded-lg w-full"
              >
                <Github size={18} />
                <span>View on GitHub</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}