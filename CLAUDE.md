@../MicroServiceArchitecture.md

# MessengerClient

## Quick Start

```bash
npm install      # einmalig
npm run dev      # Entwicklungsserver → http://localhost:5173
npm run build    # Produktions-Build (TypeScript + Vite)
```

## Mock-Login

| E-Mail | Passwort | Ergebnis |
|--------|---------|---------|
| `max@mustermann.de` | `hallo` | Login als Max Mustermann |
| Beliebige neue E-Mail | Beliebig | Registrierung → neuer User wird in `mockData` angelegt |

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
├── data/mockData.ts        # Statische Demo-Daten (Users, Spaces, Conversations)
├── store/AppContext.tsx     # Globaler State + Actions (React Context)
├── services/               # API-Stubs für spätere Backend-Anbindung
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

## Demo-Daten

- **10 Nutzer** (`u1`–`u10`): Mix aus Mitarbeitern, Admins, Kunden
- **2 Spaces**: Büro München (intern), Kundengewinnung (extern + Kunden)
- **5 DM-Konversationen** mit realistischen Beispieldialogen
- **Channels pro Typ** mit deutschen Beispieldaten

## Neue Channels/Spaces hinzufügen

Alles in `src/data/mockData.ts` → `MOCK_SPACES`. Struktur:
`Space → categories[] → ChannelCategory → channels[] → Channel`

Ein neuer Channel braucht mindestens: `id`, `spaceId`, `name`, `type`, `isEncrypted`, `isPublic`, `messages: []`, `memberIds`.

## State-Management

`AppContext` verwaltet:
- `currentUser` — eingeloggter Nutzer
- `activeSpaceId / activeChannelId / activeConversationId` — Navigation
- `sendDM / sendChannelMessage` — Nachrichten lokal hinzufügen
- `joinVoiceChannel / leaveVoiceChannel` — Teilnehmer-Listen

## Backend-Anbindung (später)

Die `services/`-Stubs ersetzen die Mock-Logik in `AppContext`:
- `authService.ts` → AuthService REST
- `messageService.ts` → MessageService REST
- `profileService.ts` → ProfileService GraphQL
- `meetingService.ts` → LiveKit / RecordingService
