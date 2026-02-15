# Quotation-Policy Integration Guide

## Overview

The Quotations page now integrates with the Policy page to display **grouped terms and conditions** in the quotation creation form. Users can select terms from organized policy groups (e.g., Wedding Policy, Engagement Policy) with an intuitive checkbox interface.

## 🎯 Key Features

### 1. **Automatic Policy Loading**

- Policies are automatically loaded from LocalStorage when the Quotations page loads
- Groups are dynamically created based on your Policy page organization
- Real-time sync with Policy page data

### 2. **Grouped Display**

- Terms are organized by their policy groups
- Each group has a distinct green gradient header
- Shows count of terms in each group
- Alphabetically sorted groups for easy navigation

### 3. **Group Selection**

- **Group Checkbox**: Select/deselect all terms in a group at once
- **Indeterminate State**: Shows when some (but not all) terms in a group are selected
- **Individual Selection**: Click any term to toggle it on/off

### 4. **Visual Feedback**

- Selected terms have a green background highlight
- Hover effects for better interactivity
- Selection counter shows total terms selected
- Empty state when no policies are available

### 5. **Seamless Integration**

- Selected terms are saved with the quotation
- Terms appear in quotation PDFs and emails
- Maintains backward compatibility with existing quotations

## 📋 How It Works

### User Workflow

#### Creating a Quotation with Terms

1. **Open Quotation Form**

   - Click the "Create Quotation" button
   - Fill in client details and line items

2. **Select Terms & Conditions**
   - Scroll to the "Terms & Conditions" section
   - You'll see all your policy groups from the Policy page
3. **Select Terms**

   - **Option A**: Click the checkbox next to a group name to select all terms in that group
   - **Option B**: Click individual term checkboxes to select specific terms
   - **Mix & Match**: Combine terms from different groups as needed

4. **Review Selection**
   - See the selection counter at the bottom (e.g., "5 terms selected")
   - Selected terms have a green background
5. **Create Quotation**
   - Click "Create Quotation"
   - Selected terms are saved with the quotation

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Terms & Conditions                                         │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ☑ 📋 Wedding Policy                        3 terms    │ │ <- Group header (green)
│  ├───────────────────────────────────────────────────────┤ │
│  │ ☑ Full payment required 7 days before event          │ │ <- Selected term
│  │ ☐ Ceremony photos limited to 3 hours                 │ │
│  │ ☑ Client must provide shot list in advance           │ │ <- Selected term
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ☐ 📋 Engagement Policy                     2 terms    │ │ <- Group header
│  ├───────────────────────────────────────────────────────┤ │
│  │ ☐ Session duration is 2 hours maximum                │ │
│  │ ☐ Two outfit changes permitted                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │        2 terms selected                               │ │ <- Selection counter
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 UI Elements

### Group Header

