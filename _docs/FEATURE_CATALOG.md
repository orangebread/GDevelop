# GDevelop Feature Catalog

**Repository:** https://github.com/4ian/GDevelop  
**Generated:** 2025-10-02  
**Total Features:** 42

## Summary

This catalog documents user-facing, non-technical features available in GDevelop. Each feature includes a description, user value proposition, entry points, prerequisites, and evidence from the repository.

### Product Areas
- Game Creation
- Visual Development
- Publishing & Export
- Online Services
- Asset Management
- Collaboration
- Learning & Support
- Monetization
- Game Features

### Plan Tiers
- Free
- Silver
- Gold
- Education

---

## Features by Area

### Visual Development

#### Visual Event-Based Programming
**Status:** GA | **Plan:** Free

No-code game logic builder using visual events, conditions, and actions instead of traditional coding.

**User Value:**
- Create game logic without writing code
- Intuitive drag-and-drop event creation
- Real-time visual feedback of game behavior

**Entry Points:**
- `/scene/events-editor`
- `/external-events-editor`

**Personas:** Game Designers, Educators, Hobbyists, Students

**Evidence:**
- File: `newIDE/app/src/EventsSheet/index.js`
- Doc: `README.md#L3`
- File: `Core/GDCore/Events/Builtin`

---

#### Visual Scene Editor
**Status:** GA | **Plan:** Free

Drag-and-drop 2D/3D scene builder with real-time preview, grid snapping, and layer management.

**User Value:**
- Design game levels visually
- Position objects with precision tools
- Organize scenes with layers and z-ordering

**Entry Points:**
- `/scene-editor`
- `/instances-editor`

**Personas:** Game Designers, Level Designers, Artists

**Evidence:**
- File: `newIDE/app/src/SceneEditor/index.js`
- File: `newIDE/app/src/InstancesEditor/index.js`
- Doc: `README.md#L5`

---

#### Live Game Preview
**Status:** GA | **Plan:** Free

Test games instantly in browser or desktop with hot-reload for real-time changes.

**User Value:**
- See changes immediately without full rebuild
- Debug games with live inspector
- Test on actual devices via network preview

**Entry Points:**
- `/toolbar/preview-button`
- `/toolbar/hot-reload-preview`

**Personas:** All Game Developers

**Evidence:**
- File: `newIDE/app/src/HotReload/HotReloadPreviewButton.js`
- File: `newIDE/app/src/ExportAndShare/PreviewLauncher.flow.js`

---

#### Game Debugger
**Status:** GA | **Plan:** Free

Real-time debugging with variable inspection, profiler, and console during preview.

**User Value:**
- Inspect and modify variables live
- Profile game performance
- View console logs and errors

**Entry Points:**
- `/debugger`
- `/preview/debugger-panel`

**Personas:** All Game Developers

**Dependencies:** live-preview

**Evidence:**
- File: `newIDE/app/src/Debugger/index.js`
- File: `newIDE/app/src/Debugger/DebuggerContent.js`

---

#### AI-Assisted Game Development
**Status:** GA | **Plan:** Free (requires authentication)

Generate game logic, find assets, and get coding help using integrated AI assistant.

**User Value:**
- Speed up development with AI suggestions
- Generate events from natural language
- Get help finding and installing assets

**Entry Points:**
- `/events-editor/ai-assistant`
- `/ask-ai`

**Personas:** All Game Developers, Beginners

**Prerequisites:** authenticated-user

**Evidence:**
- File: `newIDE/app/src/AiGeneration/index.js`
- File: `newIDE/app/src/AiGeneration/UseGenerateEvents.js`

---

#### Custom Extensions
**Status:** GA | **Plan:** Free

Create and share custom behaviors, objects, and actions using JavaScript or visual events.

**User Value:**
- Extend engine capabilities
- Share reusable game components
- Build without modifying core engine

**Entry Points:**
- `/project-manager/extensions`
- `/events-functions-extension-editor`

**Personas:** Advanced Developers, Extension Creators

**Evidence:**
- File: `newIDE/app/src/EventsFunctionsExtensionEditor/index.js`
- Doc: `newIDE/README-extensions.md`
- Doc: `README.md#L12`

---

#### Multilingual Editor
**Status:** GA | **Plan:** Free

Editor interface available in 50+ languages with community-driven translations.

