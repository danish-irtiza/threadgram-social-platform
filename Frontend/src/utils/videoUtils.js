/**
 * Video Utilities for Vibe Trimming and Validation
 */

export const MAX_VIBE_DURATION = 60;

/**
 * Extracts exact video duration (in seconds) from a File/Blob using HTML5 Video.
 * @param {File|Blob} file 
 * @returns {Promise<number>} duration in seconds
 */
export const getVideoDuration = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("video/")) {
      return resolve(0);
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);

    let isDone = false;
    const finish = (dur) => {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
      resolve(isFinite(dur) && dur > 0 ? dur : 0);
    };

    // Safety fallback timer (1.5s max) to ensure promise never hangs
    const timer = setTimeout(() => {
      finish(video.duration);
    }, 1500);

    const checkDuration = () => {
      let dur = video.duration;
      if (isFinite(dur) && dur > 0) {
        finish(dur);
        return;
      }
      if (video.seekable && video.seekable.length > 0) {
        dur = video.seekable.end(video.seekable.length - 1);
        if (isFinite(dur) && dur > 0) {
          finish(dur);
          return;
        }
      }
    };

    video.onloadedmetadata = checkDuration;
    video.onloadeddata = checkDuration;
    video.ondurationchange = checkDuration;

    video.onerror = () => {
      finish(0);
    };

    video.src = objectUrl;
    video.load();
  });
};

/**
 * Client-side video trimming using Canvas and MediaRecorder.
 * Trims the given video file between startTime and endTime and returns a new trimmed File object.
 * 
 * @param {File} sourceFile 
 * @param {number} startTime in seconds
 * @param {number} endTime in seconds
 * @param {function} [onProgress] progress callback (0 to 100)
 * @returns {Promise<File>} Trimmed Video File
 */
export const trimVideoFile = (sourceFile, startTime, endTime, onProgress) => {
  return new Promise((resolve, reject) => {
    if (!sourceFile) return reject(new Error("No video file provided"));
    if (startTime >= endTime) return reject(new Error("Start time must be less than end time"));

    const durationToRecord = endTime - startTime;
    if (durationToRecord > MAX_VIBE_DURATION + 0.5) {
      return reject(new Error(`Clip duration cannot exceed ${MAX_VIBE_DURATION} seconds`));
    }

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(sourceFile);
    video.src = objectUrl;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let mediaRecorder = null;
    const recordedChunks = [];
    let animationFrameId = null;

    const cleanup = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      URL.revokeObjectURL(objectUrl);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      video.currentTime = startTime;
    };

    video.onseeked = () => {
      if (mediaRecorder) return; // Already started recording

      // Setup MediaRecorder
      const stream = canvas.captureStream(30); // 30 FPS

      // Select mimeType supported by browser
      let mimeType = "video/webm;codecs=vp9";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=vp8";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/mp4";
      }

      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2500000, // 2.5 Mbps
        });
      } catch (err) {
        // Fallback without options
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        cleanup();
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "video/mp4" });
        const trimmedFileName = sourceFile.name.replace(/\.[^/.]+$/, "") + `_trimmed_${Math.round(startTime)}-${Math.round(endTime)}.mp4`;
        const trimmedFile = new File([blob], trimmedFileName, { type: blob.type || "video/mp4" });
        resolve(trimmedFile);
      };

      // Start recording & playback
      mediaRecorder.start(100);
      video.play().catch(reject);

      const drawFrame = () => {
        if (video.paused || video.ended) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const currentRecordedTime = video.currentTime - startTime;
        if (onProgress) {
          const progressPercent = Math.min(100, Math.round((currentRecordedTime / durationToRecord) * 100));
          onProgress(progressPercent);
        }

        if (video.currentTime >= endTime) {
          video.pause();
          if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
          }
          return;
        }

        animationFrameId = requestAnimationFrame(drawFrame);
      };

      drawFrame();
    };

    video.onerror = (err) => {
      cleanup();
      reject(new Error("Error loading video for trimming"));
    };
  });
};

/**
 * Formats seconds into MM:SS display format
 * @param {number} seconds 
 * @returns {string} e.g. "01:15"
 */
export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};
