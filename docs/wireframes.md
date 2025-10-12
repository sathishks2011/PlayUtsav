# PlayUtsav Wireframes

## 1. Landing / Entry

```
┌──────────────────────────────────────────────────────────────┐
│ PlayUtsav                               [Theme] [Language]   │
│ Bring everyone together with interactive games.              │
│--------------------------------------------------------------│
│ HOST A NEW GAME                    |   JOIN A GAME           │
│  Your name  [__________]           |   Game code [ _ _ _ _ ] │
│  Max players [ 4 ]                 |   Your name  [________] │
│  [Create session]                  |   [Join session]        │
│                                    |   Error messages here   │
│--------------------------------------------------------------│
│ Tips: Works on mobile, desktop, and TV (webOS packaged)      │
└──────────────────────────────────────────────────────────────┘
```

**Primary actions:** Create new session, join via code. Theme & locale toggles persist between visits.

## 2. Host Lobby

```
┌─────────────────────────────────────────────────────────────┐
│ Session code: H7QX                 [Copy]  Joined 2/6        │
│ Share this code or QR with your family.                      │
│-------------------------------------------------------------│
│ Lobby participants                 | Create a team           │
│  • Ava (host)                      | Team name [__________]  │
│  • Sam                             | Team color [●]          │
│  • …                               | [Add team]              │
│-------------------------------------------------------------│
│ Teams                                                       │
│  [ Lightning Lions ] members: 2                             │
│  [ Stardust Squad ] members: 0                              │
│-------------------------------------------------------------│
│ Next: Start Game • Auto-assign • Export lobby QR             │
└─────────────────────────────────────────────────────────────┘
```

**Primary actions:** Track joiners, configure teams, prep rounds.

## 3. Player Lobby

```
┌─────────────────────────────────────────────────────────────┐
│ Welcome, Sam!                                               │
│ Hang tight while the host sets things up.                   │
│ Session code: H7QX                                          │
│-------------------------------------------------------------│
│ Players in lobby                                            │
│  • Ava (Host)                                               │
│  • Sam                                                      │
│  • …                                                        │
│-------------------------------------------------------------│
│ Teams (if assigned)                                         │
│  Lightning Lions  members: Ava                              │
│  Stardust Squad  awaiting assignments                       │
└─────────────────────────────────────────────────────────────┘
```

**Primary actions:** Confirm lobby membership, wait for host; see team once assigned.

## 4. Host Game Control (Round Runner)

```
┌────────────────────────────────────────────────────────────────┐
│ Session H7QX                      Timer: 00:28          Scores │
│ Teams: Lions 25 • Squad 20                                     │
│---------------------------------------------------------------│
│ Current Game: Family Feud — Round 2                           │
│ Prompt: “Name something you bring on a picnic.”              │
│ [ Reveal Answer 1 ] [ Reveal Answer 2 ] [ Strike ]            │
│---------------------------------------------------------------│
│ Action bar: [Start/Stop Timer] [Play Audio] [Adjust Score]     │
│ Next up: Quiz → Logo Blitz → Music Match                      │
│---------------------------------------------------------------│
│ Chat/Notes | Event Log | Quick Tips                           │
└────────────────────────────────────────────────────────────────┘
```

**Primary actions:** Advance rounds, reveal prompts, trigger media, adjust scores, monitor queue.

## 5. Admin Dashboard (Templates & Marketplace)

```
┌─────────────────────────────────────────────────────────────┐
│ Templates   Marketplace   Analytics   Settings              │
│-------------------------------------------------------------│
│ + Import template (.famgame.tgz)                             │
│-------------------------------------------------------------│
│ Template list                                                │
│  • Holiday Quiz Pack v1.0   [Preview] [Edit] [Publish]       │
│  • Logo Blitz Lite          [Preview] [Edit] [Publish]       │
│  • Music Match 90s          [Preview] [Edit] [Publish]       │
│-------------------------------------------------------------│
│ Preview pane / JSON schema validator                         │
│-------------------------------------------------------------│
│ Marketplace toggle: Local | Private | Community              │
└─────────────────────────────────────────────────────────────┘
```

**Primary actions:** Manage template library, validate schema, install signed packages, view analytics.

---

### Annotations Legend
- `[Control]` denotes buttons or interactive elements.
- `•` list markers represent dynamic content populated from session state.
- Sections separated by dashed lines indicate card/group boundaries.

Use these sketches to inform high-fidelity UI and component breakdowns.
