// @flow

/**
 * File-based storage for AI requests using Electron IPC.
 * Provides durable persistence across sessions.
 */

import type { AiRequest } from '../Utils/GDevelopServices/Generation';
import optionalRequire from '../Utils/OptionalRequire';

const electron = optionalRequire('electron');
const ipcRenderer = electron ? electron.ipcRenderer : null;

type ConversationMeta = {|
  title: string,
  createdAt: string,
  updatedAt: string,
  projectId?: string | null,
  mode?: 'chat' | 'agent',
|};

/**
 * Convert AiRequest to file storage format (meta + messages).
 */
const toStorageFormat = (
  aiRequest: AiRequest
): { meta: ConversationMeta, messages: Array<any> } => {
  // Extract title from first user message or use mode as fallback
  let title = aiRequest.mode || 'chat';
  if (aiRequest.output && aiRequest.output.length > 0) {
    const firstUserMessage = aiRequest.output.find((msg) => msg.role === 'user');
    if (firstUserMessage && firstUserMessage.content) {
      // Handle different content types (string, array, object)
      let contentText = '';
      if (typeof firstUserMessage.content === 'string') {
        contentText = firstUserMessage.content;
      } else if (Array.isArray(firstUserMessage.content)) {
        // Content is an array of content blocks (Anthropic format)
        const textBlock = firstUserMessage.content.find(block => block.type === 'text' || typeof block === 'string');
        if (textBlock) {
          contentText = typeof textBlock === 'string' ? textBlock : (textBlock.text || '');
        }
      } else if (typeof firstUserMessage.content === 'object' && firstUserMessage.content.text) {
        contentText = firstUserMessage.content.text;
      }

      // Truncate to first 50 chars for title
      if (contentText) {
        title = contentText.substring(0, 50);
        if (contentText.length > 50) {
          title += '...';
        }
      }
    }
  }

  const meta: ConversationMeta = {
    title,
    createdAt: aiRequest.createdAt,
    updatedAt: aiRequest.updatedAt,
    projectId: aiRequest.gameId || null,
    mode: aiRequest.mode,
  };

  return {
    meta,
    messages: aiRequest.output || [],
  };
};

/**
 * Convert file storage format back to AiRequest.
 */
const fromStorageFormat = (
  conversationId: string,
  meta: ConversationMeta,
  messages: Array<any>
): AiRequest => {
  return {
    id: conversationId,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    userId: 'local', // Local storage doesn't track userId
    gameId: meta.projectId || null,
    status: 'complete', // Local conversations are always complete
    mode: meta.mode || 'chat',
    error: null,
    output: messages,
  };
};

/**
 * File-based AI request storage.
 * Drop-in replacement for LocalAiRequestStorage with durable file persistence.
 */
class FileAiRequestStorageClass {
  /**
   * Check if file storage is available (Electron environment).
   */
  isAvailable(): boolean {
    return !!ipcRenderer;
  }

  /**
   * Save an AI request to file storage.
   */
  async save(aiRequest: AiRequest): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('File storage not available (not in Electron)');
      return;
    }

    try {
      const { meta, messages } = toStorageFormat(aiRequest);

      // Write metadata
      await ipcRenderer.invoke('aiStorage:writeMeta', aiRequest.id, meta);

      // Append any new messages by diffing with what's already on disk
      if (messages.length > 0) {
        let existingCount = 0;
        try {
          const existing = await ipcRenderer.invoke('aiStorage:read', aiRequest.id);
          if (existing && Array.isArray(existing.messages)) existingCount = existing.messages.length;
        } catch (e) {
          // No existing conversation yet - start fresh
          existingCount = 0;
        }

        const newMessages = messages.slice(existingCount);
        for (const msg of newMessages) {
          await ipcRenderer.invoke('aiStorage:appendMessage', aiRequest.id, msg);
        }
      }
    } catch (error) {
      console.error('Failed to save AI request to file storage:', error);
      throw error;
    }
  }

  /**
   * Load a specific AI request from file storage.
   */
  async load(aiRequestId: string): Promise<AiRequest | null> {
    if (!this.isAvailable()) {
      console.warn('File storage not available (not in Electron)');
      return null;
    }

    try {
      const { meta, messages } = await ipcRenderer.invoke('aiStorage:read', aiRequestId);

      if (!meta) {
        return null;
      }

      return fromStorageFormat(aiRequestId, meta, messages);
    } catch (error) {
      console.error('Failed to load AI request from file storage:', error);
      return null;
    }
  }

  /**
   * Load all AI requests from file storage.
   */
  async loadAll(): Promise<AiRequest[]> {
    if (!this.isAvailable()) {
      console.warn('File storage not available (not in Electron)');
      return [];
    }

    try {
      const index = await ipcRenderer.invoke('aiStorage:list');

      // Load all conversations in parallel
      const requests = await Promise.all(
        index.map(async (item) => {
          const aiRequest = await this.load(item.id);
          return aiRequest;
        })
      );

      // Filter out nulls and sort by updatedAt (newest first)
      return requests
        .filter((req) => req !== null)
        .sort((a, b) => {
          const aTime = new Date(a.updatedAt).getTime();
          const bTime = new Date(b.updatedAt).getTime();
          return bTime - aTime;
        });
    } catch (error) {
      console.error('Failed to load AI requests from file storage:', error);
      return [];
    }
  }

  /**
   * Delete a specific AI request from file storage.
   */
  async delete(aiRequestId: string): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('File storage not available (not in Electron)');
      return;
    }

    try {
      await ipcRenderer.invoke('aiStorage:delete', aiRequestId);
    } catch (error) {
      console.error('Failed to delete AI request from file storage:', error);
      throw error;
    }
  }

  /**
   * Clear all AI requests from file storage.
   * Note: This is not implemented for safety - use delete() for individual conversations.
   */
  async clear(): Promise<void> {
    console.warn('FileAiRequestStorage.clear() is not implemented for safety.');
    console.warn('Use delete() to remove individual conversations.');
  }

  /**
   * Export all conversations as JSON for backup.
   */
  async export(): Promise<string> {
    const requests = await this.loadAll();
    return JSON.stringify(requests, null, 2);
  }

  /**
   * Import conversations from JSON backup.
   * Note: This is a basic implementation - consider adding conflict resolution.
   */
  async import(jsonData: string): Promise<void> {
    try {
      const requests = JSON.parse(jsonData);

      if (!Array.isArray(requests)) {
        throw new Error('Invalid import data: expected array of AiRequest objects');
      }

      // Save all requests
      await Promise.all(requests.map((request) => this.save(request)));
    } catch (error) {
      console.error('Failed to import AI requests:', error);
      throw error;
    }
  }
}

const FileAiRequestStorage = new FileAiRequestStorageClass();
export default FileAiRequestStorage;

