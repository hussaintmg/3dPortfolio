import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const scaleReveal = (element: HTMLElement) => {
  gsap.fromTo(element,
    { scale: 0.95, opacity: 0, filter: 'blur(4px)' },
    {
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)',
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        end: 'bottom 60%',
        toggleActions: 'play none none reverse',
      }
    }
  );
};

export const staggerCards = (container: HTMLElement, cards: NodeListOf<HTMLElement> | Element[]) => {
  gsap.fromTo(cards,
    { y: 50, opacity: 0, rotationX: -10 },
    {
      y: 0,
      opacity: 1,
      rotationX: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: 'back.out(0.4)',
      scrollTrigger: {
        trigger: container,
        start: 'top 80%',
        end: 'bottom 60%',
        toggleActions: 'play none none reverse',
      }
    }
  );
};

export const horizontalScroll = (container: HTMLElement, wrapper: HTMLElement, panels: HTMLElement[]) => {
  const totalWidth = panels.reduce((sum, panel) => sum + panel.offsetWidth, 0);
  
  gsap.to(wrapper, {
    x: () => `-${totalWidth - window.innerWidth}px`,
    ease: 'none',
    scrollTrigger: {
      trigger: container,
      pin: true,
      scrub: 1.2,
      end: () => `+=${totalWidth}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const progress = self.progress * 100;
        document.dispatchEvent(new CustomEvent('scrollProgress', { detail: progress }));
      }
    }
  });
};

export const parallaxBackground = (element: HTMLElement, speed: number = 0.5) => {
  gsap.to(element, {
    y: () => window.innerHeight * speed,
    ease: 'none',
    scrollTrigger: {
      trigger: element.parentElement,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    }
  });
};

export const splitTextReveal = (lines: HTMLElement[]) => {
  lines.forEach((line, i) => {
    const words = line.textContent?.split(' ') || [];
    line.innerHTML = words.map(word => 
      `<span class="inline-block overflow-hidden"><span class="inline-block translate-y-full">${word}</span></span>`
    ).join(' ');
    
    const wordSpans = line.querySelectorAll('span > span');
    
    gsap.fromTo(wordSpans,
      { y: '100%', opacity: 0 },
      {
        y: '0%',
        opacity: 1,
        duration: 0.6,
        stagger: 0.02,
        delay: i * 0.1,
        scrollTrigger: {
          trigger: line,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        }
      }
    );
  });
};
