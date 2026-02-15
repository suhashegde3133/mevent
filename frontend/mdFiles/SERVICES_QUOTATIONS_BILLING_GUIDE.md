# PhotoFlow - Services, Quotations & Billing System

## Overview

This update replaces the Gallery functionality with a comprehensive business management system for photography services, including Services management, Quotations, and Billing/Invoicing.

## New Features

### 1. **Services Management** (`/services`)

A complete service catalog system for managing your photography offerings.

#### Features:

- **Service Catalog**: Display all photography services (Wedding, Portrait, Event Coverage, Video Production, etc.)
- **Add/Edit Services**:
  - Service name and category
  - Description and pricing
  - Duration and deliverables
  - Features list
  - Mark as popular service
  - Active/Inactive status
- **Service Categories**: Photography, Videography, Post-Production, Commercial
- **Search & Filter**: Search services by name/description, filter by category
- **Statistics Dashboard**:
  - Total services count
  - Popular services count
  - Active services count
  - Total value of all services

#### Usage:

1. Navigate to Services from the sidebar
2. Click "Add New Service" to create a new service package
3. Fill in service details, pricing, deliverables, and features
4. Mark popular services with a badge
5. Edit or delete existing services using the action buttons

---

### 2. **Quotations** (`/quotations`)

Professional quotation/proposal generation for clients.

#### Features:

- **Create Quotations**:
  - Client information (name, email)
  - Multiple line items with services
  - Quantity and pricing per item
  - Service descriptions
  - Discount and tax calculations
  - Validity period (days)
  - Notes and terms
- **Quotation Management**:
  - View all quotations in a table
  - Filter by status (pending, approved, rejected)
  - Search by client name, ID, or email
  - Approve/reject quotations
- **Status Tracking**:
  - Pending (awaiting client response)
  - Approved (client accepted)
  - Rejected (client declined)
- **Statistics Dashboard**:
  - Total quotations count
  - Pending quotations
  - Approved quotations
  - Total value of all quotations
- **Actions**:
  - View quotation details
  - Download as PDF (placeholder)
  - Send via email (placeholder)
  - Delete quotation

#### Usage:

1. Navigate to Quotations from the sidebar
2. Click "New Quotation" to create a quotation
3. Enter client details
4. Add line items by selecting services
5. Adjust quantity and pricing
6. Add discount and tax percentages
7. Set validity period
8. Click "Create Quotation"

---

### 3. **Billing & Invoices** (`/billing`)

Complete invoicing and payment tracking system.

#### Features:

- **Invoice Management**:
  - Automatic invoice generation from quotations
  - Track invoice status (paid, partial, pending, overdue)
  - Payment tracking and history
  - Due date management
- **Payment Recording**:
  - Record partial or full payments
  - Multiple payment methods (Bank Transfer, Credit Card, PayPal, Cash, Check)
  - Payment date and reference number
  - Payment notes
- **Status System**:
  - **Paid**: Fully paid invoices
  - **Partial**: Partially paid invoices
  - **Pending**: Awaiting payment
  - **Overdue**: Past due date
- **Statistics Dashboard**:
  - Total invoices count
  - Total paid amount
  - Pending payment amount
  - Overdue invoices count
- **Invoice Details**:
  - Client information
  - Services provided
  - Total amount, paid amount, balance due
  - Issue date and due date
  - Payment method
  - Linked quotation ID
- **Actions**:
  - View invoice details
  - Record payments
  - Download as PDF (placeholder)
  - Send via email (placeholder)
  - Delete invoice

#### Usage:

1. Navigate to Billing from the sidebar
2. View all invoices with their payment status
3. Click "Record Payment" on unpaid invoices
4. Enter payment details:
   - Payment amount
   - Payment method
   - Payment date
   - Reference number
   - Notes
5. Submit to update invoice status
6. View invoice details by clicking the eye icon

---

## Navigation

The sidebar has been updated with the following menu items:

- **Dashboard** - Main overview
- **Projects** - Project management
- **Calendar** - Schedule and appointments
- **Team** - Team management
- **Clients** - Client database
- **Services** 📷 - Service catalog (NEW)
- **Quotations** 📄 - Quotation management (NEW)
- **Billing** 💰 - Invoice & payment tracking (NEW)
- **Chat** - Communication
- **Settings** - Application settings

---

## Technical Details

### New Files Created:

1. `src/pages/Services.jsx` - Services management component
2. `src/pages/Services.scss` - Services styling
3. `src/pages/Quotations.jsx` - Quotations management component
4. `src/pages/Quotations.scss` - Quotations styling
5. `src/pages/Billing.jsx` - Billing management component
6. `src/pages/Billing.scss` - Billing styling

### Files Modified:

1. `src/routes/AppRoutes.jsx` - Added routes for new pages
2. `src/components/Sidebar/Sidebar.jsx` - Updated navigation menu

### Components Used:

- **Modal**: Reusable modal component for forms and views
- **React Icons**: FaCamera, FaFileInvoice, FaFileInvoiceDollar, etc.
- **React Router**: Navigation between pages
- **Redux**: State management (sidebar state)

---

## Data Flow

### Services → Quotations → Billing

1. **Create Services** in the Services page
2. **Create Quotations** using those services for clients
3. **Generate Invoices** from approved quotations (manual process in current version)
4. **Track Payments** until invoices are fully paid

---

## Mock Data

All pages currently use mock data stored in component state. In production:

- Services should be stored in a database
- Quotations linked to clients and services
- Invoices linked to quotations
- Payment history tracked with timestamps
- PDF generation for quotations and invoices
- Email integration for sending documents

---

## Responsive Design

All three pages are fully responsive with:

- Mobile-friendly layouts
- Collapsible tables
- Touch-friendly buttons
- Optimized forms for small screens

---

## Future Enhancements

1. **PDF Generation**:

   - Export quotations and invoices as PDF
   - Custom branding and templates

2. **Email Integration**:

   - Send quotations directly to clients
   - Automated invoice reminders
   - Payment confirmations

3. **Payment Gateway Integration**:

   - Accept online payments
   - Stripe, PayPal, Square integration
   - Automated payment recording

4. **Recurring Invoices**:

   - Subscription-based services
   - Automatic invoice generation

5. **Reports & Analytics**:

   - Revenue reports
   - Service performance
   - Client payment history
   - Outstanding invoices report

6. **Client Portal**:

   - Clients can view quotations
   - Accept/reject proposals
   - View invoices and make payments
   - Download documents

7. **Notifications**:
   - Payment reminders
   - Overdue notifications
   - New quotation alerts

---

## Notes

- All pages maintain the existing PhotoFlow design system
- Color scheme and styling consistent across the application
- Modal forms validate required fields
- Status indicators use color coding for quick recognition
- Search and filter functionality on all list views
- Statistics cards provide at-a-glance insights

---

## Testing

To test the new features:

1. Navigate to `/services` and create a few service packages
2. Go to `/quotations` and create quotations using those services
3. View quotations and approve some
4. Navigate to `/billing` to see sample invoices
5. Record payments on unpaid invoices
6. Use search and filter features to find specific items

---

## Support

For questions or issues with the new features, please refer to the component source code or contact the development team.
