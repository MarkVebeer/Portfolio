import { useEffect, useRef } from 'react';

interface AnimateOptions {
  animation: 'fadeInUp' | 'fadeInLeft' | 'slideDown' | 'bounce';
  duration?: number;
  delay?: number;
  infinite?: boolean;
  cascade?: boolean;
  when?: 'always' | 'inView';
}

export const useAnimate = (options: AnimateOptions) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || options.when !== 'inView') {
            const keyframes = getKeyframes(options.animation);
            const timing: KeyframeAnimationOptions = {
              duration: options.duration || 800,
              delay: options.delay || 0,
              fill: 'both',
              iterations: options.infinite ? Infinity : 1,
              easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            };

            const animation = element.animate(keyframes, timing);

            if (options.cascade && element.children.length > 0) {
              Array.from(element.children).forEach((child, index) => {
                (child as HTMLElement).animate(keyframes, {
                  ...timing,
                  delay: (options.delay || 0) + index * 80,
                });
              });
            }

            if (!options.infinite) {
              animation.finished.then(() => {
                observer.unobserve(element);
              });
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: '50px' }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options]);

  return { ref };
};

const getKeyframes = (animation: string): Keyframe[] => {
  const animations = {
    fadeInUp: [
      { opacity: 0, transform: 'translateY(30px)', offset: 0 },
      { opacity: 0.5, transform: 'translateY(15px)', offset: 0.5 },
      { opacity: 1, transform: 'translateY(0)', offset: 1 }
    ],
    fadeInLeft: [
      { opacity: 0, transform: 'translateX(-30px)', offset: 0 },
      { opacity: 0.5, transform: 'translateX(-15px)', offset: 0.5 },
      { opacity: 1, transform: 'translateX(0)', offset: 1 }
    ],
    slideDown: [
      { opacity: 0, transform: 'translateY(-20px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    bounce: [
      { transform: 'translateY(0)', offset: 0 },
      { transform: 'translateY(-15px)', offset: 0.5 },
      { transform: 'translateY(0)', offset: 1 }
    ]
  };

  return animations[animation];
};