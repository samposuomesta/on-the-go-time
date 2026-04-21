# Slack App Manifest – TAika Reminders

Tämä dokumentti sisältää valmiin Slack App -manifestin, jolla luot **Bot Token** -integraation TimeTrack-sovellukseen.

## 1. Luo Slack App manifestista

1. Avaa [https://api.slack.com/apps](https://api.slack.com/apps)
2. Klikkaa **Create New App** → **From an app manifest**
3. Valitse workspace, johon haluat asentaa sovelluksen
4. Liitä alla oleva YAML-manifesti tekstikenttään ja klikkaa **Next** → **Create**

## 2. Manifesti (YAML)

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

### Oikeudet (scopes) – mihin niitä käytetään

| Scope | Käyttötarkoitus |
|-------|-----------------|
| `chat:write` | Viestien lähetys kanaviin ja DM:iin |
| `chat:write.customize` | Mukautetun nimen/ikonin käyttö viesteissä |
| `im:write` | DM-keskustelun avaaminen käyttäjän kanssa |
| `users:read` | Käyttäjätietojen luku (User ID -validointi) |
| `users:read.email` | Käyttäjien etsiminen sähköpostilla |

## 3. Asenna sovellus workspaceen

1. Avaa juuri luotu app → vasemmasta valikosta **Install App**
2. Klikkaa **Install to Workspace** → hyväksy oikeudet

## 4. Kopioi Bot User OAuth Token

1. **OAuth & Permissions** -sivulla kohdasta **Bot User OAuth Token**
2. Token alkaa merkeillä `xoxb-...`
3. Kopioi token leikepöydälle

## 5. Tallenna token TAika-sovellukseen

1. Kirjaudu **Hallintapaneeliin** ylläpitäjänä
2. Mene **Yritykset**-välilehdelle
3. Klikkaa **Muokkaa** haluamasi yrityksen kohdalla
4. **Slack Integration** -osiossa:
   - Liitä token kenttään **Slack Bot Token**
   - (Valinnainen) Aseta **Default Channel**, esim. `#general` – käytetään jos käyttäjällä ei ole Slack User ID:tä
5. Klikkaa **Tallenna**

## 6. Käyttäjien Slack User ID

Jokainen työntekijä syöttää oman Slack User ID:n itse:

1. **TAika** → **Asetukset** → **Slack User ID**
2. ID:n löytäminen Slackissa:
   - Avaa oma profiili
   - Klikkaa **⋯ More** -valikkoa
   - Valitse **Copy member ID** (muodossa `U01234ABCDE`)

Jos käyttäjällä on Slack User ID, muistutukset lähetetään hänelle henkilökohtaisena DM-viestinä. Muuten viesti menee yrityksen oletuskanavalle (jos asetettu).

## Vianetsintä

| Virhe | Ratkaisu |
|-------|----------|
| `not_authed` / `invalid_auth` | Token virheellinen tai poistettu Slackista. Luo uusi. |
| `channel_not_found` | Tarkista että kanavanimi alkaa `#`:lla ja botti on kutsuttu kanavaan (yksityiset kanavat). |
| `user_not_found` | Slack User ID väärin – tarkista että muoto on `U...`. |
| Viestit eivät tule yksityiseen kanavaan | Kutsu botti kanavaan: `/invite @TAika Reminders` |
