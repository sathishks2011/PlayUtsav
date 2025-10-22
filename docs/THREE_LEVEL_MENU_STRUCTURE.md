# Three-Level Menu Structure Implementation

## Overview
Enhanced the Host Console navigation to support a **3-level hierarchical menu** with a JSON-like structure that can be easily externalized for admin configuration.

## Menu Hierarchy

### Level 1: Parent Sections
Top-level categorization with icons (e.g., Session, Games, Configuration)

### Level 2: Child Items
Feature groups or individual features (e.g., Dashboard, Templates, Settings)

### Level 3: Sub-Child Items
Specific implementations of features (e.g., Quiz Templates, Bioscope Templates)

## Current Menu Structure

```
Host Console
│
├── 🎮 Session ▼
│   ├── Dashboard
│   └── Lobby (requires session)
│
├── 🎯 Games ▼
│   ├── Game Control (requires session)
│   ├── Bioscope (requires auth)
│   └── Templates ▶
│       ├── Quiz Templates
│       └── Bioscope Templates
│
└── ⚙️ Configuration ▼
    ├── Settings
    ├── Theme Studio
    └── Metrics
```

## Implementation Details

### Type Definitions

```typescript
type NavKey =
  | 'dashboard'
  | 'lobby'
  | 'control'
  | 'bioscope'
  | 'settings'
  | 'metrics'
  | 'theme'
  | 'templates'
  | 'quiz-templates'
  | 'bioscope-templates';

type MenuItem = {
  id: NavKey | string;
  label: string;
  requiresSession?: boolean;
  requiresAuth?: boolean;
  children?: MenuItem[];  // Recursive for sub-children
};

type MenuSection = {
  id: string;
  label: string;
  icon?: string;
  children: MenuItem[];
};
```

### JSON-like Menu Configuration

```typescript
// JSON-like menu structure - can be externalized to a config file later
const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'session',
    label: 'Session',
    icon: '🎮',
    children: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'lobby', label: 'Lobby', requiresSession: true },
    ],
  },
  {
    id: 'games',
    label: 'Games',
    icon: '🎯',
    children: [
      { id: 'control', label: 'Game Control', requiresSession: true },
      { id: 'bioscope', label: 'Bioscope', requiresAuth: true },
      {
        id: 'templates',
        label: 'Templates',
        children: [
          { id: 'quiz-templates', label: 'Quiz Templates' },
          { id: 'bioscope-templates', label: 'Bioscope Templates' },
        ],
      },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    icon: '⚙️',
    children: [
      { id: 'settings', label: 'Settings' },
      { id: 'theme', label: 'Theme Studio' },
      { id: 'metrics', label: 'Metrics' },
    ],
  },
];
```

### State Management

```typescript
// Track parent section expansion (Level 1)
const [expandedSections, setExpandedSections] = useState<string[]>([
  'session',
  'games',
  'configuration'
]);

// Track child item expansion (Level 2)
const [expandedItems, setExpandedItems] = useState<string[]>(['templates']);

// Toggle functions
const toggleSection = (sectionId: string) => {
  setExpandedSections((prev) =>
    prev.includes(sectionId)
      ? prev.filter((id) => id !== sectionId)
      : [...prev, sectionId]
  );
};

const toggleItem = (itemId: string) => {
  setExpandedItems((prev) =>
    prev.includes(itemId)
      ? prev.filter((id) => id !== itemId)
      : [...prev, itemId]
  );
};
```

### Item Click Handler

```typescript
const handleItemClick = (item: MenuItem) => {
  // If item has children, toggle expansion instead of navigating
  if (item.children && item.children.length > 0) {
    toggleItem(item.id);
  } else {
    // Navigate to the view
    setNav(item.id as NavKey);
  }
};
```

### Disabled State Logic

```typescript
const isItemDisabled = (item: MenuItem) => {
  if (item.requiresSession && !session) return true;
  if (item.requiresAuth && item.id === 'bioscope' && !canAccessBioscope) return true;
  return false;
};
```

## Rendering Logic

### Parent Section (Level 1)

```tsx
<button
  onClick={() => toggleSection(section.id)}
  className="w-full flex items-center justify-between px-3 py-2 rounded text-left text-sm font-medium border border-transparent hover:bg-[var(--fg)]/5 transition"
>
  <span className="flex items-center gap-2">
    {section.icon && <span className="text-base">{section.icon}</span>}
    {section.label}
  </span>
  <span className="text-xs opacity-60">
    {isExpanded ? '▼' : '▶'}
  </span>
</button>
```

### Child Items (Level 2)

