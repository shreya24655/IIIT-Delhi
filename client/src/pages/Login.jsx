import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, Button, Input, PageShell } from "../components/ui";

const DEMOS = [
  { label: "Demo patient", email: "patient@healthbridge.demo" },
  { label: "Demo doctor", email: "demo.doctor1@healthbridge.demo" },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password); // RedirectIfAuthed moves us on
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  function fillDemo(demoEmail) {
    setEmail(demoEmail);
    setPassword("Demo@1234");
  }

  return (
    <PageShell title="Log in" subtitle="Welcome back." narrow>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Alert>{error}</Alert>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" loading={busy} disabled={!email || !password} className="w-full">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-ink-soft">
        New here?{" "}
        <Link to="/register" className="font-medium text-teal-deep underline underline-offset-4">
          Create a patient account
        </Link>{" "}
        or{" "}
        <Link to="/doctor/register" className="font-medium text-teal-deep underline underline-offset-4">
          register as a doctor
        </Link>
        .
      </p>

      <div className="mt-10 rounded-2xl border border-line p-5">
        <p className="font-medium">Trying the demo?</p>
        <p className="mt-1 text-[15px] text-ink-soft">These are sample accounts with made-up data.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {DEMOS.map((d) => (
            <Button key={d.email} variant="outline" onClick={() => fillDemo(d.email)}>
              {d.label}
            </Button>
          ))}
        </div>
      </div>
    </PageShell>
  );
}