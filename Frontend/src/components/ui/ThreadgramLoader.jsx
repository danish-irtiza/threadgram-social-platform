import React from "react";
import { useTheme } from "@/context/ThemeContext.jsx";
import lightIconCircle from "@/assets/logo/thread-icon-circle-lightmode-removebg-preview.png";
import darkIconCircle from "@/assets/logo/thread-icon-circle-darkmode-removebg-preview.png";
import lightWordmark from "@/assets/logo/thredgram-wordmark-light-theme-removebg-preview.png";
import darkWordmark from "@/assets/logo/thredgram-wordmark-dark-theme-removebg-preview.png";

export default function ThreadgramLoader({
  logoSize = 72,
  fullScreen = true,
  className = "",
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const logo = isDark ? darkIconCircle : lightIconCircle;
  const wordmark = isDark ? darkWordmark : lightWordmark;

  return (
    <div
      className={`${fullScreen ? "fixed inset-0 z-[9999]" : "relative w-full h-full"
        } flex flex-col items-center justify-center select-none ${className}`}
      style={{ backgroundColor: isDark ? "#09090b" : "#ffffff" }}
    >
      <img
        src={logo}
        alt="Threadgram"
        draggable={false}
        className="animate-pulse"
        style={{
          width: logoSize,
          height: logoSize,
          objectFit: "contain",
        }}
      />

      <div
        className="absolute bottom-10 flex items-center justify-center"
      >
        <img
          src={wordmark}
          alt="THREADGRAM"
          draggable={false}
          style={{
            height: 22,
            objectFit: "contain",
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}
