# Testing Guide: File-Based AI Storage Implementation

## Prerequisites

1. **Build the app**:
   ```bash
   cd newIDE/app
   npm install
   npm run build
   ```

2. **Launch Electron app**:
   ```bash
   cd newIDE/electron-app
   npm install
   npm start
   ```

## Test Scenarios

### Scenario 1: Unauthenticated Custom AI Usage (Primary Use Case)

**Goal**: Verify that users can use Ask AI without logging in when custom AI is enabled.

**Steps**:

1. **Launch the app** (don't log in)

2. **Enable Custom AI**:
   - Go to `File > Preferences` (or `GDevelop > Preferences` on macOS)
   - Navigate to the "Custom AI" section
   - Enable "Use Custom AI"
   - Select provider: "OpenAI" or "Anthropic"
   - Enter your API key
   - Click "Save"

3. **Start a conversation**:
   - Open a project (or create a new one)
   - Click the "Ask AI" button in the toolbar (or press the keyboard shortcut)
   - Type a message: "Create a simple platformer game"
   - Press Enter or click Send

4. **Verify response**:
   - ✅ AI response appears in the chat
   - ✅ No login dialog appears
   - ✅ Conversation is visible in the chat panel

5. **Send follow-up message**:
   - Type: "Add a double jump mechanic"
   - Press Enter

6. **Verify persistence**:
   - ✅ Follow-up response appears
   - ✅ Full conversation history is visible
   - Close the app completely
   - Reopen the app
   - Open Ask AI panel
   - Click "History" button
   - ✅ Previous conversation is listed
   - Click on the conversation
   - ✅ Full conversation history loads

7. **Verify file storage**:
   - Open file explorer
   - Navigate to:
     - **macOS**: `~/Library/Application Support/GDevelop/gdevelop-ai/`
     - **Windows**: `%APPDATA%/GDevelop/gdevelop-ai/`
     - **Linux**: `~/.config/GDevelop/gdevelop-ai/`
   - ✅ `index.json` file exists
   - ✅ `conversations/<conversation-id>/` folder exists
   - ✅ `conversations/<conversation-id>/meta.json` exists
   - ✅ `conversations/<conversation-id>/messages.ndjson` exists
   - Open `messages.ndjson` in a text editor
   - ✅ Each line is a valid JSON object (one message per line)

### Scenario 2: Authenticated User with Custom AI

**Goal**: Verify that authenticated users can use custom AI and see both backend and local conversations.

**Steps**:

1. **Log in to GDevelop**:
   - Click "Sign in" or "Create account"
   - Complete authentication

2. **Create a backend conversation** (optional, if you have existing conversations):
   - Disable Custom AI temporarily
   - Start a conversation using GDevelop backend
   - Send a message
   - Verify response

3. **Enable Custom AI**:
   - Go to Preferences > Custom AI
   - Enable and configure as in Scenario 1

4. **Create a custom AI conversation**:
   - Start a new conversation
   - Send a message
   - Verify response

5. **Check history**:
   - Open History panel
   - ✅ Both backend and local conversations appear
   - ✅ Conversations are sorted by date (newest first)
   - ✅ Can switch between conversations

### Scenario 3: Error Handling

**Goal**: Verify graceful error handling.

**Steps**:

1. **Invalid API key**:
   - Enter an invalid API key in Preferences
   - Try to start a conversation
   - ✅ Clear error message appears
   - ✅ App doesn't crash

2. **Network error** (disconnect internet):
   - Disconnect from internet
   - Try to send a message
   - ✅ Error message appears
   - ✅ Can retry after reconnecting

3. **File system error** (read-only directory):
   - This is hard to test manually, but check console for errors
   - ✅ App continues to work even if file storage fails

### Scenario 4: Multiple Conversations

**Goal**: Verify multiple conversations work correctly.

**Steps**:

1. **Create 3-5 conversations**:
   - Start conversation 1: "Create a platformer"
   - Start conversation 2: "Create a puzzle game"
   - Start conversation 3: "Create a shooter"

2. **Verify history**:
   - Open History panel
   - ✅ All conversations listed
   - ✅ Sorted by date (newest first)
   - ✅ Each shows first user message as preview

3. **Switch between conversations**:
   - Click on conversation 1
   - ✅ Full history loads
   - Click on conversation 2
   - ✅ Different history loads
   - Send a message in conversation 2
   - ✅ Only conversation 2 updates

4. **Verify file storage**:
   - Check `gdevelop-ai/conversations/` folder
   - ✅ Multiple conversation folders exist
   - ✅ Each has its own `meta.json` and `messages.ndjson`

### Scenario 5: Agent Mode (Function Calling)

**Goal**: Verify agent mode works with custom AI.

**Steps**:

1. **Enable agent mode**:
   - In Ask AI panel, ensure "Agent" mode is selected (if available)
   - Or send a message that triggers function calls: "Create a new scene called 'Level1' with a player sprite"

2. **Verify function calls**:
   - ✅ AI suggests function calls (create_scene, add_object, etc.)
   - ✅ Function calls are executed
   - ✅ Results are sent back to AI
   - ✅ AI responds with confirmation

3. **Verify persistence**:
   - Close and reopen app
   - ✅ Agent conversation with function calls persists

## Console Checks

Open the browser console (View > Toggle Developer Tools) and check for:

- ✅ No errors related to file storage
- ✅ No errors related to IPC
- ✅ Successful save messages: "Successfully created a new AI request"
- ✅ No authentication errors when custom AI is enabled

## Performance Checks

- ✅ App starts quickly (file loading doesn't slow down startup)
- ✅ Conversations load quickly from file storage
- ✅ No lag when sending messages
- ✅ History panel loads quickly even with many conversations

## Cleanup

After testing, you can delete test conversations:

1. **Via UI** (future feature):
   - Right-click conversation in history
   - Click "Delete"

2. **Via file system**:
   - Navigate to `gdevelop-ai/conversations/`
   - Delete conversation folders
   - Update `index.json` to remove entries

## Known Issues to Watch For

1. **File permissions**: If you see "EACCES" errors, check folder permissions
2. **Concurrent access**: If you run multiple instances, conversations might conflict
3. **Large conversations**: Very long conversations (100+ messages) might be slow to load

## Success Criteria

✅ All scenarios pass without errors
✅ Conversations persist across app restarts
✅ File storage structure matches specification
✅ No authentication required when custom AI is enabled
✅ Backend and local conversations merge correctly for authenticated users

## Reporting Issues

If you encounter issues:

1. Check the console for error messages
2. Check the file storage directory for corruption
3. Try deleting `gdevelop-ai/` folder and starting fresh
4. Report with:
   - Steps to reproduce
   - Console error messages
   - File storage contents (if relevant)
   - OS and GDevelop version

