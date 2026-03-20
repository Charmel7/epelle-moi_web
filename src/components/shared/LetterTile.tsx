/**
 * @file components/shared/LetterTile.tsx
 * @description Tuile de lettre — composant central de l'application.
 *
 * Utilisé dans :
 * - Vue publique : grandes tuiles animées pour le public
 * - Vue admin    : tuiles compactes dans la zone de saisie
 *
 * Props :
 * - letter   : La lettre à afficher
 * - status   : 'pending' | 'correct' | 'incorrect' — contrôle la couleur
 * - size     : 'sm' | 'md' | 'lg' | 'xl' — taille de la tuile
 * - index    : Position pour l'animation en cascade (stagger)
 * - animate  : Active l'animation d'entrée (flip)
 */

import React from 'react';
import type { LetterStatus } from '../../hooks';

interface LetterTileProps {
  letter: string;
  status?: LetterStatus;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  index?: number;
  animate?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'w-8 h-10 text-sm',
  md: 'w-12 h-14 text-xl',
  lg: 'w-16 h-20 text-3xl',
  xl: 'w-20 h-24 text-4xl',
};

const STATUS_CLASSES: Record<LetterStatus, string> = {
  pending: 'bg-[#1a1a1a] border-white/30 text-white',
  correct: 'bg-[#1a1a1a] border-white/80 text-white',
  incorrect: 'bg-[#1a1a1a] border-red-500/60 text-red-400',
};

const LetterTile: React.FC<LetterTileProps> = ({
  letter,
  status = 'pending',
  size = 'lg',
  index = 0,
  animate = true,
  className = '',
}) => {
  const animationDelay = `${index * 60}ms`;

  return (
    <div
      className={[
        'relative flex items-center justify-center',
        'border font-black tracking-widest uppercase',
        'transition-all duration-300',
        SIZE_CLASSES[size],
        STATUS_CLASSES[status],
        animate ? 'letter-tile-enter' : '',
        className,
      ].join(' ')}
      style={{ animationDelay }}
      aria-label={`Lettre ${letter}`}
    >
      {/* Glow effect pour les lettres correctes */}
      {status === 'correct' && (
        <div className="absolute inset-0 border border-white/20 scale-110 opacity-50 pointer-events-none" />
      )}
      <span className="relative z-10">{letter}</span>
    </div>
  );
};

export default LetterTile;
