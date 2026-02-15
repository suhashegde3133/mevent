# Team Payment Tracking - Quick Reference

## Quick Actions

### Add Payment

1. Click **+ Payment** button on team card
2. Select event, enter amount & date
3. Click **Add Payment**

### Update Status

- Click **Mark Paid** button on payment item

### Delete Payment

- Click **Delete** button → Confirm

## Payment Status Types

| Status  | Meaning        | Color  |
| ------- | -------------- | ------ |
| Pending | Not yet paid   | Yellow |
| Partial | Partially paid | Blue   |
| Paid    | Fully paid     | Green  |

## Team Card Display

```
┌─────────────────────────────┐
│      Team Member Card       │
├─────────────────────────────┤
│  Avatar (Initial)           │
│  Name                       │
│  Role                       │
│  Phone & Email              │
├─────────────────────────────┤
│  Payment Summary            │
│  • Total: $X,XXX.XX         │
│  • Paid: $X,XXX.XX          │
│  • Pending: $X,XXX.XX       │
│  • X payment record(s)      │
├─────────────────────────────┤
│  [Edit] [+ Payment] [Delete]│
├─────────────────────────────┤
│  Recent Payments (Last 3)   │
│  • Event Name | Status      │
│    Amount | Date            │
│    [Mark Paid] [Delete]     │
└─────────────────────────────┘
```

## Payment Data Flow

```
Event Created → Team Member Selected → Work Completed
                                              ↓
                                    Add Payment Record
                                              ↓
                                    Track Status (Pending)
                                              ↓
                                    Update to Paid
                                              ↓
                                    Reflected in Summary
```

## Storage Location

- **Key**: `photoflow_team`
- **Type**: JSON Array
- **Persistence**: localStorage

## Code Snippet - Payment Object

```javascript
{
  id: 1729425600000,
  eventId: "evt123",
  eventName: "Smith Wedding",
  amount: 500.00,
  date: "2025-10-20",
  status: "paid",
  notes: "Great work!"
}
```

## Calculations

### Total Payments

```
Sum of all payment amounts
```

### Paid Amount

```
Sum where status === 'paid'
```

### Pending Amount

```
Sum where status === 'pending' OR 'partial'
```

## Validation Requirements

| Field  | Requirement               |
| ------ | ------------------------- |
| Event  | Must select from dropdown |
| Amount | Number > 0                |
| Date   | Required (YYYY-MM-DD)     |
| Status | Default: pending          |
| Notes  | Optional                  |

## Common Workflows

### 1. Single Event Payment

```
Select Event → Enter Amount → Set Status → Save
```

### 2. Advance + Balance Payment

```
Payment 1: Partial ($250)
   ↓
Payment 2: Paid ($250)
   ↓
Total: $500 (Paid)
```

### 3. Multiple Events per Month

```
Event A → Add Payment → $300
Event B → Add Payment → $400
Event C → Add Payment → $500
Total Earned: $1,200
```

## Keyboard Shortcuts

- **Tab**: Navigate between form fields
- **Enter**: Submit form (when focused)
- **Esc**: Close modal

## Mobile Responsive

- ✅ Single column layout
- ✅ Stacked buttons
- ✅ Touch-friendly buttons
- ✅ Scrollable payment history

## Browser Compatibility

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ⚠️ Requires localStorage enabled

## Tips & Tricks

1. **Use Notes**: Add context like "Travel expenses included"
2. **Regular Updates**: Mark paid promptly for accurate tracking
3. **Event Naming**: Keep event names descriptive
4. **Review Regularly**: Check payment summaries weekly
5. **Delete Carefully**: Confirm before deleting payment records

## Troubleshooting

### Payment not showing?

- Check if event exists in Events page
- Verify localStorage not disabled
- Refresh page

### Total not updating?

- Ensure status is correct (paid/pending)
- Check amount is valid number
- Verify data saved (check console)

### Event not in dropdown?

- Create event first in Events page
- Refresh Team page
- Check STORAGE_KEYS.EVENTS

## Related Components

- **Events Page**: Source of events for dropdown
- **Modal Component**: Used for payment form
- **Storage Utils**: Handles localStorage operations

---

**Need Help?** See `TEAM_PAYMENT_TRACKING_GUIDE.md` for detailed documentation.
