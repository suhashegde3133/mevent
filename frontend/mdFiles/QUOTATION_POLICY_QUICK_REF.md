# Quick Reference: Policy-Quotation Integration

## 🎯 What Changed?

**Old**: Hard-coded terms in a confusing multi-select dropdown  
**New**: Dynamic, grouped terms with intuitive checkboxes loaded from Policy page

---

## ✅ Quick Start Guide

### For Users

1. **Add Terms on Policy Page**

   ```
   Policy Page → Click + → Enter Group & Term → Save
   ```

2. **Use Terms in Quotations**
   ```
   Quotations → Create Quotation → Scroll to Terms & Conditions
   → Click group checkbox or individual terms → Done!
   ```

### For Developers

**Files Modified:**

- `src/pages/Quotations.jsx` - Added policy loading and selection logic
- `src/pages/Quotations.scss` - Added styling for terms section

**Key Functions Added:**

```javascript
handleTermToggle(termContent); // Toggle individual term
handleSelectGroup(groupName, selectAll); // Select/deselect group
isGroupFullySelected(groupName); // Check if group fully selected
isGroupPartiallySelected(groupName); // Check partial selection
```

**State Added:**

```javascript
const [availablePolicies, setAvailablePolicies] = useState([]);
const [groupedPolicies, setGroupedPolicies] = useState({});
```

---

## 🎨 UI Components

### Group Header

```
☑ 📋 Wedding Policy                    5 terms
├─ Green gradient background (#10b981 → #059669)
├─ Checkbox (with indeterminate state)
├─ Icon 📋
├─ Group name
└─ Term count badge
```

### Individual Term

```
☑ Full payment required 7 days before event
├─ Checkbox (accent color: #10b981)
├─ Term content
├─ Hover effect (background changes)
└─ Selected state (light green background #f0fdf4)
```

### Selection Counter

```
5 terms selected
├─ Green background (#f0fdf4)
└─ Green border (#bbf7d0)
```

---

## 🔍 Checkbox States

| State         | Visual | Meaning                       |
| ------------- | ------ | ----------------------------- |
| Unchecked     | ☐      | No terms selected in group    |
| Indeterminate | ◐      | Some (not all) terms selected |
| Checked       | ☑      | All terms in group selected   |

---

## ⚡ Quick Actions

| Action                          | Result                      |
| ------------------------------- | --------------------------- |
| Click group checkbox when empty | Select all terms in group   |
| Click group checkbox when full  | Deselect all terms in group |
| Click individual term checkbox  | Toggle that term            |
| Hover over term                 | Background changes to gray  |
| Select term                     | Background changes to green |

---

## 📊 Data Flow

```
Policy Page
    ↓
LocalStorage (STORAGE_KEYS.POLICY)
    ↓
Quotations Page (useEffect loads on mount)
    ↓
availablePolicies → groupedPolicies (grouped by 'group' field)
    ↓
UI Renders (grouped checkboxes)
    ↓
User Selects Terms
    ↓
formData.terms = ["term 1", "term 2", ...]
    ↓
Create Quotation
    ↓
Saved to LocalStorage with selected terms
```

---

## 🎯 Common Use Cases

### 1. Select All Terms from One Group

```
✓ Click the group checkbox
→ All terms in that group selected instantly
```

### 2. Select Specific Terms from Multiple Groups

```
✓ Click individual term checkboxes
→ Terms from any group can be selected
```

### 3. Select Most Terms, Exclude Few

```
✓ Click group checkbox (selects all)
✓ Unclick the few you don't want
→ Group becomes "indeterminate" state
```

### 4. No Policies Available

```
✓ Empty state displays
✓ Message: "Go to Policy page to add terms"
→ User knows what to do
```

---

## 🎨 Customization Quick Reference

### Change Group Header Color

```javascript
// In Quotations.jsx, line ~1220
background: "linear-gradient(135deg, #10b981 0%, #059669 100%)";

// Blue variant:
background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";
```

### Change Checkbox Accent Color

```javascript
// In Quotations.jsx, individual term checkbox
accentColor: "#10b981";

// Blue variant:
accentColor: "#3b82f6";
```

### Change Max Height of Terms Area

```scss
// In Quotations.scss
.quotations__policy-groups {
  max-height: 400px; // Increase for more visible terms
}
```

---

## 🐛 Troubleshooting

| Issue                           | Solution                             |
| ------------------------------- | ------------------------------------ |
| No terms showing                | Add policies on Policy page          |
| Group checkbox not working      | Check all terms have same group name |
| Terms not saving                | Verify formData.terms is populated   |
| Indeterminate state not showing | Ensure ref callback is working       |
| Scrollbar not appearing         | Check if terms exceed 400px height   |

---

## 📱 Responsive Behavior

| Screen Size        | Behavior                                     |
| ------------------ | -------------------------------------------- |
| Desktop (>900px)   | Full layout, smooth hover effects            |
| Tablet (600-900px) | Slightly compressed, maintains functionality |
| Mobile (<600px)    | Touch-friendly, stacked layout               |

---

## 🔗 Related Documentation

- `POLICY_GROUPING_GUIDE.md` - Policy page features
- `QUOTATION_POLICY_INTEGRATION.md` - Detailed integration guide
- `QUOTATION_TERMS_BEFORE_AFTER.md` - Visual comparison

---

## 📋 Testing Checklist

- [ ] Add policy on Policy page
- [ ] Open Quotations page
- [ ] Verify policy appears in terms section
- [ ] Click group checkbox (should select all terms)
- [ ] Click group checkbox again (should deselect all)
- [ ] Click individual term (should toggle)
- [ ] Select terms from multiple groups
- [ ] Verify selection counter updates
- [ ] Create quotation
- [ ] Verify terms saved in quotation
- [ ] Test on mobile device

---

## 💡 Pro Tips

1. **Organize First**: Set up policy groups before creating quotations
2. **Standard Terms**: Create common groups (Payment, Cancellation, etc.)
3. **Group Selection**: Use group checkbox for speed
4. **Mix & Match**: Combine terms from different groups as needed
5. **Review**: Check selection counter before creating quotation
6. **Keep Updated**: Update terms on Policy page, they sync automatically

---

## 🎓 Key Benefits

| Benefit             | Impact                            |
| ------------------- | --------------------------------- |
| **Dynamic**         | No code changes to add/edit terms |
| **Organized**       | Terms grouped by category         |
| **Intuitive**       | Simple checkbox interface         |
| **Fast**            | Group selection saves time        |
| **Scalable**        | Handles unlimited terms           |
| **Professional**    | Polished, branded appearance      |
| **Mobile-Friendly** | Works great on all devices        |

---

## 🚀 Next Steps

1. ✅ Add your policy terms on the Policy page
2. ✅ Create policy groups (Wedding, Corporate, etc.)
3. ✅ Test the integration in Quotations
4. ✅ Create your first quotation with grouped terms
5. 🎉 Enjoy the improved workflow!

---

**Quick Help**: If you encounter issues, check the detailed guides in:

- `QUOTATION_POLICY_INTEGRATION.md`
- `POLICY_GROUPING_GUIDE.md`

**Version**: 1.0 | **Status**: ✅ Active
