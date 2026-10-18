import { useState } from "react";
import { api, errorMessage } from "../api/client";
import useApi from "../hooks/useApi";
import { Alert, Button, Empty, Loading, PageShell } from "../components/ui";
import { formatDateTime } from "../lib/format";

export default function Notifications() {
  const { data, error, loading, reload } = useApi("/notifications");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  async function markRead(id) {
    setActionError("");
    try {
      await api.patch(`/notifications/${id}/read`);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function markAll() {
    setActionError("");
    setBusy(true);
    try {
      await api.patch("/notifications/read-all");
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const items = data?.notifications ?? [];

  return (
    <PageShell
      title="Notifications"
      subtitle="Confirmations, changes and reminders. The same messages go to WhatsApp when your number is set up."
      narrow
      actions={
        data?.unreadCount > 0 && (
          <Button variant="outline" onClick={markAll} loading={busy}>
            Mark all as read
          </Button>
        )
      }
    >
      {loading && <Loading />}
      <Alert>{error || actionError}</Alert>
      {data &&
        (items.length === 0 ? (
          <Empty title="Nothing here yet">Booking confirmations and reminders will show up here.</Empty>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {items.map((n) => (
              <li key={n.id} className="flex items-start gap-4 py-5">
                <span
                  aria-hidden="true"
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${n.readAt ? "bg-line" : "bg-teal"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[17px] ${n.readAt ? "" : "font-semibold"}`}>
                    {n.title}
                    {!n.readAt && <span className="sr-only"> (unread)</span>}
                  </p>
                  <p className="mt-0.5 text-[16px] text-ink-soft">{n.body}</p>
                  <p className="mt-1 text-sm text-ink-soft">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.readAt && (
                  <button onClick={() => markRead(n.id)} className="shrink-0 text-sm font-medium text-teal-deep underline underline-offset-4">
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}
    </PageShell>
  );
}