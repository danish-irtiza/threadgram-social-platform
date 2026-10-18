import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AlertCircle, Loader2 } from "lucide-react";
import ThreadgramLoader from "@/components/ui/ThreadgramLoader.jsx";
import VibesItem from "./vibesItem.jsx";
import { CommentsModal, CONTENT_TYPE, MediaToast } from "@/components/post/MediaViewer.jsx";
import { fetchReels, fetchMoreReels, updateReel } from "@/redux/features/reels/reelsSlice.js";

export default function VibeFeed() {
  const dispatch = useDispatch();
  const { reels, loading, error, page, hasMore } = useSelector((s) => s.reels || {});

  const [activeIndex, setActiveIndex] = useState(0);
  const [globalMuted, setGlobalMuted] = useState(true);
  const [commentsReelId, setCommentsReelId] = useState(null);
  const [expandedCaptionId, setExpandedCaptionId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast((t) => (t && t.message === message ? null : t)), 2600);
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    dispatch(fetchReels());
  }, [dispatch]);

  const sentinelRefs = useRef([]);
  const containerRef = useRef(null);
  const sentinelObs = useRef(null);
  const listLen = reels?.length || 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) return;
    if (sentinelObs.current) sentinelObs.current.disconnect();

    sentinelObs.current = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1;
        let bestRatio = 0.6;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= bestRatio) {
            bestRatio = entry.intersectionRatio;
            const idx = Number(entry.target.getAttribute("data-reel-idx"));
            if (!Number.isNaN(idx)) bestIdx = idx;
          }
        });
        if (bestIdx >= 0) setActiveIndex(bestIdx);
      },
      { threshold: [0.5, 0.6, 0.75, 0.9] }
    );

    return () => {
      if (sentinelObs.current) sentinelObs.current.disconnect();
    };
  }, []);

  useEffect(() => {
    const obs = sentinelObs.current;
    if (!obs) return;
    obs.disconnect();
    sentinelRefs.current.forEach((el) => {
      if (el) obs.observe(el);
    });
  }, [listLen]);

  useEffect(() => {
    if (!listLen || loading || !hasMore) return;
    if (activeIndex >= listLen - 2) {
      dispatch(fetchMoreReels());
    }
  }, [activeIndex, listLen, loading, hasMore, dispatch, page]);

  const handleOpenComments = (reelId) => {
    setCommentsReelId(reelId);
    setExpandedCaptionId(null);
  };

  const handleCaptionExpand = (reelId) => setExpandedCaptionId(reelId);

  const handleCommentCountChange = useCallback((reelId, count) => {
    dispatch(updateReel({ reelId, commentsCount: count }));
  }, [dispatch]);

  const commentsReel = useMemo(
    () => reels.find((r) => String(r._id) === String(commentsReelId)) || null,
    [reels, commentsReelId]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory scroll-smooth bg-black reels-scroll-hidden flex flex-col items-center"
      style={{ scrollbarWidth: "none" }}
    >
      <style>{`.reels-scroll-hidden::-webkit-scrollbar { display: none; }`}</style>

      {listLen === 0 && (
        <div className="h-screen w-full grid place-items-center bg-black text-white">
          {loading ? (
            <ThreadgramLoader fullScreen={false} logoSize={56} />
          ) : error ? (
            <div className="max-w-xs rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <div className="grid mx-auto mb-3 h-10 w-10 place-items-center rounded-full bg-rose-500/20 text-rose-400">
                <AlertCircle size={20} />
              </div>
              <p className="text-[14px] font-semibold mb-1">Couldn't load vibes</p>
              <p className="text-[12px] text-white/70 mb-4">
                {String(error || "Something went wrong.")}
              </p>
              <button
                type="button"
                onClick={() => dispatch(fetchReels())}
                className="rounded-xl bg-indigo px-4 py-2 text-[12px] font-semibold text-white hover:bg-indigo-hover transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="text-center max-w-sm px-6">
              <p className="text-[15px] font-semibold mb-2">No vibes yet</p>
              <p className="text-[12px] text-white/70">
                When other users publish short videos on public accounts, they'll appear here.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="w-full flex flex-col items-center">
        {reels.map((reel, idx) => (
          <div
            key={String(reel?._id || `reel-${idx}`)}
            ref={(el) => { sentinelRefs.current[idx] = el; }}
            data-reel-idx={idx}
            className="snap-start h-screen w-full shrink-0 flex items-center justify-center bg-black"
          >
            <VibesItem
              reel={reel}
              index={idx}
              isActive={idx === activeIndex}
              globalMuted={globalMuted}
              onToggleGlobalMute={() => setGlobalMuted((m) => !m)}
              onOpenComments={handleOpenComments}
              onCaptionExpandStateChange={handleCaptionExpand}
              isCaptionExpanded={expandedCaptionId === String(reel?._id)}
            />
          </div>
        ))}
      </div>

      {listLen > 0 && loading && (
        <div className="h-24 w-full grid place-items-center bg-black">
          <Loader2 size={22} className="animate-spin text-indigo" />
        </div>
      )}

      {commentsReel && commentsReelId && (
        <CommentsModal
          contentId={commentsReelId}
          content={commentsReel}
          contentType={CONTENT_TYPE.VIBE}
          commentsCount={commentsReel?.commentsCount ?? 0}
          onClose={() => setCommentsReelId(null)}
          onCommentCountChange={(n) => handleCommentCountChange(commentsReelId, n)}
        />
      )}

      {toast && <MediaToast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  );
}
