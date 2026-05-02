// V5 parity (Phase 5.1 #3) — slides du carrousel home.
//
// 3 slides par défaut alignés sur le V5 vivant. Pour customiser :
//   1. Dépose les images dans `public/hero/` (1600×640 recommandé,
//      AVIF ou WebP idéalement, JPG ok pour démarrer)
//   2. Édite ce fichier
//   3. Le ServeurNetlify Image CDN les optimise automatiquement
//      via /.netlify/images?url=...
//
// Si la liste est vide, le composant ne rend rien. Le bloc hero
// fallback de la home prend le relais.

import type { Slide } from '@/components/home/HeroSlider';

export const heroSlides: Slide[] = [
  {
    id: 'hero-mothers-day',
    imageSrc: '/hero/hero-mothers-day.jpg',
    imageAlt: 'Coffret cadeau de stylos Belius pour la fête des mères',
    eyebrow: 'Fête des Mères',
    title: 'Offrez l’élégance',
    description:
      'Notre sélection de stylos Belius : design raffiné, écriture fluide, coffret cadeau inclus. Le cadeau parfait pour une maman qui a du style.',
    ctaLabel: 'Découvrir Belius',
    ctaHref: '/catalogue?brand=Belius',
  },
  {
    id: 'hero-oxford-revision',
    imageSrc: '/hero/hero-oxford-revision.jpg',
    imageAlt: 'Fiches Révision 2.0 d’Oxford avec scan SCRIBZEE',
    eyebrow: 'Examens',
    title: 'Révisez malin avec les fiches Oxford 2.0',
    description:
      'Flashcards connectées, système SCRIBZEE® pour scanner et réviser sur mobile. Brevet, Bac, concours — soyez prêts.',
    ctaLabel: 'Voir les fiches Oxford',
    ctaHref: '/catalogue?q=oxford+revision',
  },
  {
    id: 'hero-school-list',
    imageSrc: '/hero/hero-school-list.jpg',
    imageAlt: 'Service liste scolaire pré-remplie Ma Papeterie',
    eyebrow: 'Rentrée 2026',
    title: 'Uploadez votre liste, on fait le panier',
    description:
      'Photo ou PDF, notre OCR identifie chaque article et propose le bon produit. En moins de deux minutes, vous passez commande.',
    ctaLabel: 'Démarrer ma liste',
    ctaHref: '/liste-scolaire',
  },
];
