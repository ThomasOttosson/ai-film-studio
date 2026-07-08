import "./AppMenuBar.css";

function AppMenuBar() {
  return (
    <header className="app-menu-bar">

      <div className="app-menu-left">

        <div className="app-logo">
          🎬 AI Film Studio
        </div>

        <button>File</button>

        <button>Edit</button>

        <button>Project</button>

        <button>Generate</button>

        <button>View</button>

        <button>Tools</button>

        <button>Window</button>

        <button>Help</button>

      </div>

      <div className="app-menu-right">

        <span>Local Project</span>

      </div>

    </header>
  );
}

export default AppMenuBar;