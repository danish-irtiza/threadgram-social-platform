import React, { useCallback, useState } from "react";
import HomeLeftSidebar from "@components/home/HomeLeftSidebar.jsx";
import HomeCenterColumn from "@components/home/HomeCenterColumn.jsx";
import HomeRightPanel from "@components/home/HomeRightPanel.jsx";
import { cn } from "@/lib/utils.js";
import { useNavigate } from "react-router-dom";
import LeftCornerNav from "../components/navigation/LeftCornerNav";
import MobileTopNav from "../components/navigation/MobileTopNav";
import { useCreateModal } from "../context/CreateModalContext";

import { useSelector } from "react-redux";
import AuthPromptModal from "../components/model/AuthPromptModal";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("home");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const { openCreate } = useCreateModal();
  const navigate = useNavigate();
  const accessToken = useSelector((s) => s.auth?.accessToken) || localStorage.getItem("accessToken");

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
      setActiveTab(id);
      if (id === "profile") {
        navigate(accessToken ? "/me" : "/login", { replace: false });
      }
    },
    [accessToken, navigate, openCreate]
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
