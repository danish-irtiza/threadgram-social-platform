import React, { useState, useRef, useEffect } from "react";
import {
  X,
  ArrowLeft,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { addPostToProfile, addVibeToProfile } from "@/redux/features/profile/profileSlice.js";
import { addCreatedStoryToFeed } from "@/redux/features/story/storySlice.js";
import { prependFeedPost } from "@/redux/features/feed/feedSlice.js";
import api from "@/api/axios";
import { getVideoDuration, trimVideoFile, MAX_VIBE_DURATION } from "@/utils/videoUtils";
import VideoTrimmer from "@/components/ui/VideoTrimmer";
import InlineVideoTrimmer from "@/components/ui/InlineVideoTrimmer";
import { Avatar } from "@/components/home/HomeLeftSidebar";
import lightIconCircle from "@/assets/logo/thread-icon-circle-lightmode-removebg-preview.png";
import { cn } from "@/lib/utils";
import CustomVideoPreview from "@/components/ui/CustomVideoPreview";

const CONTENT_TYPES = [
  { id: "post", label: "Post", accept: "image/*,video/*" },
  { id: "vibe", label: "Vibe", accept: "video/*" },
  { id: "story", label: "Story", accept: "image/*,video/*" },
];

export default function CreateContentModal({
  isOpen = false,
  onClose,
  defaultType = "post",
  onCreatedSuccess,
}) {
  const user = useSelector((state) => state.auth?.user);
  const dispatch = useDispatch();

  const [contentType, setContentType] = useState(defaultType); // "post" | "vibe" | "story"
  const [step, setStep] = useState(1); // 1: Select Media, 1.5: Trim Video, 2: Caption & Share
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isTrimmingVideo, setIsTrimmingVideo] = useState(false);

  const fileInputRef = useRef(null);

  // Sync default type when modal opens
  useEffect(() => {
    if (isOpen) {
      setContentType(defaultType);
      resetForm();
    }
  }, [isOpen, defaultType]);

  // Auto-dismiss error notifications after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [error]);

  // Handle preview URL creation & revocation
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      setIsVideo(false);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    setIsVideo(selectedFile.type.startsWith("video/"));

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsVideo(false);
    setCaption("");
    setStep(1);
    setError(null);
    setSuccessMsg(null);
    setUploadProgress(0);
    setShowDiscardConfirm(false);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setIsTrimmingVideo(false);
  };

  const handleClose = () => {
    setError(null);
    if (selectedFile && !successMsg) {
      setShowDiscardConfirm(true);
    } else {
      resetForm();
      onClose && onClose();
    }
  };

  const confirmDiscard = () => {
    resetForm();
    onClose && onClose();
  };

  // Change content type toggle
  const handleTypeToggle = async (typeId) => {
    setContentType(typeId);
    setError(null);

    if (selectedFile) {
      const isVid = selectedFile.type.startsWith("video/");
      if (typeId === "vibe") {
        if (!isVid) {
          setError("Vibes must be a video file. Please select a video.");
          setSelectedFile(null);
          setStep(1);
          return;
        }

        try {
          const duration = await getVideoDuration(selectedFile);
          if (duration > MAX_VIBE_DURATION) {
            setError("Vibe video duration cannot exceed 60 seconds. Please trim your video.");
            setStep(1.5);
            return;
          } else {
            setError(null);
            setStep(1);
          }
        } catch (err) {
          console.warn("Could not check video duration on type toggle:", err);
        }
      }
    }
  };

  // Process file selection
  const handleFileSelect = async (file) => {
    if (!file) return;
    setError(null);

    const isVid = file.type.startsWith("video/");
    const isImg = file.type.startsWith("image/");

    if (contentType === "vibe" && !isVid) {
      setError("Only video files are allowed for Vibes.");
      return;
    }

    if (!isVid && !isImg) {
      setError("Please select a valid image or video file.");
      return;
    }

    setSelectedFile(file);

    if (isVid) {
      try {
        const dur = await getVideoDuration(file);
        setVideoDuration(dur);
        setTrimStart(0);
        setTrimEnd(dur);

        if ((contentType === "story" || contentType === "vibe") && dur > 60) {
          setError(
            contentType === "story"
              ? "Story videos must be 60 seconds or shorter."
              : "Vibe videos must be 60 seconds or shorter."
          );
        }
      } catch (err) {
        console.warn("Could not read video duration:", err);
      }
    } else {
      setVideoDuration(0);
      setTrimStart(0);
      setTrimEnd(0);
    }

    setStep(1);
  };

  const onFileInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Completed trimming from VideoTrimmer
  const handleTrimComplete = (trimmedFile) => {
    setSelectedFile(trimmedFile);
    setError(null); // Automatically clear error when trimmed to 60s or less
    setStep(2);
  };

  // Submit Handler to API
  const handleSubmit = async () => {
    console.log(`[Publish ${contentType} Flow 1/7] Clicked Publish button.`, {
      contentType,
      file: selectedFile ? { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type } : null,
      caption,
    });

    if (!selectedFile) {
      console.error(`[Publish ${contentType} Flow ERROR] No file selected.`);
      setError("Please select media to upload.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);

    let finalUploadFile = selectedFile;

    // Perform video trim if needed for story/vibe/post video uploads
    if (
      selectedFile.type.startsWith("video/") &&
      (videoDuration > 60 || trimStart > 0 || (trimEnd > 0 && trimEnd < videoDuration - 0.5))
    ) {
      const targetEnd = trimEnd > 0 ? trimEnd : Math.min(videoDuration, 60);
      const clipLength = targetEnd - trimStart;

      if (clipLength > 60.5) {
        setIsSubmitting(false);
        setError("Story videos must be 60 seconds or shorter.");
        return;
      }

      try {
        setIsTrimmingVideo(true);
        finalUploadFile = await trimVideoFile(
          selectedFile,
          trimStart,
          targetEnd,
          (progress) => setUploadProgress(progress)
        );
        setIsTrimmingVideo(false);
      } catch (trimErr) {
        console.error("Video trim failed during submit:", trimErr);
        setIsTrimmingVideo(false);
        setIsSubmitting(false);
        setError("Failed to trim video clip. Please try selecting a shorter clip.");
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append("media", finalUploadFile);
      if (contentType !== "story") {
        formData.append("caption", caption.trim());
      }

      let endpoint = "/posts";
      if (contentType === "vibe") endpoint = "/vibes";
      if (contentType === "story") endpoint = "/stories";

      console.log(`[Publish ${contentType} Flow 4/7] Sending FormData request to ${endpoint}...`);

      const res = await api.post(endpoint, formData, {
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            console.log(`[Publish ${contentType} Flow 5/7] Upload progress: ${pct}%`);
            setUploadProgress(pct);
          }
        },
      });

      console.log(`[Publish ${contentType} Flow 6/7] API response received successfully:`, res.data);

      setIsSubmitting(false);
      setSuccessMsg(
        `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} published successfully!`
      );

      // Immediately push new content into the profile and feed Redux store
      if (contentType === "post" && res.data?.data?.post) {
        console.log(`[Publish ${contentType} Flow 7/7] Dispatching addPostToProfile and prependFeedPost.`);
        dispatch(addPostToProfile(res.data.data.post));
        dispatch(prependFeedPost(res.data.data.post));
      }
      if (contentType === "vibe" && res.data?.data?.vibe) {
        console.log(`[Publish ${contentType} Flow 7/7] Dispatching addVibeToProfile.`);
        dispatch(addVibeToProfile(res.data.data.vibe));
      }
      if (contentType === "story" && res.data?.data?.story) {
        console.log(`[Publish ${contentType} Flow 7/7] Dispatching addCreatedStoryToFeed.`);
        dispatch(addCreatedStoryToFeed(res.data.data.story));
      }

      setTimeout(() => {
        if (onCreatedSuccess) onCreatedSuccess(res.data);
        resetForm();
        onClose && onClose();
      }, 1200);
    } catch (err) {
      console.error(`[Publish ${contentType} Flow ERROR] API request failed:`, err);
      setIsSubmitting(false);
      const msg =
        err?.response?.data?.message ||
        `Failed to create ${contentType}. Please try again.`;
      setError(msg);
    }
  };

  if (!isOpen) return null;

  const currentTypeLabel =
    contentType === "vibe" ? "Vibe" : contentType === "story" ? "Story" : "Post";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="relative flex max-h-[90vh] w-full max-w-[850px] flex-col overflow-hidden rounded-3xl border border-border bg-paper shadow-2xl transition-all">
        {/* Top Navigation & Type Selector */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
          {/* Back Button / Title */}
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(step === 1.5 ? 1 : 1);
                }}
                className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-elevated transition-colors"
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-[15px] font-semibold text-ink sm:text-[16px]">
              Create New {currentTypeLabel}
            </h2>
          </div>

          {/* Center 3-Option Toggle */}
          <div className="flex items-center rounded-xl bg-surface p-1 border border-border-subtle">
            {CONTENT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTypeToggle(t.id)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-150",
                  contentType === t.id
                    ? "bg-indigo text-white shadow-sm"
                    : "text-text-subtle hover:text-ink"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Action Button / Close */}
          <div className="flex items-center gap-2">
            {step === 1 && selectedFile && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg bg-indigo px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo/90 transition-all"
              >
                Next
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="grid h-9 w-9 place-items-center rounded-full text-text-subtle hover:bg-overlay-hover hover:text-ink transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Error / Success Notifications */}
        {error && (
          <div className="flex items-center justify-between bg-pink-soft/90 px-4 py-2 text-xs font-medium text-pink border-b border-pink/20 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-pink hover:bg-pink/20 transition-colors"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-600 border-b border-emerald-500/20">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex min-h-[420px] flex-1 flex-col overflow-y-auto p-4 sm:p-6">
          {/* STEP 1: SELECT MEDIA */}
          {step === 1 && (
            <div className="flex flex-1 flex-col items-center justify-center">
              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="flex w-full max-w-lg cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border-strong bg-surface p-8 text-center transition-all hover:border-indigo hover:bg-surface-elevated"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-indigo-soft/60 text-indigo">
                    {contentType === "vibe" ? <VideoIcon size={32} /> : <ImageIcon size={32} />}
                  </div>
                  <h3 className="text-base font-semibold text-ink">
                    Select {contentType === "vibe" ? "video" : "photos and videos"} to upload
                  </h3>
                  <p className="mt-1 text-xs text-text-subtle">
                    {contentType === "vibe"
                      ? "Short video clips up to 60 seconds"
                      : "Drag and drop or select files from your computer"}
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={
                      CONTENT_TYPES.find((t) => t.id === contentType)?.accept || "image/*,video/*"
                    }
                    onChange={onFileInputChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    className="mt-6 rounded-xl bg-indigo px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo/90 transition-all"
                  >
                    Select From Computer
                  </button>
                </div>
              ) : (
                /* Selected File Preview Screen */
                <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">
                  <div className="relative flex max-h-[380px] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-2xl bg-black shadow-md">
                    {isVideo ? (
                      <CustomVideoPreview
                        key={previewUrl}
                        src={previewUrl}
                        hideFullscreen={contentType === "post"}
                        className="max-h-[380px] w-full"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-[380px] w-full object-contain"
                      />
                    )}
                  </div>

                  {/* Inline Video Trimmer / Duration Adjuster */}
                  {isVideo && videoDuration > 0 && (
                    <div className="w-full max-w-[420px]">
                      <InlineVideoTrimmer
                        duration={videoDuration}
                        startTime={trimStart}
                        endTime={trimEnd}
                        maxDuration={60}
                        onTimeChange={({ start, end }) => {
                          setTrimStart(start);
                          setTrimEnd(end);
                          if (end - start <= 60 && error?.includes("60 seconds")) {
                            setError(null);
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      className="rounded-xl bg-surface hover:bg-surface-elevated text-ink px-4 py-2 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Change Media
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={
                        CONTENT_TYPES.find((t) => t.id === contentType)?.accept || "image/*,video/*"
                      }
                      onChange={onFileInputChange}
                      className="hidden"
                    />

                    {contentType === "vibe" && isVideo && (
                      <button
                        type="button"
                        onClick={() => setStep(1.5)}
                        className="rounded-xl border border-indigo/40 bg-indigo-soft/40 px-4 py-2 text-xs font-semibold text-indigo hover:bg-indigo-soft/80 transition-colors"
                      >
                        Edit Vibe
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="rounded-xl bg-indigo px-6 py-2 text-xs font-semibold text-white shadow hover:bg-indigo/90 transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 1.5: TRIM / EDIT VIDEO (VIBE ONLY) */}
          {step === 1.5 && selectedFile && isVideo && (
            <div className="flex flex-1 flex-col items-center justify-center">
              <h3 className="mb-2 text-sm font-semibold text-ink">
                Edit Vibe (Trim Video Clip)
              </h3>
              <VideoTrimmer
                file={selectedFile}
                onTrimComplete={handleTrimComplete}
                onCancel={() => setStep(1)}
              />
            </div>
          )}

          {/* STEP 2: ADD CAPTION & SPLIT VIEW */}
          {step === 2 && (
            <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
              {/* Left Column: Media Preview */}
              <div className="flex items-center justify-center rounded-2xl bg-black/90 p-2 overflow-hidden shadow-inner max-h-[380px]">
                {isVideo ? (
                  <CustomVideoPreview
                    key={previewUrl}
                    src={previewUrl}
                    hideFullscreen={contentType === "post"}
                    className="max-h-[360px] w-full"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Selected"
                    className="max-h-[360px] w-full object-contain"
                  />
                )}
              </div>

              {/* Right Column: Profile & Caption */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* User Info Header */}
                  <div className="flex items-center gap-3">
                    <Avatar src={user?.avatar || lightIconCircle} size={42} ringed />
                    <div>
                      <p className="text-xs font-bold text-ink">
                        {user?.name || "Your Account"}
                      </p>
                      <p className="text-[11px] text-text-subtle">
                        @{user?.username || "username"}
                      </p>
                    </div>
                  </div>

                  {/* Caption Input */}
                  {contentType !== "story" ? (
                    <div className="space-y-1">
                      <textarea
                        rows={6}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder={`Write a caption for your ${currentTypeLabel.toLowerCase()}...`}
                        maxLength={2200}
                        className="w-full resize-none rounded-xl border border-border bg-surface p-3 text-xs leading-5 text-ink placeholder:text-text-subtle focus:border-indigo focus:outline-none"
                      />
                      <div className="flex justify-end text-[10px] text-text-subtle">
                        {caption.length} / 2200
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-surface p-4 text-xs text-text-subtle">
                      Stories automatically disappear after 24 hours.
                    </div>
                  )}
                </div>

                {/* Final Share Button + Upload Progress */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo/90 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>
                          {isVideo
                            ? uploadProgress > 0 && uploadProgress < 100
                              ? `Publishing Video (${uploadProgress}%)...`
                              : "Publishing Video..."
                            : uploadProgress < 100
                              ? `Uploading... ${uploadProgress}%`
                              : `Publishing ${currentTypeLabel}...`}
                        </span>
                      </>
                    ) : (
                      <span>Publish {currentTypeLabel}</span>
                    )}
                  </button>

                  {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                      <div
                        className="h-full rounded-full bg-indigo transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-paper p-5 text-center shadow-xl">
            <h3 className="text-sm font-bold text-ink">Discard content?</h3>
            <p className="mt-1 text-xs text-text-subtle">
              If you leave now, your edits will not be saved.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmDiscard}
                className="w-full rounded-xl bg-pink py-2.5 text-xs font-semibold text-white hover:bg-pink/90 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="w-full rounded-xl border border-border bg-surface py-2.5 text-xs font-semibold text-ink hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
