# Accessibility Statement

AI Film Studio is committed to making its product and documentation accessible to as many people as possible.

## Accessibility Goals

We aim to:

- Follow WCAG 2.2 Level AA where practical.
- Support keyboard-only navigation.
- Provide visible focus indicators.
- Maintain sufficient colour contrast.
- Use semantic HTML and accessible labels.
- Support common screen readers.
- Avoid relying on colour alone to communicate meaning.
- Provide text alternatives for meaningful images and controls.
- Respect reduced-motion preferences.

## Product Development

Accessibility should be considered during design, implementation, review, and testing.

New user-facing features should include:

- Keyboard interaction testing
- Focus-order verification
- Screen-reader label checks
- Colour-contrast checks
- Responsive zoom testing
- Automated accessibility scanning
- Manual review of critical workflows

## Critical Workflows

The following workflows receive priority:

- Authentication
- Project creation and navigation
- Timeline and editor controls
- Media upload and management
- Rendering and export
- Realtime collaboration
- Error messages and recovery flows

## Known Limitations

Complex visual editing interfaces can present accessibility challenges. Some timeline, drag-and-drop, canvas, preview, or media-editing interactions may require additional accessible alternatives.

Known limitations should be documented in the issue tracker and prioritised according to user impact.

## Reporting Accessibility Issues

Accessibility issues should be reported through the repository's bug-report process.

Reports should include, where possible:

- The affected page or feature
- Steps to reproduce
- Browser and operating system
- Assistive technology used
- Expected and actual behaviour
- Screenshots or recordings that do not expose sensitive information

Accessibility reports should be labelled and triaged promptly.

## Compatibility

The application should be tested with supported browsers and representative assistive technologies. Compatibility requirements are defined in `docs/BROWSER_SUPPORT.md`.

## Continuous Improvement

Accessibility is an ongoing responsibility. The team should review accessibility:

- Before major releases
- After significant interface changes
- When supported browser requirements change
- When users report barriers
- During periodic product-quality audits