# Template Card Styling Enhancement

## Overview
Enhanced the visual design of template cards in both Quiz and Bioscope template managers with consistent styling, unique icons, gradient effects, and improved user experience.

## Design Goals
1. **Consistency**: Both Quiz and Bioscope templates share the same visual language
2. **Visual Hierarchy**: Clear distinction between header, stats, and actions
3. **Interactivity**: Hover effects and transitions for better UX
4. **Accessibility**: Icons + text labels, proper contrast, and tooltips
5. **Modern Aesthetic**: Gradients, shadows, and smooth animations

## Card Components

### 1. Card Container
**Styling Features:**
- Rounded corners (`rounded-xl`)
- Gradient background (`from-[var(--card)]/90 to-[var(--card)]/70`)
- Shadow effects with hover enhancement
- Hover lift animation (`hover:-translate-y-1`)
- Smooth transitions (`transition-all duration-300`)

```tsx
className="group relative overflow-hidden rounded-xl border border-[var(--fg)]/15
bg-gradient-to-br from-[var(--card)]/90 to-[var(--card)]/70 shadow-lg
transition-all duration-300 hover:shadow-xl hover:border-blue-400/40 hover:-translate-y-1"
```

**Quiz Template:**
- Blue accent on hover (`hover:border-blue-400/40`)
- Blue gradient overlay

**Bioscope Template:**
- Purple/pink accent on hover (`hover:border-purple-400/40`)
- Purple gradient overlay
- Selected state with purple/pink gradient background

### 2. Decorative Gradient Overlay
**Purpose:** Subtle visual enhancement on hover

```tsx
<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br
from-blue-500/10 to-transparent rounded-full blur-2xl opacity-0
group-hover:opacity-100 transition-opacity duration-300" />
```

**Quiz:** Blue gradient
**Bioscope:** Purple gradient

### 3. Header Section

**Icon Badge:**
- Large game type icon (📝 for Quiz, 🎬 for Bioscope)
- Gradient background matching theme
- Rounded corners with border

```tsx
<div className="flex-shrink-0 w-12 h-12 rounded-lg
bg-gradient-to-br from-blue-500/20 to-blue-600/20
border border-blue-400/30 flex items-center justify-center text-2xl">
  📝
</div>
```

**Title & Description:**
- Bold title with truncation
- Subtle description text
- Proper spacing and line clamping

```tsx
<div className="flex-1 min-w-0 space-y-1">
  <h3 className="text-lg font-bold text-[var(--fg)] truncate">
    {template.name}
  </h3>
  {template.description && (
    <p className="text-xs text-[var(--fg)]/60 line-clamp-2">
      {template.description}
    </p>
  )}
</div>
```

**Additional Badges (Bioscope only):**
- "Public" badge for public templates
- "✓ SELECTED" badge when template is selected

### 4. Stats Grid

**Design:**
- Individual stat boxes with background and border
- Icon + label + value layout
- Responsive grid (2 or 3 columns)

```tsx
<dl className="grid grid-cols-2 gap-3">
  <div className="rounded-lg bg-[var(--fg)]/5 border border-[var(--fg)]/10 px-3 py-2.5">
    <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider
    text-[var(--fg)]/50 font-medium">
      <span className="text-sm">📂</span>
      Categories
    </dt>
    <dd className="mt-1 text-xl font-bold text-[var(--fg)]">
      {template.categories.length}
    </dd>
  </div>
</dl>
```

**Quiz Template Stats:**
- 📂 Categories
- ❓ Questions

**Bioscope Template Stats:**
- 🎯 Rounds
- 🖼️ Images
- ⏱️ Timer

### 5. Action Buttons

**Layout:**
- Footer section with border-top separator
- Horizontal button group with gaps
- Responsive button sizing

**View Button:**
```tsx
<button
  type="button"
  onClick={() => handleViewTemplate(template)}
  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5
  rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20
  border border-blue-400/30 text-sm font-medium text-blue-100
  transition-all duration-200 hover:from-blue-500/30 hover:to-blue-600/30
  hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20"
  title="View and edit questions"
>
  <span className="text-base">👁️</span>
  View
</button>
```

