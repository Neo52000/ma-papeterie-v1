// Tampon designer — shared shape types between the React island, the
// quote API, and the admin display. Keep narrow: anything that grows
// beyond a stamp design (colors, vector logos, multi-side templates)
// belongs in V3.

export type TamponShape = 'rond' | 'ovale' | 'rectangle' | 'carre';

export interface TamponLine {
  text: string;
  fontFamily: string;
  fontSize: number; // px on the design canvas (300px base)
  bold: boolean;
}

export interface TamponDesign {
  shape: TamponShape;
  /** mm — physical stamp size. Reference for the manufacturer. */
  diameterMm: number;
  borderColor: string; // CSS color
  lines: TamponLine[];
}

export const TAMPON_FONTS = [
  { value: 'Inter, sans-serif', label: 'Inter (sans-serif)' },
  { value: 'Poppins, sans-serif', label: 'Poppins (sans-serif)' },
  { value: 'Georgia, serif', label: 'Georgia (serif)' },
  { value: '"Courier New", monospace', label: 'Courier (mono)' },
] as const;

export const TAMPON_SHAPES: { value: TamponShape; label: string; defaultDiameterMm: number }[] = [
  { value: 'rond', label: 'Rond', defaultDiameterMm: 40 },
  { value: 'ovale', label: 'Ovale', defaultDiameterMm: 50 },
  { value: 'rectangle', label: 'Rectangle', defaultDiameterMm: 60 },
  { value: 'carre', label: 'Carré', defaultDiameterMm: 40 },
];

export const DEFAULT_TAMPON: TamponDesign = {
  shape: 'rond',
  diameterMm: 40,
  borderColor: '#121c2a',
  lines: [
    { text: 'Ma Société', fontFamily: 'Inter, sans-serif', fontSize: 22, bold: true },
    { text: '12 rue de la Mairie', fontFamily: 'Inter, sans-serif', fontSize: 16, bold: false },
    { text: '52000 Chaumont', fontFamily: 'Inter, sans-serif', fontSize: 16, bold: false },
  ],
};