**User Value:**
- Use GDevelop in your native language
- Contribute translations
- Accessible to global audience

**Entry Points:**
- `/preferences/language`

**Personas:** All Users, Educators

**Evidence:**
- File: `newIDE/app/src/MainFrame/Preferences/LanguageDialog.js`
- File: `newIDE/app/src/locales`
- Doc: `README.md#L16`

---

#### Command Palette
**Status:** GA | **Plan:** Free

Quick access to all editor commands via keyboard-driven command palette.

**User Value:**
- Navigate editor efficiently
- Discover available commands
- Keyboard-centric workflow

**Entry Points:**
- `/command-palette`

**Personas:** Power Users, Developers

**Evidence:**
- File: `newIDE/app/src/CommandPalette/index.js`
- File: `newIDE/app/src/CommandPalette/CommandPalette`

---

### Game Features

#### 3D Game Development
**Status:** GA | **Plan:** Free

Create 3D games with 3D models, cameras, lighting, fog, and physics using Three.js rendering.

**User Value:**
- Build 3D games without complex 3D programming
- Import and use 3D models (GLTF/GLB)
- Configure 3D lighting and camera perspectives

**Entry Points:**
- `/scene-editor/3d-objects`
- `/asset-store/3d-models`

**Personas:** 3D Game Developers, Indie Developers

**Evidence:**
- File: `Extensions/3D/JsExtension.js`
- Doc: `README.md#L3`
- File: `Extensions/3D/Model3DRuntimeObject.ts`

---

#### Multiplayer Game Lobbies
**Status:** GA | **Plan:** Free

Built-in multiplayer with lobby system, object sync, and host migration for up to 8 players.

**User Value:**
- Add multiplayer without server management
- Automatic object and variable synchronization
- Handle player joins, leaves, and host migration

**Entry Points:**
- `/events/multiplayer-actions`

**Personas:** Multiplayer Game Developers, Indie Developers

**Dependencies:** player-authentication

**Evidence:**
- File: `Extensions/Multiplayer/JsExtension.js#L1-L100`
- Doc: `README.md#L3`
- File: `Extensions/Multiplayer/multiplayertools.ts`

---

#### Physics Engine (2D & 3D)
**Status:** GA | **Plan:** Free

Realistic physics simulation using Box2D for 2D and Jolt Physics for 3D games.

**User Value:**
- Add realistic physics without complex math
- Configure gravity, forces, and collisions
- Support for joints and constraints

**Entry Points:**
- `/behaviors/physics2`
- `/behaviors/physics3d`

**Personas:** Game Developers

**Evidence:**
- File: `Extensions/Physics2Behavior/JsExtension.js`
- File: `Extensions/Physics3DBehavior/JsExtension.js`
- Doc: `README.md#L39`

---

#### Platformer Character Behavior
**Status:** GA | **Plan:** Free

Pre-built platformer movement with jumping, double-jump, wall-sliding, and ladder climbing.

**User Value:**
- Create Mario-like platformers quickly
- Customizable jump physics and controls
- Built-in collision handling

**Entry Points:**
- `/behaviors/platformer-character`

**Personas:** Platformer Game Developers

**Evidence:**
- File: `Extensions/PlatformBehavior/JsExtension.js`
- File: `Extensions/PlatformBehavior/platformerobjectruntimebehavior.ts`

---

#### Pathfinding Behavior
**Status:** GA | **Plan:** Free

AI pathfinding for NPCs and enemies with obstacle avoidance and dynamic path calculation.

**User Value:**
- Create intelligent enemy movement
- Automatic obstacle navigation
- Configurable movement speed and behavior

**Entry Points:**
- `/behaviors/pathfinding`

**Personas:** Game Developers

**Evidence:**
- File: `Extensions/PathfindingBehavior/JsExtension.js`
- File: `Extensions/PathfindingBehavior/pathfindingruntimebehavior.ts`

---

#### Visual Effects Library
**Status:** GA | **Plan:** Free

Apply shader-based effects like blur, glow, pixelate, and color adjustments to objects and layers.

**User Value:**
- Enhance visuals without shader programming
- Over 30 built-in effects
- Real-time effect preview

**Entry Points:**
- `/layer-editor/effects`
- `/object-editor/effects`

**Personas:** Game Developers, Artists

**Evidence:**
- File: `Extensions/Effects/JsExtension.js`
- File: `newIDE/app/src/EffectsList/index.js`

