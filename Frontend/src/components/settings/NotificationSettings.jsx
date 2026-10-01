import React, { useState } from "react";
import { Bell, Heart, MessageSquare, UserPlus, Mail, ShieldAlert, Check } from "lucide-react";

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState({
    pauseAll: false,
    likes: true,
    comments: true,
    newFollowers: true,
    directMessages: true,
    emailAlerts: false,
  });

  const [isSaved, setIsSaved] = useState(false);

  const toggle = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setIsSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const items = [
    {
      key: "pauseAll",
      title: "Pause All Notifications",
      description: "Temporarily mute all push notifications",
      icon: ShieldAlert,
    },
    {
      key: "likes",
      title: "Likes & Reactions",
      description: "Get notified when someone likes your posts or comments",
      icon: Heart,
    },
    {
      key: "comments",
      title: "Comments & Mentions",
      description: "Get notified when someone comments on your post or mentions you",
      icon: MessageSquare,
    },
    {
      key: "newFollowers",
      title: "New Followers & Requests",
      description: "Get notified when someone follows you or requests to follow",
      icon: UserPlus,
    },
    {
      key: "directMessages",
      title: "Direct Messages",
      description: "Get notified when you receive a new chat message",
      icon: Bell,
    },
    {
      key: "emailAlerts",
      title: "Email Notifications",
      description: "Receive weekly digests and security updates in your inbox",
      icon: Mail,
    },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-ink flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-400" />
          Notification Preferences
        </h3>
        <p className="mt-1 text-sm text-muted">
          Control how and when you receive push notifications and alerts.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          const enabled = preferences[item.key];
          return (
            <div
              key={item.key}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-surface-elevated/40 hover:bg-surface-elevated transition-colors"
            >
              <div className="flex items-start gap-3.5 pr-4">
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-overlay text-indigo-400">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">{item.title}</div>
                  <div className="text-xs text-muted mt-0.5">{item.description}</div>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => toggle(item.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enabled ? "bg-indigo" : "bg-zinc-700/50"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        {isSaved ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Check size={14} /> Preferences updated successfully!
          </span>
        ) : (
          <span />
        )}

        <button
          type="submit"
          className="h-9 px-5 rounded-full bg-indigo hover:bg-indigo-hover text-white text-xs font-semibold transition-all shadow-md active:scale-95"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
