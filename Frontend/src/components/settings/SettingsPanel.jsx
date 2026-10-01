import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Lock,
  Bell,
  Bookmark,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react";
import AccountSettings from "./AccountSettings.jsx";
import PrivacySettings from "./PrivacySettings.jsx";
import NotificationSettings from "./NotificationSettings.jsx";
import SavedPostsSettings from "./SavedPostsSettings.jsx";
import LogoutSetting from "./LogoutSetting.jsx";

const SETTING_TABS = [
  { id: "account", label: "Account Settings", icon: User, component: AccountSettings },
  { id: "privacy", label: "Privacy Settings", icon: Lock, component: PrivacySettings },
  { id: "notifications", label: "Notifications", icon: Bell, component: NotificationSettings },
  { id: "saved", label: "Saved Posts", icon: Bookmark, component: SavedPostsSettings },
  { id: "logout", label: "Logout", icon: LogOut, component: LogoutSetting, isDanger: true },
];

export default function SettingsPanel({ isOpen, onClose, initialTab = "account" }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeTabConfig = SETTING_TABS.find((t) => t.id === activeTab) || SETTING_TABS[0];
  const ActiveComponent = activeTabConfig.component;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Card */}
      <div
        className="relative w-full max-w-4xl h-[90vh] max-h-[640px] rounded-3xl border border-border bg-surface shadow-2xl flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border md:hidden bg-surface-elevated/50">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Shield size={18} className="text-indigo-400" />
            <span>Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-ink hover:bg-overlay cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Left Sidebar Navigation */}
        <div className="w-full md:w-64 border-r border-border bg-surface-elevated/30 flex shrink-0 flex-col justify-between overflow-y-auto custom-scrollbar">
          <div className="p-3 sm:p-4 space-y-1">
            {/* Desktop Header Title */}
            <div className="hidden md:flex items-center justify-between pb-3 px-3 border-b border-border/50 mb-2">
              <div className="flex items-center gap-2 font-bold text-base text-ink">
                <Shield size={18} className="text-indigo" />
                Settings
              </div>
            </div>

            {/* Navigation Tabs */}
            {SETTING_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${isActive
                    ? "bg-indigo text-white shadow-md"
                    : tab.isDanger
                      ? "text-red-500 hover:bg-red-500/10"
                      : "text-muted hover:text-ink hover:bg-overlay"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? "text-white" : ""} />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight size={14} className={isActive ? "text-white/80" : "opacity-40"} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-surface">
          {/* Desktop Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="hidden md:grid cursor-pointer absolute top-4 right-4 z-10 h-8 w-8 place-items-center rounded-full border border-border bg-surface-elevated/70 text-ink hover:bg-overlay hover:scale-105 active:scale-95 transition-all"
          >
            <X size={16} />
          </button>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8">
            <ActiveComponent onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}
