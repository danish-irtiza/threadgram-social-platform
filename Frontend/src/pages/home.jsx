import React, { useCallback, useEffect, useState } from "react";
import HomeLeftSidebar from "@components/home/HomeLeftSidebar.jsx";
import HomeCenterColumn from "@components/home/HomeCenterColumn.jsx";
import HomeRightPanel from "@components/home/HomeRightPanel.jsx";
import { cn } from "@/lib/utils.js";
import { useNavigate, useLocation } from "react-router-dom";
import LeftCornerNav from "../components/navigation/LeftCornerNav";
import MobileTopNav from "../components/navigation/MobileTopNav";
import { useCreateModal } from "../context/CreateModalContext";

import { useSelector } from "react-redux";
import AuthPromptModal from "../components/model/AuthPromptModal";

export default function HomePage({ initialTab = "home" }) {
  const location = useLocation();
  const getTabFromPath = (path) => {
    if (path === "/reels" || path === "/vibes") return "reels";
    if (path === "/search") return "search";
    return initialTab;
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const { openCreate } = useCreateModal();
  const navigate = useNavigate();
  const accessToken = useSelector((s) => s.auth?.accessToken) || localStorage.getItem("accessToken");

  useEffect(() => {
    const tab = getTabFromPath(location.pathname);
    setActiveTab(tab);
  }, [location.pathname, initialTab]);

  const handleTabChange = useCallback(
    (id) => {
      const isProtected = id === "create" || id === "reels" || id === "home";
      if (!accessToken && isProtected) {
        setAuthPromptOpen(true);
        return;
      }
      if (id === "create") {
        openCreate("post");
        return;
      }
      if (id === "reels") {
        setActiveTab("reels");
        if (location.pathname !== "/reels") navigate("/reels");
      } else if (id === "home") {
        setActiveTab("home");
        if (location.pathname !== "/") navigate("/");
      } else if (id === "search") {
        setActiveTab("search");
        if (location.pathname !== "/search") navigate("/search");
      } else if (id === "profile") {
        navigate(accessToken ? "/me" : "/login", { replace: false });
      }
    },
    [accessToken, navigate, openCreate, location.pathname]
  );

  return (
    <div
      className={cn(
        "flex h-screen w-full overflow-hidden bg-paper text-ink lg:pl-[72px] xl:pl-[84px]"
      )}
    >
      <LeftCornerNav
        activeId={activeTab}
        onChange={handleTabChange}
      />

      <MobileTopNav
        onStoryCreateClick={() => openCreate("story")}
        onNotificationsClick={() => console.info("[demo] notifications clicked")}
      />

      <div className="mx-auto flex h-full w-full max-w-[1600px] pt-14 lg:pt-0">
        {activeTab !== "reels" && (
          <HomeLeftSidebar
            className="sticky top-0 h-screen"
            onFollowToggle={(id) => {
              console.info("[demo] toggle follow", id);
            }}
            onLogout={() => {
              console.info("[demo] logout clicked");
            }}
          />
        )}

        <HomeCenterColumn
          activeTab={activeTab}
          initialTab={activeTab}
          onTabChange={(id) => handleTabChange(id)}
          onOpenCreate={(type = "post") => openCreate(type)}
        />

        {activeTab !== "reels" && (
          <HomeRightPanel
            className="sticky top-0 h-screen"
            onConversationClick={(conv) => {
              console.info("[demo] open conversation", conv.id);
            }}
          />
        )}
      </div>

      <AuthPromptModal
        isOpen={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
      />
    </div>
  );
}
