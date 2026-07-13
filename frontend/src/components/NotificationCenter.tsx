import { useCallback, useEffect, useRef, useState } from "react";
import { FiBell, FiCheck, FiTrash2, FiX } from "react-icons/fi";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../api/notificationApi";
import "./NotificationCenter.css";

function formatNotificationTime(value: string) {
  const date = new Date(value);
  const now = Date.now();
  const difference = now - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) return "Just now";
  if (difference < hour) return `${Math.floor(difference / minute)}m ago`;
  if (difference < day) return `${Math.floor(difference / hour)}h ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await listNotifications();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      setError("");
    } catch (requestError) {
      console.error("Failed to load notifications:", requestError);
      setError("Could not load notifications.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  async function toggleOpen() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) await refresh(true);
  }

  async function handleRead(notification: NotificationItem) {
    if (notification.isRead) return;

    const updated = await markNotificationRead(notification.id);
    setItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function handleReadAll() {
    await markAllNotificationsRead();
    setItems((current) =>
      current.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt ?? new Date().toISOString(),
      }))
    );
    setUnreadCount(0);
  }

  async function handleDelete(notificationId: number) {
    const deletedItem = items.find((item) => item.id === notificationId);
    await deleteNotification(notificationId);
    setItems((current) => current.filter((item) => item.id !== notificationId));
    if (deletedItem && !deletedItem.isRead) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }
  }

  return (
    <div className="notification-center" ref={containerRef}>
      <button
        type="button"
        className="notification-bell"
        onClick={() => void toggleOpen()}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section className="notification-panel" aria-label="Notifications">
          <header className="notification-panel-header">
            <div>
              <h2>Notifications</h2>
              <span>{unreadCount} unread</span>
            </div>
            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <button type="button" onClick={() => void handleReadAll()}>
                  <FiCheck /> Read all
                </button>
              )}
              <button
                type="button"
                className="notification-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
              >
                <FiX />
              </button>
            </div>
          </header>

          <div className="notification-list">
            {isLoading && <p className="notification-state">Loading…</p>}
            {!isLoading && error && (
              <p className="notification-state notification-error">{error}</p>
            )}
            {!isLoading && !error && items.length === 0 && (
              <p className="notification-state">No notifications yet.</p>
            )}

            {!isLoading &&
              items.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-item ${
                    notification.isRead ? "is-read" : "is-unread"
                  }`}
                  onClick={() => void handleRead(notification)}
                >
                  <span className="notification-unread-dot" />
                  <div className="notification-content">
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <time dateTime={notification.createdAt}>
                      {formatNotificationTime(notification.createdAt)}
                    </time>
                  </div>
                  <button
                    type="button"
                    className="notification-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(notification.id);
                    }}
                    aria-label="Delete notification"
                  >
                    <FiTrash2 />
                  </button>
                </article>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default NotificationCenter;