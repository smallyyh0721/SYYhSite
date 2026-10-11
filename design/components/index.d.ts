/** Accent tones. Island letters map to island-a…island-d. */
export type Tone = 'signal' | 'hazard' | 'pop' | 'tube' | 'ink' | 'a' | 'b' | 'c' | 'd';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** solid = accent fill (default); ghost = transparent with ink border. */
  variant?: 'solid' | 'ghost';
  /** Fill colour for solid buttons. Default 'signal'. */
  tone?: Tone;
  children: React.ReactNode;
}

export interface StickerProps {
  tone?: Tone;
  /** Default leans left by --tilt; 'right' leans 3deg; 'none' is flat. */
  tilt?: 'left' | 'right' | 'none';
  children: React.ReactNode;
}

export interface HudBarProps {
  /** e.g. 'CH-01'. */
  channel?: string;
  /** e.g. 'WORKS'. */
  location?: string;
  /** Visitor callsign from the gate; null shows GUEST. */
  callsign?: string | null;
  /** Colour of the channel tab: the current island's tone. */
  tone?: Tone;
  /** When set, shows the ◀ HUB button. */
  onHub?: () => void;
}

export interface SectionTitleProps {
  /** Plate text, e.g. 'No.01' or 'CH-02'. */
  index?: string;
  title: string;
  /** Katakana sub-label, e.g. 'サクヒン'. */
  kana?: string;
  tone?: Tone;
  /** 'hero' uses the hero style; default display-lg. */
  size?: 'hero' | 'lg';
  as?: 'h1' | 'h2' | 'h3';
}

export interface PanelProps {
  title?: string;
  index?: string;
  kana?: string;
  tone?: Tone;
  /** Permanently lifted with shadow-pop. */
  featured?: boolean;
  children: React.ReactNode;
}

export interface WorkTileProps {
  no: number;
  title: string;
  year?: string | number;
  kind?: string;
  tone?: Tone;
  /** Image URL; omitted renders a screentone placeholder with an SFX. */
  image?: string;
  alt?: string;
  sfx?: string;
  onOpen?: () => void;
}

export interface Island {
  id: string;
  letter: 'A' | 'B' | 'C' | 'D' | string;
  name: string;
  kana?: string;
  channel: string;
  tone: Tone;
  /** Centre position in world pixels. */
  x: number;
  y: number;
}

export interface IslandNodeProps extends Omit<Island, 'id' | 'x' | 'y'> {
  active?: boolean;
  /** Idle-bob phase offset in seconds. */
  phase?: number;
  onClick?: () => void;
}

export interface SpeedLinesProps {
  active?: boolean;
  tone?: Tone;
  count?: number;
  /** Same seed renders identical lines. */
  seed?: number;
}

export interface IslandMapProps {
  islands: Island[];
  /** Called after the jump animation finishes (about 920ms, or 200ms with reduced motion). */
  onArrive?: (island: Island) => void;
  worldWidth?: number;
  worldHeight?: number;
  prompt?: string;
  style?: React.CSSProperties;
}

export interface GateConsoleProps {
  /** Callsign, or null for a guest. */
  onEnter?: (callsign: string | null) => void;
  title?: string;
  bootLines?: string[];
}
