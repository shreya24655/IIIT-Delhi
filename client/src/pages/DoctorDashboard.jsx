import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import AppointmentCard from "../components/AppointmentCard";
import { Alert, Empty, Loading, PageShell, Tabs } from "../components/ui";
import { dayKey, todayKey } from "../lib/format";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState("upcoming");
  const { data, error, loading } = useApi(`/appointments?scope=${scope}`);
  const profile = user?.profile;
  const pending = profile?.verificationStatus && profile.verificationStatus !== "VERIFIED";

  const all = data?.appointments ?? [];
  const today = all.filter((a) => dayKey(a.startsAt) === todayKey() && a.status === "CONFIRMED");

  return (
    <PageShell title={profile?.name ? `Dr. ${profile.name.replace(/^dr\.?\s+/i, "")}` : "Your appointments"} subtitle="Your schedule and consultations.">
      {pending && (
        <Alert tone="warn" className="mb-8" title="Your profile isn’t visible to patients yet">
          Patients can book you once your registration is verified. Your current status is{" "}
          {profile.verificationStatus.toLowerCase()}.
        </Alert>
      )}

      <Tabs
        value={scope}
        onChange={setScope}
        options={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
        ]}
      />

      <div className="mt-6 space-y-3">
        {loading && <Loading />}
        <Alert>{error}</Alert>

        {data && !loading && scope === "upcoming" && today.length > 0 && (
          <p className="rounded-xl bg-teal/10 px-4 py-3 font-medium text-teal-deep">
            {today.length} {today.length === 1 ? "appointment" : "appointments"} today
          </p>
        )}

        {data &&
          !loading &&
          (all.length === 0 ? (
            <Empty title={scope === "upcoming" ? "No upcoming appointments" : "No past appointments"}>
              {scope === "upcoming" && "Booked visits will show up here and in your notifications."}
            </Empty>
          ) : (
            all.map((a) => <AppointmentCard key={a.id} appt={a} role="DOCTOR" />)
          ))}
      </div>
    </PageShell>
  );
}