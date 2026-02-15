# Column Preferences Feature Guide

## Overview

Added **Column Preferences** functionality to both **Quotations** and **Billing** pages, allowing users to customize which columns are visible in the table view. This feature enhances user experience by enabling personalized data views based on individual needs.

## 🎯 Features Implemented

### **Column Selector Button**

- **Icon**: Columns icon (`FaColumns`) located in the toolbar
- **Position**: Between the filter dropdown and view toggle buttons
- **Visibility**: Only appears when in **Table View** mode
- **Function**: Opens a dropdown menu to manage column visibility

### **Column Preferences Menu**

- **Dropdown Panel**: Appears below the column selector button
- **Header**: "Show Columns" with a close button (X)
- **Column List**: Checkbox list of all available columns
- **Visual Indicators**:
  - Checked: `FaCheckSquare` (blue icon)
  - Unchecked: `FaSquare` (outline icon)
- **Interactive**: Click any column to toggle its visibility
- **Real-time Updates**: Table updates instantly when columns are toggled

## 📋 Available Columns

### **Quotations Page**

1. ✅ **Quotation ID** - Unique identifier for each quotation
2. ✅ **Client** - Client name, avatar, and email
3. ✅ **Services** - List of services in the quotation
4. ✅ **Amount** - Total quotation amount (sortable)
5. ✅ **Date** - Quotation creation date (sortable)
6. ✅ **Valid Until** - Expiration date of the quotation
7. ✅ **Status** - Current status (pending/approved/rejected)
8. ✅ **Actions** - Action buttons (View, Download, Email, Delete)

### **Billing Page**

1. ✅ **Invoice ID** - Unique identifier for each invoice
2. ✅ **Client** - Client name, avatar, and email
3. ✅ **Services** - List of services in the invoice
4. ✅ **Amount** - Total invoice amount (sortable)
5. ✅ **Paid** - Amount already paid
6. ✅ **Balance** - Outstanding balance due
7. ✅ **Due Date** - Payment due date (sortable)
8. ✅ **Status** - Payment status (pending/partial/paid/overdue)
9. ✅ **Actions** - Action buttons (View, Record Payment, Download, Email, Delete)

## 🎨 Design & UX

### Visual Design

