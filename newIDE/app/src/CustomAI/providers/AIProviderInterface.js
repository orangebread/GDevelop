// @flow

/**
 * Interface that all AI providers must implement.
 * This ensures consistent behavior across GDevelop, OpenAI, Anthropic, and future providers.
 *
 * All providers must handle:
 * - Chat and agent modes
 * - Function calling (for agent mode)
 * - Streaming responses (optional but recommended)
 * - Request cancellation via AbortSignal
 * - Error handling and normalization
 */

import {
  type AiRequest,
  type AiRequestMessage,
  type AiRequestFunctionCallOutput,
  type AiConfiguration,
} from '../../Utils/GDevelopServices/Generation';

/**
 * Parameters for creating a new AI request.
 */
export type CreateAiRequestParams = {|
  userId: string,
  userRequest: string,
  gameProjectJson: string | null,
  gameProjectJsonUserRelativeKey: string | null,
  projectSpecificExtensionsSummaryJson: string | null,
  projectSpecificExtensionsSummaryJsonUserRelativeKey: string | null,
  payWithCredits: boolean,
  mode: 'chat' | 'agent',
  aiConfiguration: AiConfiguration,
  gameId: string | null,
  fileMetadata: ?{
    fileIdentifier: string,
    version?: string,
    lastModifiedDate?: number,
    gameId?: string,
  },
  storageProviderName: ?string,
  toolsVersion: string,
|};

/**
 * Parameters for adding a message to an existing AI request.
 */
export type AddMessageParams = {|
  userId: string,
  aiRequestId: string,
  /** Optional full AI request when available (recommended to provide for correct history and mode). */
  aiRequest?: AiRequest,
  userMessage: string,
  functionCallOutputs: Array<AiRequestFunctionCallOutput>,
  payWithCredits: boolean,
  gameProjectJson: string | null,
  gameProjectJsonUserRelativeKey: string | null,
  projectSpecificExtensionsSummaryJson: string | null,
  projectSpecificExtensionsSummaryJsonUserRelativeKey: string | null,
|};

/**
 * Parameters for generating events.
 */
export type GenerateEventsParams = {|
  userId: string,
  gameProjectJson: string | null,
  gameProjectJsonUserRelativeKey: string | null,
  projectSpecificExtensionsSummaryJson: string | null,
  projectSpecificExtensionsSummaryJsonUserRelativeKey: string | null,
  sceneName: string,
  eventsDescription: string,
  extensionNamesList: string,
  objectsList: string,
  existingEventsAsText: string,
  placementHint: string | null,
  relatedAiRequestId: string,
|};

/**
 * Options for AI requests (streaming, cancellation, etc.)
 */
export type AiRequestOptions = {|
  abortSignal?: AbortSignal,
  onStreamChunk?: (chunk: string) => void,
  onStreamComplete?: () => void,
  onStreamError?: (error: Error) => void,
|};

/**
 * Provider information.
 */
export type ProviderInfo = {|
  id: string,
  name: string,
  requiresApiKey: boolean,
|};

/**
 * Interface that all AI providers must implement.
 */
export interface AIProviderInterface {
  /**
   * Get provider metadata.
   *
   * @returns Provider information
   */
  getProviderInfo(): ProviderInfo;

  /**
   * Create a new AI request (chat or agent).
   *
   * @param params - Request parameters
   * @param options - Optional streaming/cancellation options
   * @returns AI request object
   */
  createAiRequest(
    params: CreateAiRequestParams,
    options?: AiRequestOptions
  ): Promise<AiRequest>;

  /**
   * Add a message to an existing AI request.
   * Used for continuing a conversation or providing function call results.
   *
   * @param params - Message parameters
   * @param options - Optional streaming/cancellation options
   * @returns Updated AI request object
   */
  addMessage(
    params: AddMessageParams,
    options?: AiRequestOptions
  ): Promise<AiRequest>;

  /**
   * Generate events for a scene.
   * This is a specialized AI request for event generation.
   *
   * @param params - Event generation parameters
   * @param options - Optional streaming/cancellation options
   * @returns Generated events result
   */
  generateEvents(
    params: GenerateEventsParams,
    options?: AiRequestOptions
  ): Promise<any>;
}

