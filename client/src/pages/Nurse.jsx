import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errorMessage, fieldErrors } from "../api/client";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import { Alert, Button, Check, Input, Loading, PageShell, Textarea } from "../components/ui";
import { addDays, formatDateTime, formatTime, rupees, todayKey } from "../lib/format";

const dayLabel = (key) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${key}T12:00:00+05:30`)
  );

export default function Nurse() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const services = useApi("/nurse/services");

  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [city, setCity] = useState("");
  const [slots, setSlots] = useState({ list: [], message: "", loading: false, error: "" });
  const [startsAt, setStartsAt] = useState("");
  const [form, setForm] = useState({ address: "", landmark: "", notes: "", consent: false });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(todayKey(), i)), []);
  const list = services.data?.services ?? [];
  const service = list.find((s) => s.id === serviceId);
  const savedCity = user?.profile?.city;

  // Load free times whenever the task, day or city changes.
  useEffect(() => {
    if (!serviceId) return undefined;
    let active = true;
    setStartsAt("");
    setSlots((s) => ({ ...s, loading: true, error: "", message: "" }));
    const q = new URLSearchParams({ serviceId, date });
    if (city.trim().length >= 2) q.set("city", city.trim());
    api
      .get(`/nurse/availability?${q}`)
      .then((res) => active && setSlots({ list: res.data.slots, message: res.data.emptyMessage ?? "", loading: false, error: "" }))
      .catch((err) => active && setSlots({ list: [], message: "", loading: false, error: errorMessage(err) }));
    return () => {
      active = false;
    };
  }, [serviceId, date, city]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function book() {
    setError("");
    setErrors({});
    setBusy(true);
    try {
      await api.post("/nurse/visits", {
        serviceId,
        startsAt,
        consentShareAddress: form.consent,
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(form.landmark.trim() ? { landmark: form.landmark.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      });
      navigate("/nurse/visits", { state: { booked: true } });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="A nurse at home"
      subtitle="For short, routine tasks. Nurses don’t diagnose or prescribe. In an emergency, call 112."
      actions={<Link to="/nurse/visits" className="font-medium text-teal-deep underline underline-offset-4">My nurse visits</Link>}
    >
      <div className="space-y-12">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">1. What do you need?</h2>
          {services.loading && <Loading />}
          <Alert>{services.error}</Alert>
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={serviceId === s.id}
                  onClick={() => setServiceId(s.id)}
                  className={`h-full w-full rounded-2xl border p-5 text-left transition-colors ${
                    serviceId === s.id ? "border-teal bg-teal/5" : "border-line hover:border-teal"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-lg font-semibold">{s.name}</span>
                    <span className="font-medium">{rupees(s.price)}</span>
                  </span>
                  <span className="mt-1 block text-[16px] text-ink-soft">{s.description}</span>
                  <span className="mt-1 block text-sm text-ink-soft">About {s.durationMinutes} minutes</span>
                </button>
              </li>
            ))}
          </ul>
          {service?.patientNote && <Alert tone="info" className="mt-4">{service.patientNote}</Alert>}
        </section>

        {serviceId && (
          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold">2. Pick a day and time</h2>
            <ul className="flex gap-2 overflow-x-auto pb-2">
              {days.map((d) => (
                <li key={d}>
                  <button
                    type="button"
                    aria-pressed={date === d}
                    onClick={() => setDate(d)}
                    className={`whitespace-nowrap rounded-xl border px-4 py-2 transition-colors ${
                      date === d ? "border-teal bg-teal text-white" : "border-line hover:border-teal"
                    }`}
                  >
                    {d === todayKey() ? "Today" : dayLabel(d)}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 max-w-xs">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={savedCity ?? ""}
                hint={savedCity ? `Leave blank to use ${savedCity}.` : "Where should the nurse come?"}
              />
            </div>

            <div className="mt-6">
              {slots.loading && <Loading label="Checking nurses" />}
              <Alert>{slots.error}</Alert>
              {!slots.loading && !slots.error && slots.list.length === 0 && (
                <p className="text-ink-soft">{slots.message || "No free times on this day."}</p>
              )}
              <ul className="flex flex-wrap gap-2">
                {slots.list.map((s) => (
                  <li key={s.startsAt}>
                    <button
                      type="button"
                      aria-pressed={startsAt === s.startsAt}
                      onClick={() => setStartsAt(s.startsAt)}
                      className={`rounded-xl border px-4 py-2 font-medium transition-colors ${
                        startsAt === s.startsAt ? "border-teal bg-teal text-white" : "border-line hover:border-teal"
                      }`}
                    >
                      {formatTime(s.startsAt)}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-ink-soft">
                Times shown are in India time. The earliest booking is 2 hours from now. We assign a verified nurse in your
                city when you confirm.
              </p>
            </div>
          </section>
        )}

        {startsAt && (
          <section className="max-w-xl space-y-5">
            <h2 className="font-display text-2xl font-semibold">3. Where should the nurse come?</h2>
            <Alert>{error}</Alert>
            <Input
              label="Address (optional)"
              value={form.address}
              onChange={set("address")}
              error={errors.address}
              hint="Leave blank to use the address saved in your profile."
              autoComplete="street-address"
            />
            <Input label="Landmark (optional)" value={form.landmark} onChange={set("landmark")} error={errors.landmark} placeholder="Near the park gate" />
            <Textarea label="Notes for the nurse (optional)" rows={3} maxLength={500} value={form.notes} onChange={set("notes")} error={errors.notes} />

            <div className="rounded-2xl bg-wash p-5">
              <Check checked={form.consent} onChange={set("consent")} error={errors.consentShareAddress}>
                I agree to share my address with the assigned nurse for this visit only.
              </Check>
            </div>

            <div className="rounded-xl border border-line p-4">
              <p className="font-medium">{service?.name} · {rupees(service?.price)}</p>
              <p className="text-ink-soft">{formatDateTime(startsAt)}</p>
              <p className="mt-1 text-sm text-ink-soft">Payment is not part of this demo.</p>
            </div>

            <Button onClick={book} loading={busy} disabled={!form.consent} className="w-full">
              Confirm nurse visit
            </Button>
          </section>
        )}
      </div>
    </PageShell>
  );
}