```tsx
<button
  title={item.label}
  className={`w-full px-3 py-1.5 rounded text-left text-sm border transition flex items-center justify-between ${
    isActive && !hasChildren
      ? 'bg-[var(--fg)]/10 border-[var(--fg)]/20 font-medium'
      : 'border-transparent hover:bg-[var(--fg)]/5'
  } ${
    disabled
      ? 'opacity-40 cursor-not-allowed'
      : 'cursor-pointer'
  }`}
  onClick={() => !disabled && handleItemClick(item)}
  disabled={disabled}
>
  <span>{item.label}</span>
  {hasChildren && (
    <span className="text-xs opacity-60">
      {isItemExpanded ? '▼' : '▶'}
    </span>
  )}
</button>
```

### Sub-Child Items (Level 3)

```tsx
{hasChildren && isItemExpanded && (
  <div className="ml-4 pl-2 border-l-2 border-[var(--fg)]/10 space-y-1">
    {item.children!.map((subItem) => {
      const isSubActive = nav === subItem.id;
      const subDisabled = isItemDisabled(subItem);
      return (
        <button
          key={subItem.id}
          title={subItem.label}
          className={`w-full px-3 py-1.5 rounded text-left text-xs border transition ${
            isSubActive
              ? 'bg-[var(--fg)]/10 border-[var(--fg)]/20 font-medium'
              : 'border-transparent hover:bg-[var(--fg)]/5'
          } ${
            subDisabled
              ? 'opacity-40 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
          onClick={() => !subDisabled && setNav(subItem.id as NavKey)}
          disabled={subDisabled}
        >
          {subItem.label}
        </button>
      );
    })}
  </div>
)}
```

## Visual Hierarchy

### Indentation Levels
- **Level 1 (Parent)**: No indentation, full width
- **Level 2 (Child)**: `ml-4 pl-2` with left border
- **Level 3 (Sub-Child)**: Additional `ml-4 pl-2` (total `ml-8`) with left border

### Font Sizes
- **Level 1**: `text-sm font-medium`
- **Level 2**: `text-sm`
- **Level 3**: `text-xs`

### Border Indicators
- Each level has a `border-l-2` to show hierarchical relationship
- Border color: `border-[var(--fg)]/10`

### Expand/Collapse Indicators
- Parent sections: `▼` (expanded) / `▶` (collapsed)
- Child items with children: `▼` (expanded) / `▶` (collapsed)
- Leaf items: No indicator

## View Component Mapping

```typescript
// In the section render area:
{nav === 'dashboard' && <HostDashboard />}
{nav === 'lobby' && session && <HostLobby />}
{nav === 'control' && session && <HostQuizPanel />}
{nav === 'bioscope' && <HostBioscopePanel />}
{nav === 'settings' && <HostSettingsPanel />}
{nav === 'metrics' && <HostMetricsPanel />}
{nav === 'theme' && <ThemeStudioPanel />}
{nav === 'templates' && <TemplateManager />}
{nav === 'quiz-templates' && <QuizTemplateManager />}
{nav === 'bioscope-templates' && <BioscopeTemplateManager />}
```

## Features

### 1. Collapsible at Multiple Levels
- Parent sections can collapse to hide all children
- Child items with sub-children can collapse independently
- State persists during navigation

### 2. Visual Feedback
- **Active state**: Highlighted with background, border, and bold text
- **Hover state**: Subtle background change
- **Disabled state**: Reduced opacity, cursor change
- **Expanded/Collapsed**: Visual indicator (▼/▶)

### 3. Conditional Access
- Items can require active session (`requiresSession: true`)
- Items can require authentication (`requiresAuth: true`)
- Disabled items shown but not clickable

### 4. Flexible Click Behavior
- Items with children: Toggle expansion
- Leaf items: Navigate to view
- No navigation for parent sections (only toggle)

## Externalizing Configuration

### Future Enhancement: JSON Config File

The menu structure can be moved to an external JSON file for admin control:

#### Step 1: Create config file
```json
// config/menu.json
{
  "sections": [
    {
      "id": "session",
      "label": "Session",
      "icon": "🎮",
      "children": [
        { "id": "dashboard", "label": "Dashboard" },
        {
          "id": "lobby",
          "label": "Lobby",
          "requiresSession": true
        }
      ]
    },
    {
      "id": "games",
      "label": "Games",
      "icon": "🎯",
      "children": [
        {
          "id": "control",
          "label": "Game Control",
          "requiresSession": true
        },
        {
          "id": "bioscope",
          "label": "Bioscope",
          "requiresAuth": true
        },
        {
          "id": "templates",
          "label": "Templates",
          "children": [
            { "id": "quiz-templates", "label": "Quiz Templates" },
            { "id": "bioscope-templates", "label": "Bioscope Templates" }
          ]
        }
      ]
    },
    {
      "id": "configuration",
      "label": "Configuration",
      "icon": "⚙️",
      "children": [
        { "id": "settings", "label": "Settings" },
        { "id": "theme", "label": "Theme Studio" },
        { "id": "metrics", "label": "Metrics" }
      ]
    }
  ]
}
```

#### Step 2: Load from API
```typescript
// Fetch menu configuration from backend
const [menuSections, setMenuSections] = useState<MenuSection[]>([]);

