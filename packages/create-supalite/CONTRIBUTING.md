# Contributing to supalite

Thank you for your interest in contributing to supalite! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/supalite.git`
3. Install dependencies: `pnpm install`
4. Make your changes
5. Test your changes: `pnpm build`
6. Submit a pull request

## Development Setup

```bash
# Install dependencies
pnpm install

# Watch mode for development
cd packages/create-supalite
pnpm dev

# Build the package
pnpm build

# Test the CLI locally
node dist/cli.js test-app
```

## Project Structure

```
supalite/
├── packages/
│   └── create-supalite/     # Main CLI package
│       ├── src/             # Source code
│       │   ├── cli.ts       # Entry point
│       │   ├── prompts/     # User prompts
│       │   └── utils/       # Utility functions
│       └── template/        # Template files for generated projects
└── docs/                    # Documentation
```

## Guidelines

### Code Style

- Use TypeScript with strict mode
- Follow existing code patterns
- Keep functions small and focused
- Add comments for complex logic
- Use meaningful variable names

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 72 characters
- Add detailed description if needed

Examples:
```
Add support for yarn package manager
Fix migration retry logic for new projects
Update README with troubleshooting section
```

### Pull Requests

- Create a new branch for each feature/fix
- Reference any related issues
- Provide a clear description of changes
- Include screenshots/demos for UI changes
- Ensure the build passes: `pnpm build`

## What to Contribute

### Bug Reports

Found a bug? Please [open an issue](https://github.com/TimBrunsmo/supalite/issues) with:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behaviour
- Your environment (OS, Node version, package manager)
- Error messages or screenshots

### Feature Requests

Have an idea? [Open an issue](https://github.com/TimBrunsmo/supalite/issues) with:

- Clear description of the feature
- Why it would be useful
- Potential implementation approach (optional)

### Code Contributions

Areas where contributions are welcome:

- **Bug fixes**: Fix reported issues
- **Documentation**: Improve README, guides, or code comments
- **Tests**: Add unit or integration tests
- **Features**: Implement items from the roadmap or propose new ones
- **Template improvements**: Enhance the generated project template
- **Error handling**: Improve error messages and recovery
- **Performance**: Optimise CLI execution speed

## Template Changes

If you're modifying the template (`packages/create-supalite/template/`):

1. Test the generated project works correctly
2. Ensure all dependencies are compatible
3. Update `GUIDE.md` if patterns change
4. Consider backward compatibility

## CLI Changes

If you're modifying the CLI:

1. Test all user flows (automated setup, manual setup, errors)
2. Ensure proper error handling and user feedback
3. Test on multiple operating systems if possible
4. Verify the published package works: `npm pack` and test installation

## Release Process

Releases are managed by the maintainer. If you're interested in the process:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Build: `pnpm build`
4. Test: `npm pack` and verify contents
5. Publish: `npm publish`
6. Create GitHub release with tag

## Questions?

Feel free to [open an issue](https://github.com/TimBrunsmo/supalite/issues) with any questions about contributing.

## Code of Conduct

Be respectful and constructive. We're all here to build something useful together.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