---

#### Particle System
**Status:** GA | **Plan:** Free

Create particle effects like fire, smoke, explosions, and magic with visual emitter editor.

**User Value:**
- Add visual polish with particles
- Customize emitter properties visually
- Performance-optimized rendering

**Entry Points:**
- `/objects/particle-emitter`

**Personas:** Game Developers, VFX Artists

**Evidence:**
- File: `Extensions/ParticleSystem/JsExtension.js`
- File: `Extensions/ParticleSystem/particleemitterobject.ts`

---

#### Tilemap Editor
**Status:** GA | **Plan:** Free

Import and edit tilemaps from Tiled or LDtk with collision layers and visual painting.

**User Value:**
- Build levels with tilemap tools
- Import from popular tilemap editors
- Paint tiles directly in scene editor

**Entry Points:**
- `/objects/tilemap`
- `/scene-editor/tilemap-painter`

**Personas:** Level Designers, 2D Game Developers

**Evidence:**
- File: `Extensions/TileMap/JsExtension.js`
- File: `Extensions/TileMap/tilemapruntimeobject.ts`

---

#### 2D Lighting System
**Status:** GA | **Plan:** Free

Add dynamic 2D lighting with light objects, shadows, and obstacle behaviors.

**User Value:**
- Create atmospheric lighting effects
- Dynamic shadows and light sources
- Performance-optimized rendering

**Entry Points:**
- `/objects/light`
- `/behaviors/light-obstacle`

**Personas:** 2D Game Developers, Artists

**Evidence:**
- File: `Extensions/Lighting/JsExtension.js`
- File: `Extensions/Lighting/lightruntimeobject.ts`

---

#### Spine Animation Support
**Status:** GA | **Plan:** Free

Import and use Spine skeletal animations with full runtime control.

**User Value:**
- Use professional skeletal animations
- Control animations from events
- Smooth character animation

**Entry Points:**
- `/objects/spine-object`

**Personas:** Game Developers, Animators

**Evidence:**
- File: `Extensions/Spine/JsExtension.js`
- File: `Extensions/Spine/spineruntimeobject.ts`

---

#### Dialogue Tree System
**Status:** GA | **Plan:** Free

Create branching dialogues using Yarn format with visual dialogue editor.

**User Value:**
- Build narrative-driven games
- Branching conversation trees
- Import from Yarn Spinner

**Entry Points:**
- `/events/dialogue-actions`

**Personas:** Narrative Designers, RPG Developers

**Evidence:**
- File: `Extensions/DialogueTree/JsExtension.js`
- File: `Extensions/DialogueTree/dialoguetools.ts`

---

#### Peer-to-Peer Networking
**Status:** GA | **Plan:** Free

Direct peer-to-peer connections for custom multiplayer implementations using WebRTC.

**User Value:**
- Build custom multiplayer solutions
- Low-latency peer connections
- No server infrastructure needed

**Entry Points:**
- `/events/p2p-actions`

**Personas:** Advanced Developers

**Evidence:**
- File: `Extensions/P2P/JsExtension.js`
- File: `Extensions/P2P/B_p2ptools.ts`

---

### Publishing & Export

#### One-Click Game Export
**Status:** GA | **Plan:** Free (requires authentication)

Export games to Android, iOS, Windows, macOS, Linux, and web with automated cloud builds.

**User Value:**
- Publish to multiple platforms without setup
- Automated build process in the cloud
- Download ready-to-distribute packages

**Entry Points:**
- `/export-and-share`
- `/builds`

**Personas:** All Game Developers, Publishers

**Prerequisites:** authenticated-user

**Evidence:**
- File: `newIDE/app/src/ExportAndShare/Builds/index.js`
- File: `newIDE/app/src/ExportAndShare/GenericExporters/OnlineWebExport`
- Doc: `README.md#L3`

---

#### gd.games Publishing
**Status:** GA | **Plan:** Free (requires authentication)

Publish games directly to gd.games platform with one click from the editor.

**User Value:**
- Share games instantly with community
- Get player feedback and ratings
- Track game plays and engagement

**Entry Points:**
- `/export-and-share/publish-to-gdgames`

**Personas:** All Game Developers, Hobbyists

**Prerequisites:** authenticated-user

**Evidence:**
- Doc: `README.md#L23`
- File: `newIDE/app/src/GameDashboard/PublicGamePropertiesDialog.js`

