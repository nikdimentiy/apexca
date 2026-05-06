# ⌘ Command Portal

A sleek, glass-morphism dashboard that unifies your life OS ecosystem — seamlessly connecting FocusTrack, Cali Hustler, Nexus Hub, Sportage HQ, and Titan Crew with real-time Todoist integration.

## ✨ Features

### 🎯 Unified Portal
- **5-Module Launchpad**: Quick access to your productivity, fitness, strategy, and vehicle telemetry tools
- **Visited Tracking**: Automatically marks recently accessed modules with check badges
- **Visit Rankings**: See your top-clicked destinations at a glance
- **Quick Links Panel**: Curated shortcuts for rapid context-switching

### 📊 Live Intelligence
- **Real-Time Clock**: Monospace-style live footer time display
- **Day Progress**: Calendar date, weekday, and year completion tracker
- **Midnight Countdown**: Visual timer showing hours:minutes:seconds remaining in the day
- **System Status**: Pulsing LED indicator with nominal status message

### ✅ Todoist Integration
- **Today's Tasks**: Unified panel showing all due-today tasks sorted by priority (P1 red → P4 grey)
- **Quick Inbox Add**: Beautiful glass-pill input in the footer for rapid task capture
- **Smart Toggling**: Mark tasks complete with optimistic UI feedback (with smooth fade animation)
- **Auto-Refresh**: Background refresh every 5 minutes when the panel is open
- **Sync API**: Secure server-side token handling via Supabase Edge Functions

### 🎨 Design & UX
- **Glass Morphism**: Frosted glass cards with backdrop blur and subtle gradients
- **Dark Mode**: System-aware theme toggle with persistent preference
- **Responsive Layout**: Elegantly adapts from desktop (grid cards) to mobile (stacked with FAB repositioning)
- **Keyboard-First**: Modal navigation with global shortcuts:
  - `1–5`: Launch modules
  - `T`: Toggle Todoist panel
  - `R`: Rankings
  - `Q`: Quick Links
  - `H`: Top Links
  - `/`: Keyboard help
  - `Ctrl+/`: Quick-add to Todoist inbox

### 🔐 Authentication
- **Supabase Auth**: Email/password login with secure session management
- **User Bar**: Displays logged-in user with logout button
- **Auth Overlay**: Terminal-style hexagonal auth gate with geometric backgrounds

### 📱 Mobile-First Responsive
- Floating action buttons (FABs) reposition at bottom on small screens
- Footer collapses vertically while maintaining readability
- Quick-add input expands full-width on mobile
- Touch-friendly button sizing

## 🛠️ Stack

- **Frontend**: Vanilla JavaScript, CSS3 (Glass Morphism, Grid/Flex, Animations)
- **Backend**: Supabase (Auth, Edge Functions, Realtime)
- **Icons**: Font Awesome 6.5.1
- **Typography**: Inter (Google Fonts)
- **External APIs**: Todoist Sync API v1 (server-side proxied)

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ (for Supabase CLI)
- Supabase project with:
  - Auth enabled (email/password)
  - Edge Functions deployed
  - `TODOIST_TOKEN` secret configured

### Installation

1. **Clone & Navigate**
   ```bash
   git clone <repo>
   cd apexca
   ```

2. **Configure Supabase**
   - Update `supabase-auth.js` with your Supabase URL and anon key
   - Ensure `TODOIST_TOKEN` is set in Supabase secrets

3. **Deploy Edge Functions**
   ```bash
   supabase functions deploy todoist-today
   ```

4. **Serve Locally**
   ```bash
   npx http-server
   # or use your preferred static server
   ```

5. **Open in Browser**
   ```
   http://localhost:8080
   ```

## 📁 Project Structure