- **Color**: Green gradient (#10b981 → #059669)
- **Components**:
  - Group checkbox (with indeterminate state)
  - 📋 Icon
  - Group name
  - Term count badge

### Individual Terms

- **Normal**: White background
- **Hover**: Light gray background (#f9fafb)
- **Selected**: Light green background (#f0fdf4)
- Checkbox + term text

### Selection Counter

- **Color**: Green background (#f0fdf4)
- **Border**: Light green (#bbf7d0)
- Shows number of selected terms

### Empty State

- Displays when no policies exist
- Prompts user to add policies on Policy page

## 💻 Technical Implementation

### State Management

```javascript
// Loaded from LocalStorage on component mount
const [availablePolicies, setAvailablePolicies] = useState([]);
const [groupedPolicies, setGroupedPolicies] = useState({});

// Selected terms stored in formData
formData.terms = ["term 1", "term 2", ...]
```

### Key Functions

#### `handleTermToggle(termContent)`

- Toggles individual term selection
- Adds/removes term from formData.terms array

#### `handleSelectGroup(groupName, selectAll)`

- Selects/deselects all terms in a group
- Parameters:
  - `groupName`: The name of the group
  - `selectAll`: Boolean to select (true) or deselect (false)

#### `isGroupFullySelected(groupName)`

- Returns true if all terms in group are selected
- Used for group checkbox checked state

#### `isGroupPartiallySelected(groupName)`

- Returns true if some (but not all) terms are selected
- Used for indeterminate checkbox state

### Data Structure

#### Loaded from Policy Page

```javascript
availablePolicies = [
  {
    id: 1697500000000,
    content: "Full payment required 7 days before event",
    group: "Wedding Policy",
    createdAt: "2025-10-17T10:30:00.000Z"
  },
  // ... more policies
]

groupedPolicies = {
  "Wedding Policy": [
    { id: ..., content: "...", group: "Wedding Policy" },
    { id: ..., content: "...", group: "Wedding Policy" }
  ],
  "Engagement Policy": [
    { id: ..., content: "...", group: "Engagement Policy" }
  ]
}
```

#### Stored in Quotation

```javascript
{
  id: "Q001",
  clientName: "John Doe",
  // ... other fields
  terms: [
    "Full payment required 7 days before event",
    "Client must provide shot list in advance"
  ]
}
```

## 🔄 Integration Flow

```
Policy Page → LocalStorage → Quotations Page
     ↓                           ↓
  Add/Edit                   Load Policies
  Policies                        ↓
     ↓                      Group by Category
  Save to                         ↓
  LocalStorage              Display in Form
                                  ↓
                           User Selects Terms
                                  ↓
                            Save Quotation
                                  ↓
                           Terms in Quotation
```

## 📱 Responsive Design

### Desktop

- Full width display
- Scrollable terms area (max 400px height)
- Smooth hover effects

### Mobile

- Adapts to single column layout
- Touch-friendly checkboxes
- Maintains scroll functionality

## ✨ User Benefits

### 1. **Consistency**

- Use the same terms across all quotations
- Maintain professional, standardized language

### 2. **Efficiency**

- No need to manually type terms
- Quick selection with group checkboxes
- Mix and match from different categories

### 3. **Organization**

- Terms organized by policy type
- Easy to find relevant terms
- Visual grouping reduces clutter

### 4. **Flexibility**

- Select individual terms or entire groups
- Create custom combinations
- Update terms centrally on Policy page

## 🔧 Customization Options

### Change Group Header Color

In `Quotations.jsx`, find the group header style:

```javascript
background: "linear-gradient(135deg, #10b981 0%, #059669 100%)";

// Change to blue:
background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";

// Change to purple:
background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)";
```

### Change Selected Term Background

Find the term label style:

```javascript
background: (formData.terms || []).includes(policy.content)
  ? "#f0fdf4"
  : "transparent";

// Change to blue:
background: (formData.terms || []).includes(policy.content)
  ? "#dbeafe"
  : "transparent";
```

### Adjust Max Height of Terms Area

In `Quotations.scss`:

```scss
.quotations__policy-groups {
  max-height: 400px; // Change to 600px for more visible terms
}
```

## 🐛 Troubleshooting

### No Policies Showing?

1. Check if policies exist on the Policy page
2. Verify policies have content and group assigned
3. Check browser console for errors
4. Clear cache and reload page

### Group Checkbox Not Working?

- The checkbox uses indeterminate state for partial selection
- Ensure all terms in group have the same group name (case-sensitive)
- Check that handleSelectGroup function is called

### Terms Not Saving with Quotation?

- Verify formData.terms is populated
- Check handleSubmitQuotation includes terms in payload
- Inspect LocalStorage for saved quotation

## 🚀 Future Enhancements

Potential improvements:

- **Search/Filter**: Add search box to filter terms
- **Preview**: Show selected terms in a preview panel
- **Drag & Drop**: Reorder selected terms
- **Templates**: Save term combinations as templates
- **Quick Actions**: "Select All" / "Clear All" buttons
- **Recent Terms**: Show most frequently used terms
- **Term Details**: Add descriptions/tooltips to terms

## 📊 Example Use Cases

### Wedding Photography Business

```
Selected Groups:
✓ Wedding Policy (all 5 terms)
✓ Payment Terms (3 of 4 terms)
✗ Cancellation Policy (0 terms)

Result: 8 terms added to quotation
```

### Event Photography

```
Custom Selection:
✓ Corporate Events Policy - Term 1
✓ Corporate Events Policy - Term 3
✓ General Terms - Term 2
✓ Delivery Terms - All terms

Result: 7 terms added to quotation
```

## 🔗 Related Files

```
src/pages/Quotations.jsx       - Main component with integration
src/pages/Quotations.scss      - Styling for terms section
src/pages/Policy.jsx           - Source of policy data
src/utils/storage.js           - LocalStorage utilities
src/utils/constants.js         - Storage keys
```

## 📝 Best Practices

### For Users

1. **Organize Well**: Keep policy groups well-organized on Policy page
2. **Clear Names**: Use clear, descriptive group names
3. **Review Selection**: Double-check selected terms before creating quotation
4. **Regular Updates**: Keep terms updated on Policy page
5. **Test Combinations**: Try different term combinations for different client types

### For Developers

1. **Maintain Sync**: Keep policy data structure consistent
2. **Error Handling**: Add try-catch for LocalStorage operations
3. **Performance**: Consider virtualization for very large term lists
4. **Accessibility**: Ensure keyboard navigation works
5. **Testing**: Test with various group/term combinations

---

**Version**: 1.0  
**Last Updated**: October 17, 2025  
**Integration Status**: ✅ Active and Functional
