import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, LayoutList, Search, FileText } from "lucide-react";

import { UserRole } from "@/types";

interface CopilotScreenProps {
  userName: string;
  role: UserRole;
  onNavigate: (destination: string) => void;
  onGenerateSummary: () => void;
}

const AnimatedText = ({ text, delay = 0, onComplete, hasTypedBefore }: { text: string, delay?: number, onComplete?: () => void, hasTypedBefore?: boolean }) => {
  useEffect(() => {
    if (hasTypedBefore) {
      if (onComplete) onComplete();
      return;
    }
    const timeout = setTimeout(() => {
      if (onComplete) onComplete();
    }, delay + 600); // Wait for animation to finish
    return () => clearTimeout(timeout);
  }, [delay, hasTypedBefore, onComplete]);

  if (hasTypedBefore) {
    return <span>{text}</span>;
  }

  return (
    <motion.span
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: "easeOut" }}
    >
      {text}
    </motion.span>
  );
}

// Global flag to track typing across unmounts
let hasSeenTyping = false;

export function CopilotScreen({ userName, role, onNavigate, onGenerateSummary }: CopilotScreenProps) {
  const [showOptions, setShowOptions] = useState(hasSeenTyping);

  useEffect(() => {
    if (showOptions) {
      hasSeenTyping = true;
    }
  }, [showOptions]);

  const canSeeHome = role === 'admin' || role === 'gestor360' || role === 'estrategico';
  const canSeeArtifacts = role === 'admin' || role === 'gestor360' || role === 'artefatos';
  const canSeeEvents = role === 'admin' || role === 'gestor360' || role === 'eventos';
  const canSeeSummary = role === 'admin' || role === 'gestor360' || role === 'estrategico';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="text-center mb-10 min-h-[120px] flex flex-col items-center justify-center">
        <h2 className="text-4xl font-light text-gray-500 tracking-tight leading-tight mb-2">
          <AnimatedText text={`Olá, ${userName}.`} hasTypedBefore={hasSeenTyping} />
        </h2>
        <h3 className="text-4xl font-medium text-gray-900 tracking-tight leading-tight">
          <AnimatedText 
            text="Qual pilar de governança deseja analisar hoje?" 
            delay={100} 
            hasTypedBefore={hasSeenTyping}
            onComplete={() => setTimeout(() => setShowOptions(true), 50)}
          />
        </h3>
      </div>

      <AnimatePresence>
        {showOptions && (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { 
                  delayChildren: 0.1,
                  staggerChildren: 0.1 
                }
              }
            }}
            className="flex flex-wrap items-center justify-center gap-2 px-6 max-w-xl"
          >
            {canSeeHome && (
              <motion.button 
                variants={{
                  hidden: { opacity: 0, y: 15, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate("home")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium text-sm transition-all group"
              >
                <LayoutList className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                Visão estratégica
              </motion.button>
            )}

            {canSeeArtifacts && (
              <motion.button 
                variants={{
                  hidden: { opacity: 0, y: 15, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate("initial")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium text-sm transition-all group"
              >
                <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                Explorar Artefatos
              </motion.button>
            )}

            {canSeeEvents && (
              <motion.button 
                variants={{
                  hidden: { opacity: 0, y: 15, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate("events_capture")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium text-sm transition-all group"
              >
                <Activity className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                Consultar Eventos
              </motion.button>
            )}

            {canSeeSummary && (
              <motion.button 
                variants={{
                  hidden: { opacity: 0, y: 15, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onGenerateSummary}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-900 bg-gray-900 text-white hover:bg-gray-800 font-medium text-sm transition-all group"
              >
                <FileText className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                Gerar Resumo Executivo
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
