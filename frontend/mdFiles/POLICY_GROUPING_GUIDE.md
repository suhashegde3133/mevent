# Policy Grouping Feature Guide

## Overview

The Policy page now includes a powerful **Terms & Conditions Grouping** feature that allows you to organize your policies into logical categories. This makes it easier to manage different sets of terms for various event types or services.

## Features

### 1. **Group/Category Assignment**

- When adding or editing a term, you can now assign it to a specific group
- Groups are created automatically when you enter a new group name
- Examples of groups:
  - Wedding Policy
  - Engagement Policy
  - Corporate Events Policy
  - Birthday Party Policy
  - Portrait Session Policy

### 2. **Group Filter Dropdown**

- Filter your terms by specific groups
- "All Groups" option shows all terms across all groups
- Dynamically updated based on your existing groups

### 3. **Organized Group Display**

- Terms are displayed grouped together under their category headers
- Each group shows:
  - Group name with an icon (📋)
  - Number of terms in that group
  - All terms belonging to that group in a table format

### 4. **Search Functionality**

- Search works across both term content and group names
- Easily find specific terms or entire groups

## How to Use

### Adding a New Term with a Group

1. Click the **+** button to open the form
2. Enter a **Group/Category** name (e.g., "Wedding Policy")
   - If left empty, the term will be assigned to "Uncategorized"
3. Enter your **Terms & Conditions** text
4. Click **Add Term**

### Editing a Term's Group

1. Click the **✏️ (Edit)** button on any term
2. Modify the **Group/Category** field to change the group
3. Update the content if needed
4. Click **Update**

### Filtering by Group

1. Use the **Group Filter** dropdown at the top
2. Select a specific group to view only terms in that category
3. Select "All Groups" to see all terms

### Searching Terms

1. Use the **Search** box to find terms
2. The search looks for matches in both:
   - Term content
   - Group names

## Benefits

### Organization

- Keep related terms together
- Easy to find and manage specific policy types

### Reusability

- Create policy templates for different event types
- Apply consistent terms across similar projects

### Scalability

- As your business grows, easily add new policy categories
- Maintain clarity even with many terms

### Professional Presentation

- Organized, categorized terms look more professional
- Easy to copy/paste entire groups when needed

## Example Use Cases

### Wedding Photography Business

```
Groups:
- Wedding Policy (ceremony rules, timeline, payment terms)
- Engagement Policy (session duration, outfit changes)
- Pre-wedding Policy (location permissions, timing)
```

### Multi-Service Photography

```
Groups:
- Event Photography (corporate events, parties)
- Portrait Sessions (studio terms, outdoor sessions)
- Commercial Work (usage rights, delivery timeline)
- Product Photography (retouching, file formats)
```

### Event-Based Organization

```
Groups:
- Cancellation Policy (refunds, rescheduling)
- Payment Terms (deposits, final payment)
- Delivery Terms (timeline, format, revisions)
- Client Responsibilities (preparation, cooperation)
```

## UI Features

### Visual Hierarchy

- Each group has a distinct green gradient header
- Group count badge shows number of terms
- Clean, organized table layout within each group

### Responsive Design

- Works seamlessly on desktop and mobile devices
- Filter controls stack vertically on smaller screens
- Easy to navigate and use on any device

## Data Storage

- All policies are stored in browser LocalStorage
- Group assignments are saved with each term
- Data persists between sessions
- Can be exported/imported if needed

## Tips for Best Practices

1. **Use Clear Group Names**: Choose descriptive names like "Wedding Photography Policy" instead of just "Wedding"

2. **Consistent Naming**: Use consistent capitalization and formatting for group names

3. **Logical Grouping**: Group terms by event type, service type, or policy category depending on your business needs

4. **Start Broad**: Begin with general categories and create more specific groups as needed

5. **Regular Review**: Periodically review and consolidate groups to avoid duplication

## Future Enhancements

Potential future features could include:

- Bulk operations (move multiple terms to a different group)
- Group templates with pre-filled common terms
- Export specific groups to PDF or document formats
- Copy entire groups to duplicate for similar services
- Group color customization
- Drag-and-drop reordering within groups

## Technical Details

### Data Structure

Each policy item now includes:

```javascript
{
  id: timestamp,
  content: "The terms and conditions text",
  group: "Wedding Policy",
  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp" // when edited
}
```

### Default Behavior

- If no group is specified, terms are assigned to "Uncategorized"
- Existing terms without groups will show in "Uncategorized"
- Groups are sorted alphabetically in the filter dropdown

## Backward Compatibility

- Existing policies without group assignments will automatically appear in the "Uncategorized" group
- No data migration needed
- All existing functionality remains intact

---

**Version**: 1.0  
**Last Updated**: October 17, 2025  
**Feature Status**: ✅ Active
