import Navbar from "./components/Navbar";
import { useAuth } from "./auth/AuthContext";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border" role="status" aria-label="Loading" />
      </main>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <Dashboard />
    </div>
  );
}

export default App;