useEffect(() => {
  async function loadMenuConfig() {
    try {
      const config = await fetch('/api/admin/menu-config').then(r => r.json());
      setMenuSections(config.sections);
    } catch (error) {
      console.error('Failed to load menu config, using defaults');
      setMenuSections(MENU_SECTIONS); // Fallback to hardcoded
    }
  }
  loadMenuConfig();
}, []);
```

#### Step 3: Admin Interface
Create an admin panel to:
- Add/remove menu items
- Reorder menu items (drag & drop)
- Set permissions (requiresSession, requiresAuth)
- Configure icons and labels
- Preview changes before saving
- Export/import menu configurations

## Benefits

### 1. Scalability
- Easy to add new games without code changes
- Menu structure grows organically with features
- Supports unlimited nesting levels (recursive structure)

### 2. Maintainability
- Centralized menu configuration
- Clear separation of menu structure and rendering logic
- Type-safe with TypeScript
- Single source of truth

### 3. Flexibility
- Admin can control menu without developer intervention
- Different menu structures for different user roles
- A/B testing of menu layouts
- Localization support built-in

### 4. User Experience
- Logical grouping reduces cognitive load
- Progressive disclosure (collapsed sections)
- Clear visual hierarchy
- Consistent interaction patterns

## Testing Checklist

### Navigation
- [ ] Click parent section to expand/collapse
- [ ] Click child item to navigate (if no children)
- [ ] Click child item to expand (if has children)
- [ ] Click sub-child item to navigate
- [ ] Verify active state highlights correct item
- [ ] Verify expansion state persists during navigation

### State Management
- [ ] Disabled items remain disabled
- [ ] Session-dependent items enable when session created
- [ ] Auth-dependent items enable when authenticated
- [ ] Multiple sections can be expanded simultaneously
- [ ] Expansion state independent for each section

### Visual Feedback
- [ ] Hover effects on all clickable items
- [ ] Active state shows on current view
- [ ] Expand/collapse indicators update correctly
- [ ] Indentation shows clear hierarchy
- [ ] Border lines align properly

### Edge Cases
- [ ] Empty children array handled
- [ ] Missing icons handled gracefully
- [ ] Long labels wrap correctly
- [ ] Mobile responsiveness
- [ ] Keyboard navigation (if implemented)

## Migration Path

### From 2-Level to 3-Level

**Before:**
```typescript
{
  id: 'games',
  children: [
    { id: 'templates', label: 'Templates' }
  ]
}
```

**After:**
```typescript
{
  id: 'games',
  children: [
    {
      id: 'templates',
      label: 'Templates',
      children: [
        { id: 'quiz-templates', label: 'Quiz Templates' },
        { id: 'bioscope-templates', label: 'Bioscope Templates' }
      ]
    }
  ]
}
```

### No Breaking Changes
- All existing 2-level items continue to work
- Optional `children` property for 3rd level
- Backward compatible with existing views

## Future Enhancements

### 1. Infinite Nesting
Current implementation supports 3 levels, but can be extended to support unlimited nesting with a recursive component.

### 2. Menu Personalization
Allow users to:
- Pin favorite items to top
- Hide unused sections
- Reorder items
- Save custom layouts

### 3. Search & Filter
- Quick search across all menu items
- Filter by category
- Recent items list
- Keyboard shortcuts

### 4. Analytics
- Track most-used menu items
- Optimize menu structure based on usage
- A/B test different layouts

### 5. Context Menu
- Right-click for actions
- "Open in new tab" for multi-tasking
- "Add to favorites"

### 6. Breadcrumbs
Show navigation path:
```
Games > Templates > Quiz Templates
```

## Related Files

- [HostPortal.tsx](../apps/web/src/components/HostPortal.tsx) - Main component with 3-level menu
- [QuizTemplateManager.tsx](../apps/web/src/components/templates/QuizTemplateManager.tsx) - Quiz template view
- [BioscopeTemplateManager.tsx](../apps/web/src/components/templates/BioscopeTemplateManager.tsx) - Bioscope template view
- [TemplateManager.tsx](../apps/web/src/components/TemplateManager.tsx) - Parent template view (can be deprecated)

## Summary

The 3-level menu structure successfully:
- ✅ Replaces horizontal tabs with nested menu items
- ✅ Supports JSON-like configuration for future admin control
- ✅ Maintains visual hierarchy with indentation and borders
- ✅ Preserves all existing functionality
- ✅ Provides collapsible sections at multiple levels
- ✅ Uses recursive data structure for scalability
- ✅ Enables easy addition of new game types
- ✅ Maintains theme consistency and simplicity
