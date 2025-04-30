
# WORKFLOW.md

## 🔒 IMPORTANT: WORKFLOW PROTECTION PROTOCOL 🔒

This file is critical project documentation. Changes require:
1. Explicit user confirmation before deletion
2. Version backup before major changes
3. Verification code for structural changes: "PROTECT-WORKFLOW"

## Development Philosophy

### First Principles Thinking
Following Elon Musk's 5 principles of fundamental thinking:
1. **Question every requirement** - Ask "why?" until you reach first principles
2. **Reason from first principles, not by analogy** - Build understanding from foundational truths
3. **Apply both convergent and divergent thinking** - Explore widely, then focus narrowly
4. **Actively seek and consider critical feedback** - Embrace criticism to strengthen your ideas
5. **Iterate rapidly with continuous improvement** - Move fast, learn, adjust, repeat

### Zoom In, Zoom Out Framework
- **Zoom Out**: Maintain high-level perspective on project goals and architecture
- **Zoom In**: Focus intensely on implementation details when coding
- **Regular Perspective Shifting**: Alternate between detailed and broad views to maintain alignment

## Development Workflow

1. **Create a feature branch** for any new feature or fix.
2. **Write code and corresponding unit tests** in `/tests`.
3. **Update requirements.txt** if new dependencies are needed.
4. **Update documentation** (README.md, PLANNING.md, TASKS.md).
5. **Push to GitHub and test on Lovable**.
6. **Mark tasks as complete in TASKS.md**.
7. **Perform code reviews and merge to main** when stable.

## Deployment

- Push to `main` triggers Lovable deployment.
- Check Lovable logs for errors after each push.
- Roll back if critical errors are detected.

## Documentation Maintenance

### Regular Maintenance
- After every 10–15 completed tasks, move them from TASKS.md to CHANGELOG.md.
- Review and update README.md, PLANNING.md, and WORKFLOW.md at the end of each sprint or major change.
- Remove or archive deprecated code and documentation.

### Document Organization
- **README.md**: Project overview, setup instructions, environment variables
- **PLANNING.md**: Vision, architecture, development phases
- **TASKS.md**: Current and upcoming tasks, organized by category
- **CHANGELOG.md**: Completed tasks and changes, organized by version/date
- **WORKFLOW.md**: Process documentation, best practices, philosophical approaches

### Version Control
- All documentation changes should be committed with clear, descriptive messages.
- Major documentation updates should be reviewed by at least one team member.

## Best Practices

- Keep `/tests` up to date.
- Keep all planning and workflow docs current.
- Remove unused files and dependencies regularly.
- Use environment variables for secrets and configuration.
- Store API keys and credentials as secrets in Supabase, never in code.
- Follow consistent naming conventions across the codebase.

---

**Refer to this document for onboarding and process consistency.**

