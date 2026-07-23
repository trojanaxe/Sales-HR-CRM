"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  requirementId: string | null;
  isRead: boolean;
  createdAt: string;
}

const POLL_MS = 30_000;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);

    // Dashboard pop-up: toast any unread notification we haven't shown yet
    // in this session. Skipped on first load so a page refresh doesn't
    // re-toast a backlog the user already knows about.
    const unseen = (data.notifications as Notification[]).filter((n) => n.isRead === false && !seenIds.current.has(n.id));
    if (!firstLoad.current) {
      unseen.forEach((n) => toast(n.title, { icon: "🔔", duration: 6000 }));
    }
    data.notifications.forEach((n: Notification) => seenIds.current.add(n.id));
    firstLoad.current = false;
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  return (
    <div className="fixed top-5 right-6 z-40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <svg className="w-4.5 h-4.5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl max-h-96 overflow-y-auto"
          style={{ background: "rgba(15,15,40,0.97)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-8">No notifications yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 ${!n.isRead ? "bg-white/[0.03]" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white/85">{n.title}</p>
                    {!n.isRead && (
                      <button onClick={() => markRead(n.id)} className="text-[10px] text-white/30 hover:text-white/60 transition-colors cursor-pointer whitespace-nowrap">
                        mark read
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-1">{n.body}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-white/25">{new Date(n.createdAt).toLocaleString()}</span>
                    {n.requirementId && (
                      <Link href={`/requirements/${n.requirementId}`} onClick={() => setOpen(false)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
