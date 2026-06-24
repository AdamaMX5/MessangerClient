# MessengerClient

Dieser Client ist in Anlehnung zu Discord und spielt mit dem Virtuellen Office als cleane Version zusammen.

## Architecture
See @../../.claude/MSArchitecture/VirtualOfficeServer.md für den Zwischenlayer-Server (Presence WebSocket).
See @../../.claude/MSArchitecture/AuthService.md für AuthService details (JWT verification, GITCLIENT role).
See @../../.claude/MSArchitecture/ProfileService.md für ProfileService details (Profile von userids).
See @../../.claude/MSArchitecture/ObjectService.md für ObjectService details (Persistenz).
See @../../.claude/MSArchitecture/MediaService.md für MediaService details (Bilder und Videos ).
See @../../.claude/MSArchitecture/EmailService.md für EmailService details (Sende Nachfragen zum Issue-Ersteller).
See @../../.claude/MSArchitecture/ExceptionService.md für ExceptionService details (Sende Fehlerfälle).
See @../../.claude/MSArchitecture/MessageService.md für MessageService details (Nachrichten zu anderen Usern).
See @../../.claude/MSArchitecture/RecordingService.md für RecordingService details (Serverseitige Aufnahmen von LiveKit Meetings).
See @../../.claude/MSArchitecture/GitService.md für GitService details (Issue creation)

## Quick Start

```bash
npm install      # einmalig
npm run dev      # Entwicklungsserver → http://localhost:5173
npm run build    # Produktions-Build (TypeScript + Vite)
```

## Login

Der Login läuft über den echten **AuthService** (`src/services/authService.ts`),
nicht mehr über hartkodierte Mock-Logins. Der Flow ist email-first:

1. `checkEmail(email)` — entscheidet, ob ein Account existiert (Login) oder neu
   registriert werden muss (Check-E-Mail / klassische Registrierung).