- **Menu Style**: Clean dropdown with white background and shadow
- **Hover Effect**: Light gray background on menu items
- **Icons**: Primary blue color (#6366f1) for consistency
- **Typography**: 0.875rem font size for readability
- **Spacing**: Comfortable padding and gaps between elements

### User Experience

- **One-Click Toggle**: Single click to show/hide any column
- **Instant Feedback**: Table updates immediately without page refresh
- **Persistent During Session**: Preferences maintained while navigating within the page
- **Non-Intrusive**: Menu closes when clicking the X button
- **Accessible**: Clear labels and visual indicators

### Responsive Behavior

- **Desktop**: Full menu displayed with all options
- **Tablet**: Maintained functionality with adjusted spacing
- **Mobile**: Column selector hidden (grid view recommended for mobile)

## 💡 Use Cases

### 1. **Simplified View**

Hide unnecessary columns to focus on key information:

- Hide "Valid Until" when viewing approved quotations
- Hide "Services" when analyzing amounts only
- Hide "Balance" on paid invoices

### 2. **Space Optimization**

Reduce horizontal scrolling by showing only relevant columns:

- Essential view: Client, Amount, Status, Actions
- Financial view: Amount, Paid, Balance, Status
- Date-focused view: Client, Date, Due Date, Status

### 3. **Print-Friendly Layout**

Customize columns before printing or exporting:

- Hide action buttons for cleaner printouts
- Show only client-relevant information
- Focus on financial data only

### 4. **Role-Based Customization**

Different users can focus on relevant data:

- **Accountants**: Amount, Paid, Balance, Status
- **Sales Team**: Client, Services, Amount, Status
- **Managers**: All columns for comprehensive overview

## 🔧 Technical Implementation

### State Management

```javascript
// Track visible columns
const [visibleColumns, setVisibleColumns] = useState({
  id: true,
  client: true,
  services: true,
  amount: true,
  // ... other columns
});

// Track menu visibility
const [showColumnMenu, setShowColumnMenu] = useState(false);
```

### Toggle Function

```javascript
const toggleColumn = (columnKey) => {
  setVisibleColumns({
    ...visibleColumns,
    [columnKey]: !visibleColumns[columnKey],
  });
};
```

### Column Configuration

```javascript
const columnOptions = [
  { key: "id", label: "Quotation ID" },
  { key: "client", label: "Client" },
  // ... other columns
];
```

### Conditional Rendering

```jsx
{
  /* Header */
}
{
  visibleColumns.client && <th>Client</th>;
}

{
  /* Body */
}
{
  visibleColumns.client && (
    <td>
      <div className="quotations__client">{/* Client content */}</div>
    </td>
  );
}
```

## 🚀 How to Use

### **Step 1: Open Column Preferences**

1. Navigate to Quotations or Billing page
2. Ensure you're in **Table View** (not Grid View)
3. Click the **Columns** icon (⊞) in the toolbar

### **Step 2: Customize Columns**

1. The column menu will appear below the button
2. Review the list of available columns
3. Click any column name to toggle its visibility
4. Checked items are visible; unchecked items are hidden

### **Step 3: Apply Changes**

- Changes apply instantly to the table
- No need to save or confirm
- Close the menu by clicking the X button

### **Step 4: Reset to Default**

- Simply check all boxes to show all columns
- Or uncheck all except essential columns

## 📊 Benefits

### **For Users**

- ✅ Personalized data views
- ✅ Reduced clutter and information overload
- ✅ Faster data scanning and analysis
- ✅ Better focus on relevant information
- ✅ Improved productivity

### **For the Application**

- ✅ Enhanced user experience
- ✅ Flexible data presentation
- ✅ Accommodates different user roles and needs
- ✅ Modern, professional interface
- ✅ Competitive feature set

## ⚙️ Configuration Details

### Default State

All columns are visible by default to ensure users see complete data initially.

### Minimum Columns

At least one column should remain visible for usability (though the system doesn't enforce this currently).

### Grid View

Column preferences only apply to table view. Grid view shows all data in card format and is not affected by column preferences.

### Persistence

Currently, preferences reset on page refresh. Future enhancement could save preferences to localStorage or user profile.

## 🎯 Future Enhancements (Potential)

- [ ] **Save Preferences**: Store column preferences in localStorage
- [ ] **User Profiles**: Save preferences to user account
- [ ] **Preset Views**: Quick access to predefined column sets
  - Minimal View
  - Financial View
  - Complete View
- [ ] **Column Reordering**: Drag and drop to reorder columns
- [ ] **Column Width**: Adjust column widths
- [ ] **Export Preferences**: Export data with selected columns only
- [ ] **Keyboard Shortcuts**: Quick toggle for common column sets
- [ ] **Column Groups**: Organize related columns together

## 📁 Files Modified

1. **src/pages/Quotations.jsx**

   - Added column visibility state
   - Implemented toggle functionality
   - Updated table rendering with conditional columns
   - Added column selector UI

2. **src/pages/Quotations.scss**

   - Styled column selector button
   - Styled dropdown menu
   - Added hover effects and transitions

3. **src/pages/Billing.jsx**

   - Added column visibility state
   - Implemented toggle functionality
   - Updated table rendering with conditional columns
   - Added column selector UI

4. **src/pages/Billing.scss**
   - Styled column selector button
   - Styled dropdown menu
   - Added hover effects and transitions

## 🔍 Testing Checklist

- [x] Column selector button appears in table view
- [x] Column selector hidden in grid view
- [x] Menu opens/closes correctly
- [x] All columns can be toggled on/off
- [x] Table updates instantly when toggling
- [x] Checkboxes reflect current state accurately
- [x] Sorting still works on visible columns
- [x] Search and filtering work with any column combination
- [x] No layout breaks with minimal columns shown
- [x] Close button (X) works properly

## 💬 User Tips

1. **Start Simple**: Hide less-used columns first to see the benefit
2. **Use with Filters**: Combine column preferences with status filters for focused views
3. **Try Different Combinations**: Experiment to find your ideal layout
4. **Match Your Task**: Adjust columns based on what you're doing
5. **Remember Grid View**: Switch to grid view for mobile or visual browsing

---

**Note**: This feature is designed to enhance flexibility without adding complexity. Users who prefer seeing all data can simply leave all columns checked. The default state shows everything, so the feature is optional and non-disruptive.
