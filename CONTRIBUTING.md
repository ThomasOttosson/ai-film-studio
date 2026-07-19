# Contributing

Thank you for contributing to AI Film Studio.

## Development setup

1. Clone the repository.
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Install backend dependencies:
   ```bash
   cd ../backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. Start the application using the project's documented development workflow.

## Pull requests

- Create a feature branch.
- Keep pull requests focused.
- Ensure CI passes.
- Add or update tests when appropriate.
- Update documentation if behavior changes.

## Code style

- Follow the project's existing formatting.
- Use meaningful commit messages.
- Avoid committing generated files or secrets.

## Reporting issues

Please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Logs or screenshots when relevant

## Security

Please do not disclose security vulnerabilities publicly.
See `SECURITY.md` for responsible disclosure instructions.