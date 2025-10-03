// @flow

/**
 * GDevelop AI Provider - wraps existing GDevelop backend to match AIProviderInterface.
 * This maintains backward compatibility with the existing AI infrastructure.
 *
 * This provider delegates all requests to the existing GDevelop Generation API,
 * ensuring no regressions in existing functionality while providing a consistent
 * interface for the AIService layer.
 */

import type {
  AIProviderInterface,
  CreateAiRequestParams,
  AddMessageParams,
  GenerateEventsParams,
  AiRequestOptions,
  ProviderInfo,
} from './AIProviderInterface';
import type { AiRequest } from '../../Utils/GDevelopServices/Generation';
import {
  createAiRequest as gdevelopCreateAiRequest,
  addMessageToAiRequest as gdevelopAddMessage,
  createAiGeneratedEvent as gdevelopGenerateEvents,
} from '../../Utils/GDevelopServices/Generation';

/**
 * GDevelop AI Provider implementation.
 * Wraps the existing GDevelop backend API.
 */
export class GDevelopProvider implements AIProviderInterface {
  _getAuthorizationHeader: () => Promise<string>;

  constructor(getAuthorizationHeader: () => Promise<string>) {
    this._getAuthorizationHeader = getAuthorizationHeader;
  }

  getProviderInfo(): ProviderInfo {
    return {
      id: 'gdevelop',
      name: 'GDevelop AI',
      requiresApiKey: false,
    };
  }

  /**
   * Create a new AI request using GDevelop backend.
   *
   * @param params - Request parameters
   * @param options - Optional streaming/cancellation options (not supported by GDevelop backend)
   * @returns AI request object
   */
  async createAiRequest(
    params: CreateAiRequestParams,
    options?: AiRequestOptions
  ): Promise<AiRequest> {
    // Note: GDevelop backend doesn't support streaming or cancellation yet
    // These options are ignored for now but kept in the interface for future compatibility

    return await gdevelopCreateAiRequest(this._getAuthorizationHeader, {
      userId: params.userId,
      userRequest: params.userRequest,
      gameProjectJson: params.gameProjectJson,
      gameProjectJsonUserRelativeKey: params.gameProjectJsonUserRelativeKey,
      projectSpecificExtensionsSummaryJson: params.projectSpecificExtensionsSummaryJson,
      projectSpecificExtensionsSummaryJsonUserRelativeKey: params.projectSpecificExtensionsSummaryJsonUserRelativeKey,
      payWithCredits: params.payWithCredits,
      mode: params.mode,
      aiConfiguration: params.aiConfiguration,
      gameId: params.gameId,
      fileMetadata: params.fileMetadata,
      storageProviderName: params.storageProviderName,
      toolsVersion: params.toolsVersion,
    });
  }

  /**
   * Add a message to an existing AI request using GDevelop backend.
   *
   * @param params - Message parameters
   * @param options - Optional streaming/cancellation options (not supported by GDevelop backend)
   * @returns Updated AI request object
   */
  async addMessage(
    params: AddMessageParams,
    options?: AiRequestOptions
  ): Promise<AiRequest> {
    // Note: GDevelop backend doesn't support streaming or cancellation yet
    // These options are ignored for now but kept in the interface for future compatibility

    return await gdevelopAddMessage(this._getAuthorizationHeader, {
      userId: params.userId,
      aiRequestId: params.aiRequestId,
      userMessage: params.userMessage,
      functionCallOutputs: params.functionCallOutputs,
      payWithCredits: params.payWithCredits,
      gameProjectJson: params.gameProjectJson,
      gameProjectJsonUserRelativeKey: params.gameProjectJsonUserRelativeKey,
      projectSpecificExtensionsSummaryJson: params.projectSpecificExtensionsSummaryJson,
      projectSpecificExtensionsSummaryJsonUserRelativeKey: params.projectSpecificExtensionsSummaryJsonUserRelativeKey,
    });
  }

  /**
   * Generate events using GDevelop backend.
   *
   * @param params - Event generation parameters
   * @param options - Optional streaming/cancellation options (not supported by GDevelop backend)
   * @returns Generated events result
   */
  async generateEvents(
    params: GenerateEventsParams,
    options?: AiRequestOptions
  ): Promise<any> {
    // Note: GDevelop backend doesn't support streaming or cancellation yet
    // These options are ignored for now but kept in the interface for future compatibility

    return await gdevelopGenerateEvents(this._getAuthorizationHeader, {
      userId: params.userId,
      gameProjectJson: params.gameProjectJson,
      gameProjectJsonUserRelativeKey: params.gameProjectJsonUserRelativeKey,
      projectSpecificExtensionsSummaryJson: params.projectSpecificExtensionsSummaryJson,
      projectSpecificExtensionsSummaryJsonUserRelativeKey: params.projectSpecificExtensionsSummaryJsonUserRelativeKey,
      sceneName: params.sceneName,
      eventsDescription: params.eventsDescription,
      extensionNamesList: params.extensionNamesList,
      objectsList: params.objectsList,
      existingEventsAsText: params.existingEventsAsText,
      placementHint: params.placementHint,
      relatedAiRequestId: params.relatedAiRequestId,
    });
  }
}

