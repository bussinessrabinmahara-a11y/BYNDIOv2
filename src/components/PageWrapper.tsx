import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
}

const variants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.61, 1, 0.88, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.61, 1, 0.88, 1],
    },
  },
};

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants}
      className="flex-1 flex flex-col w-full"
    >
      {children}
    </motion.div>
  );
}
