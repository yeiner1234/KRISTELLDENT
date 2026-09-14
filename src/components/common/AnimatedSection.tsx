import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const easing: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}

function AnimatedSection({ children, className = '', id, delay = 0 }: AnimatedSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      id={id}
      className={className}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 35 }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={shouldReduceMotion ? { duration: 0.18 } : { duration: 0.6, delay, ease: easing }}
    >
      {children}
    </motion.section>
  );
}

export default AnimatedSection;

interface RevealItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
  staggerMs?: number;
}

export function RevealItem({ children, className = '', index = 0, staggerMs = 80 }: RevealItemProps) {
  const shouldReduceMotion = useReducedMotion();
  const delay = shouldReduceMotion ? 0 : (index % 3) * (staggerMs / 1000);

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 35 }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={shouldReduceMotion ? { duration: 0.18 } : { duration: 0.6, delay, ease: easing }}
    >
      {children}
    </motion.div>
  );
}
