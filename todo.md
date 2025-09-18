# Meta Regional Tablero - MVP Implementation Plan

## Core Files to Create (Max 8 files)

### 1. **src/types/index.ts** - TypeScript interfaces
- Branch, Entry, User roles, Badge types
- API response types

### 2. **src/lib/storage.ts** - Data management
- LocalStorage for offline support
- Entry submission queue
- Data persistence utilities

### 3. **src/lib/badges.ts** - Motivational system
- Badge calculation logic
- Motivational messages
- Achievement triggers

### 4. **src/components/BranchPicker.tsx** - Entry interface
- Branch selection
- Quick buttons (+1, +5, +10)
- Split entry functionality
- Offline queue handling

### 5. **src/components/Dashboard.tsx** - Main board
- Regional totals and progress
- Branch listings with badges
- Real-time updates

### 6. **src/components/Reports.tsx** - Analytics view
- Day/Week/Month toggles
- Charts and tables
- Export functionality

### 7. **src/components/PinAccess.tsx** - Authentication
- PIN pad interface
- Leader/Admin dashboards
- Correction capabilities

### 8. **src/pages/Index.tsx** - Main app container
- Navigation between views
- State management
- Layout coordination

## MVP Features Priority
1. ✅ Basic entry addition (public)
2. ✅ Branch selection and totals
3. ✅ Progress tracking toward goal
4. ✅ Split entries between branches
5. ✅ Basic reporting views
6. ✅ PIN access for leaders/admin
7. ✅ Motivational badges system
8. ✅ Offline support with sync

## Simplified Implementation Notes
- Use localStorage for data persistence (no backend required)
- Implement basic badge logic with thresholds
- Create responsive design for mobile-first usage
- Focus on core functionality over advanced features
- Use shadcn/ui components for consistent UI