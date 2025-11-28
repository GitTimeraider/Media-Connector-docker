# Security Policy

## Supported Versions

Currently supported versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **DO NOT** open a public issue
2. Email the maintainers directly with details
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Security Best Practices

When using Media Connector:

1. **Use HTTPS** - Always run behind a reverse proxy with SSL/TLS
2. **Network Security** - Keep services on internal network when possible
3. **Authentication** - Enable authentication on your reverse proxy
4. **API Keys** - Protect your configuration files containing API keys
5. **Updates** - Keep the application and all integrated services updated
6. **Backups** - Regular backups of configuration files
7. **Access Control** - Limit who can access the web interface

## Secure Configuration

```yaml
# Example reverse proxy configuration with authentication
# (nginx example)
location / {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Known Security Considerations

- Configuration files contain API keys and should be protected
- Default configuration has no authentication (use reverse proxy)
- All service communications use the configured protocols (HTTP/HTTPS)

Thank you for helping keep Media Connector secure!