```
apexca/
├── index.html                 # Main portal layout & UI structure
├── app.js                     # Core logic (theme, time, shortcuts, leaderboard)
├── todoist.js                 # Todoist panel & quick-add integration
├── supabase-auth.js          # Supabase authentication handler
├── styles.css                 # Glass morphism design, animations, responsive
├── auth.css                   # Auth overlay hexagon UI
├── favicon/                   # App icons
└── supabase/
    └── functions/
        └── todoist-today/
            └── index.ts       # Edge Function: fetch/toggle/add Todoist tasks
```

## 🎮 Usage

### Quick-Add Workflow
1. Press `Ctrl+/` (or `Cmd+/` on Mac) anywhere to focus the quick-add field in the footer
2. Type your task: "Finish Q2 report"
3. Press Enter or click the `+` button
4. See ✓ confirmation — task added to Todoist inbox
5. Press `Ctrl+/` again to blur and return to portal

### Module Navigation
- **Number Keys** (`1–5`): Launch a module (animates card and opens in new tab)
- **Keyboard Help** (`/`): View all available shortcuts

### Dark Mode
- Click the sun/moon icon in the top-right
- Preference saved in localStorage

### Todoist Panel
- Press `T` to toggle the Todoist panel
- Shows all due-today tasks grouped by priority
- Click any task's checkbox to mark complete (with smooth animation)
- Click the arrow icon to open in Todoist directly
- Auto-refreshes every 5 minutes in the background

## 🔄 Edge Function API

The `todoist-today` Supabase Edge Function supports three actions:

### Fetch Today's Tasks
```javascript
await tdRequest({ action: 'fetch' })
// → { tasks: [ { id, content, priority, due, url, labels } ] }
```

### Toggle Task Complete/Reopen
```javascript
await tdRequest({ action: 'close', task_id: '123' })
await tdRequest({ action: 'reopen', task_id: '123' })
// → { ok: true }
```

### Add Task to Inbox
```javascript
await tdRequest({ action: 'add', content: 'New task' })
// → { ok: true }
```

All requests require valid Supabase session token (auto-injected by the client library).

## 🎨 Customization

### Colors & Gradients
Edit CSS variables in `styles.css`:
```css
:root {
    --accent-focus: #db4035;     /* FocusTrack red */
    --accent-hustler: #ff9933;   /* Cali orange */
    --accent-nexus: #7c3aed;     /* Nexus violet */
    /* ... more in file */
}
```

### Module Shortcuts
Update `KEY_MODULE_MAP` in `app.js` to change number-key bindings:
```javascript
const KEY_MODULE_MAP = { 
    '1': 'mod-focus', 
    '2': 'mod-hustler', 
    // ...
};
```

### Todoist Priority Colors
Edit `TD_PRIORITY` in `todoist.js`:
```javascript
const TD_PRIORITY = {
    4: { color: '#db4035' },   // P1
    3: { color: '#ff9933' },   // P2
    // ...
};
```

## 🔒 Security Notes

- **Token Isolation**: Todoist API token lives server-side in Supabase secrets — never exposed to frontend
- **CORS**: Edge Function handles CORS headers; requests proxied server-to-server
- **Session Auth**: All Todoist operations require valid Supabase user session
- **Input Sanitization**: HTML escaping on all task content renders

## 📦 Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires ES2020+ support (async/await, modern CSS Grid/Flex, Backdrop Filter).

## 📝 Keyboard Shortcuts Reference

| Key(s) | Action |
|--------|--------|
| `1–5` | Launch module |
| `T` | Toggle Todoist panel |
| `R` | Rankings |
| `Q` | Quick Links |
| `H` | Top Links |
| `/` | Keyboard help |
| `Ctrl+/` | Focus quick-add inbox field |

**Note**: All shortcuts are blocked when typing in input fields.

## 🎯 Future Enhancements

- [ ] Dark mode toggle animation
- [ ] Custom module reordering
- [ ] Todoist project filtering
- [ ] Calendar integration (Google/Apple)
- [ ] Workout logging from Titan Crew
- [ ] Vehicle log sync from Sportage HQ

## 📄 License

MIT

---

**Built with ⚡ and precision for relentless execution**
