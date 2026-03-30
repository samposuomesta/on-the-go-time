

## Plan: Add DNS prerequisite to Traefik/TLS section

**Change:** In `docs/Installation101.md`, add a prerequisite warning box just before the TLS proxy section (before line 600) telling users to configure their domain's DNS A record to point to their server's public IP before starting Docker with Traefik.

**Content to insert after line 599:**

```markdown
> **Prerequisites for HTTPS (Traefik / TLS proxy):**
>
> Before starting Docker with Traefik or any TLS proxy, your domain must already resolve to your server:
>
> 1. Add an **A record** for your domain (e.g. `timetrack.example.com`) pointing to your server's public IP
> 2. If using Studio subdomain, add an **A record** for `studio.timetrack.example.com` as well
> 3. Wait for DNS propagation — verify with:
>    ```bash
>    dig +short yourdomain.com
>    ```
>    The output must show your server IP. Let's Encrypt HTTP challenge will fail if DNS is not ready.
```

This goes right before the "Alternative: Official TLS proxy" heading so it applies to both the override file (Traefik) approach and the official Caddy/Nginx overlays.

