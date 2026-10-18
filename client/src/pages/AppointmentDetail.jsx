import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import SlotPicker from "../components/SlotPicker";
import { Alert, Badge, Button, DemoBadge, Loading, PageShell, StatusBadge, Textarea } from "../components/ui";
import { formatDateTime, formatDayLong, formatTime, MODE_LABEL, rupees } from "../lib/format";

const CHANGE_BEFORE_MS = 2 * 60 * 60 * 1000;
const SEVERITY = { mild: "Mild", moderate: "Moderate", severe: "Severe", unknown: "Not stated" };

export default function AppointmentDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const isDoctor = user.role === "DOCTOR";

  const { data, error, loading, reload } = useApi(`/appointments/${id}`);
  const [now, setNow] = useState(() => Date.now());
  const [panel, setPanel] = useState(""); // "", "cancel", "reschedule"
  const [reason, setReason] = useState("");
  const [slotId, setSlotId] = useState("");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(state?.booked ? "Your appointment is confirmed. We’ve also sent a WhatsApp message if your number is set up." : "");

  // Keeps "Join" accurate without a page refresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const appt = data?.appointment;
  const doctorSlots = useApi(appt ? `/doctors/${appt.doctor.id}` : "", {
    enabled: panel === "reschedule" && Boolean(appt),
  });

  if (loading) return <PageShell title="Appointment"><Loading /></PageShell>;
  if (error || !appt) {
    return (
      <PageShell title="Appointment">
        <Alert>{error || "We couldn’t load this appointment."}</Alert>
      </PageShell>
    );
  }

  const active = appt.status === "CONFIRMED" || appt.status === "PENDING";
  const startMs = new Date(appt.startsAt).getTime();
  const patientCanChange = active && startMs - now >= CHANGE_BEFORE_MS;
  const online = appt.mode === "ONLINE" && appt.status === "CONFIRMED";
  const opensAt = appt.online ? new Date(appt.online.opensAt) : null;
  const closesAt = appt.online ? new Date(appt.online.closesAt) : null;
  const roomOpen = online && opensAt && now >= opensAt.getTime() && now <= closesAt.getTime();
  const summary = data.patientSummary;

  async function run(key, fn, success) {
    setActionError("");
    setBusy(key);
    try {
      await fn();
      if (success) setNotice(success);
      setPanel("");
      setReason("");
      setSlotId("");
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function join() {
    setActionError("");
    setBusy("join");
    try {
      const { data: res } = await api.get(`/appointments/${id}/join`);
      window.open(res.meetingUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  const cancel = () =>
    run("cancel", () => api.patch(`/appointments/${id}/cancel`, reason.trim() ? { reason: reason.trim() } : {}), "Appointment cancelled.");
  const reschedule = () =>
    run("reschedule", () => api.patch(`/appointments/${id}/reschedule`, { slotId }), "Appointment moved to the new time.");
  const mark = (status) =>
    run(status, () => api.patch(`/appointments/${id}/status`, { status }), status === "COMPLETED" ? "Marked as completed." : "Marked as missed.");

  const otherSlots = (doctorSlots.data?.slots ?? []).filter((s) => s.startsAt !== appt.startsAt);

  return (
    <PageShell
      title={isDoctor ? appt.patient?.name ?? "Appointment" : appt.doctor.name}
      subtitle={isDoctor ? "Appointment details" : `${appt.doctor.specialization}`}
      actions={<StatusBadge status={appt.status} />}
    >
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <Alert tone="success">{notice}</Alert>
          <Alert>{actionError}</Alert>

          <dl className="grid gap-x-8 gap-y-5 border-y border-line py-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink-soft">When</dt>
              <dd className="font-display text-xl font-semibold">{formatDayLong(appt.startsAt)}</dd>
              <dd className="text-[17px]">{formatTime(appt.startsAt)} to {formatTime(appt.endsAt)} (India time)</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Type</dt>
              <dd className="font-medium">{MODE_LABEL[appt.mode] ?? appt.mode}</dd>
              {!isDoctor && <dd className="text-ink-soft">Fee {rupees(appt.doctor.consultationFee)}</dd>}
            </div>
            {appt.mode === "IN_PERSON" && !isDoctor && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-ink-soft">Where</dt>
                <dd className="font-medium">
                  {appt.doctor.clinicName ? `${appt.doctor.clinicName}, ` : ""}
                  {appt.doctor.address}, {appt.doctor.city}
                </dd>
              </div>
            )}
            {appt.reason && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-ink-soft">Reason for the visit</dt>
                <dd className="whitespace-pre-line">{appt.reason}</dd>
              </div>
            )}
            {!isDoctor && appt.doctor.isDemo && (
              <div className="sm:col-span-2"><DemoBadge /></div>
            )}
            {appt.status === "CANCELLED" && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-ink-soft">Cancelled</dt>
                <dd>
                  By {appt.cancelledBy === "DOCTOR" ? "the doctor" : "the patient"}
                  {appt.cancelReason ? `: ${appt.cancelReason}` : ""}
                </dd>
              </div>
            )}
          </dl>

          {online && (
            <section className="rounded-2xl border border-line p-6">
              <h2 className="font-display text-xl font-semibold">Video consultation</h2>
              {roomOpen ? (
                <>
                  <p className="mt-2 text-ink-soft">The room is open. It opens in a new tab.</p>
                  <Button onClick={join} loading={busy === "join"} className="mt-4">Join video visit</Button>
                </>
              ) : now < (opensAt?.getTime() ?? 0) ? (
                <p className="mt-2 text-ink-soft">
                  The room opens at {formatTime(opensAt)}, 10 minutes before the start. Come back then.
                </p>
              ) : (
                <p className="mt-2 text-ink-soft">The video room has closed.</p>
              )}
              <p className="mt-3 text-sm text-ink-soft">
                Allow camera and microphone when your browser asks. If the room asks you to log in, wait for the host to
                start it.
              </p>
            </section>
          )}

          {isDoctor && summary && (
            <section className="rounded-2xl bg-wash p-6">
              <h2 className="font-display text-xl font-semibold">Patient’s summary</h2>
              <p className="mt-1 text-sm text-ink-soft">{summary.label}</p>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-sm text-ink-soft">Symptoms</dt>
                  <dd className="font-medium">{summary.symptoms.join(", ") || "None listed"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-soft">Duration and severity</dt>
                  <dd className="font-medium">{summary.duration ?? "Not stated"} · {SEVERITY[summary.severity] ?? summary.severity}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-soft">In the patient’s own words</dt>
                  <dd className="whitespace-pre-line">{summary.originalDescription}</dd>
                </div>
              </dl>
            </section>
          )}
          {isDoctor && !summary && appt.status !== "CANCELLED" && (
            <p className="text-ink-soft">The patient didn’t share a symptom summary.</p>
          )}
          {isDoctor && appt.patient && (
            <p className="text-[15px] text-ink-soft">
              Patient: {appt.patient.name}, {appt.patient.city}. Prefers {appt.patient.preferredLanguage === "hi" ? "Hindi" : "English"}.
            </p>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {active && (
            <div className="space-y-4 rounded-2xl border border-line p-6">
              <h2 className="font-display text-xl font-semibold">Manage</h2>

              {isDoctor && (
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => mark("COMPLETED")} loading={busy === "COMPLETED"}>Mark completed</Button>
                  <Button variant="outline" onClick={() => mark("NO_SHOW")} loading={busy === "NO_SHOW"}>
                    Patient didn’t come
                  </Button>
                </div>
              )}

              {!isDoctor && (
                <Button variant="outline" disabled={!patientCanChange} onClick={() => setPanel(panel === "reschedule" ? "" : "reschedule")} className="w-full">
                  Change the time
                </Button>
              )}
              <Button variant="danger" disabled={!isDoctor && !patientCanChange} onClick={() => setPanel(panel === "cancel" ? "" : "cancel")} className="w-full">
                Cancel appointment
              </Button>
              {!isDoctor && !patientCanChange && (
                <p className="text-sm text-ink-soft">
                  Changes close 2 hours before the start. Please contact the doctor.
                </p>
              )}

              {panel === "cancel" && (
                <div className="space-y-3 border-t border-line pt-4">
                  <Textarea label="Reason (optional)" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
                  <Button variant="danger" onClick={cancel} loading={busy === "cancel"} className="w-full">
                    Yes, cancel it
                  </Button>
                  {isDoctor && (
                    <p className="text-sm text-ink-soft">The patient is notified. This time is removed from your schedule.</p>
                  )}
                </div>
              )}
            </div>
          )}
          <Link to={isDoctor ? "/doctor" : "/appointments"} className="inline-block text-[15px] text-ink-soft underline underline-offset-4 hover:text-ink">
            Back to appointments
          </Link>
        </aside>
      </div>

      {panel === "reschedule" && !isDoctor && (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="mb-4 font-display text-2xl font-semibold">Pick a new time with {appt.doctor.name}</h2>
          {doctorSlots.loading && <Loading />}
          <Alert>{doctorSlots.error}</Alert>
          {doctorSlots.data && <SlotPicker slots={otherSlots} value={slotId} onChange={setSlotId} />}
          {slotId && (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button onClick={reschedule} loading={busy === "reschedule"}>
                Move to {formatDateTime(otherSlots.find((s) => s.id === slotId)?.startsAt)}
              </Button>
              <Badge>Your old time is released</Badge>
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}