# Memory System Commands Reference

## Overview
The BCI Memory System allows Claude to create, update, and manage a virtual file system that persists across conversations. All commands are invisible to the user when using the hidden JSON format.

## Command Formats

### 1. Hidden JSON Format (Recommended - Invisible to User)

The memory action is embedded in HTML comments and removed from the displayed message:

```
<!--MEMORY_ACTION-->
```json
{
  "operation": "create|update|append|delete",
  "data": {
    // operation-specific data
  }
}
```
<!--END_MEMORY_ACTION-->
```

### 2. Operations

#### CREATE - Create a new node (folder or document)

```json
{
  "operation": "create",
  "data": {
    "name": "Document Name",           // Required
    "type": "document|folder",         // Optional (auto-detected from name)
    "content": "# Content here...",    // Optional (for documents)
    "parent_name": "Parent Folder",    // Optional (find parent by name)
    "path": "Folder1/Folder2",         // Optional (auto-create path)
    "color": "#6E6E80",                // Optional (default: #6E6E80)
    "icon": "📄"                       // Optional (auto-assigned by type)
  }
}
```

**Examples:**

Create a simple document:
```json
{
  "operation": "create",
  "data": {
    "name": "README.md",
    "content": "# Project Overview\n\nThis is the documentation."
  }
}
```

Create in a specific folder:
```json
{
  "operation": "create",
  "data": {
    "name": "api.md",
    "parent_name": "Documentation",
    "content": "# API Reference"
  }
}
```

Create with auto-path (creates missing folders):
```json
{
  "operation": "create",
  "data": {
    "name": "guide.md",
    "path": "Documentation/Tutorials/Getting Started",
    "content": "# Welcome"
  }
}
```

#### UPDATE - Modify existing content

```json
{
  "operation": "update",
  "data": {
    "name": "Document Name",        // Find by name
    "content": "New content",        // New content
    "new_name": "Renamed.md"         // Optional: rename
  }
}
```

#### APPEND - Add content to existing document

```json
{
  "operation": "append",
  "data": {
    "name": "Document Name",
    "content": "\n## New Section\n\nAdditional content..."
  }
}
```

#### DELETE - Remove a node

```json
{
  "operation": "delete",
  "data": {
    "name": "Document Name"    // Find and delete by name
  }
}
```

## Usage Examples in Conversation

### Example 1: Creating Project Structure

User: "Create a project structure for my web app"

Claude's response:
```
I'll create a comprehensive project structure for your web app.

<!--MEMORY_ACTION-->
```json
{
  "operation": "create",
  "data": {
    "name": "Project Structure",
    "type": "folder"
  }
}
```
<!--END_MEMORY_ACTION-->

<!--MEMORY_ACTION-->
```json
{
  "operation": "create",
  "data": {
    "name": "README.md",
    "parent_name": "Project Structure",
    "content": "# Web Application\n\n## Overview\nA modern web application with React and Node.js\n\n## Structure\n- `/src` - Source code\n- `/public` - Static assets\n- `/docs` - Documentation"
  }
}
```
<!--END_MEMORY_ACTION-->

Done! I've created the project structure in your memory system.
```

### Example 2: Updating Documentation

User: "Update the README with installation instructions"

Claude's response:
```
I'll add installation instructions to your README.

<!--MEMORY_ACTION-->
```json
{
  "operation": "append",
  "data": {
    "name": "README.md",
    "content": "\n\n## Installation\n\n1. Clone the repository\n2. Run `npm install`\n3. Start with `npm run dev`"
  }
}
```
<!--END_MEMORY_ACTION-->

Installation instructions have been added to your README.
```

## Features

### Auto-Detection
- **Type Detection**: Files ending with `.md`, `.txt`, `.js` etc. are automatically marked as documents
- **Folder Detection**: Names without extensions are treated as folders
- **Icon Assignment**: 📁 for folders, 📄 for documents

### Path Handling
- **Auto-Create Paths**: Using `"path": "A/B/C"` automatically creates missing parent folders
- **Parent Resolution**: `"parent_name": "Folder"` finds the parent folder by name
- **Nested Structures**: Full support for deeply nested folder structures

### Content Management
- **Markdown Support**: Full markdown formatting in document content
- **Append Mode**: Add content without overwriting existing data
- **Rename Support**: Change node names while preserving structure

## Best Practices

1. **Use Hidden Format**: Always use `<!--MEMORY_ACTION-->` format to keep commands invisible
2. **Descriptive Names**: Use clear, descriptive names for folders and documents
3. **Organize by Topic**: Create logical folder structures (Documentation, Code, Notes, etc.)
4. **Incremental Updates**: Use `append` operation to add content without losing existing data
5. **Path Creation**: Leverage auto-path creation for quick structure building

## Error Handling

The system handles various edge cases:
- Missing parents are auto-created when using paths
- Duplicate names in the same folder are prevented
- Non-existent nodes for update/delete create new ones or show warnings
- Invalid JSON is logged but doesn't break the conversation

## Integration with UI

Users can:
- View the memory structure in the left sidebar
- Double-click to open documents in a modal editor
- Drag & drop to reorganize structure
- Rename folders inline
- Manually create/edit/delete nodes

All changes made by Claude are immediately reflected in the UI through real-time Supabase subscriptions.