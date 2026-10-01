export const designSystem = {
  name: "LOOP Design System V3",
  version: "3.0.0",

  colors: {
    paper: "#0F0F14",
    surface: "#1A1A22",
    surfaceElevated: "#22222C",
    ink: "#F4F4F2",
    muted: "#8A8A95",
    border: {
      DEFAULT: "#2A2A34",
      strong: "#3A3A44",
      subtle: "#1F1F28",
    },
    indigo: {
      DEFAULT: "#6B5BFF",
      soft: "#2A2550",
      hover: "#5A4AE8",
      pressed: "#4A3DD4",
      glow: "rgba(107, 91, 255, 0.35)",
    },
    yellow: {
      DEFAULT: "#FFD24D",
      soft: "#3D3200",
      hover: "#E6BB3A",
      pressed: "#CCA62E",
    },
    pink: {
      DEFAULT: "#FF5C72",
      soft: "#3D1520",
      hover: "#E64B60",
    },
    success: {
      DEFAULT: "#22C55E",
      soft: "rgba(34,197,94,0.12)",
    },
    warning: {
      DEFAULT: "#FBBF24",
      soft: "rgba(251,191,36,0.12)",
    },
    error: {
      DEFAULT: "#EF4444",
      soft: "rgba(239,68,68,0.12)",
    },
    overlay: {
      DEFAULT: "rgba(255,255,255,0.04)",
      hover: "rgba(255,255,255,0.07)",
      strong: "rgba(255,255,255,0.12)",
    },
    card: {
      from: "#22222C",
      to: "#1A1A22",
    },
  },

  radius: {
    sm: "6px",
    md: "10px",
    lg: "12px",
    xl: "16px",
    "2xl:": "20px",
    full: "9999px",
  },

  shadow: {
    sm: "0 1px 2px rgba(0,0,0,0.35)",
    md: "0 4px 14px rgba(0,0,0,0.45)",
    lg: "0 12px 32px rgba(0,0,0,0.55)",
    focus: "0 0 0 3px rgba(107, 91, 255, 0.28)",
    card: "0 4px 14px rgba(0,0,0,0.45)",
    button: "0 6px 16px -6px rgba(107, 91, 255, 0.50)",
    input: "0 1px 2px rgba(0,0,0,0.3)",
  },

  backdropBlur: {
    sm: "4px",
    DEFAULT: "12px",
    lg: "24px",
    xl: "40px",
  },

  fontSize: {
    display: ["48px", "52px"],
    h1: ["32px", "40px"],
    h2: ["24px", "32px"],
    h3: ["18px", "26px"],
    ["body-l"]: ["16px", "26px"],
    body: ["15px", "24px"],
    small: ["13px", "20px"],
    micro: ["12px", "16px"],
  },

  fontFamily: {
    sans: '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  letterSpacing: {
    display: "-0.02em",
    h1: "-0.015em",
    h2: "-0.01em",
    h3: "0",
    body: "0",
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    ["2xl"]: "48px",
    ["3xl"]: "80px",
    section: "32px",
    field: "16px",
  },

  motion: {
    micro: "120ms",
    standard: "220ms",
    complex: "300ms",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
  },
};

export const { colors, radius, shadow, backdropBlur, fontSize, fontFamily, letterSpacing, spacing, motion } = designSystem;
export default designSystem;
