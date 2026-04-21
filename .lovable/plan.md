

## Slack App Manifest – nimi "TAika Reminders"

Luon Slack App -manifestin Bot Token -integraatiota varten käyttäen nimeä **TAika Reminders** alkuperäisen "TimeTrack Reminders" sijaan.

### Mitä tehdään

1. **Uusi tiedosto**: `docs/slack-app-manifest.md`
   - Valmis YAML-manifesti (kopioi & liitä Slackiin)
   - Asennusohjeet suomeksi
   - Bot Tokenin tallennusohje hallintapaneeliin

2. **Pieni UI-lisäys**: `src/pages/AdminDashboard.tsx`
   - Linkki "Slack App -ohjeet" `slack_bot_token`-kentän alle EditCompanyDialogissa
   - Avaa `docs/slack-app-manifest.md` uuteen välilehteen

### Manifestin sisältö (YAML, versio 2)

```yaml
display_information:
  name: TAika Reminders
  description: Sends time tracking reminders and notifications
  background_color: "#1f2937"
features:
  bot_user:
    display_name: TAika Reminders
    always_online: true
oauth_config:
  scopes:
    bot:
      - chat:write
      - chat:write.customize
      - im:write
      - users:read
      - users:read.email
settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

### Asennusohje (sisältyy dokumenttiin)

1. Avaa `https://api.slack.com/apps` → **Create New App** → **From an app manifest**
2. Valitse workspace → liitä YAML → **Create**
3. **Install to Workspace** → hyväksy oikeudet
4. **OAuth & Permissions** → kopioi **Bot User OAuth Token** (`xoxb-…`)
5. Hallintapaneeli → Yritykset → Muokkaa → liitä **Slack Bot Token** + aseta **Default Channel** (esim. `#general`)
6. Käyttäjät syöttävät **Slack User ID:n** Asetuksissa (Slack: profiili → ⋯ → *Copy member ID*)

### Muokattavat tiedostot

- **Uusi**: `docs/slack-app-manifest.md`
- **Muokataan**: `src/pages/AdminDashboard.tsx` (ohjelinkki tokenin alle)

