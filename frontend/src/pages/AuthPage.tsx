import { useState, type FormEvent } from "react";
import axios from "axios";
import { FiFilm } from "react-icons/fi";
import { useAuth } from "../auth/AuthContext";

type AuthMode = "login" | "register";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }
  }

  return "Something went wrong. Please try again.";
}

function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const credentials = { email, password };

      if (mode === "login") {
        await login(credentials);
      } else {
        await register(credentials);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode() {
    setMode((currentMode) =>
      currentMode === "login" ? "register" : "login"
    );
    setError("");
  }

  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center bg-dark px-3 py-5">
      <section className="card shadow-lg border-0" style={{ maxWidth: 460, width: "100%" }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <FiFilm size={42} className="mb-3" />
            <h1 className="h3 fw-bold">AI Film Studio</h1>
            <p className="text-secondary mb-0">
              {mode === "login"
                ? "Sign in to continue to your studio."
                : "Create an account to save your projects."}
            </p>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                required
              />
              <div className="form-text">Minimum 8 characters.</div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-link w-100 mt-3"
            onClick={switchMode}
            disabled={isSubmitting}
          >
            {mode === "login"
              ? "Need an account? Register"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;