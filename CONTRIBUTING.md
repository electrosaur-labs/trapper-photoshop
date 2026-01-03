# Contributing to Trapper for Photoshop

Thank you for your interest in contributing to Trapper for Photoshop! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Adobe Photoshop 2024 (v24.0.0) or later
- Node.js 14+ and npm
- UXP Developer Tool (for testing)
- Git

### Setting Up Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/trapper-photoshop.git
   cd trapper-photoshop
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/electrosaur-labs/trapper-photoshop.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Build the plugin:**
   ```bash
   npm run build
   ```

6. **Load in Photoshop:**
   - Open UXP Developer Tool
   - Click "Add Plugin"
   - Select `manifest.json` from the repository
   - Click "Load"

## Development Workflow

### Running in Development Mode

```bash
npm run dev
```

This starts webpack in watch mode, automatically rebuilding when you make changes.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Code Style

- Use ES6+ JavaScript features
- Follow existing code formatting
- Add JSDoc comments for functions and classes
- Keep functions focused and testable

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write clear, focused commits
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes:**
   - Run unit tests: `npm test`
   - Test manually in Photoshop with various documents
   - Test with different document sizes and color counts

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add feature: description of feature"
   ```

   **Commit message guidelines:**
   - Use present tense ("Add feature" not "Added feature")
   - Be descriptive but concise
   - Reference issues if applicable (e.g., "Fixes #123")

5. **Keep your fork updated:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request:**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Fill out the PR template with details about your changes

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows existing style and conventions
- [ ] All tests pass (`npm test`)
- [ ] New tests added for new functionality
- [ ] Documentation updated (README, code comments, etc.)
- [ ] Commit messages are clear and descriptive
- [ ] No console.log statements left in code (use proper logging)
- [ ] Plugin tested manually in Photoshop

### PR Description Should Include

- **What**: Brief description of changes
- **Why**: Reason for the changes (fix bug, add feature, etc.)
- **How**: Technical details of implementation
- **Testing**: How you tested the changes
- **Screenshots**: If UI changes, include before/after screenshots
- **Related Issues**: Reference any related issues

## Types of Contributions

### Bug Reports

When reporting bugs, please include:
- Photoshop version
- Operating system
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages or logs
- Sample PSD file if applicable (use small test files)

### Feature Requests

When suggesting features:
- Describe the problem you're trying to solve
- Explain your proposed solution
- Consider alternative approaches
- Note any potential drawbacks or limitations

### Code Contributions

Priority areas for contribution:
- Bug fixes
- Performance improvements
- Test coverage
- Documentation improvements
- UI/UX enhancements
- Additional trap size formats
- Error handling improvements

## Architecture Guidelines

### Project Structure

```
src/
├── index.js              # Plugin entry point
├── index.html            # Modal dialog UI
├── core/
│   ├── TrapperController.js  # Main controller
│   └── TrappingEngine.js     # Core algorithms
├── api/
│   └── PhotoshopAPI.js   # Photoshop API wrapper
└── utils/
    └── TrapSizeParser.js # Trap size utilities
```

### Key Design Principles

1. **Separation of Concerns**
   - Core algorithms isolated from Photoshop API
   - UI logic separate from business logic
   - Utilities are pure functions when possible

2. **Error Handling**
   - Fail fast with clear error messages
   - Validate inputs early
   - Provide actionable error messages to users

3. **Algorithm Consistency**
   - Maintain compatibility with [Trapper Java application](https://github.com/electrosaur-labs/trapper)
   - Core trapping algorithm should produce identical results

4. **Performance**
   - Use progress callbacks for long operations
   - Process large documents efficiently
   - Avoid blocking the UI

### Testing Guidelines

- Write unit tests for utilities (TrapSizeParser, etc.)
- Test edge cases (0 colors, 1 color, max colors)
- Test various trap size formats
- Test error conditions
- Keep tests fast and focused

### Documentation

- Add JSDoc comments to all public functions
- Update README.md for user-facing changes
- Update inline comments for complex algorithms
- Keep CLAUDE.md updated for architecture changes

## Relationship with Parent Project

This plugin is a port of the [Trapper Java application](https://github.com/electrosaur-labs/trapper). When making changes to core trapping algorithms:

1. **Reference the Java implementation** for algorithm correctness
2. **Maintain consistency** with the Java version where possible
3. **Document differences** when Photoshop API requires different approach
4. **Consider proposing changes** to both projects for consistency

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/electrosaur-labs/trapper-photoshop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/electrosaur-labs/trapper-photoshop/discussions)
- **Parent Project**: [Trapper Java Application](https://github.com/electrosaur-labs/trapper)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Project documentation for major features

Thank you for contributing to Trapper for Photoshop! 🎨
