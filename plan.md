# MessengerClient — Implementierungsplan

> Discord-ähnliches UI-Mockup auf späterer Basis der Virtual-Office-Microservice-Architektur

---

## Inhalt

1. [Kontext & Ziel](#kontext--ziel)
2. [Stack](#stack)
3. [Projektstruktur](#projektstruktur)
4. [Datenmodell](#datenmodell)
5. [Mock-Daten](#mock-daten)
6. [UI-Layout](#ui-layout)
7. [Farbpalette](#farbpalette)
8. [Umsetzungsschritte](#umsetzungsschritte)
9. [Auth-Architektur & Sicherheit](#auth-architektur--sicherheit)
10. [Verifikation](#verifikation)

---

## Kontext & Ziel

Das Ziel ist ein reines **UI-Mockup** eines Messenger-Clients mit Discord-ähnlicher Optik — zunächst als Präsentations-Prototype ohne echte API-Aufrufe. Alle Daten sind statisch (hardcoded Mock-Daten).

Das Datenmodell spiegelt die echte Microservice-Architektur (AuthService, MessageService, ProfileService) wider, damit ein späterer Umbau zum vollständigen Client mit minimalem Aufwand möglich ist.

---

## Stack

| Technologie | Version | Zweck |
|-------------|---------|-------|
| React | 18 | UI-Framework |
| TypeScript | 5 | Typsicherheit |
| Vite | 5 | Build-Tool & Dev-Server |
| TailwindCSS | 3 | Styling (keine externe Komponentenbibliothek) |
| react-router-dom | 6 | Client-seitiges Routing |
| livekit-client | — | Vorbereitung für spätere Audio/Video-Integration |

---

## Projektstruktur

```
MessangerClient/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types/
    │   └── index.ts                # User, Message, Conversation, Status
    ├── data/
    │   └── mockData.ts             # Statische Beispieldaten
    ├── store/
    │   └── AppContext.tsx          # React Context: aktiver User, aktive Conversation
    ├── services/                   # Vorbereitung für echte API-Anbindung
    │   ├── authService.ts          # AuthService-Aufrufe (Login, Refresh, Logout)
    │   ├── messageService.ts       # MessageService-Aufrufe
    │   └── meetingService.ts       # LiveKit / RecordingService
    ├── components/
    │   ├── auth/
    │   │   └── LoginPage.tsx       # Login-Formular (visuell, kein echtes Submit)
    │   ├── layout/
    │   │   ├── AppSidebar.tsx      # Schmale linke Leiste (72 px) mit App-Icons
    │   │   ├── ChannelSidebar.tsx  # DM-/Gesprächsliste (~240 px)
    │   │   ├── TopBar.tsx          # Header: Gesprächsname + Icons
    │   │   └── UserListPanel.tsx   # Rechte Sidebar: Online-Nutzer
    │   ├── chat/
    │   │   ├── ChatArea.tsx        # Scrollbarer Nachrichtenverlauf
    │   │   ├── MessageBubble.tsx   # Einzelne Nachricht (Avatar, Name, Zeit, Text)
    │   │   └── MessageInput.tsx    # Eingabezeile (Enter simuliert Senden)
    │   └── common/
    │       ├── Avatar.tsx          # Rundes Profilbild mit Status-Dot
    │       └── StatusBadge.tsx     # Online / Away / DND / Offline
    └── pages/
        ├── AuthPage.tsx            # Wrapper für LoginPage
        └── ChatPage.tsx            # Haupt-Layout (alle Layout-Komponenten)
```

---

## Datenmodell

Die Typen orientieren sich direkt an den API-Feldern der echten Services.

```typescript
// src/types/index.ts

type UserStatus = 'online' | 'away' | 'dnd' | 'offline';

interface User {
  id: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  email: string;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;        // ISO-String — spiegelt MessageService.createdAt
  readAt: string | null;    // null = ungelesen
}

interface Conversation {
  id: string;
  participants: User[];
  messages: Message[];
  unreadCount: number;
}
```

---

## Mock-Daten

**Datei:** `src/data/mockData.ts`

- **6–8 fiktive Nutzer** mit Namen, Status und Placeholder-Avataren
  (`https://api.dicebear.com/7.x/avataaars/svg?seed={name}`)
- **3–4 Konversationen** mit je 10–20 Nachrichten
- **1 eingeloggter "Ich"-Nutzer**, fixiert im AppContext

---

## UI-Layout

Die Oberfläche ist in vier Spalten gegliedert — Spalte 4 ist optional und kontextsensitiv.

```
┌──────┬──────────────────┬──────────────────────────────────┬─────────────┐
│      │                  │  TopBar  (Gesprächsname + Icons)              │
│      │                  ├──────────────────────────────────┼─────────────┤
│ App  │ Channel          │                                  │             │
│ Side │ Sidebar          │   ChatArea                       │  UserList   │
│ bar  │                  │   (Nachrichten-Feed)             │  Panel      │
│ 72px │ 240px            │                                  │  200px      │
│      │ ├ DM-Nutzer      ├──────────────────────────────────┤ (optional)  │
│      │ ├ Gruppen        │  MessageInput                    │             │
│      │ └ Space-Channels │                                  │             │
└──────┴──────────────────┴──────────────────────────────────┴─────────────┘
```

### Spalte 1 — AppSidebar (72 px)

Schmale Icon-Leiste; Tooltip beim Hover zeigt den Space-Namen.

| Icon | Ziel |
|------|------|
| Freunde | Kontaktliste |
| Chats | Direkt-Nachrichten |
| VirtualOffice | Space VirtualOffice |
| Verkaufs-Office | Space Verkaufs-Office |
| Freischule | Space Freischule |

### Spalte 2 — ChannelSidebar (240 px)

- Direkte Unterhaltungen mit einzelnen Nutzern
- Gruppenunterhaltungen
- Bei Spaces: Channel-Liste mit unterschiedlichen Kanal-Typen (Text, Audio, Video, Forum, OnBoarding, FAQ)

### Spalte 3 — Hauptbereich

- Nachrichten-Feed (ChatArea)
- Anruf-Ansicht mit Transkript

### Spalte 4 — UserListPanel (200 px, optional)

Nutzerliste der aktiven Gruppe oder App — ein-/ausblendbar.

---

## Farbpalette

Discord Dark Theme als Grundlage; alle Werte werden als Tailwind Custom Tokens definiert.

| Token | Hex | Verwendung |
|-------|-----|------------|
| `bg-app-sidebar` | `#202225` | AppSidebar-Hintergrund |
| `bg-channel-sidebar` | `#2F3136` | ChannelSidebar-Hintergrund |
| `bg-chat` | `#36393F` | Chat-Bereich |
| `bg-input` | `#40444B` | Eingabefeld |
| `text-primary` | `#DCDDDE` | Haupttext |
| `text-muted` | `#72767D` | Zeitstempel, Beschriftungen |
| `accent` | `#5865F2` | Buttons, Markierungen (Discord Blurple) |
| `online` | `#3BA55C` | Online-Status |
| `away` | `#FAA61A` | Abwesend |
| `dnd` | `#ED4245` | Nicht stören |

---

## Umsetzungsschritte

### Phase 1 — Projekt aufsetzen

1. `npm create vite@latest MessangerClient -- --template react-ts`
2. TailwindCSS installieren & Custom-Farben in `tailwind.config.js` eintragen
3. Basis-Routing: `react-router-dom` — Route `/login` und `/` (ChatPage)

### Phase 2 — Typen, Mock-Daten & Context

4. `src/types/index.ts` — alle Interfaces definieren
5. `src/data/mockData.ts` — Nutzer, Konversationen, Nachrichten befüllen
6. `src/store/AppContext.tsx` — aktiver Nutzer + aktive Konversation als State

### Phase 3 — Layout-Komponenten

7. `AppSidebar.tsx` — Icon-Leiste links (App-Logo + Trennlinie)
8. `ChannelSidebar.tsx` — DM-Liste: Avatar, Name, letzter Nachrichtenauszug, Unread-Badge
9. `TopBar.tsx` — Name + Status der aktiven Konversation + Dummy-Aktions-Icons
10. `UserListPanel.tsx` — rechte Sidebar mit Nutzer-Gruppen (Online / Offline)

### Phase 4 — Chat

11. `MessageBubble.tsx` — Nachricht mit Avatar, Absender-Name, Zeitstempel, Text
12. `ChatArea.tsx` — Verlauf rendern, auto-scroll ans Ende, Datum-Trennlinien
13. `MessageInput.tsx` — Eingabefeld + Senden-Button; Enter fügt lokale Mock-Nachricht hinzu

### Phase 5 — Auth-Seite & Common

14. `LoginPage.tsx` — Discord-ähnliches Login-Formular (dunkel, zentriert), Submit navigiert zu `/`
15. `Avatar.tsx` / `StatusBadge.tsx` — wiederverwendbare Hilfskomponenten

### Phase 6 — Feinschliff

16. Responsive Verhalten: UserListPanel auf kleinen Screens ausblenden
17. Hover-Effekte, aktive Konversation hervorheben, Übergänge
18. Favicon + Seitentitel "MessengerClient"

---

## Auth-Architektur & Sicherheit

Dieser Abschnitt beschreibt, wie die Authentifizierung im echten Client — auf Basis des AuthService — sicher implementiert werden soll.

### Überblick des Token-Systems

Der AuthService verwendet ein **Dual-Token-Verfahren**:

| Token | Format | Speicherort | Lebensdauer |
|-------|--------|-------------|-------------|
| Access Token | JWT (RS256) | In-Memory (React State / Context) | Kurz (15 min) |
| Refresh Token | Opaque | `HttpOnly`-Cookie (Pfad `/user/refresh`) | Lang (7 Tage) |

### Login-Flow

```
Client                        AuthService
  │                               │
  │  POST /user/login             │
  │  { email, password,           │
  │    device_fingerprint,        │
  │    device_name }              │
  │ ─────────────────────────── > │
  │                               │  Validiert Credentials (bcrypt via passlib.CryptContext auth.py:28)
  │                               │  In der Datenbank wird get_password_hash(password) gespeichert. Der JWT wird nicht gespeichert. Der Refresh-Token wird mit SHA-256 gehasht in der Datenbank gespeichert (schneller und es gibt keine leicht erratbaren Token)
  │  200 { access_token, ... }    │  Erstellt Access-JWT mit Signatur (Private- & Public-Key) & Refresh-Token
  │  Set-Cookie: refresh_token    │
  │ < ─────────────────────────── │
  │                               │
  │  Access Token → In-Memory     │
  │  Refresh Token → Cookie       │
  │  (automatisch vom Browser     │
  │   verwaltet)                  │
```

Der `access_token` wird **niemals** in `localStorage` oder `sessionStorage` abgelegt — nur im React-Context (Arbeitsspeicher). 
Damit ist er vor XSS-Angriffen geschützt, da kein JavaScript außerhalb der App-Laufzeit darauf zugreifen kann.

### JWT-Verifikation (RS256)

Jeder Microservice verifiziert JWTs **eigenständig** ohne Rückfrage beim AuthService:

```
Startup jedes Microservice:
  GET /jwt/public-key  →  RSA-Public-Key cachen

Pro Request:
  JWT-Signatur lokal mit Public Key prüfen
  → kein Single Point of Failure
  → kein Netzwerk-Overhead pro Request
```

Der JWT-Payload enthält `user_id`, `email`, eine Liste von `roles` und ein Dict von `permissions`. Der Client liest diese Felder aus dem dekodiertem Token, um UI-Elemente rollenabhängig zu rendern (Admin-Bereiche etc.).

> **Achtung:** Der Client darf die JWT-Signatur nicht als Sicherheitsbeweis behandeln. Die Verifikation findet serverseitig statt. Client-seitiges Dekodieren dient ausschließlich der UI-Steuerung.
Falls der JWT gefälscht ist und das Adminrecht gegeben wurde, dann wird der Adminbereicht des Clients zwar angezeigt, aber die Request werden durch die falsche Signatur von den Services abgelehnt.

### Token-Refresh

Da Access Tokens kurzlebig sind, muss der Client sie regelmäßig erneuern:

```
Client                          AuthService
  │                                 │
  │  (Access Token läuft ab)        │
  │                                 │
  │  POST /user/refresh             │
  │  Cookie: refresh_token          │
  │ ─────────────────────────────> │
  │                                 │  Prüft Refresh Token
  │                                 │  Rotiert Refresh Token (Rotation!)
  │  200 { access_token }           │
  │  Set-Cookie: refresh_token (neu)│
  │ <───────────────────────────── │
  │                                 │
  │  Neuer Access Token → In-Memory │
```

**Refresh-Token-Rotation** stellt sicher, dass ein gestohlenes Refresh-Token nur einmalig verwendbar ist. Bei einem zweiten Versuch mit demselben Token wird die gesamte Session invalidiert.

### CSRF-Schutz

Da der Refresh Token als Cookie übertragen wird, muss der Client **CSRF** (Cross-Site Request Forgery) berücksichtigen:

- Der Cookie hat den Pfad `/user/refresh` — er wird vom Browser nur an genau diesen Endpunkt gesendet.
- Der AuthService prüft den `Origin`- bzw. `Referer`-Header gegen eine Allowlist.
- Für zusätzliche Sicherheit kann ein CSRF-Token als separater Header (`X-CSRF-Token`) eingeführt werden, der im Access Token oder als separates Cookie (nicht `HttpOnly`) übermittelt wird.

### Logout

```typescript
// Lokalen State löschen
clearAccessToken();

// Refresh Token server-seitig invalidieren
POST /user/logout   // invalidiert das aktuelle Gerät
POST /user/logout-all  // invalidiert alle Sessions des Nutzers (JWT-Auth)
```

Nach dem Logout darf kein Access Token im Speicher verbleiben. Der `HttpOnly`-Cookie wird serverseitig durch Überschreiben mit einem abgelaufenen Cookie gecleart.

### Registrierungs-Flow

Der AuthService verwendet einen **zweistufigen Registrierungsprozess**:

1. `POST /user/login` mit neuer E-Mail → Response `{ status: "register" }`
2. `POST /user/register` mit `password` + `repassword` → vollständiger Login

Das macht eine separate "Registrieren"-Seite überflüssig — die Login-Maske erkennt neue E-Mail-Adressen automatisch und leitet zur Passwort wiederholung.

### Sicherheits-Checkliste für die Implementierung

| Maßnahme | Begründung |
|----------|------------|
| Access Token nur In-Memory | Schutz vor XSS / localStorage-Diebstahl |
| Refresh Token als `HttpOnly`-Cookie | JavaScript kann den Token nicht lesen |
| RS256 statt HS256 | Asymmetrisch: kein gemeinsamer Secret zwischen Services |
| Refresh-Token-Rotation | Gestohlene Tokens werden sofort ungültig |
| Kurze Access-Token-Lebensdauer | Schadensminimierung bei Kompromittierung |
| `device_fingerprint` + `device_name` | Nachvollziehbarkeit aktiver Sessions |
| HTTPS-Only | Verhindert Token-Interception im Netzwerk |
| `logout-all`-Endpunkt | Notfall-Abmeldung bei Verdacht auf Kompromittierung |
| Public-Key-Caching pro Service | Kein zentraler Auth-Bottleneck; Key-Rotation via `/admin/jwt/keys` |

---

## Verifikation

Nach Abschluss der Implementierung müssen folgende Szenarien fehlerfrei funktionieren:

- `npm run dev` → App öffnet sich unter `localhost:5173`
- `/login` zeigt das Login-Formular; Klick auf "Anmelden" leitet zu `/` weiter
- Konversation wechseln → ChatArea aktualisiert sich, Unread-Badge verschwindet
- Nachricht tippen + Enter → Nachricht erscheint lokal im Verlauf
- `npm run build` → keine TypeScript-Fehler, kein Konsolenfehler
