import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient, signIn } from "@/lib/auth/client";
import { GROK_PROVIDERS } from "@/lib/auth/providers";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = joining
      ? await authClient.signUp.email({ email, password, name: "Member", callbackURL: "/" })
      : await authClient.signIn.email({ email, password, callbackURL: "/" });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Could not log in.");
      return;
    }
    window.location.assign("/");
  };

  return (
    <div className="atlas">
      <header>
        <Link to="/" className="brand">
          Meaning Atlas
          <small>WORDS HOLD MORE THAN DEFINITIONS</small>
        </Link>
      </header>
      <main>
        <section className="form-panel">
          <span className="eyebrow">Join the archive</span>
          <h1>A user ID, not a name.</h1>
          <p className="intro">
            Log in and the tree shows your user ID on every account you add. Names are not placed on the branches.
          </p>
          <div className="row">
            {GROK_PROVIDERS.map((provider) => (
              <button key={provider.providerId} type="button" onClick={() => void signIn(provider.providerId, { callbackURL: "/" })}>
                Continue with {provider.label}
              </button>
            ))}
          </div>
          <form onSubmit={(event) => void submit(event)}>
            <label>
              Email
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={joining ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="status error">{error}</p> : null}
            <div className="row">
              <button className="primary" type="submit" disabled={busy}>
                {busy ? "Working…" : joining ? "Create account" : "Log in"}
              </button>
              <button type="button" onClick={() => setJoining((current) => !current)}>
                {joining ? "I already have an account" : "Create an account"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
