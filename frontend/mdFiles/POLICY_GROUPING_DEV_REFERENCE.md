# Policy Grouping - Developer Quick Reference

## 🔧 Implementation Summary

### State Variables Added

```javascript
const [groupName, setGroupName] = useState(""); // Current group being edited/added
const [filterGroup, setFilterGroup] = useState("all"); // Currently selected filter
```

### Data Structure

```javascript
{
  id: Date.now(),              // Unique identifier
  content: "Term text...",     // The actual term/condition
  group: "Wedding Policy",     // NEW: Group/category name
  createdAt: "2025-10-17T...", // Creation timestamp
  updatedAt: "2025-10-17T..."  // Last update timestamp (optional)
}
```

### Key Functions

#### `getGroups()`

- Returns array of unique group names from all policies
- Sorted alphabetically
- Used to populate the filter dropdown

#### `getFilteredPolicies()`

- Filters policies by search term (content OR group name)
- Filters by selected group (if not "all")
- Returns filtered array

#### `getGroupedPolicies()`

- Takes filtered policies and groups them by group name
- Returns object: `{ "Group Name": [policy1, policy2, ...] }`
- Used for rendering grouped display

### Component Structure

```
Policy Component
├── Page Header (Title + Add Button)
├── Policy Form (conditionally rendered)
│   ├── Group Input Field [NEW]
│   ├── Content Textarea
│   └── Action Buttons (Add/Update/Cancel)
└── Policy List
    ├── List Header
    │   ├── Title
    │   └── Filter Controls [NEW]
    │       ├── Group Filter Dropdown
    │       └── Search Input
    └── Grouped Policies Display [NEW]
        └── For each group:
            ├── Group Header (name + count)
            └── Table (terms in that group)
```

## 🎨 SCSS Structure

### New Classes Added

```scss
.group-input          // Styling for group input field
.filter-controls      // Container for filter dropdown + search
.group-filter         // Dropdown for filtering by group
.grouped-policies     // Container for all policy groups
.policy-group         // Individual group section
  ├── .group-header   // Group name + count header
  │   ├── .group-name // Group title with icon
  │   └── .group-count // Badge showing term count
  └── .table-wrap     // Table container
```

### Color Variables Used

```scss
Primary Green: #10b981, #059669 (gradient)
Focus Green: rgba(16, 185, 129, 0.1)
Text Colors: #374151, #1f2937, #6b7280
Border Colors: #d1d5db, #e5e7eb
Background: #ffffff, #f9fafb
```

## 🔄 State Flow

### Adding a Term

```
1. User enters group name + content
2. handleAdd() called
3. Creates object with group field
4. Adds to policies array
5. Persists to LocalStorage
6. Resets form (including groupName)
7. UI re-renders with new grouping
```

### Editing a Term

```
1. User clicks edit button
2. handleEdit(id) called
3. Loads content + group into form
4. User modifies fields
5. handleAdd() with editingIndex set
6. Updates existing item with new group
7. Persists changes
8. UI re-renders
```

### Filtering

```
1. User selects group from dropdown
2. setFilterGroup(groupName) called
3. getFilteredPolicies() recalculates
4. getGroupedPolicies() reorganizes
5. UI shows only selected group
```

## 📦 LocalStorage

### Storage Key

```javascript
STORAGE_KEYS.POLICY; // Defined in utils/constants.js
```

### Stored Data Format

```json
[
  {
    "id": 1697500000000,
    "content": "Full payment required...",
    "group": "Wedding Policy",
    "createdAt": "2025-10-17T10:30:00.000Z"
  },
  {
    "id": 1697500100000,
    "content": "Session duration is 2 hours",
    "group": "Engagement Policy",
    "createdAt": "2025-10-17T10:31:00.000Z",
    "updatedAt": "2025-10-17T10:35:00.000Z"
  }
]
```

## 🔍 Search Logic

### Search Matches

```javascript
const matchesSearch =
  (p.content || "").toLowerCase().includes(search.toLowerCase()) ||
  (p.group || "").toLowerCase().includes(search.toLowerCase());
```

### Search Features

- Case-insensitive
- Searches both content and group name
- Works in combination with group filter
- Shows groups that have matches
- Hides groups with no matches

## 🎯 Default Behaviors

### Default Group Name

- Empty input → "Uncategorized"
- Trailing/leading spaces → trimmed
- Existing terms without group → "Uncategorized"

### Default Filter

- Starts with "all" (show all groups)
- Persists during session
- Resets when component unmounts

### Empty States

1. No policies at all
2. No policies match search/filter combination

## 🚀 Performance Considerations

### Optimization Points

- `getGroups()` recalculates on every render (acceptable for small datasets)
- Could be memoized with `useMemo()` if performance issues arise
- Filtering happens in-memory (fast for typical use cases)

### Scalability

- Current implementation handles hundreds of terms efficiently
- For thousands of terms, consider:
  - Pagination
  - Virtual scrolling
  - Backend filtering

## 🧪 Testing Scenarios

### Manual Testing Checklist

- [ ] Add term with group name
- [ ] Add term without group name (should go to "Uncategorized")
- [ ] Edit term and change its group
- [ ] Filter by specific group
- [ ] Search within filtered group
- [ ] Search across all groups
- [ ] Delete term (should update group count)
- [ ] Multiple terms in same group
- [ ] Empty group name (edge case)
- [ ] Very long group names
- [ ] Special characters in group names
- [ ] Mobile responsiveness

## 🔗 Related Files

```
src/pages/Policy.jsx         - Main component logic
src/pages/Policy.scss        - Styling
src/utils/storage.js         - LocalStorage utilities
src/utils/constants.js       - Storage keys
POLICY_GROUPING_GUIDE.md     - User documentation
POLICY_GROUPING_VISUAL.md    - Visual reference
```

## 📝 Future Enhancement Ideas

### Potential Features

```javascript
// Bulk operations
const moveToGroup = (policyIds, newGroup) => { ... }
const deleteGroup = (groupName) => { ... }

// Templates
const applyTemplate = (templateName) => { ... }

// Export
const exportGroup = (groupName, format) => { ... }

// Drag and drop
const handleDragStart = (e, policyId) => { ... }
const handleDrop = (e, targetGroup) => { ... }
```

### Data Enhancements

```javascript
{
  id: timestamp,
  content: "...",
  group: "...",
  order: 0,              // For custom ordering within group
  color: "#10b981",      // Custom group color
  icon: "📋",            // Custom group icon
  template: false,       // Is this a template?
  createdAt: "...",
  updatedAt: "..."
}
```

## 🐛 Known Limitations

1. **No validation** on group name length (could be very long)
2. **Case-sensitive groups**: "Wedding" and "wedding" are different groups
3. **No group deletion**: Empty groups don't auto-delete
4. **No drag-and-drop**: Must edit to change groups
5. **No undo/redo**: Deletes are permanent

## 💡 Tips for Customization

### Change Default Group Name

```javascript
group: groupName.trim() || "General Policy"; // Line ~37, 52
```

### Change Group Header Color

```scss
background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); // Blue
background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); // Purple
```

### Add Group Icons by Type

```javascript
const getGroupIcon = (groupName) => {
  if (groupName.includes("Wedding")) return "💍";
  if (groupName.includes("Corporate")) return "💼";
  if (groupName.includes("Birthday")) return "🎂";
  return "📋";
};
```

---

**Last Updated**: October 17, 2025  
**Component Version**: 2.0 (with grouping)