**Features:**
- 👁️ Eye icon
- Gradient background (blue for Quiz, purple/pink for Bioscope)
- Hover glow effect with matching color shadow
- Full-width flex button

**Delete Button:**
```tsx
<button
  type="button"
  onClick={() => handleDeleteTemplate(template.id)}
  className="inline-flex items-center justify-center gap-2 px-4 py-2.5
  rounded-lg bg-red-500/10 border border-red-400/30
  text-sm font-medium text-red-200 transition-all duration-200
  hover:bg-red-500/20 hover:border-red-400/50 hover:text-red-100
  hover:shadow-lg hover:shadow-red-500/20"
  title="Delete this template"
>
  <span className="text-base">🗑️</span>
  Delete
</button>
```

**Features:**
- 🗑️ Trash icon
- Red theme (danger action)
- Hover glow effect
- Fixed-width button

**Select Button (Bioscope only):**
```tsx
<button
  type="button"
  onClick={() => dispatch(selectTemplate(template))}
  className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5
  rounded-lg text-sm font-medium transition-all duration-200 ${
    isSelected
      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/50 text-green-100 hover:from-green-500/30 hover:to-emerald-500/30'
      : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-100 hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20'
  }`}
  title={isSelected ? 'Currently selected' : 'Select this template'}
>
  <span className="text-base">{isSelected ? '✓' : '☑️'}</span>
  {isSelected ? 'Selected' : 'Select'}
