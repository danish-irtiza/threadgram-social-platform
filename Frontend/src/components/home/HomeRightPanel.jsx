import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils.js";
import SearchInput from "@ui/SearchInput.jsx";
import { Avatar } from "./HomeLeftSidebar.jsx";
import lightIconCircle from "@/assets/logo/thread-icon-circle-lightmode-removebg-preview.png";

const RIGHT_DEMO_CONVERSATIONS = [
  {
    id: "c1",
    username: "aditya123",
    preview: "See you tomorrow 👌",
    avatar: lightIconCircle,
    isOnline: true,
    unread: 2,
    lastSeenAt: "now",
    isActive: true,
  },
  {
    id: "c2",
    username: "thegopalsahu_",
    preview: "Reel bheji hai dekh liyo?",
    avatar: lightIconCircle,
    isOnline: false,
    unread: 0,
    lastSeenAt: "2m",
    isActive: false,
  },
  {
    id: "c3",
    username: "theayushsahu_",
    preview: "You: bhai kal milte hain",
    avatar: lightIconCircle,
    isOnline: false,
    unread: 0,
    lastSeenAt: "1h",
    isActive: false,
  },
];

function ChatBubbleIcon({ className, strokeWidth = 2.25}) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("block shrink-0", className)}
    >
      <path
        d="M5 4.75h11.5a2.25 2.25 0 0 1 2.25 2.25V15a2.25 2.25 0 0 1-2.25 2.25h-5.879a.75.75 0 0 0-.487.181l-2.963 2.47a.5.5 0 0 1-.821-.386V17.5H7.75a2.75 2.75 0 0 1-2.75-2.75V4.75Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M8.25 9h8.5M8.25 11.75h5.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

function UnreadBadge({ count = 0, className }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className={cn(
        "inline-flex min-h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-success px-[6px]  text-[11px] font-semibold text-white shadow-[0_2px_6px_rgba(34,197,94,0.35)]  ",
        "box-content text-center leading-none align-baseline",
        className
      )}
    >
      <span className="inline-block translate-y-[0.5px]">{label}</span>
    </span>
  );
}

function ConversationRow({ conversation, onClick, className }) {
  const active = conversation.isActive;
  return (
    <button
      type="button"
      onClick={() => onClick && onClick(conversation)}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all duration-120 ease-out",
        active
          ? "bg-indigo-soft/80 ring-1 ring-indigo/60"
          : "hover:bg-overlay active:bg-overlay-hover"
      )}
    >
      <div className="relative shrink-0">
        <Avatar src={conversation.avatar} size={44} />
        {conversation.isOnline && (
          <span
            aria-label="Online"
            className="absolute -bottom-0.5 -right-0.5 h-[14px] w-[14px] rounded-full border-[2px] border-paper bg-success shadow-[0_0_0_1px_rgba(34,197,94,0.35)]"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold leading-5 text-ink">
            @{conversation.username}
          </p>
          <span className="shrink-0 text-[11px] leading-4 text-text-subtle">
            {conversation.lastSeenAt}
          </span>
        </div>
        <p
          className={cn(
            "truncate text-[13px] leading-5",
            conversation.unread > 0
              ? "text-ink font-medium"
              : "text-text-subtle"
          )}
        >
          {conversation.preview}
        </p>
      </div>
      <UnreadBadge count={conversation.unread} />
    </button>
  );
}

export default function HomeRightPanel({
  conversations = RIGHT_DEMO_CONVERSATIONS,
  onConversationClick,
  unreadTotal,
  className,
}) {
  const [query, setQuery] = useState("");

  const totalUnread = useMemo(
    () =>
      typeof unreadTotal === "number"
        ? unreadTotal
        : conversations.reduce((sum, c) => sum + (c.unread || 0), 0),
    [conversations, unreadTotal]
  );

  const filtered = useMemo(
    () =>
      conversations.filter((c) =>
        query.trim() === ""
          ? true
          : c.username.toLowerCase().includes(query.toLowerCase())
      ),
    [conversations, query]
  );

  return (
    <aside
      className={cn(
        "hidden xl:flex h-full w-[320px] shrink-0 flex-col border-l border-border-subtle/70 bg-paper",
        className
      )}
      aria-label="Messages"
    >
      <header className="border-b border-border-subtle px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 pt-2 items-center justify-center rounded-xl bg-indigo-soft text-indigo shadow-[0_2px_10px_rgba(107,91,255,0.22)]">
              <ChatBubbleIcon className="h-6
               w-6 translate-x-[0.5px] -translate-y-[1px]" strokeWidth={1.75} />
            </div>
            <div className="absolute -right-1.5 -top-1.5">
              <UnreadBadge count={totalUnread} />
            </div>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[15px] font-semibold leading-6 text-ink">
              Chats
            </p>
            <p className="truncate text-[12px] leading-4 text-text-subtle">
              {conversations.filter((c) => c.isOnline).length} friends online
            </p>
          </div>
        </div>
      </header>

      <div className="px-3 pt-4 pb-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search user"
          variant="surface"
          size="md"
          ariaLabel="Search conversations"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4 pr-2 [scrollbar-width:thin]">
        {filtered.length === 0 ? (
          <div className="mx-auto mt-10 max-w-[240px] text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-overlay text-muted">
              <ChatBubbleIcon className="h-6 w-6" />
            </div>
            <p className="text-[13px] leading-5 text-text-subtle">
              No users match &ldquo;{query}&rdquo;.
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              onClick={onConversationClick}
            />
          ))
        )}
      </div>

      <footer className="border-t border-border-subtle px-5 py-3.5">
        <button
          type="button"
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-indigo px-4 py-2.5 text-[13px] font-semibold leading-5 text-white shadow-[0_6px_16px_-6px_rgba(107,91,255,0.55)] transition-all duration-120 ease-out hover:bg-indigo-hover active:scale-[0.98]"
        >
          <ChatBubbleIcon
            className="h-4 w-4 text-white"
            strokeWidth={1.85}
          />
          New Message
        </button>
      </footer>
    </aside>
  );
}

export { ChatBubbleIcon, ConversationRow, UnreadBadge, RIGHT_DEMO_CONVERSATIONS };
