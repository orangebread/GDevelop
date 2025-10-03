# File-Based Storage Implementation Summary

## Overview

This document summarizes the implementation of file-based persistence for AI conversations in your personal GDevelop fork. This enables unauthenticated usage of the Ask AI feature when users provide their own OpenAI or Anthropic API keys.

## Implementation Date

2025-10-03

## Files Created

### 1. `newIDE/electron-app/app/main/aiFileStorage.js`
- **Purpose**: Main process IPC handler for file-based AI conversation storage
- **Key Features**:
  - Atomic writes using temp files + rename
  - NDJSON format for messages (append-only)
  - JSON format for metadata and index
  - Storage location: `userData/gdevelop-ai/`
  - IPC handlers: `aiStorage:list`, `aiStorage:read`, `aiStorage:writeMeta`, `aiStorage:appendMessage`, `aiStorage:delete`

### 2. `newIDE/app/src/AiGeneration/FileAiRequestStorage.js`
- **Purpose**: Renderer-side wrapper for file storage (drop-in replacement for LocalAiRequestStorage)
- **Key Features**:
  - Async API using IPC
  - Converts between AiRequest format and file storage format
  - Methods: `save()`, `load()`, `loadAll()`, `delete()`, `export()`, `import()`
  - Graceful fallback when not in Electron environment

## Files Modified

### 1. `newIDE/electron-app/app/main.js`
- **Changes**:
  - Added import for `registerAiStorageHandlers`
  - Called `registerAiStorageHandlers()` during app initialization

### 2. `newIDE/app/src/AiGeneration/AiRequestContext.js`
- **Changes**:
  - Added imports for `PreferencesContext` and `FileAiRequestStorage`
  - Modified `useAiRequestsStorage` to load from file storage on mount
  - Modified `updateAiRequest` to persist to file storage when custom AI is enabled

### 3. `newIDE/app/src/AiGeneration/AskAiHistory.js`
- **Changes**:
  - Added import for `FileAiRequestStorage`
  - Modified `fetchAiRequests` to merge local (file-based) and backend conversations
  - Sorts merged conversations by `updatedAt` (newest first)

### 4. `newIDE/app/src/AiGeneration/AskAiEditorContainer.js`
- **Changes**:
  - Added imports for `useAIService` and `FileAiRequestStorage`
  - Added `aiService` hook
  - Modified authentication check to allow unauthenticated usage when custom AI is enabled
  - Modified `createAiRequest` flow to use `aiService.createAiRequest()` when custom AI is enabled
  - Modified `addMessage` flow to use `aiService.addMessage()` when custom AI is enabled
  - Skips analytics and limits refresh for custom AI
  - Persists to file storage after each AI request/message when custom AI is enabled

## Storage Structure

```
<userData>/gdevelop-ai/
  index.json                        # List of conversations (id, title, updatedAt, projectId)
  conversations/
    <conversationId>/
      meta.json                     # Metadata: title, createdAt, updatedAt, projectId, mode
      messages.ndjson               # Append-only line-delimited JSON (one message per line)
  backups/                          # Reserved for future use
    <YYYY-MM-DD>/
      <conversationId>.ndjson
```

## Key Design Decisions

1. **File-based vs LocalStorage**: Chose file-based storage for durability and no size limits
2. **NDJSON for messages**: Append-only format is efficient and allows streaming in the future
3. **Atomic writes**: Prevents corruption from crashes or power loss
4. **IPC architecture**: Clean separation between main and renderer processes
5. **Drop-in replacement**: FileAiRequestStorage has same API as LocalAiRequestStorage for easy migration

## Usage Flow

### Unauthenticated User with Custom AI

1. User enables Custom AI in Preferences
2. User enters OpenAI/Anthropic API key
3. User opens Ask AI panel (no login required)
4. User sends message → `aiService.createAiRequest()` → saved to file storage
5. AI responds → conversation persisted to `userData/gdevelop-ai/conversations/<id>/`
6. User sends follow-up → `aiService.addMessage()` → appended to messages.ndjson
7. User closes app → conversations remain on disk
8. User reopens app → conversations loaded from file storage

### Authenticated User with Custom AI

1. Same as above, but user is logged in
2. Backend conversations and local conversations are merged in history panel
3. Backend conversations take precedence if same ID exists

## Testing Checklist

- [ ] Build passes: `cd newIDE/app && npm run build`
- [ ] Launch app in development mode
- [ ] Enable Custom AI in Preferences
- [ ] Enter API key (OpenAI or Anthropic)
- [ ] Start a chat without logging in
- [ ] Verify response appears
- [ ] Send follow-up message
- [ ] Verify conversation continues
- [ ] Close and reopen app
- [ ] Verify conversation persists
- [ ] Check file storage location: `~/Library/Application Support/GDevelop/gdevelop-ai/` (macOS)
- [ ] Verify index.json and conversation files exist
- [ ] Test with authenticated user (verify backend + local conversations merge)

## Known Limitations

1. **No cross-device sync**: Conversations are local to the machine
2. **No event generation**: Custom AI providers don't support event generation (requires GDevelop backend)
3. **No feedback submission**: Feedback is disabled for custom AI conversations
4. **No cloud backup**: Users should export conversations manually

## Future Enhancements

1. **Export/Import UI**: Add buttons to history panel for backup/restore
2. **Automatic backups**: Daily snapshots to `backups/` folder
3. **Configurable storage location**: Allow users to choose storage directory
4. **Conversation search**: Full-text search across all conversations
5. **Cloud sync option**: Optional sync for authenticated users with custom AI

## Troubleshooting

### Conversations not persisting
- Check console for errors
- Verify `FileAiRequestStorage.isAvailable()` returns true
- Check file permissions on userData directory

### IPC errors
- Verify `registerAiStorageHandlers()` is called in main.js
- Check Electron version compatibility

### Merge conflicts in history
- Backend conversations take precedence
- Local conversations marked with `isLocal: true` flag

## References

- Design Doc: `_docs/CUSTOM_AI_UNAUTHENTICATED_USAGE.md`
- Appendix F: File-Based Persistence specification
- Personal Fork Implementation Plan (lines 17-144)

