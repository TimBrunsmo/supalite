# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in supalite, please report it responsibly:

### DO NOT

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it's been addressed

### DO

1. **Report via GitHub**: [Open a security advisory](https://github.com/TimBrunsmo/supalite/security/advisories/new) with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

2. **Response Time**: You can expect:
   - Initial response within 48 hours
   - Status update within 7 days
   - Fix timeline based on severity

3. **Disclosure**: Once the vulnerability is fixed:
   - You'll be notified
   - A security advisory will be published
   - Credit will be given (if desired)

## Security Considerations

### Credentials Handling

supalite handles sensitive credentials during setup:

- **Service Role Key**: Used only during setup, never stored in the generated project
- **Anon Key**: Stored in `.env.local` (gitignored by default)
- **Database Password**: Used only for migrations, never stored

### Best Practices

When using supalite-generated projects:

1. **Environment Variables**
   - Never commit `.env.local` to version control
   - Use different credentials for development and production
   - Rotate keys if accidentally exposed

2. **Row Level Security (RLS)**
   - Keep RLS enabled on all tables (enabled by default)
   - Test RLS policies thoroughly
   - Never bypass RLS in production code

3. **Authentication**
   - Use Supabase's built-in auth features
   - Enable email verification in production

4. **API Keys**
   - The anon key is safe to expose in client-side code
   - Never expose the service role key in client code
   - Store service role key in environment variables only

## Known Limitations

- The CLI temporarily stores credentials in memory during setup
- Debug logs may contain project references (but not keys)

## Security Updates

Security updates will be released as patch versions (0.1.x) and announced via:
- GitHub Security Advisories
- Release notes
- README updates

## Responsible Disclosure

We appreciate security researchers who report vulnerabilities responsibly. We commit to:

- Acknowledge your report within 48 hours
- Keep you informed of our progress
- Credit you in the security advisory (if desired)
- Work with you to understand and resolve the issue

Thank you for helping keep supalite and its users safe!
