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

    // Safety fallback timer (2s max) to ensure promise never hangs
    const timer = setTimeout(() => {
      finish(video.duration);
    }, 2000);

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
 * Client-side video trimming using Canvas, Web Audio API, and MediaRecorder.
 * Trims the given video file between startTime and endTime and returns a new trimmed File object
 * with audio preserved and guaranteed non-blocking execution.
 * 
 * @param {File} sourceFile 
 * @param {number} startTime in seconds
 * @param {number} endTime in seconds
 * @param {function} [onProgress] progress callback (0 to 100)
 * @returns {Promise<File>} Trimmed Video File
 */
export const trimVideoFile = (sourceFile, startTime, endTime, onProgress) => {
  return new Promise(async (resolve, reject) => {
    if (!sourceFile) return reject(new Error("No video file provided"));
    if (startTime >= endTime) return reject(new Error("Start time must be less than end time"));

    const durationToRecord = endTime - startTime;
    if (durationToRecord > MAX_VIBE_DURATION + 0.5) {
      return reject(new Error(`Clip duration cannot exceed ${MAX_VIBE_DURATION} seconds`));
    }

    const video = document.createElement("video");
    video.muted = true; // MUST remain true so browsers never block play() via Autoplay policy!
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(sourceFile);
    video.src = objectUrl;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let mediaRecorder = null;
    const recordedChunks = [];
    let animationFrameId = null;
    let safetyCheckInterval = null;
    let maxTimeoutGuard = null;
    let audioContext = null;
    let audioBufferSource = null;
    let isFinished = false;

    const cleanup = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (safetyCheckInterval) clearInterval(safetyCheckInterval);
      if (maxTimeoutGuard) clearTimeout(maxTimeoutGuard);

      if (audioBufferSource) {
        try {
          audioBufferSource.stop();
          audioBufferSource.disconnect();
        } catch (e) {}
      }

      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }

      URL.revokeObjectURL(objectUrl);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const stopRecording = () => {
      if (isFinished) return;
      isFinished = true;

      if (audioBufferSource) {
        try {
          audioBufferSource.stop();
        } catch (e) {}
      }

      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try {
          mediaRecorder.stop();
        } catch (e) {
          console.warn("Error stopping MediaRecorder:", e);
        }
      }
    };

    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;

      // Setup Canvas Video Stream
      const canvasStream = canvas.captureStream(30); // 30 FPS
      const compositeStream = new MediaStream();

      canvasStream.getVideoTracks().forEach((track) => compositeStream.addTrack(track));

      // Decode Audio directly from file ArrayBuffer via Web Audio API for 100% audio fidelity & no autoplay blocks
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioContext = new AudioContextClass();
          if (audioContext.state === "suspended") {
            await audioContext.resume().catch(() => {});
          }

          const arrayBuffer = await sourceFile.arrayBuffer();
          const decodeAudio = (ctx, buf) =>
            new Promise((res, rej) => {
              const r = ctx.decodeAudioData(buf, res, rej);
              if (r && typeof r.then === "function") r.then(res).catch(rej);
            });

          const audioBuffer = await decodeAudio(audioContext, arrayBuffer);
          if (audioBuffer && audioBuffer.numberOfChannels > 0) {
            const bufferSource = audioContext.createBufferSource();
            bufferSource.buffer = audioBuffer;
            const audioDest = audioContext.createMediaStreamDestination();
            bufferSource.connect(audioDest);

            audioDest.stream.getAudioTracks().forEach((track) => compositeStream.addTrack(track));
            audioBufferSource = bufferSource;
          }
        }
      } catch (audioErr) {
        console.warn("Audio extraction note (file may be silent or audio decode unsupported):", audioErr);
        if (typeof video.captureStream === "function") {
          try {
            const vStream = video.captureStream();
            vStream.getAudioTracks().forEach((t) => compositeStream.addTrack(t));
          } catch (e) {}
        }
      }

      // Determine best supported MIME type
      const preferredTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=h264,opus",
        "video/webm",
        "video/mp4;codecs=avc1,mp4a",
        "video/mp4",
      ];
      let selectedMimeType = "";
      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      try {
        mediaRecorder = selectedMimeType
          ? new MediaRecorder(compositeStream, { mimeType: selectedMimeType, videoBitsPerSecond: 3000000 })
          : new MediaRecorder(compositeStream);
      } catch (err) {
        mediaRecorder = new MediaRecorder(compositeStream);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        cleanup();
        const rawMime = mediaRecorder.mimeType || selectedMimeType || "video/mp4";
        const cleanMime = rawMime.includes("webm") ? "video/webm" : "video/mp4";
        const blob = new Blob(recordedChunks, { type: cleanMime });
        const ext = cleanMime.includes("webm") ? ".webm" : ".mp4";
        const baseName = (sourceFile?.name || "video").replace(/\.[^/.]+$/, "");
        const trimmedFileName = `${baseName}_trimmed_${Math.round(startTime)}-${Math.round(endTime)}${ext}`;
        const trimmedFile = new File([blob], trimmedFileName, { type: cleanMime });
        resolve(trimmedFile);
      };

      // Seek to startTime & start recording
      video.currentTime = startTime;

      let hasStarted = false;
      const startRecordingProcess = () => {
        if (hasStarted) return;
        hasStarted = true;

        try {
          mediaRecorder.start(100);
        } catch (recErr) {
          cleanup();
          return reject(recErr);
        }

        if (audioBufferSource) {
          try {
            audioBufferSource.start(0, startTime, durationToRecord);
          } catch (aErr) {
            console.warn("AudioBufferSource start note:", aErr);
          }
        }

        video.play().catch((err) => {
          console.warn("Video play warning during trim:", err);
        });

        // Frame rendering loop via requestAnimationFrame
        const drawFrame = () => {
          if (isFinished) return;

          if (video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }

          const currentRecordedTime = video.currentTime - startTime;
          if (onProgress && durationToRecord > 0) {
            const progressPercent = Math.min(100, Math.max(0, Math.round((currentRecordedTime / durationToRecord) * 100)));
            onProgress(progressPercent);
          }

          if (video.currentTime >= endTime - 0.05 || video.ended) {
            video.pause();
            stopRecording();
            return;
          }

          animationFrameId = requestAnimationFrame(drawFrame);
        };

        drawFrame();

        // Backup safety interval check every 100ms (handles tab switching or rAF throttling)
        safetyCheckInterval = setInterval(() => {
          if (isFinished) return;

          const currentRecordedTime = video.currentTime - startTime;
          if (onProgress && durationToRecord > 0) {
            const progressPercent = Math.min(100, Math.max(0, Math.round((currentRecordedTime / durationToRecord) * 100)));
            onProgress(progressPercent);
          }

          if (video.currentTime >= endTime - 0.05 || video.ended) {
            video.pause();
            stopRecording();
          }
        }, 100);

        // Maximum timeout guard (duration + 5 seconds buffer)
        maxTimeoutGuard = setTimeout(() => {
          if (!isFinished) {
            console.warn("Trim recording reached max timeout guard. Stopping cleanly.");
            video.pause();
            stopRecording();
          }
        }, (durationToRecord + 5) * 1000);
      };

      // Trigger start on seeked or immediately if position matches
      video.onseeked = startRecordingProcess;

      // Fallback check if seeked event doesn't fire (e.g. startTime is 0)
      setTimeout(() => {
        if (!hasStarted) {
          startRecordingProcess();
        }
      }, 250);
    };

    video.onerror = (err) => {
      cleanup();
      reject(new Error("Failed to load video file for trimming."));
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

/**
 * Generates an image poster thumbnail URL for a video.
 * For Cloudinary hosted videos, it replaces the video extension with .jpg and applies so_0.5 (frame at 0.5s)
 * so browsers load a crisp image thumbnail immediately without rendering blank frames.
 *
 * @param {string} url - video media URL
 * @returns {string|null} - poster image URL or null
 */
export const getVideoPosterUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  // Cloudinary video URL
  if (url.includes("cloudinary.com") && url.includes("/video/upload/")) {
    let poster = url;
    // Add start offset 0.5s if not already transformed
    if (!poster.includes("/so_")) {
      poster = poster.replace("/video/upload/", "/video/upload/so_0.5/");
    }
    // Replace video extension with .jpg
    poster = poster.replace(/\.(mp4|mov|webm|avi|mkv|m4v|3gp|flv)(\?.*)?$/i, ".jpg$2");
    return poster;
  }

  return null;
};

/**
 * Checks whether a given media URL or item represents a video
 * @param {string|object} mediaOrItem 
 * @returns {boolean}
 */
export const isVideoMedia = (mediaOrItem) => {
  if (!mediaOrItem) return false;
  if (typeof mediaOrItem === "string") {
    return /\.(mp4|mov|webm|avi|mkv|m4v|3gp|flv)(\?.*)?$/i.test(mediaOrItem);
  }
  return (
    mediaOrItem._type === "vibe" ||
    mediaOrItem._kind === "vibe" ||
    mediaOrItem.mediaType === "video" ||
    isVideoMedia(mediaOrItem.media || mediaOrItem.videoUrl || "")
  );
};

