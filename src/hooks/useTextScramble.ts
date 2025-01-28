import { useState, useEffect } from 'react';

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*0123456789';

export const useTextScramble = (
  finalText: string,
  startDelay: number = 0,
  duration: number = 2000
) => {
  const [text, setText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let startTime: number;
    let lastUpdateTime: number = 0;
    let animationFrame: number;
    let timeout: NodeJS.Timeout;

    const scramble = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Update scrambled characters every 60ms
      if (timestamp - lastUpdateTime > 60 || percentage === 1) {
        lastUpdateTime = timestamp;
        
        let result = '';
        const revealIndex = Math.floor(percentage * finalText.length * 2);

        for (let i = 0; i < finalText.length; i++) {
          if (i < revealIndex) {
            result += finalText[i];
          } else {
            const charIndex = Math.floor(
              Math.sin((i + timestamp * 0.01) * 0.5) * characters.length
            );
            result += characters[Math.abs(charIndex) % characters.length];
          }
        }

        setText(result);
      }

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(scramble);
      } else {
        setText(finalText);
        setIsComplete(true);
      }
    };

    timeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(scramble);
    }, startDelay);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(timeout);
    };
  }, [finalText, duration, startDelay]);

  return { text, isComplete };
};