# Team Payment Tracking Guide

## Overview

The Team page now includes comprehensive payment tracking functionality that allows you to manage and track individual team member payments for each event.

## Features Added

### 1. Payment Summary on Team Cards

Each team member card now displays:

- **Total Payments**: Sum of all payment amounts
- **Paid Amount**: Sum of payments marked as "paid"
- **Pending Amount**: Sum of payments with "pending" or "partial" status
- **Payment Record Count**: Number of payment entries

### 2. Add Payment Functionality

- **+ Payment Button**: Click to add a new payment record for a team member
- **Event Selection**: Choose from existing events in the system
- **Amount**: Enter payment amount in dollars
- **Payment Date**: Select the date of payment
- **Status Options**:
  - `Pending`: Payment not yet received
  - `Partial`: Partial payment received
  - `Paid`: Full payment completed
- **Notes**: Optional field for additional payment details

### 3. Payment History Display

Each team card shows the 3 most recent payments with:

- Event name
- Payment status badge (color-coded)
- Payment amount
- Payment date
- Optional notes
- Quick action buttons

### 4. Payment Management Actions

- **Mark Paid**: Quickly update pending/partial payments to paid status
- **Delete**: Remove payment records (with confirmation)
- **Status Badges**: Visual indicators for payment status
  - Green: Paid
  - Yellow: Pending
  - Blue: Partial

## Data Structure

### Team Member Object

```javascript
{
  id: number,
  name: string,
  role: string,
  phone: string,
  email: string,
  avatar: null,
  payments: [
    {
      id: timestamp,
      eventId: string,
      eventName: string,
      amount: number,
      date: string (YYYY-MM-DD),
      status: 'pending' | 'partial' | 'paid',
      notes: string
    }
  ]
}
```

## Usage Workflow

### Adding a Payment

1. Navigate to the Team page
2. Find the team member card
3. Click the **+ Payment** button (blue)
4. Fill in the payment form:
   - Select the event from dropdown
   - Enter payment amount
   - Select payment date
   - Choose payment status
   - Add optional notes
5. Click **Add Payment**

### Updating Payment Status

1. Locate the payment in the team member's payment history
2. Click **Mark Paid** button to change status to paid
3. Changes are saved automatically to localStorage

### Deleting a Payment

1. Find the payment record
2. Click the **Delete** button
3. Confirm the deletion in the dialog
4. Payment is removed and totals are updated

### Viewing Payment History

- The 3 most recent payments are displayed on each card
- If more than 3 payments exist, a message shows: "+ X more payment(s)"
- Payments are displayed newest first

## Storage

- All team member data including payments is stored in localStorage
- Storage Key: `photoflow_team`
- Data persists across browser sessions
- Automatic save on every change

## UI/UX Features

### Color Coding

- **Total Amount**: Gray (#374151)
- **Paid Amount**: Green (#10b981)
- **Pending Amount**: Orange (#f59e0b)
- **Paid Status Badge**: Green background
- **Pending Status Badge**: Yellow background
- **Partial Status Badge**: Blue background

### Responsive Design

- Payment cards adapt to mobile screens
- Button layout wraps on smaller devices
- Payment history stacks vertically

### Visual Feedback

- Hover effects on buttons
- Smooth transitions
- Status badges with clear colors
- Error messages for validation

## Validation Rules

### Payment Form Validation

- **Event**: Required field
- **Amount**: Must be a positive number greater than 0
- **Date**: Required field
- **Status**: Default to "pending"
- **Notes**: Optional

### Error Messages

- "Please select an event" - When no event is selected
- "Enter a valid amount" - When amount is invalid or ≤ 0
- "Payment date is required" - When date is missing

## Integration with Events

- Payments are linked to specific events via `eventId`
- Event dropdown shows:
  - Client name or event identifier
  - Event date (if available)
- Event name is auto-filled when event is selected

## Benefits

1. **Track Individual Earnings**: Monitor how much each team member has earned
2. **Payment Status Visibility**: Quickly see what's paid vs pending
3. **Event Association**: Link payments to specific projects/events
4. **Financial Transparency**: Clear payment history for team members
5. **Easy Management**: Quick actions to update status or delete records

## Future Enhancements (Potential)

- Export payment reports to CSV/PDF
- Filter payments by date range or status
- Payment reminders for pending amounts
- Batch payment entry
- Payment receipt generation
- Analytics dashboard for team earnings
- Payment history pagination for members with many records
- Search/filter within payment history

## Technical Notes

- Payment IDs use timestamp (`Date.now()`) for uniqueness
- All monetary values stored as floats with 2 decimal precision
- Dates stored in ISO format (YYYY-MM-DD)
- Event data loaded from `STORAGE_KEYS.EVENTS`
- Backwards compatible - existing team members without payments property will work fine

## Example Use Cases

### Scenario 1: Wedding Photography Event

1. Event completed: "Smith Wedding"
2. Navigate to Team page
3. Find photographer "John Doe"
4. Click "+ Payment"
5. Select "Smith Wedding" event
6. Enter amount: $500
7. Status: Paid
8. Notes: "Excellent work on ceremony shots"
9. Save payment

### Scenario 2: Tracking Partial Payments

1. Add payment for "Johnson Birthday" event
2. Amount: $300
3. Status: Partial
4. Notes: "50% advance payment"
5. Later, update status to "Paid" when remaining amount received

### Scenario 3: Managing Multiple Events

- Team member works on 5 events in a month
- Add payment record for each event separately
- View total earnings across all events
- Track which events have pending payments

## Tips

- Add payments immediately after events to maintain accurate records
- Use notes field to add context (advance, bonus, travel expenses, etc.)
- Regularly update pending payments to paid status
- Review payment summaries during team meetings
- Keep event names descriptive for easy identification

---

**Version**: 1.0  
**Last Updated**: October 2025  
**Component**: Team.jsx, Team.scss  
**Storage Key**: photoflow_team
