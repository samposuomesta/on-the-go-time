

## Update Prerequisites to Actual Latest Stable Versions

The previously proposed versions were outdated. Here are the corrected updates for `docs/Installation101.md`:

### Changes

**1. Prerequisites table** — update to current latest stable versions:

| Component | Old value | New value |
|-----------|-----------|-----------|
| Docker | 24+ | **29+** |
| Docker Compose | v2.20+ | **v2.40+** |
| Node.js | 20 LTS | **24 LTS** |

**2. Stack header** (line 4): Change `Node.js 20+` / `Node.js 22+` to `Node.js 24+`

**3. Node.js section**: Update install command to `setup_24.x`, mention codename "Krypton", supported until April 2028. Note that Node 22 is in maintenance mode and Node 18/20 are EOL.

**4. Docker install notes**: Mention Docker 29.x as the current stable release line with Compose v2.40 bundled.

**5. Update last-updated date** to `2026-03-27`.

### Technical Details
- Docker Engine 29.3.0 released 2026-03-05
- Docker Compose v2.40.3 available in Ubuntu 24.04 repos
- Node.js 24 entered LTS ("Krypton") on 2025-10-28, supported until April 2028
- Node.js 22 is in maintenance (ends October 2026)
- Node.js 18 and 20 are EOL

