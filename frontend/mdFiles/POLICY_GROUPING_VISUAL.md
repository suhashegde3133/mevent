# Policy Grouping - Visual Reference

## 🎨 UI Layout

### Form Section (Adding/Editing Terms)

```
┌─────────────────────────────────────────────────────────────────┐
│  Group/Category                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ e.g., Wedding Policy, Engagement Policy, Corporate...  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Enter Terms & Conditions                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │ Write terms and conditions here...                      │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [ Add Term ]  [ Cancel ]                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Filter Section

```
┌─────────────────────────────────────────────────────────────────┐
│  Saved Terms & Conditions                                       │
│                                                                  │
│  [ All Groups ▼ ]    [ Search terms...              🔍 ]       │
│     │                                                            │
│     ├─ All Groups                                               │
│     ├─ Corporate Events Policy                                  │
│     ├─ Engagement Policy                                        │
│     ├─ Uncategorized                                            │
│     └─ Wedding Policy                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Grouped Display

```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Wedding Policy                                  [ 3 terms ]  │ <- Green gradient header
├─────────────────────────────────────────────────────────────────┤
│ No. │ Content                              │ Actions           │
├─────┼──────────────────────────────────────┼───────────────────┤
│  1  │ Full payment required 7 days...      │  ✏️  🗑️          │
│  2  │ Ceremony photos limited to 3 hours   │  ✏️  🗑️          │
│  3  │ Client must provide shot list...     │  ✏️  🗑️          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📋 Engagement Policy                               [ 2 terms ]  │ <- Green gradient header
├─────────────────────────────────────────────────────────────────┤
│ No. │ Content                              │ Actions           │
├─────┼──────────────────────────────────────┼───────────────────┤
│  1  │ Session duration is 2 hours max      │  ✏️  🗑️          │
│  2  │ Two outfit changes permitted         │  ✏️  🗑️          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📋 Corporate Events Policy                         [ 1 term ]   │ <- Green gradient header
├─────────────────────────────────────────────────────────────────┤
│ No. │ Content                              │ Actions           │
├─────┼──────────────────────────────────────┼───────────────────┤
│  1  │ Business license and insurance...    │  ✏️  🗑️          │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 User Workflow Examples

### Scenario 1: Adding Wedding Terms

```
1. Click [+] button
2. Type "Wedding Policy" in Group field
3. Type "Full payment required 7 days before event" in Content
4. Click [Add Term]
   → Term appears under "Wedding Policy" group
```

### Scenario 2: Organizing Existing Terms

```
1. Click ✏️ on an uncategorized term
2. Change Group from "Uncategorized" to "Engagement Policy"
3. Click [Update]
   → Term moves to Engagement Policy group
```

### Scenario 3: Finding Specific Group

```
1. Click the "All Groups" dropdown
2. Select "Wedding Policy"
   → Only wedding-related terms are shown
```

### Scenario 4: Searching Across Groups

```
1. Type "payment" in search box
   → All terms containing "payment" from any group are shown
   → Groups with no matching terms are hidden
```

## 🎨 Color Scheme

### Group Headers

- **Background**: Linear gradient from `#10b981` to `#059669` (green)
- **Text**: White (`#ffffff`)
- **Icon**: 📋 emoji
- **Count Badge**: White with 20% opacity background

### Form Inputs

- **Group Input Border**: Green focus (`#10b981`)
- **Content Textarea Border**: Blue focus (`#3b82f6`)
- **Placeholder Text**: Gray (`#9ca3af`)

### Buttons

- **Add Button**: Green circular (`#10b981`)
- **Edit Icon**: Blue hover background (`#dbeafe`)
- **Delete Icon**: Red hover background (`#fee2e2`)

## 📱 Responsive Behavior

### Desktop (> 768px)

- Filters and search are side-by-side
- Group headers show name and count on same line
- Tables display full width

### Mobile (≤ 768px)

- Filters and search stack vertically
- Group headers stack name and count
- Tables remain scrollable horizontally
- Full-width group filter and search

## 🔍 Filter Interactions

### When "All Groups" is selected:

- Shows all groups with their terms
- Groups are sorted alphabetically
- Empty message if no terms exist

### When specific group is selected:

- Shows only that one group
- Empty message if no terms in that group
- Search still works within selected group

### When searching:

- Filters across content AND group names
- Shows only groups with matching terms
- Maintains group filter if one is selected
- Empty message if no matches found

## ✨ Key Features Highlighted

1. **Visual Grouping**: Each policy group has a distinct colored header
2. **Term Count**: Shows number of terms in each group at a glance
3. **Easy Filtering**: Dropdown to focus on specific policy types
4. **Search Integration**: Find terms across all groups or within filtered group
5. **Flexible Organization**: Move terms between groups via edit
6. **Professional Look**: Clean, modern design with smooth transitions

## 🎓 Example Business Setup

### Wedding Photography Studio

```
📋 Wedding Policy (5 terms)
   - Payment schedule terms
   - Event day timeline requirements
   - Guest photo permissions
   - Delivery timeframe
   - Copyright and usage rights

📋 Engagement Session (3 terms)
   - Session duration
   - Outfit changes allowed
   - Location restrictions

📋 Cancellation & Refund (4 terms)
   - Cancellation notice period
   - Refund policy
   - Rescheduling options
   - Force majeure clause
```

---

This visual guide helps you understand how the grouping feature works and how to use it effectively!
