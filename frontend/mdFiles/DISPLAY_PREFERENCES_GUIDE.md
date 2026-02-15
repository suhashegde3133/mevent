# Display Preferences Feature Guide

## Overview

Added view toggle functionality to both **Quotations** and **Billing** pages, allowing users to switch between **Table View** and **Grid View** for better data visualization preferences.

## Features Implemented

### 🎯 View Toggle Controls

Located next to the filter dropdown in the toolbar:

- **Table View (List Icon)**: Traditional tabular format with sortable columns
- **Grid View (Grid Icon)**: Card-based layout with enhanced visual presentation

### 📋 **Quotations Page**

#### Table View

- Sortable columns: Client Name, Date, Amount
- Full table with all quotation details
- Inline action buttons for each quotation

#### Grid View

- Responsive card grid layout (auto-fills based on screen width)
- Each card displays:
  - Quotation ID and status badge
  - Client avatar and information
  - Service tags
  - Amount, Date, and Valid Until with icons
  - Action buttons (View, Download, Email, Delete)
- Hover effects with shadow and lift animation
- Cards adapt to mobile screens (single column on small devices)

### 💰 **Billing Page**

#### Table View

- Sortable columns: Client Name, Due Date, Amount
- Complete invoice information in tabular format
- Status indicators and action buttons

#### Grid View

- Responsive card grid layout
- Each card shows:
  - Invoice ID and status badge
  - Client avatar and details
  - Service tags
  - Amount breakdown (Total, Paid, Balance) in highlighted section
  - Due date and payment method
  - Action buttons (View, Record Payment, Download, Email, Delete)
- Visual distinction for amount breakdown with color coding:
  - Total Amount: Dark gray
  - Paid: Green
  - Balance: Primary blue
- Hover animations for better interactivity

## 🎨 Visual Design

### Toggle Buttons

- Clean, modern toggle group with border
- Active state highlighted in primary blue (#6366f1)
- Hover effects for better user feedback
- Seamless transition between views

### Grid Cards

- White background with subtle shadow
- 12px border radius for modern look
- Hover effect: elevated shadow + 2px lift
- Consistent 1.5rem gap between cards
- Minimum card width: 350px
- Responsive: adapts to 1 column on mobile devices

### Icons

- List icon (FaList) for table view
- Grid icon (FaThLarge) for grid view
- Contextual icons in cards for better scanning

## 💡 User Experience Benefits

1. **Flexibility**: Users can choose their preferred viewing format
2. **Quick Scanning**: Grid view offers visual scanning of key information
3. **Detailed Analysis**: Table view provides dense data for comparison
4. **Mobile Friendly**: Grid view adapts better to smaller screens
5. **Persistent State**: View preference maintained during filtering and sorting

## 🔧 Technical Implementation

### State Management

```javascript
const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'
```

### Toggle Control

```jsx
<div className="quotations__view-toggle">
  <button
    className={`quotations__view-btn ${viewMode === "table" ? "active" : ""}`}
    onClick={() => setViewMode("table")}
  >
    <FaList />
  </button>
  <button
    className={`quotations__view-btn ${viewMode === "grid" ? "active" : ""}`}
    onClick={() => setViewMode("grid")}
  >
    <FaThLarge />
  </button>
</div>
```

### Conditional Rendering

- Uses ternary operators to switch between table and grid layouts
- Maintains all functionality (sorting, filtering, search) across both views
- Identical data operations regardless of view mode

## 📱 Responsive Behavior

### Desktop (> 768px)

- Grid: Multiple columns (auto-fill based on 350px min width)
- Table: Full horizontal scroll if needed

### Tablet (768px - 1024px)

- Grid: 2 columns typically
- Table: Horizontal scroll

### Mobile (< 768px)

- Grid: Single column (optimal for touch interaction)
- Table: Horizontal scroll with sticky first column

## 🚀 Usage Tips

1. **For Quick Overview**: Use Grid View to quickly scan quotations/invoices
2. **For Data Comparison**: Use Table View to compare values across columns
3. **On Mobile**: Grid View provides better touch interaction
4. **When Presenting**: Grid View looks more modern and visually appealing
5. **For Analysis**: Table View with sorting is ideal for detailed analysis

## 🎯 Future Enhancements (Potential)

- [ ] Remember user's view preference in localStorage
- [ ] Add "Compact" vs "Comfortable" density options
- [ ] Export view-specific reports (table to CSV, grid to PDF with cards)
- [ ] Add custom column visibility controls for table view
- [ ] Implement drag-and-drop reordering in grid view
- [ ] Add quick actions on card hover in grid view

## Files Modified

1. **src/pages/Quotations.jsx** - Added view toggle and grid layout
2. **src/pages/Quotations.scss** - Styled toggle buttons and grid cards
3. **src/pages/Billing.jsx** - Added view toggle and grid layout
4. **src/pages/Billing.scss** - Styled toggle buttons and grid cards

---

**Note**: Both views maintain full functionality including search, filtering, sorting, and all CRUD operations. The display preference is purely presentational and does not affect data handling.
