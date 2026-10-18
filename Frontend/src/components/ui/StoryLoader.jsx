import React from "react";

/**
 * StoryLoader — Animated SVG ring loader for Story loading states.
 * Adapted to use pure CSS (no styled-components) and theme colors.
 *
 * Props:
 *   size  — pixel diameter (default 80)
 *   className — extra wrapper classes
 */
export default function StoryLoader({ size = 80, className = "" }) {
  const id = React.useId().replace(/:/g, ""); // unique filter/gradient IDs

  return (
    <div className={`story-loader-root ${className}`} style={{ position: "relative", width: size, height: size }}>
      {/* Inline scoped styles — keyframes + animation rules */}
      <style>{`
        .story-loader-root { display: grid; place-items: center; }

        .sl-filter-svg { width: 0; height: 0; position: absolute; }

        .sl-main-svg { filter: url(#sl-goo-${id}); }

        .sl-stop1 { stop-color: var(--sl-color-1, #6b5bff); }
        .sl-stop2 { stop-color: var(--sl-color-2, #f472b6); }

        .sl-path {
          animation: sl-spin 10s infinite linear;
          stroke-dasharray: 180 800;
          fill: none;
          stroke: url(#sl-grad-${id});
          stroke-width: 18;
          stroke-linecap: round;
        }

        .sl-circle {
          animation: sl-spin 3s infinite linear;
          stroke-dasharray: 26 54;
          fill: none;
          stroke: url(#sl-grad-${id});
          stroke-width: 18;
          stroke-linecap: round;
        }

        .sl-shadow-svg {
          filter: blur(4px);
          opacity: 0.25;
          position: absolute;
          inset: 0;
          transform: translate(2px, 2px);
        }

        @keyframes sl-spin {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -403px; }
        }
      `}</style>

      {/* Gooey filter (invisible SVG) */}
      <svg className="sl-filter-svg" aria-hidden="true">
        <defs>
          <filter id={`sl-goo-${id}`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={7} result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Main animated ring */}
      <svg
        className="sl-main-svg"
        width={size}
        height={size}
        viewBox="0 0 200 200"
        aria-label="Loading story"
        role="status"
      >
        <defs>
          <linearGradient id={`sl-lin-${id}`}>
            <stop className="sl-stop1" offset={0} />
            <stop className="sl-stop2" offset={1} />
          </linearGradient>
          <linearGradient
            y2={160} x2={160} y1={40} x1={40}
            gradientUnits="userSpaceOnUse"
            id={`sl-grad-${id}`}
            xlinkHref={`#sl-lin-${id}`}
          />
        </defs>
        <path
          className="sl-path"
          d="m 164,100 c 0,-35.346224 -28.65378,-64 -64,-64 -35.346224,0 -64,28.653776 -64,64 0,35.34622 28.653776,64 64,64 35.34622,0 64,-26.21502 64,-64 0,-37.784981 -26.92058,-64 -64,-64 -37.079421,0 -65.267479,26.922736 -64,64 1.267479,37.07726 26.703171,65.05317 64,64 37.29683,-1.05317 64,-64 64,-64"
        />
        <circle className="sl-circle" cx={100} cy={100} r={64} />
      </svg>

      {/* Shadow copy for depth */}
      <svg
        className="sl-shadow-svg"
        width={size}
        height={size}
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <path
          className="sl-path"
          d="m 164,100 c 0,-35.346224 -28.65378,-64 -64,-64 -35.346224,0 -64,28.653776 -64,64 0,35.34622 28.653776,64 64,64 35.34622,0 64,-26.21502 64,-64 0,-37.784981 -26.92058,-64 -64,-64 -37.079421,0 -65.267479,26.922736 -64,64 1.267479,37.07726 26.703171,65.05317 64,64 37.29683,-1.05317 64,-64 64,-64"
        />
        <circle className="sl-circle" cx={100} cy={100} r={64} />
      </svg>
    </div>
  );
}