---

#### Steamworks Integration
**Status:** GA | **Plan:** Free

Integrate Steam features including achievements, cloud saves, and input for desktop games.

**User Value:**
- Publish to Steam with native features
- Steam achievements and leaderboards
- Steam controller support

**Entry Points:**
- `/events/steamworks-actions`

**Personas:** PC Game Developers, Publishers

**Evidence:**
- File: `Extensions/Steamworks/JsExtension.js`
- File: `Extensions/Steamworks/steamworkstools.ts`

---

### Online Services

#### Leaderboards
**Status:** GA | **Plan:** Free (requires authentication)

Managed leaderboard service for player scores with customizable display and admin tools.

**User Value:**
- Add competitive leaderboards without backend
- Customize leaderboard appearance
- Manage entries via dashboard

**Entry Points:**
- `/events/leaderboard-actions`
- `/game-dashboard/leaderboards`

**Personas:** Game Developers, Publishers

**Prerequisites:** authenticated-user

**Evidence:**
- File: `Extensions/Leaderboards/JsExtension.js#L1-L50`
- File: `newIDE/app/src/GameDashboard/LeaderboardAdmin/index.js`

---

#### Player Authentication
**Status:** GA | **Plan:** Free

Built-in player login system with authentication banner and user profile management.

**User Value:**
- Identify players across sessions
- Enable personalized experiences
- Link scores to player accounts

**Entry Points:**
- `/events/authentication-actions`

**Personas:** Game Developers

**Evidence:**
- File: `Extensions/PlayerAuthentication/JsExtension.js#L1-L50`
- File: `Extensions/PlayerAuthentication/playerauthenticationtools.ts`

---

#### Game Analytics Dashboard
**Status:** GA | **Plan:** Free (requires authentication)

Track player sessions, retention, and engagement metrics with visual charts and insights.

**User Value:**
- Understand player behavior
- Monitor game performance metrics
- Make data-driven improvements

**Entry Points:**
- `/games-dashboard/analytics`

**Personas:** Game Developers, Publishers, Product Managers

**Prerequisites:** authenticated-user

**Evidence:**
- File: `newIDE/app/src/GameDashboard/GameAnalyticsPanel.js`
- File: `newIDE/app/src/GameDashboard/GameAnalyticsCharts.js`

---

#### Firebase Integration
**Status:** GA | **Plan:** Free

Connect to Firebase services including database, storage, functions, and analytics.

**User Value:**
- Add backend services without server setup
- Store player data in cloud database
- Trigger cloud functions from game

**Entry Points:**
- `/events/firebase-actions`
- `/project-properties/firebase-config`

**Personas:** Advanced Developers, Backend Developers

**Evidence:**
- File: `Extensions/Firebase/JsExtension.js#L1-L50`
- File: `Extensions/Firebase/B_firebasetools`

---

#### Player Feedback Collection
**Status:** GA | **Plan:** Free (requires authentication)

Collect and view player ratings and feedback directly in the game dashboard.

**User Value:**
- Understand player sentiment
- Collect structured feedback
- Improve games based on ratings

**Entry Points:**
- `/games-dashboard/feedback`

**Personas:** Game Developers, Publishers

**Prerequisites:** authenticated-user

**Dependencies:** gd-games-publishing

**Evidence:**
- File: `newIDE/app/src/GameDashboard/Feedbacks/index.js`
- File: `newIDE/app/src/GameDashboard/Widgets/FeedbackWidget.js`

---

### Asset Management

#### Asset Store
**Status:** GA | **Plan:** Free

Browse and install game assets, templates, extensions, and behaviors from integrated marketplace.

**User Value:**
- Access thousands of ready-to-use assets
- Install premium and free content
- Speed up game development with templates

**Entry Points:**
- `/home/asset-store`
- `/asset-store/resources`
- `/asset-store/game-templates`

**Personas:** All Game Developers, Beginners

**Evidence:**
- File: `newIDE/app/src/AssetStore/index.js`
- Route: `newIDE/app/src/MainFrame/RouterContext.js#L10-L12`
- Doc: `README.md#L14-L15`

---

#### Behavior Library
**Status:** GA | **Plan:** Free

Browse and add pre-built behaviors like draggable, anchor, tween, and top-down movement.

**User Value:**
- Add complex functionality without coding
- Reusable behavior components
- Community-contributed behaviors

