export const themes = [
  {
    id: 'iris',
    name: 'Midnight & Iris',
    description: 'Calm, focused and contemporary.',
    header: '#15233d',
    accent: '#435deb',
    wash: '#eef1ff',
  },
  {
    id: 'azure',
    name: 'Deep Sea & Blue',
    description: 'Crisp contrast. A bolder accent.',
    header: '#0d263e',
    accent: '#117ec5',
    wash: '#eaf4fc',
  },
  {
    id: 'graphite',
    name: 'Graphite & Ember',
    description: 'Warm detail. Editorial clarity.',
    header: '#282a32',
    accent: '#b66b44',
    wash: '#f4ece5',
  },
  {
    id: 'plum',
    name: 'Aubergine & Lilac',
    description: 'Rich plum with soft lavender.',
    header: '#30213e',
    accent: '#7953b5',
    wash: '#f2ecfa',
  },
  {
    id: 'teal',
    name: 'Petrol & Mint',
    description: 'Deep ocean with fresh sea glass.',
    header: '#16383c',
    accent: '#147b78',
    wash: '#e7f5f1',
  },
  {
    id: 'rose',
    name: 'Burgundy & Blush',
    description: 'Warm wine with a rose accent.',
    header: '#3d2330',
    accent: '#aa4568',
    wash: '#fbeef3',
  },
  {
    id: 'ochre',
    name: 'Espresso & Gold',
    description: 'Coffee tones with golden detail.',
    header: '#342c24',
    accent: '#946511',
    wash: '#faf2df',
  },
  {
    id: 'slate',
    name: 'Ink & Silver',
    description: 'Quiet neutrals. Clear contrast.',
    header: '#202a36',
    accent: '#52657d',
    wash: '#edf1f5',
  },
  {
    id: 'cobalt',
    name: 'Indigo & Sky',
    description: 'Vivid blue with an airy finish.',
    header: '#202953',
    accent: '#315ccd',
    wash: '#ebf1ff',
  },
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export function isThemeId(value: unknown): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}