2. `login(email, password)` — liefert ein Access-Token (siehe „Token-Modell").
3. `registerComplete(...)` — schließt die Registrierung eines neuen Accounts ab.

## Token-Modell

- **Access-Token** wird ausschließlich **in-memory** gehalten (`src/services/tokenStore.ts`),
  niemals in `localStorage`/`sessionStorage` (XSS-Schutz).
- **Refresh** läuft über ein **HttpOnly-Cookie** plus separates **CSRF-Cookie**;
  der Client liest weder das eine noch das andere direkt aus.
- Der Access-Token wird per **Auto-Refresh alle 10 Minuten** erneuert
  (Timer in `AppContext`), sodass die Session ohne Re-Login bestehen bleibt.
- `src/services/httpClient.ts` hängt den Access-Token als `Authorization`-Header
  an und stößt bei `401` einen Refresh-Versuch an.

## Technologie-Stack

| Paket | Version | Zweck |
|-------|---------|-------|
| React | 18 | UI-Framework |
| TypeScript | 5 | Typsicherheit |
| Vite | 5 | Build-Tool & Dev-Server |
| TailwindCSS | 3 | Styling |
| react-router-dom | 6 | Routing (`/login` und `/`) |
| lucide-react | 0.441 | Icons |

## Tailwind-Farbtokens

Alle Farben sind unter dem Namespace `discord` definiert (`tailwind.config.js`):

| Token | Hex | Klasse (Beispiel) |
|-------|-----|-------------------|
| `sidebar` | `#202225` | `bg-discord-sidebar` |
| `channels` | `#2F3136` | `bg-discord-channels` |
| `chat` | `#36393F` | `bg-discord-chat` |
| `input` | `#40444B` | `bg-discord-input` |
| `text` | `#DCDDDE` | `text-discord-text` |
| `muted` | `#72767D` | `text-discord-muted` |
| `blurple` | `#5865F2` | `bg-discord-blurple` |
| `green` | `#3BA55C` | `bg-discord-green` |
| `yellow` | `#FAA61A` | `text-discord-yellow` |
| `red` | `#ED4245` | `bg-discord-red` |
| `gray` | `#747F8D` | `bg-discord-gray` |
| `hover` | `#34373C` | `hover:bg-discord-hover` |
| `active` | `#3C3F45` | `bg-discord-active` |

## Projekt-Struktur

```
src/
├── types/index.ts          # Alle TypeScript-Interfaces
├── data/mockData.ts        # Nur noch MOCK_USERS (statische Nutzerliste, siehe „Bekannte Lücken")
├── store/
│   ├── AppContext.tsx       # Globaler State + Actions (React Context)
│   ├── dmHelpers.ts         # Reine Helfer für DMs (toUiMessage, deriveConversations, buildMessage)
│   └── spacesHelpers.ts     # Mapping ObjectService-Objekte → UI (groupChannels, toSpace, toForumPost)
├── services/                # Echte API-Clients (keine Stubs mehr)
│   ├── httpClient.ts        # fetch-Wrapper: Auth-Header, 401-Refresh, JSON
│   ├── tokenStore.ts        # In-memory Access-Token (kein localStorage)
│   ├── authService.ts       # AuthService: checkEmail/login/registerComplete/refresh
│   ├── profileService.ts    # ProfileService (GraphQL): globalProfile(userId)
│   ├── messageService.ts    # MessageService: DMs (inbox/sent/send)
│   ├── objectService.ts     # ObjectService: Collections (spaces/channels/forum-posts)
│   ├── mediaService.ts      # MediaService: Avatar-Upload
│   └── gitService.ts        # GitService: Issue-Erstellung
├── components/
│   ├── auth/LoginPage.tsx  # Email-first Login + klassisches Registrierungsmodal
│   ├── layout/             # AppSidebar, ChannelSidebar, TopBar, UserListPanel
│   ├── chat/               # MessageBubble, ChatArea, MessageInput
│   ├── channels/           # Je ein View pro Channel-Typ (7 Typen)
│   └── common/             # Avatar, StatusBadge
└── views/
    ├── AuthView.tsx         # Wrapper für Login
    └── ChatView.tsx         # Haupt-Layout: ordnet alle Layout-Komponenten an
```

## Channel-Typen

| Typ | Komponente | Eingabe | Beschreibung |
|-----|-----------|---------|-------------|
| `text` | ChatArea + MessageInput | ✅ | Standard-Textnachrichten |
| `announcement` | AnnouncementView | ❌ | Read-only Ankündigungen |
| `forum` | ForumView | ✅ (in Posts) | Thread-basierte Diskussionen |
| `faq` | FaqView | ❌ | Accordion-FAQ |
| `onboarding` | OnBoardingView | ❌ | Schritt-für-Schritt-Checkliste |
| `voice` | VoiceRoomView | ❌ | Sprachraum mit Teilnehmerliste |
| `video` | VideoRoomView | ❌ | Videoraum mit Kamera-Kacheln |
| `stage` | StageView | ❌ | Bühne mit Sprecher/Publikum-Trennung |

## Datenmodell ObjectService

Spaces, Channels und Forum-Posts werden als **Collections** im **ObjectService**
persistiert (`src/services/objectService.ts`):

- `spaces` — ein Objekt pro Space
- `channels` — ein Objekt pro Channel; jedes Channel-Objekt trägt einen
  `categoryName`. **Kategorien sind keine eigene Collection** — sie werden
  client-seitig aus `channels[].categoryName` gruppiert (`groupChannels` in
  `spacesHelpers.ts`).
- `forum-posts` — ein Objekt pro Forum-Post.

## Nutzer

Die einzige verbleibende statische Datenquelle ist `MOCK_USERS` in
`src/data/mockData.ts` (10 Demo-Nutzer `u1`–`u10`). Grund siehe „Bekannte Lücken".

## Neue Channels/Spaces hinzufügen

Spaces und Channels werden **nicht mehr in `mockData.ts`** gepflegt, sondern über
die ObjectService-Collections `spaces` bzw. `channels` (anlegen via
`objectService.ts`). Ein Channel-Objekt braucht mindestens: `id`, `spaceId`,
`name`, `type`, `categoryName`, `isEncrypted`, `isPublic`, `memberIds`.

## Bekannte Lücken

- **Keine Nutzerliste in ProfileService**: ProfileService kann nur einzelne
  Profile (`globalProfile(userId)`) auflösen, nicht alle Nutzer aufzählen. Daher
  bleibt `MOCK_USERS` als statische Demo-Liste bestehen, bis es einen
  entsprechenden Endpoint gibt.
- **Presence nur für eigenen Nutzer**: Nur der eigene Online-Status ist real;
  fremde Nutzer defaulten auf `'offline'`.
- **Channel-Mitgliedschaft server-seitig erzwungen** (Issue #6): Lese-/Schreib-
  zugriff auf Channel-Nachrichten **und** die Verwaltung der Mitgliedschaft
  laufen über den **MessageService**, der die ACL durchsetzt (`sub ∈ memberIds`
  für Inhalte; ChannelAdmin/Service-Admin/Self für Mitgliederverwaltung). Der
  Client nutzt dafür `src/services/channelMembershipService.ts` (Mitglieder
  laden/hinzufügen/entfernen, Admins ernennen/degradieren, selbst verlassen) und
  schreibt `channels.data.memberIds`/`adminIds` **nicht mehr direkt** — der
  MessageService persistiert die Änderung server-seitig via `X-API-Key`.
- **ObjectService-ACL für `spaces`/`channels` server-seitig erzwungen** (Issue #6,
  vormals Lücke): Der ObjectService unterstützt jetzt **Klassen-/Namespace-ACL**
  (`readRoles`/`writeRoles`/`editRoles`) **und** **Member-Level-ACL**
  (`membershipField: "memberIds"` → prüft `sub ∈ data.memberIds` bei Read/Edit,
  List/Search wird server-seitig auf Member + `isPublic` gefiltert). Das ersetzt
  das frühere rein UI-seitige Gating: Anlegen/Ändern von Space-/Channel-Objekten
  ist rollen-gegated, private Channels sind server-seitig (nicht nur in der UI)
  verborgen. **Wichtig — Identität:** Der Client setzt `currentUser.id = JWT.sub`
  (`AppContext.decodeJwtPayload`) und schreibt genau diesen Wert in `memberIds`,
  passend zur `sub`-Prüfung von ObjectService **und** MessageService.
  **Aktivierung (Ops, kein Client-Code):** Admin registriert die Klassen einmalig
  via `POST /admin/classes` für `spaces`/`channels` und legt für member-gegatete
  Collections einen Data-Index auf `memberIds` an (`POST /admin/indexes`).

## State-Management

`AppContext` verwaltet:
- `currentUser` — eingeloggter Nutzer
- `activeSpaceId / activeChannelId / activeConversationId` — Navigation
- `sendDM / sendChannelMessage` — Nachrichten lokal hinzufügen
- `joinVoiceChannel / leaveVoiceChannel` — Teilnehmer-Listen

## Backend-Anbindung

Die `services/`-Clients sind angebunden (keine Stubs mehr) und ersetzen die
frühere Mock-Logik in `AppContext`:
- `authService.ts` → AuthService (Login/Refresh)
- `messageService.ts` → MessageService (DMs + Channel-Textnachrichten)
- `profileService.ts` → ProfileService (GraphQL)
- `objectService.ts` → ObjectService (Spaces/Channels/Forum-Posts; keine Nachrichten mehr)
- `mediaService.ts` → MediaService (Avatar-Upload)
- `gitService.ts` → GitService (Issue-Erstellung)
- `e2eService.ts` → ProfileService (ChatProfil: publicKey + Key-Backup) + ObjectService (`channel-keys`)
- `meetingService.ts` → LiveKit / RecordingService (noch nicht aktiv genutzt)

## Ende-zu-Ende-Verschlüsselung (Issue #8, Teil 1)

Client-seitiger E2E-Layer auf Basis von **tweetnacl** (`src/services/crypto/`):

- **Persönliches Keypair** (`nacl.box`, X25519): `publicKey` **und** das
  PBKDF2-SHA256 (600k Iter.) + AES-GCM-verschlüsselte Backup liegen im
  **ChatProfil** des Nutzers (ProfileService `MessangerProfile`, eigener
  Profil-Write) — bewusst dort statt im GlobalProfile, damit andere Apps (z.B.
  VirtualOffice) den `publicKey` cross-app lesen können. Backup-Passwort =
  **Login-Passwort**. Der `secretKey` lebt nur **in-memory** (`e2eKeyStore`, wie
  `tokenStore`) und wird beim Logout gewiped.
- **DMs**: `nacl.box` mit **ephemerem Absender-Keypair pro Nachricht** (Forward
  Secrecy). Body = getaggter Base64-Envelope `e2e:1:<base64(json)>`.
- **Channels**: symmetrischer Gruppenkey (`nacl.secretbox`, AES-256-Äquivalent),
  je Mitglied an dessen `publicKey` gewrappt in Collection `channel-keys`
  (ref `{ channelId, userId }`). Envelope trägt `keyVersion` (`kv`).
- **Defensiv/feature-geflaggt**: Fehlt ein `publicKey`-Feld, eine Collection oder
  ein Key, fällt jeder Pfad auf **Klartext** zurück — die App bleibt nutzbar.
  Tests: `src/services/crypto/*.test.ts` (vitest, `npm test`).

### Threat-Model / bewusste Grenzen (Teil 1)

- **Fail-open-Downgrade** (Issue #12, sichtbar gemacht): Ist ein Key nicht
  verfügbar/Session locked, wird weiterhin **unverschlüsselt** gesendet — aber
  nicht mehr stillschweigend. Indikatoren:
  - **Pro Nachricht** ein grünes Schloss (`Message.encrypted`). Der Flag ist
    **fälschungssicher**: er wird aus dem **erfolgreichen Entschlüsseln**
    abgeleitet (`decryptDmBody`/`decryptChannelBody` liefern `{ text, encrypted }`,
    `encrypted` nur bei real geöffnetem Envelope) — nicht aus dem Tag-Präfix. Ein
    Klartext, der wörtlich mit `e2e:1:` beginnt, erhält **kein** Schloss.
  - **Channel-Header**: grünes Schloss nur, wenn ein **Gruppenkey geladen** ist
    (`channelE2EReady(channelId)`, gespeist aus `prepareChannelKeys`) — nicht
    schon bei bloß entsperrter Sitzung; sonst gelbes offenes Schloss.
  - **DM-Header**: grün/gelb je `e2eUnlocked` (DMs nutzen `nacl.box`).
  - **Warnzeile** über dem Eingabefeld, wenn ein verschlüsselter Channel keinen
    Key hat bzw. die DM-Sitzung gesperrt ist.
  Das *Fehlen* des Schlosses an einer Nachricht ist das eigentliche
  Downgrade-Signal. Tests: `src/services/crypto/messageCrypto.test.ts`.
- **Absender-Authentizität** (Issue #13, bewertet): `nacl.box` mit ephemerem Key
  authentifiziert den Absender nicht — die Vertrauenswürdigkeit von `senderId`
  kommt aus dem server-seitig JWT-geprüften MessageService (`senderId = JWT.sub`),
  nicht aus der Krypto. **Bewertung:** Eine zusätzliche kryptografische
  Absender-Bindung (z.B. `nacl.sign`/Ed25519-Signatur über den Ciphertext mit
  einem zweiten, langlebigen Signing-Key) ist **bewusst zurückgestellt**: sie
  bräuchte ein zweites Schlüsselpaar inkl. Backup/Verteilung, hebt die
  Deniability auf und bringt im internen Bedrohungsmodell (ein extern unfälschbarer
  JWT-`sub` als Vertrauensanker) wenig Mehrwert. Bei Öffnung nach außen neu bewerten.
- **publicKey-Vertrauen** (Issue #13, gehärtet): Empfänger-`publicKey` wird jetzt
  **TOFU-gepinnt** (`src/services/crypto/keyPinning.ts`): beim ersten Sehen
  gepinnt (localStorage — öffentliche Keys, keine Secrets; **pro lokalem
  Login-User namespaced**, kein Cross-User-Sharing). Verschlüsselt wird stets an
  den **gepinnten** Key (`e2eService.trustedKeyFor`) — eine spätere
  Server-Substitution greift damit ins Leere (nur der ursprünglich vertraute
  Empfänger kann lesen), nicht nur Warnung. Bei Key-Wechsel zeigt die UI eine
  **Warnung**; der Nutzer muss den neuen Key nach Out-of-Band-Verifikation des
  lesbaren **Fingerprints** (`fingerprint.ts`, SHA-256/128-bit, im DM via
  `KeyVerificationNotice`) explizit **bestätigen** (`acceptKeyChange` → re-pin).
  **Restrisiko:** Beim allerersten Kontakt wird dem ProfileService vertraut
  (TOFU-Baseline); ein Mid-Session-Key-Wechsel wird wegen des Session-Caches erst
  beim nächsten Login erkannt (Vertraulichkeit bleibt aber durch das Pinning
  gewahrt); XSS könnte Pins überschreiben (degradiert nur auf No-Pinning, kein
  Secret-Leak). Tests: `keyPinning.test.ts`, `fingerprint.test.ts`.
- **Key-Rotation bei Mitgliederwechsel** (Issue #11, implementiert): Add/Remove
  im `ChannelMembersModal` löst — sofern der Akteur Channel-Admin ist und der
  Channel verschlüsselt — eine Rotation aus (`e2eService.rotateForMembership`):
  neue Version = max(vorhandene)+1, nur für die resultierende Mitgliederliste
  gewrappt. Alte Versionen bleiben lesbar (Historie); entfernte Mitglieder
  erhalten die neue Version nie (Backward-Secrecy), neu hinzugefügte lesen ab der
  neuen Version. **Verbleibende Grenzen:** (a) Rotation braucht einen online
  Channel-Admin-Client — bei Self-Leave oder Aktion durch einen Nicht-Admin
  (z.B. Channel-Assistent) bleibt sie **ausstehend**, bis ein Admin online ist
  (UI-Hinweis); (b) ein hinzugefügtes Mitglied ohne publizierten `publicKey` wird
  beim Wrappen übersprungen (Hinweis im UI) und liest erst nach eigener
  Key-Provisionierung + erneuter Rotation.

**Aktivierung (Ops, kein Client-Code):**
- **Unique-Index auf `channel-keys`** über das abgeleitete Einzelfeld
  `data.vkey` (`"channelId:userId:version"`): `POST /admin/indexes
  { "field": "vkey", "unique": true }`. Der Client schreibt `vkey` bei jedem
  Key-Dokument; da die ObjectService-Index-API nur ein einzelnes `field` kennt,
  bündelt `vkey` die drei Bestandteile in einen indexierbaren Wert. Die Version
  wird client-seitig als `max(vorhandene)+1` bestimmt; der Unique-Index lässt
  einen kollidierenden `create` bei gleichzeitigen Admin-Rotationen fehlschlagen
  — der Client erkennt den Konflikt, berechnet die Version neu und versucht es
  erneut. **Ohne** den Index greift dieser Schutz nicht und parallele Rotationen
  können denselben Versions-Index mit unterschiedlichen Keys belegen →
  Nachrichten dieser Version werden für manche Mitglieder unlesbar.
- **ProfileService-Annahme:** Das `keyBackup`-Feld der `MessangerProfile` darf
  **nur** im eigenen Profil (`myMessangerProfile`) lesbar sein, **nicht** im
  fremd-lesbaren `messangerProfile(userId)`-Resolver (dort nur `publicKey`). Das
  Backup ist zwar passwortverschlüsselt, sollte aber nicht breit exponiert sein.
