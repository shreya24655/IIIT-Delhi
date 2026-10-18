import { useState } from "react";
import { useLocation } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import useApi from "../hooks/useApi";
import { Alert, Badge, Button, ButtonLink, DemoBadge, Empty, Loading, PageShell, StatusBadge, Tabs } from "../components/ui";
import { formatDateTime, rupees } from "../lib/format";

const CANCEL_BEFORE_MS = 2 * 60 * 60 * 1000;
const LANG = { en: "English", hi: "Hindi" };

export default function NurseVisits() {
  const { state } = useLocation();
  const [scope, setScope] = useState("upcoming");
  const { data, error, loading, reload } = useApi(`/nurse/visits?scope=${scope}`);
  const [notice, setNotice] = useState(state?.booked ? "Your nurse visit is confirmed. We’ve also sent a WhatsApp message if your number is set up." : "");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [confirmId, setConfirmId] = useState("");

  async function cancel(id) {
    setActionError("");
    setBusyId(id);
    try {
      await api.patch(`/nurse/visits/${id}/cancel`, {});
      setNotice("Visit cancelled.");
      setConfirmId("");
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId("");
    }
  }

  return (
    <PageShell title="My nurse visits" actions={<ButtonLink to="/nurse">Book a visit</ButtonLink>}>
      <Tabs
        value={scope}
        onChange={setScope}
        options={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
        ]}
      />
      <div className="mt-6 space-y-3">
        <Alert tone="success">{notice}</Alert>
        <Alert>{actionError}</Alert>
        {loading && <Loading />}
        <Alert>{error}</Alert>
        {data &&
          !loading &&
          (data.visits.length === 0 ? (
            <Empty title={scope === "upcoming" ? "No nurse visits booked" : "No past visits"} />
          ) : (
            data.visits.map((v) => {
              const canCancel = v.status === "CONFIRMED" && new Date(v.startsAt).getTime() - Date.now() >= CANCEL_BEFORE_MS;
              return (
                <article key={v.id} className="rounded-2xl border border-line p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-lg font-semibold">{formatDateTime(v.startsAt)}</p>
                      <p className="text-[17px]">{v.service.name} · {rupees(v.price)}</p>
                      <p className="text-[15px] text-ink-soft">
                        {v.nurse.name}, {v.nurse.qualification} · {v.nurse.yearsOfExperience} years · speaks{" "}
                        {v.nurse.languages.map((l) => LANG[l] ?? l).join(" and ")}
                      </p>
                      <p className="text-[15px] text-ink-soft">
                        {v.address}, {v.city}
                        {v.landmark ? ` (${v.landmark})` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge status={v.status} />
                        <Badge tone="ok">Verified nurse</Badge>
                        {v.nurse.isDemo && <DemoBadge />}
                      </div>
                    </div>

                    {v.status === "CONFIRMED" &&
                      (confirmId === v.id ? (
                        <div className="flex gap-2">
                          <Button variant="danger" loading={busyId === v.id} onClick={() => cancel(v.id)}>Yes, cancel</Button>
                          <Button variant="outline" onClick={() => setConfirmId("")}>Keep it</Button>
                        </div>
                      ) : (
                        <Button variant="danger" disabled={!canCancel} onClick={() => setConfirmId(v.id)}>
                          Cancel visit
                        </Button>
                      ))}
                  </div>
                  {v.status === "CONFIRMED" && !canCancel && (
                    <p className="mt-3 text-sm text-ink-soft">Visits can be cancelled up to 2 hours before the start.</p>
                  )}
                  {v.service.patientNote && v.status === "CONFIRMED" && (
                    <p className="mt-3 rounded-xl bg-wash px-4 py-3 text-[15px] text-ink-soft">{v.service.patientNote}</p>
                  )}
                </article>
              );
            })
          ))}
      </div>
    </PageShell>
  );
}