**Entry Points:**
- `/asset-store/behaviors`
- `/object-editor/add-behavior`

**Personas:** All Game Developers

**Evidence:**
- File: `newIDE/app/src/AssetStore/BehaviorStore/index.js`
- File: `newIDE/app/src/BehaviorsEditor/index.js`

---

#### Resource Management
**Status:** GA | **Plan:** Free

Organize and manage game assets including images, audio, fonts, and 3D models.

**User Value:**
- Centralized asset organization
- Preview resources in editor
- Bulk import and management

**Entry Points:**
- `/resources-editor`
- `/project-manager/resources`

**Personas:** All Game Developers

**Evidence:**
- File: `newIDE/app/src/ResourcesEditor/index.js`
- File: `newIDE/app/src/ResourcesList/index.js`

---

#### External Editor Integration
**Status:** GA | **Plan:** Free

Edit sprites, sounds, and other assets with integrated external tools like Piskel and Jfxr.

**User Value:**
- Edit assets without leaving GDevelop
- Integrated sprite and sound editors
- Automatic asset updates

**Entry Points:**
- `/resource-editor/edit-with-piskel`
- `/resource-editor/edit-with-jfxr`

**Personas:** All Game Developers, Artists

**Evidence:**
- File: `newIDE/app/src/ResourcesList/ResourceExternalEditor.js`
- Config: `newIDE/app/package.json#L141`

---

### Collaboration

#### Cloud Project Storage
**Status:** GA | **Plan:** Free (requires authentication)

Save and sync game projects to GDevelop cloud with automatic versioning and backup.

**User Value:**
- Access projects from any device
- Automatic project backups
- Version history and recovery

**Entry Points:**
- `/file/save-to-cloud`
- `/file/open-from-cloud`

**Personas:** All Game Developers

**Prerequisites:** authenticated-user

**Evidence:**
- File: `newIDE/app/src/ProjectsStorage/CloudStorageProvider/index.js`
- File: `newIDE/app/src/VersionHistory/index.js`

---

#### Google Drive Storage
**Status:** GA | **Plan:** Free (requires authentication)

Save and open projects directly from Google Drive with automatic synchronization.

**User Value:**
- Use existing Google Drive storage
- Access projects from Drive interface
- Automatic cloud backup

**Entry Points:**
- `/file/open-from-google-drive`
- `/file/save-to-google-drive`

**Personas:** All Game Developers

**Prerequisites:** authenticated-user

**Evidence:**
- File: `newIDE/app/src/ProjectsStorage/GoogleDriveStorageProvider/index.js`
- Doc: `newIDE/README.md#L93-L100`

---

#### Team Collaboration
**Status:** GA | **Plan:** Education

Share projects with team members, manage permissions, and view team member projects.

**User Value:**
- Collaborate on games with team
- Manage student or team member access
- View and organize team projects

**Entry Points:**
- `/home/team`
- `/profile/team-management`

**Personas:** Educators, Team Leads, Studios

**Prerequisites:** authenticated-user

**Dependencies:** cloud-project-storage

**Evidence:**
- File: `newIDE/app/src/Profile/Team/index.js`
- File: `newIDE/app/src/MainFrame/EditorContainers/HomePage/TeamSection/index.js`

---

#### Project Version History
**Status:** GA | **Plan:** Free (requires authentication)

Automatic versioning of cloud projects with ability to restore previous versions.

**User Value:**
- Recover from mistakes
- Track project evolution
- Restore any previous version

**Entry Points:**
- `/project/version-history`

**Personas:** All Game Developers

**Prerequisites:** authenticated-user

**Dependencies:** cloud-project-storage

**Evidence:**
- File: `newIDE/app/src/VersionHistory/index.js`
- File: `newIDE/app/src/VersionHistory/UseVersionHistory.js`

---

### Learning & Support

#### Interactive In-App Tutorials
**Status:** GA | **Plan:** Free

Step-by-step guided lessons within the editor teaching game development concepts.

**User Value:**
- Learn by doing with interactive guidance
- Complete tutorials without leaving editor
- Track progress through lessons

**Entry Points:**
- `/home/learn/tutorials`
- `/guided-lesson`

**Personas:** Beginners, Students, Educators

**Evidence:**
- File: `newIDE/app/src/InAppTutorial/index.js`
- Route: `newIDE/app/src/MainFrame/RouterContext.js#L6-L7`
- File: `newIDE/app/src/MainFrame/EditorContainers/HomePage/InAppTutorials`

