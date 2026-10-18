import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import AppointmentCard from "../components/AppointmentCard";
import { Alert, ButtonLink, Empty, Loading, PageShell } from "../components/ui";
import { formatDateTime } from "../lib/format";

const ACTIONS = [
  { to: "/query", title: "Describe how you feel", text: "Speak or type. We find doctors who fit." },
  { to: "/nurse", title: "Book a nurse at home", text: "Injections, dressings, BP and sugar checks." },
  { to: "/appointments", title: "My appointments", text: "Join, change or cancel a visit." },
];

export default function Dashboard() {
  const { user } = useAuth();
  const appts = useApi("/appointments?scope=upcoming");
  const visits = useApi("/nurse/visits?scope=upcoming");
  const name = user?.profile?.name?.split(" ")[0];

  return (
    <PageShell title={name ? `Hello, ${name}` : "Hello"} subtitle="What would you like to do today?">
      <ul className="grid gap-4 md:grid-cols-3">
        {ACTIONS.map((a) => (
          <li key={a.to}>
            <Link to={a.to} className="block h-full rounded-2xl border border-line p-5 transition-colors hover:border-teal">
              <span className="font-display text-lg font-semibold">{a.title}</span>
              <span className="mt-1 block text-[16px] text-ink-soft">{a.text}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold">Coming up</h2>
          <Link to="/appointments" className="text-[15px] font-medium text-teal-deep underline underline-offset-4">
            All appointments
          </Link>
        </div>
        {appts.loading && <Loading />}
        <Alert>{appts.error}</Alert>
        {appts.data &&
          (appts.data.appointments.length === 0 ? (
            <Empty title="No upcoming appointments">
              <ButtonLink to="/query" className="mt-3">Find a doctor</ButtonLink>
            </Empty>
          ) : (
            <div className="space-y-3">
              {appts.data.appointments.slice(0, 3).map((a) => (
                <AppointmentCard key={a.id} appt={a} />
              ))}
            </div>
          ))}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold">Nurse visits</h2>
          <Link to="/nurse/visits" className="text-[15px] font-medium text-teal-deep underline underline-offset-4">
            All visits
          </Link>
        </div>
        {visits.loading && <Loading />}
        <Alert>{visits.error}</Alert>
        {visits.data &&
          (visits.data.visits.length === 0 ? (
            <p className="text-ink-soft">No nurse visits booked.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {visits.data.visits.slice(0, 3).map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-4">
                  <span className="font-medium">{v.service.name}</span>
                  <span className="text-ink-soft">
                    {formatDateTime(v.startsAt)} with {v.nurse.name}
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </section>
    </PageShell>
  );
}