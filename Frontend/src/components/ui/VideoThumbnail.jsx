import React, { useState } from "react";
import { Film } from "lucide-react";
import { getVideoPosterUrl } from "@/utils/videoUtils.js";

/**
 * VideoThumbnail
 * ──────────────
 * Renders high-quality video thumbnails:
 * 1. For Cloudinary videos, loads the extracted frame image (so_0.5/.jpg) instantly without browser decoding lags.
 * 2. If image fails or for non-Cloudinary videos, renders HTML5 video seeking to #t=0.1 to force first frame painting.
 * 3. Never renders blank/black box and never tries to load video files in raw <img> tags.
 */
export default function VideoThumbnail({
  src,
  poster,
  alt = "Video thumbnail",
  className = "h-full w-full object-cover",
}) {
  const [imgError, setImgError] = useState(false);
  const derivedPoster = poster || getVideoPosterUrl(src);

  // If we have a poster URL and it hasn't errored, render native <img>
  if (derivedPoster && !imgError) {
    return (
      <img
        src={derivedPoster}
        alt={alt}
        onError={() => setImgError(true)}
        className={className}
        loading="lazy"
        draggable={false}
      />
    );
  }

  if (!src) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-overlay/30 text-muted">
        <Film size={26} />
      </div>
    );
  }

  // HTML5 video element with #t=0.1 media fragment seeking to render the frame
  const videoSrc = src.includes("#t=") ? src : `${src}#t=0.1`;

  return (
    <video
      src={videoSrc}
      className={`${className} pointer-events-none select-none`}
      muted
      playsInline
      preload="metadata"
      tabIndex={-1}
    />
  );
}
