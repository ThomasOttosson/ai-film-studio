import { FiFilm } from "react-icons/fi";

function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
      <a className="navbar-brand fw-bold d-flex align-items-center gap-2" href="/">
        <FiFilm />
        AI Film Studio
      </a>
    </nav>
  );
}

export default Navbar;