</button>
```

**Features:**
- ☑️ Checkbox icon (unchecked) or ✓ (checked)
- Dynamic styling based on selection state
- Green theme when selected, blue when not selected
- Full-width flex button

## Color Schemes

### Quiz Templates (Blue Theme)
- **Primary**: Blue (`blue-500`)
- **Secondary**: Blue-600 (`blue-600`)
- **Hover Border**: `blue-400/40`
- **Gradient**: `from-blue-500/20 to-blue-600/20`
- **Shadow Glow**: `shadow-blue-500/20`

### Bioscope Templates (Purple/Pink Theme)
- **Primary**: Purple (`purple-500`)
- **Secondary**: Pink (`pink-500`)
- **Hover Border**: `purple-400/40`
- **Gradient**: `from-purple-500/20 to-pink-500/20`
- **Shadow Glow**: `shadow-purple-500/20`
- **Selected State**: `from-purple-500/20 to-pink-500/10`

### Shared Colors
- **Delete Button**: Red (`red-500`, `red-400`)
- **Public Badge**: Emerald (`emerald-500`)
- **Selected Badge**: Green (`green-500`, `emerald-500`)

## Responsive Behavior

### Grid Layout
```tsx
<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
```

- **Mobile**: 1 column
- **Medium (md)**: 2 columns
- **Extra Large (xl)**: 3 columns
- **Gap**: 1.25rem (20px)

### Button Layout
- Flex container with gaps
- Buttons adapt to available space
- View and Select buttons are `flex-1` (full width)
- Delete button has fixed width

## Animations & Transitions

### Card Hover Effects
1. **Lift Animation**: `-translate-y-1` (4px upward)
2. **Shadow Enhancement**: `shadow-lg` → `shadow-xl`
3. **Border Glow**: Subtle color accent
4. **Gradient Overlay**: Fade in from 0 to 100% opacity

### Button Hover Effects
1. **Background Intensification**: Opacity increase (20% → 30%)
2. **Border Glow**: Border color intensity increase
3. **Shadow Glow**: Colored shadow appears
4. **Text Brightness**: Text color lightens slightly

### Transition Timing
- **Cards**: `transition-all duration-300`
- **Buttons**: `transition-all duration-200`
- **Gradient Overlay**: `transition-opacity duration-300`

## Icons Used

### Template Cards
- **Quiz Icon**: 📝 (Memo/Document)
- **Bioscope Icon**: 🎬 (Movie Clapper)

### Stats Icons
- **Categories**: 📂 (Folder)
- **Questions**: ❓ (Question Mark)
- **Rounds**: 🎯 (Target/Bullseye)
- **Images**: 🖼️ (Framed Picture)
- **Timer**: ⏱️ (Stopwatch)

### Action Icons
- **View**: 👁️ (Eye)
- **Delete**: 🗑️ (Trash Can)
- **Select (Unchecked)**: ☑️ (Ballot Box)
- **Select (Checked)**: ✓ (Check Mark)

### Status Badges
- **Selected**: ✓ (Check Mark)
- **Public**: No icon, text-only badge

## Accessibility Features

### Tooltips
All buttons have `title` attributes:
```tsx
title="View and edit questions"
title="Delete this template"
title="Select this template"
```

### Color Contrast
- Text uses proper opacity levels for readability
- Buttons have clear visual states (default, hover, active)
- Selected state uses distinct visual indicators

### Interactive States
- Hover effects provide clear feedback
- Disabled states (if needed) reduce opacity
- Focus states inherit from Tailwind defaults

## Code Consistency

### Shared Patterns
Both Quiz and Bioscope templates use:
1. Same card structure (header, stats, footer)
2. Same icon + text pattern for stats
3. Same button layout and sizing
4. Same hover and transition effects
5. Same grid responsiveness

### Template-Specific Differences
1. **Color scheme** (blue vs purple/pink)
2. **Stats displayed** (Categories/Questions vs Rounds/Images/Timer)
3. **Select button** (Bioscope only)
4. **Selected state** (Bioscope only)
5. **Public badge** (Bioscope only)

## Benefits

### Visual Appeal
- Modern, polished appearance
- Cohesive design language across game types
- Professional gradient and shadow effects

### User Experience
- Clear visual hierarchy
- Intuitive action buttons with icons
- Smooth, responsive interactions
- Immediate visual feedback

### Maintainability
- Consistent structure across both managers
- Reusable styling patterns
- Easy to add new template types
- Theme-aware color system

### Accessibility
- Proper labeling with tooltips
- Icon + text for clarity
- High contrast for readability
- Responsive touch targets

## Future Enhancements

### Potential Additions
1. **Drag & Drop**: Reorder templates
2. **Favorites**: Star/pin frequently used templates
3. **Tags**: Categorize templates (e.g., "Holiday", "Sports")
4. **Preview Modal**: Quick preview on card click
5. **Duplicate**: Clone template functionality
6. **Export**: Download template as JSON
7. **Share**: Generate shareable link
8. **Stats Visualization**: Charts for template usage
9. **Thumbnail**: Preview image for Bioscope templates
10. **Animation Previews**: Show reveal animations

### Advanced Interactions
1. **Card Context Menu**: Right-click for quick actions
2. **Keyboard Navigation**: Arrow keys to navigate cards
3. **Multi-Select**: Select multiple templates for batch operations
4. **Search & Filter**: Find templates by name/stats
5. **Sort Options**: Sort by name, date created, rounds, etc.

## Implementation Files

### Quiz Template Manager
[QuizTemplateManager.tsx](../apps/web/src/components/templates/QuizTemplateManager.tsx)
- Blue theme
- Categories + Questions stats
- View + Delete buttons

### Bioscope Template Manager
[BioscopeTemplateManager.tsx](../apps/web/src/components/templates/BioscopeTemplateManager.tsx)
- Purple/Pink theme
- Rounds + Images + Timer stats
- View + Select + Delete buttons
- Selected state visualization
- Public badge

## Summary

The template card redesign successfully:
- ✅ Creates consistent visual language across Quiz and Bioscope
- ✅ Enhances card headers with icons and gradients
- ✅ Improves stats display with individual boxes and icons
- ✅ Adds modern action buttons with icons and hover effects
- ✅ Implements smooth animations and transitions
- ✅ Maintains accessibility with tooltips and proper contrast
- ✅ Provides clear visual feedback for all interactions
- ✅ Uses theme-aware color system
- ✅ Supports responsive layouts
- ✅ Creates a professional, polished appearance
