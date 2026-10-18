import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../api/client";

// GET a path and keep { data, error, loading }. Call reload() after a change.
export default function useApi(path, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: "", loading: enabled });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !path) return undefined;
    let active = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    api
      .get(path)
      .then((res) => active && setState({ data: res.data, error: "", loading: false }))
      .catch((err) => active && setState({ data: null, error: errorMessage(err), loading: false }));
    return () => {
      active = false;
    };
  }, [path, enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}