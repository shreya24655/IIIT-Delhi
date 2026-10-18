import { useState } from "react";
import useApi from "../hooks/useApi";
import AppointmentCard from "../components/AppointmentCard";
import { Alert, ButtonLink, Empty, Loading, PageShell, Tabs } from "../components/ui";

export default function Appointments() {
  const [scope, setScope] = useState("upcoming");
  const { data, error, loading } = useApi(`/appointments?scope=${scope}`);

  return (
    <PageShell
      title="My appointments"
      actions={<ButtonLink to="/query">Find a doctor</ButtonLink>}
    >
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
        {data &&
          !loading &&
          (data.appointments.length === 0 ? (
            <Empty title={scope === "upcoming" ? "Nothing booked yet" : "No past appointments"}>
              {scope === "upcoming" && "Describe how you feel and we’ll find doctors who can help."}
            </Empty>
          ) : (
            data.appointments.map((a) => <AppointmentCard key={a.id} appt={a} />)
          ))}
      </div>
    </PageShell>
  );
}