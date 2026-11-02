import { isDark } from './dom';

const pick = (dark: string, light: string) => () => (isDark() ? dark : light);

/** Theme colours resolved at draw time (canvas cannot read CSS variables). */
export const C = {
  green: pick('#9FE1CB', '#1D9E75'),
  greenD: pick('#9FE1CB', '#085041'),
  blue: pick('#B5D4F4', '#378ADD'),
  blueD: pick('#B5D4F4', '#0C447C'),
  red: pick('#F7C1C1', '#E24B4A'),
  redD: pick('#F7C1C1', '#791F1F'),
  amber: pick('#FAC775', '#BA7517'),
  purple: pick('#CECBF6', '#7F77DD'),
  teal: pick('#9FE1CB', '#1D9E75'),
  coral: pick('#F5C4B3', '#D85A30'),
  text: pick('#e8e6de', '#1a1a18'),
  text2: pick('#b4b2a9', '#5f5e5a'),
  text3: pick('#888780', '#888780'),
  bg: pick('#141413', '#faf9f6'),
  bg2: pick('#1e1e1c', '#f1efe8'),
  bgCard: pick('#1e1e1c', '#ffffff'),
} as const;
