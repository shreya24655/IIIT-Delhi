import { useEffect, useState } from "react";
import { api } from "../api/client";

// Unread notification count, refreshed every minute while logged in.
export default function useUnreadCount(enabled) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return undefined;
    }
    let active = true;
    const load = () =>
      api
        .get("/notifications?unread=true")
        .then((res) => active && setCount(res.data.unreadCount ?? 0))
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [enabled]);

  return count;
}