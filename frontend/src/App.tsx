import Navbar from "./components/Navbar";
import { useAuth } from "./auth/AuthContext";
import AuthPage from "./pages/AuthPage";

import { AIActionProvider } from "./features/ai/AIActionProvider";
import { AIActionResultBridge } from "./features/ai/AIActionResultBridge";
import { AIActionStatusPanel } from "./features/ai/AIActionStatusPanel";

import { AppRouter } from "./app/router";

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="min-vh-100 d-flex align-items-center justify-content-center">
        <div
          className="spinner-border"
          role="status"
          aria-label="Loading"
        />
      </main>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <AIActionProvider>
      <AIActionResultBridge />

      <div className="app-shell">
        <Navbar />
        <AppRouter />
      </div>

      <AIActionStatusPanel />
    </AIActionProvider>
  );
}

export default App;