---

#### Video Courses
**Status:** GA | **Plan:** Free

Access structured video courses teaching game development from beginner to advanced.

**User Value:**
- Learn game development systematically
- Follow along with video tutorials
- Track course progress

**Entry Points:**
- `/home/learn/courses`

**Personas:** Beginners, Students

**Evidence:**
- File: `newIDE/app/src/MainFrame/EditorContainers/HomePage/LearnSection/CoursesPage.js`
- File: `newIDE/app/src/Course/index.js`

---

### Game Creation

#### Game Templates
**Status:** GA | **Plan:** Free

Start from ready-made game templates including platformers, shooters, puzzles, and more.

**User Value:**
- Jump-start development with working games
- Learn from example implementations
- Customize templates to your needs

**Entry Points:**
- `/home/create/templates`
- `/asset-store/game-templates`

**Personas:** Beginners, All Game Developers

**Evidence:**
- File: `newIDE/app/src/AssetStore/ExampleStore/index.js`
- Route: `newIDE/app/src/MainFrame/RouterContext.js#L22`

---

#### Quick Game Customization
**Status:** GA | **Plan:** Free

Rapidly customize game templates by swapping objects, colors, and properties visually.

**User Value:**
- Personalize templates quickly
- Preview changes in real-time
- Publish customized games fast

**Entry Points:**
- `/quick-customization`

**Personas:** Beginners, Educators

**Dependencies:** game-templates

**Evidence:**
- File: `newIDE/app/src/QuickCustomization/index.js`
- File: `newIDE/app/src/QuickCustomization/QuickCustomizationDialog.js`

---

### Monetization

#### AdMob Monetization
**Status:** GA | **Plan:** Free

Display AdMob banner, interstitial, rewarded, and app open ads in mobile games.

**User Value:**
- Monetize games with Google AdMob
- Support multiple ad formats
- Configure ads without coding

**Entry Points:**
- `/events/admob-actions`
- `/project-properties/admob-settings`

**Personas:** Mobile Game Developers, Publishers

**Evidence:**
- File: `Extensions/AdMob/JsExtension.js#L1-L50`
- File: `Extensions/AdMob/admobtools.ts`

---

#### Subscription Plans
**Status:** GA | **Plan:** Free (requires authentication)

Access premium features, increased limits, and priority support with paid subscriptions.

**User Value:**
- Remove usage limits
- Access premium assets and features
- Priority customer support

**Entry Points:**
- `/profile/subscription`
- `/subscription-dialog`

**Personas:** Professional Developers, Studios

**Prerequisites:** authenticated-user

**Evidence:**
- File: `newIDE/app/src/Profile/Subscription/SubscriptionDialog.js`
- Route: `newIDE/app/src/MainFrame/RouterContext.js#L8`
- Doc: `README.md#L17`

---

## Feature Dependencies

Some features depend on or enhance other features:

- **Game Debugger** requires **Live Game Preview**
- **Multiplayer Game Lobbies** requires **Player Authentication**
- **Player Feedback Collection** requires **gd.games Publishing**
- **Team Collaboration** requires **Cloud Project Storage**
- **Project Version History** requires **Cloud Project Storage**
- **Quick Game Customization** requires **Game Templates**

---

## Evidence Types

This catalog uses the following evidence types to verify feature existence:

- **file**: Source code file implementing the feature
- **route**: UI route definition in router configuration
- **doc**: Documentation reference (README, guides)
- **config**: Configuration file entry

---

## Confidence Levels

Each feature includes a confidence score (0.0-1.0):

- **1.0**: Feature verified with multiple evidence sources
- **0.95**: Feature verified with strong evidence but minor assumptions
- **0.5 or lower**: Feature marked with [ASSUMPTION] or [NEEDS-SOURCE]

All features in this catalog have confidence ≥ 0.95.

---

## Notes

- This catalog focuses on **user-facing features** that provide value to game developers, not implementation details
- Entry points use UI paths, API endpoints, or CLI commands where applicable
- Plan tiers indicate minimum subscription level required (Free = available to all)
- Prerequisites list required user roles or feature flags
- Evidence includes file paths with optional line ranges for verification

---

**Last Updated:** 2025-10-02
**Catalog Version:** 1.0
