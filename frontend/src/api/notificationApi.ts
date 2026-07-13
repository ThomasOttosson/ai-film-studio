import apiClient from "./client";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unreadCount: number;
}

export async function listNotifications(limit = 30) {
  const response = await apiClient.get<NotificationListResponse>(
    "/api/notifications",
    { params: { limit } }
  );
  return response.data;
}

export async function markNotificationRead(notificationId: number) {
  const response = await apiClient.patch<NotificationItem>(
    `/api/notifications/${notificationId}/read`
  );
  return response.data;
}

export async function markAllNotificationsRead() {
  await apiClient.post("/api/notifications/read-all");
}

export async function deleteNotification(notificationId: number) {
  await apiClient.delete(`/api/notifications/${notificationId}`);
}