import { FiFilm, FiLogOut } from "react-icons/fi";
import { useAuth } from "../auth/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar navbar-dark navbar-custom px-4">
      <div className="container-fluid px-0">
        <a
          className="navbar-brand fw-bold d-flex align-items-center gap-2"
          href="/"
        >
          <FiFilm />
          AI Film Studio
        </a>

        <div className="d-flex align-items-center gap-3 ms-auto">
          {user?.email && (
            <span className="text-light small d-none d-md-inline">
              {user.email}
            </span>
          )}

          <button
            type="button"
            className="btn btn-outline-light btn-sm d-flex align-items-center gap-2"
            onClick={logout}
          >
            <FiLogOut />
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;