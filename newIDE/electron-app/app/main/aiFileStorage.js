/**
 * File-based storage for AI conversations in Electron.
 * Provides durable persistence using the filesystem with atomic writes.
 */

const { app, ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');

/**
 * Get the base directory for AI data storage.
 * Defaults to userData/gdevelop-ai/
 */
const getBaseDir = () => {
  // TODO: Allow override via preferences
  return path.join(app.getPath('userData'), 'gdevelop-ai');
};

const getConversationsDir = () => path.join(getBaseDir(), 'conversations');
const getBackupsDir = () => path.join(getBaseDir(), 'backups');
const getIndexPath = () => path.join(getBaseDir(), 'index.json');
const getConversationDir = (conversationId) =>
  path.join(getConversationsDir(), conversationId);
const getMetaPath = (conversationId) =>
  path.join(getConversationDir(conversationId), 'meta.json');
const getMessagesPath = (conversationId) =>
  path.join(getConversationDir(conversationId), 'messages.ndjson');

/**
 * Ensure directory structure exists.
 */
const ensureDirectories = async () => {
  await fs.mkdir(getBaseDir(), { recursive: true });
  await fs.mkdir(getConversationsDir(), { recursive: true });
  await fs.mkdir(getBackupsDir(), { recursive: true });
};

/**
 * Atomic write: write to temp file then rename.
 */
const atomicWrite = async (filePath, content) => {
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, content, 'utf8');
  await fs.rename(tmpPath, filePath);
};

/**
 * Load the index file.
 */
const loadIndex = async () => {
  try {
    const indexPath = getIndexPath();
    const data = await fs.readFile(indexPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // Index doesn't exist yet
    }
    throw error;
  }
};

/**
 * Save the index file.
 */
const saveIndex = async (index) => {
  await atomicWrite(getIndexPath(), JSON.stringify(index, null, 2));
};

/**
 * Update index entry for a conversation.
 */
const updateIndex = async (conversationId, updates) => {
  const index = await loadIndex();
  const existingIndex = index.findIndex((item) => item.id === conversationId);

  if (existingIndex >= 0) {
    index[existingIndex] = { ...index[existingIndex], ...updates };
  } else {
    index.push({ id: conversationId, ...updates });
  }

  await saveIndex(index);
};

/**
 * Remove conversation from index.
 */
const removeFromIndex = async (conversationId) => {
  const index = await loadIndex();
  const filtered = index.filter((item) => item.id !== conversationId);
  await saveIndex(filtered);
};

/**
 * List all conversations.
 */
const listConversations = async () => {
  await ensureDirectories();
  return await loadIndex();
};

/**
 * Read a conversation (meta + messages).
 */
const readConversation = async (conversationId) => {
  try {
    const metaPath = getMetaPath(conversationId);
    const messagesPath = getMessagesPath(conversationId);

    const [metaData, messagesData] = await Promise.all([
      fs.readFile(metaPath, 'utf8').catch(() => '{}'),
      fs.readFile(messagesPath, 'utf8').catch(() => ''),
    ]);

    const meta = JSON.parse(metaData);
    const messages = messagesData
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));

    return { meta, messages };
  } catch (error) {
    console.error(`Error reading conversation ${conversationId}:`, error);
    return { meta: null, messages: [] };
  }
};

/**
 * Write conversation metadata.
 */
const writeMeta = async (conversationId, meta) => {
  await ensureDirectories();
  const conversationDir = getConversationDir(conversationId);
  await fs.mkdir(conversationDir, { recursive: true });

  const metaPath = getMetaPath(conversationId);
  await atomicWrite(metaPath, JSON.stringify(meta, null, 2));

  // Update index
  await updateIndex(conversationId, {
    title: meta.title,
    updatedAt: meta.updatedAt || Date.now(),
    projectId: meta.projectId || null,
  });
};

/**
 * Append a message to the conversation.
 */
const appendMessage = async (conversationId, message) => {
  await ensureDirectories();
  const conversationDir = getConversationDir(conversationId);
  await fs.mkdir(conversationDir, { recursive: true });

  const messagesPath = getMessagesPath(conversationId);
  const messageLine = JSON.stringify(message) + '\n';

  // Append to file
  await fs.appendFile(messagesPath, messageLine, 'utf8');

  // Update index timestamp
  await updateIndex(conversationId, {
    updatedAt: Date.now(),
  });
};

/**
 * Delete a conversation.
 */
const deleteConversation = async (conversationId) => {
  try {
    const conversationDir = getConversationDir(conversationId);
    await fs.rm(conversationDir, { recursive: true, force: true });
    await removeFromIndex(conversationId);
  } catch (error) {
    console.error(`Error deleting conversation ${conversationId}:`, error);
    throw error;
  }
};

/**
 * Register IPC handlers for AI storage.
 */
const registerAiStorageHandlers = () => {
  ipcMain.handle('aiStorage:list', async () => {
    try {
      return await listConversations();
    } catch (error) {
      console.error('Error listing conversations:', error);
      return [];
    }
  });

  ipcMain.handle('aiStorage:read', async (_event, conversationId) => {
    try {
      return await readConversation(conversationId);
    } catch (error) {
      console.error(`Error reading conversation ${conversationId}:`, error);
      return { meta: null, messages: [] };
    }
  });

  ipcMain.handle('aiStorage:writeMeta', async (_event, conversationId, meta) => {
    try {
      await writeMeta(conversationId, meta);
      return { success: true };
    } catch (error) {
      console.error(`Error writing meta for ${conversationId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('aiStorage:appendMessage', async (_event, conversationId, message) => {
    try {
      await appendMessage(conversationId, message);
      return { success: true };
    } catch (error) {
      console.error(`Error appending message to ${conversationId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('aiStorage:delete', async (_event, conversationId) => {
    try {
      await deleteConversation(conversationId);
      return { success: true };
    } catch (error) {
      console.error(`Error deleting conversation ${conversationId}:`, error);
      return { success: false, error: error.message };
    }
  });
};

module.exports = {
  registerAiStorageHandlers,
};

