import { defineConfig } from "vitepress";
import { mintlifyCompat } from "./mintlify-compat";

export default defineConfig({
  title: "Edwin Docs",
  description: "Edwin is a multi-channel gateway for AI agents that runs on any OS.",

  // Use clean URLs (no .html extension)
  cleanUrls: true,

  // MPA mode — skip SSR to avoid Mintlify component rendering issues
  mpa: true,

  // Ignore dead links — many Mintlify cross-references may not resolve
  ignoreDeadLinks: true,

  // Exclude directories that shouldn't be processed
  srcExclude: ['**/zh-CN/**', '**/node_modules/**', '**/refactor/**', '**/experiments/**', '**/auth/**', '**/debug/**', '**/diagnostics/**', '**/shad/**', '**/.i18n/**'],

  // Head meta
  head: [["link", { rel: "icon", href: "/assets/favicon-32x32.png" }]],

  // Vite config
  vite: {
    plugins: [mintlifyCompat()],
    vue: {
      template: {
        compilerOptions: {
          // Treat Mintlify components as custom elements so Vue doesn't warn
          isCustomElement: (tag) => {
            const mintlifyTags = [
              "Card",
              "CardGroup",
              "Columns",
              "Steps",
              "Step",
              "Note",
              "Info",
              "Warning",
              "Tip",
              "Tabs",
              "Tab",
              "Accordion",
              "AccordionGroup",
              "Developer",
            ];
            return mintlifyTags.includes(tag);
          },
        },
      },
    },
  },

  themeConfig: {
    // Logo
    logo: "/assets/edwin-logo.png",

    // Search
    search: {
      provider: "local",
    },

    // Navigation bar
    nav: [
      { text: "Get Started", link: "/start/getting-started" },
      { text: "Channels", link: "/channels/" },
      { text: "Agents", link: "/concepts/architecture" },
      { text: "Tools", link: "/tools/" },
      { text: "Models", link: "/providers/" },
      { text: "Infrastructure", link: "/gateway/" },
      { text: "Reference", link: "/cli/" },
      { text: "Help", link: "/help/" },
    ],

    // Social links
    socialLinks: [
      { icon: "github", link: "https://github.com/jonesj38/edwin" },
      { icon: "discord", link: "https://discord.gg/edwin" },
    ],

    // Footer
    footer: {
      message: "Built with VitePress",
      copyright: "© Edwin",
    },

    // Edit link
    editLink: {
      pattern: "https://github.com/jonesj38/edwin/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    // Multi-sidebar
    sidebar: {
      // === GET STARTED ===
      "/start/": [
        {
          text: "Overview",
          items: [
            { text: "Edwin", link: "/" },
            { text: "Features", link: "/concepts/features" },
            { text: "Showcase", link: "/start/showcase" },
          ],
        },
        {
          text: "Installation",
          items: [
            { text: "Overview", link: "/install/" },
            { text: "Installer", link: "/install/installer" },
            { text: "Docker", link: "/install/docker" },
            { text: "Bun", link: "/install/bun" },
            { text: "Nix", link: "/install/nix" },
            { text: "Ansible", link: "/install/ansible" },
            { text: "Development Channels", link: "/install/development-channels" },
            { text: "Updating", link: "/install/updating" },
            { text: "Uninstall", link: "/install/uninstall" },
          ],
        },
        {
          text: "Setup",
          items: [
            { text: "Getting Started", link: "/start/getting-started" },
            { text: "Quickstart", link: "/start/quickstart" },
            { text: "Wizard", link: "/start/wizard" },
            { text: "Setup", link: "/start/setup" },
            { text: "Onboarding", link: "/start/onboarding" },
            { text: "Pairing", link: "/start/pairing" },
            { text: "Edwin", link: "/start/edwin" },
            { text: "Hubs", link: "/start/hubs" },
            { text: "Docs Directory", link: "/start/docs-directory" },
          ],
        },
        {
          text: "Platforms",
          items: [
            { text: "Overview", link: "/platforms/" },
            { text: "macOS", link: "/platforms/macos" },
            { text: "Linux", link: "/platforms/linux" },
            { text: "Windows", link: "/platforms/windows" },
            { text: "Android", link: "/platforms/android" },
            { text: "iOS", link: "/platforms/ios" },
          ],
        },
      ],

      "/install/": [
        {
          text: "Installation",
          items: [
            { text: "Overview", link: "/install/" },
            { text: "Installer", link: "/install/installer" },
            { text: "Docker", link: "/install/docker" },
            { text: "Bun", link: "/install/bun" },
            { text: "Nix", link: "/install/nix" },
            { text: "Ansible", link: "/install/ansible" },
            { text: "Development Channels", link: "/install/development-channels" },
            { text: "Updating", link: "/install/updating" },
            { text: "Uninstall", link: "/install/uninstall" },
          ],
        },
      ],

      "/platforms/": [
        {
          text: "Platforms",
          items: [
            { text: "Overview", link: "/platforms/" },
            { text: "macOS", link: "/platforms/macos" },
            { text: "Linux", link: "/platforms/linux" },
            { text: "Windows", link: "/platforms/windows" },
            { text: "Android", link: "/platforms/android" },
            { text: "iOS", link: "/platforms/ios" },
          ],
        },
        {
          text: "macOS Companion App",
          items: [
            { text: "Dev Setup", link: "/platforms/mac/dev-setup" },
            { text: "Menu Bar", link: "/platforms/mac/menu-bar" },
            { text: "Voicewake", link: "/platforms/mac/voicewake" },
            { text: "Voice Overlay", link: "/platforms/mac/voice-overlay" },
            { text: "Webchat", link: "/platforms/mac/webchat" },
            { text: "Canvas", link: "/platforms/mac/canvas" },
            { text: "Child Process", link: "/platforms/mac/child-process" },
            { text: "Health", link: "/platforms/mac/health" },
            { text: "Icon", link: "/platforms/mac/icon" },
            { text: "Logging", link: "/platforms/mac/logging" },
            { text: "Permissions", link: "/platforms/mac/permissions" },
            { text: "Remote", link: "/platforms/mac/remote" },
            { text: "Signing", link: "/platforms/mac/signing" },
            { text: "Release", link: "/platforms/mac/release" },
            { text: "Bundled Gateway", link: "/platforms/mac/bundled-gateway" },
            { text: "XPC", link: "/platforms/mac/xpc" },
            { text: "Skills", link: "/platforms/mac/skills" },
            { text: "Peekaboo", link: "/platforms/mac/peekaboo" },
          ],
        },
        {
          text: "Deployment",
          items: [
            { text: "Fly.io", link: "/platforms/fly" },
            { text: "Hetzner", link: "/platforms/hetzner" },
            { text: "GCP", link: "/platforms/gcp" },
            { text: "macOS VM", link: "/platforms/macos-vm" },
            { text: "Exe Dev", link: "/platforms/exe-dev" },
          ],
        },
      ],

      // === CHANNELS ===
      "/channels/": [
        {
          text: "Channels Overview",
          items: [{ text: "Overview", link: "/channels/" }],
        },
        {
          text: "Messaging Platforms",
          items: [
            { text: "WhatsApp", link: "/channels/whatsapp" },
            { text: "Telegram", link: "/channels/telegram" },
            { text: "Grammy (Telegram)", link: "/channels/grammy" },
            { text: "Discord", link: "/channels/discord" },
            { text: "Slack", link: "/channels/slack" },
            { text: "Feishu", link: "/channels/feishu" },
            { text: "Google Chat", link: "/channels/googlechat" },
            { text: "Mattermost", link: "/channels/mattermost" },
            { text: "Signal", link: "/channels/signal" },
            { text: "iMessage", link: "/channels/imessage" },
            { text: "MS Teams", link: "/channels/msteams" },
            { text: "LINE", link: "/channels/line" },
            { text: "Matrix", link: "/channels/matrix" },
            { text: "Zalo", link: "/channels/zalo" },
            { text: "Zalo User", link: "/channels/zalouser" },
          ],
        },
        {
          text: "Configuration",
          items: [
            { text: "Group Messages", link: "/concepts/group-messages" },
            { text: "Groups", link: "/concepts/groups" },
            { text: "Broadcast Groups", link: "/broadcast-groups" },
            { text: "Channel Routing", link: "/concepts/channel-routing" },
            { text: "Location", link: "/channels/location" },
            { text: "Troubleshooting", link: "/channels/troubleshooting" },
          ],
        },
      ],

      // === AGENTS / CONCEPTS ===
      "/concepts/": [
        {
          text: "Fundamentals",
          items: [
            { text: "Architecture", link: "/concepts/architecture" },
            { text: "Agent", link: "/concepts/agent" },
            { text: "Agent Loop", link: "/concepts/agent-loop" },
            { text: "System Prompt", link: "/concepts/system-prompt" },
            { text: "Context", link: "/concepts/context" },
            { text: "Agent Workspace", link: "/concepts/agent-workspace" },
            { text: "OAuth", link: "/concepts/oauth" },
          ],
        },
        {
          text: "Sessions and Memory",
          items: [
            { text: "Session", link: "/concepts/session" },
            { text: "Sessions", link: "/concepts/sessions" },
            { text: "Session Pruning", link: "/concepts/session-pruning" },
            { text: "Session Tool", link: "/concepts/session-tool" },
            { text: "Memory", link: "/concepts/memory" },
            { text: "Compaction", link: "/concepts/compaction" },
          ],
        },
        {
          text: "Multi-Agent",
          items: [
            { text: "Multi-Agent", link: "/concepts/multi-agent" },
            { text: "Presence", link: "/concepts/presence" },
          ],
        },
        {
          text: "Messages and Delivery",
          items: [
            { text: "Messages", link: "/concepts/messages" },
            { text: "Streaming", link: "/concepts/streaming" },
            { text: "Retry", link: "/concepts/retry" },
            { text: "Queue", link: "/concepts/queue" },
          ],
        },
        {
          text: "Models",
          items: [
            { text: "Models", link: "/concepts/models" },
            { text: "Model Providers", link: "/concepts/model-providers" },
            { text: "Model Failover", link: "/concepts/model-failover" },
          ],
        },
        {
          text: "Technical",
          items: [
            { text: "Features", link: "/concepts/features" },
            { text: "Channel Routing", link: "/concepts/channel-routing" },
            { text: "Group Messages", link: "/concepts/group-messages" },
            { text: "Groups", link: "/concepts/groups" },
            { text: "TypeBox", link: "/concepts/typebox" },
            { text: "Markdown Formatting", link: "/concepts/markdown-formatting" },
            { text: "Typing Indicators", link: "/concepts/typing-indicators" },
            { text: "Usage Tracking", link: "/concepts/usage-tracking" },
            { text: "Timezone", link: "/concepts/timezone" },
          ],
        },
      ],

      // === TOOLS ===
      "/tools/": [
        {
          text: "Overview",
          items: [{ text: "Tools", link: "/tools/" }],
        },
        {
          text: "Built-in Tools",
          items: [
            { text: "LLM Task", link: "/tools/llm-task" },
            { text: "Exec", link: "/tools/exec" },
            { text: "Web", link: "/tools/web" },
            { text: "Apply Patch", link: "/tools/apply-patch" },
            { text: "Elevated", link: "/tools/elevated" },
            { text: "Thinking", link: "/tools/thinking" },
            { text: "Reactions", link: "/tools/reactions" },
          ],
        },
        {
          text: "Browser",
          items: [
            { text: "Browser", link: "/tools/browser" },
            { text: "Browser Login", link: "/tools/browser-login" },
            { text: "Chrome Extension", link: "/tools/chrome-extension" },
            { text: "Linux Troubleshooting", link: "/tools/browser-linux-troubleshooting" },
          ],
        },
        {
          text: "Agent Coordination",
          items: [
            { text: "Agent Send", link: "/tools/agent-send" },
            { text: "Subagents", link: "/tools/subagents" },
            { text: "Multi-Agent Sandbox", link: "/multi-agent-sandbox-tools" },
          ],
        },
        {
          text: "Skills and Extensions",
          items: [
            { text: "Slash Commands", link: "/tools/slash-commands" },
            { text: "Skills", link: "/tools/skills" },
            { text: "Skills Config", link: "/tools/skills-config" },
            { text: "EdwinHub", link: "/tools/edwin-skills" },
            { text: "Plugins", link: "/plugin" },
            { text: "Voice Call", link: "/plugins/voice-call" },
            { text: "Zalo User", link: "/plugins/zalouser" },
          ],
        },
        {
          text: "Automation",
          items: [
            { text: "Hooks", link: "/hooks" },
            { text: "Soul Evil", link: "/hooks/soul-evil" },
            { text: "Cron Jobs", link: "/automation/cron-jobs" },
            { text: "Cron vs Heartbeat", link: "/automation/cron-vs-heartbeat" },
            { text: "Webhook", link: "/automation/webhook" },
            { text: "Gmail Pub/Sub", link: "/automation/gmail-pubsub" },
            { text: "Poll", link: "/automation/poll" },
            { text: "Auth Monitoring", link: "/automation/auth-monitoring" },
          ],
        },
        {
          text: "Media and Devices",
          items: [
            { text: "Nodes", link: "/nodes/" },
            { text: "Images", link: "/nodes/images" },
            { text: "Audio", link: "/nodes/audio" },
            { text: "Camera", link: "/nodes/camera" },
            { text: "Talk", link: "/nodes/talk" },
            { text: "Voicewake", link: "/nodes/voicewake" },
            { text: "Location", link: "/nodes/location-command" },
          ],
        },
      ],

      // === MODELS / PROVIDERS ===
      "/providers/": [
        {
          text: "Overview",
          items: [
            { text: "Providers", link: "/providers/" },
            { text: "Models List", link: "/providers/models" },
            { text: "Models Config", link: "/concepts/models" },
          ],
        },
        {
          text: "Configuration",
          items: [
            { text: "Model Providers", link: "/concepts/model-providers" },
            { text: "Model Failover", link: "/concepts/model-failover" },
          ],
        },
        {
          text: "Providers",
          items: [
            { text: "Anthropic", link: "/providers/anthropic" },
            { text: "OpenAI", link: "/providers/openai" },
            { text: "OpenRouter", link: "/providers/openrouter" },
            { text: "Bedrock", link: "/bedrock" },
            { text: "Vercel AI Gateway", link: "/providers/vercel-ai-gateway" },
            { text: "Moonshot", link: "/providers/moonshot" },
            { text: "MiniMax", link: "/providers/minimax" },
            { text: "OpenCode", link: "/providers/opencode" },
            { text: "GLM", link: "/providers/glm" },
            { text: "ZAI", link: "/providers/zai" },
            { text: "Synthetic", link: "/providers/synthetic" },
          ],
        },
      ],

      // === GATEWAY / INFRASTRUCTURE ===
      "/gateway/": [
        {
          text: "Gateway",
          items: [{ text: "Overview", link: "/gateway/" }],
        },
        {
          text: "Configuration and Operations",
          items: [
            { text: "Configuration", link: "/gateway/configuration" },
            { text: "Configuration Examples", link: "/gateway/configuration-examples" },
            { text: "Authentication", link: "/gateway/authentication" },
            { text: "Health", link: "/gateway/health" },
            { text: "Heartbeat", link: "/gateway/heartbeat" },
            { text: "Doctor", link: "/gateway/doctor" },
            { text: "Logging", link: "/gateway/logging" },
            { text: "Gateway Lock", link: "/gateway/gateway-lock" },
            { text: "Background Process", link: "/gateway/background-process" },
            { text: "Multiple Gateways", link: "/gateway/multiple-gateways" },
            { text: "Troubleshooting", link: "/gateway/troubleshooting" },
          ],
        },
        {
          text: "Security and Sandboxing",
          items: [
            { text: "Security", link: "/gateway/security/" },
            { text: "Sandboxing", link: "/gateway/sandboxing" },
            {
              text: "Sandbox vs Tool Policy vs Elevated",
              link: "/gateway/sandbox-vs-tool-policy-vs-elevated",
            },
          ],
        },
        {
          text: "Protocols and APIs",
          items: [
            { text: "Protocol", link: "/gateway/protocol" },
            { text: "Bridge Protocol", link: "/gateway/bridge-protocol" },
            { text: "OpenAI HTTP API", link: "/gateway/openai-http-api" },
            { text: "Tools Invoke HTTP API", link: "/gateway/tools-invoke-http-api" },
            { text: "CLI Backends", link: "/gateway/cli-backends" },
            { text: "Local Models", link: "/gateway/local-models" },
          ],
        },
        {
          text: "Networking and Discovery",
          items: [
            { text: "Network Model", link: "/gateway/network-model" },
            { text: "Pairing", link: "/gateway/pairing" },
            { text: "Discovery", link: "/gateway/discovery" },
            { text: "Bonjour", link: "/gateway/bonjour" },
          ],
        },
        {
          text: "Remote Access and Deployment",
          items: [
            { text: "Remote", link: "/gateway/remote" },
            { text: "Remote Gateway Readme", link: "/gateway/remote-gateway-readme" },
            { text: "Tailscale", link: "/gateway/tailscale" },
            { text: "Fly.io", link: "/platforms/fly" },
            { text: "Hetzner", link: "/platforms/hetzner" },
            { text: "GCP", link: "/platforms/gcp" },
            { text: "macOS VM", link: "/platforms/macos-vm" },
            { text: "Exe Dev", link: "/platforms/exe-dev" },
            { text: "Railway", link: "/railway" },
            { text: "Render", link: "/render" },
            { text: "Northflank", link: "/northflank" },
          ],
        },
        {
          text: "Security",
          items: [{ text: "Formal Verification", link: "/security/formal-verification" }],
        },
      ],

      // === WEB ===
      "/web/": [
        {
          text: "Web Interfaces",
          items: [
            { text: "Overview", link: "/web/" },
            { text: "Control UI", link: "/web/control-ui" },
            { text: "Dashboard", link: "/web/dashboard" },
            { text: "Webchat", link: "/web/webchat" },
            { text: "TUI", link: "/tui" },
          ],
        },
      ],

      // === NODES ===
      "/nodes/": [
        {
          text: "Media and Devices",
          items: [
            { text: "Nodes", link: "/nodes/" },
            { text: "Images", link: "/nodes/images" },
            { text: "Audio", link: "/nodes/audio" },
            { text: "Camera", link: "/nodes/camera" },
            { text: "Talk", link: "/nodes/talk" },
            { text: "Voicewake", link: "/nodes/voicewake" },
            { text: "Location", link: "/nodes/location-command" },
          ],
        },
      ],

      // === CLI / REFERENCE ===
      "/cli/": [
        {
          text: "CLI Commands",
          items: [
            { text: "Overview", link: "/cli/" },
            { text: "agent", link: "/cli/agent" },
            { text: "agents", link: "/cli/agents" },
            { text: "approvals", link: "/cli/approvals" },
            { text: "browser", link: "/cli/browser" },
            { text: "channels", link: "/cli/channels" },
            { text: "configure", link: "/cli/configure" },
            { text: "cron", link: "/cli/cron" },
            { text: "dashboard", link: "/cli/dashboard" },
            { text: "directory", link: "/cli/directory" },
            { text: "dns", link: "/cli/dns" },
            { text: "docs", link: "/cli/docs" },
            { text: "doctor", link: "/cli/doctor" },
            { text: "gateway", link: "/cli/gateway" },
            { text: "health", link: "/cli/health" },
            { text: "hooks", link: "/cli/hooks" },
            { text: "logs", link: "/cli/logs" },
            { text: "memory", link: "/cli/memory" },
            { text: "message", link: "/cli/message" },
            { text: "models", link: "/cli/models" },
            { text: "nodes", link: "/cli/nodes" },
            { text: "onboard", link: "/cli/onboard" },
            { text: "pairing", link: "/cli/pairing" },
            { text: "plugins", link: "/cli/plugins" },
            { text: "reset", link: "/cli/reset" },
            { text: "sandbox", link: "/cli/sandbox" },
            { text: "security", link: "/cli/security" },
            { text: "sessions", link: "/cli/sessions" },
            { text: "setup", link: "/cli/setup" },
            { text: "skills", link: "/cli/skills" },
            { text: "status", link: "/cli/status" },
            { text: "system", link: "/cli/system" },
            { text: "tui", link: "/cli/tui" },
            { text: "uninstall", link: "/cli/uninstall" },
            { text: "update", link: "/cli/update" },
            { text: "voicecall", link: "/cli/voicecall" },
          ],
        },
      ],

      "/reference/": [
        {
          text: "RPC and API",
          items: [
            { text: "RPC", link: "/reference/rpc" },
            { text: "Device Models", link: "/reference/device-models" },
          ],
        },
        {
          text: "Templates",
          items: [
            { text: "AGENTS.default", link: "/reference/AGENTS.default" },
            { text: "AGENTS", link: "/reference/templates/AGENTS" },
            { text: "BOOT", link: "/reference/templates/BOOT" },
            { text: "BOOTSTRAP", link: "/reference/templates/BOOTSTRAP" },
            { text: "HEARTBEAT", link: "/reference/templates/HEARTBEAT" },
            { text: "IDENTITY", link: "/reference/templates/IDENTITY" },
            { text: "SOUL", link: "/reference/templates/SOUL" },
            { text: "TOOLS", link: "/reference/templates/TOOLS" },
            { text: "USER", link: "/reference/templates/USER" },
          ],
        },
        {
          text: "Release Notes",
          items: [
            { text: "Releasing", link: "/reference/RELEASING" },
            { text: "Test", link: "/reference/test" },
          ],
        },
        {
          text: "Other",
          items: [
            { text: "Credits", link: "/reference/credits" },
            { text: "Session Mgmt & Compaction", link: "/reference/session-management-compaction" },
          ],
        },
      ],

      // === AUTOMATION ===
      "/automation/": [
        {
          text: "Automation",
          items: [
            { text: "Cron Jobs", link: "/automation/cron-jobs" },
            { text: "Cron vs Heartbeat", link: "/automation/cron-vs-heartbeat" },
            { text: "Webhook", link: "/automation/webhook" },
            { text: "Gmail Pub/Sub", link: "/automation/gmail-pubsub" },
            { text: "Poll", link: "/automation/poll" },
            { text: "Auth Monitoring", link: "/automation/auth-monitoring" },
          ],
        },
      ],

      // === HOOKS ===
      "/hooks": [
        {
          text: "Hooks",
          items: [
            { text: "Hooks", link: "/hooks" },
            { text: "Soul Evil", link: "/hooks/soul-evil" },
          ],
        },
      ],

      // === HELP ===
      "/help/": [
        {
          text: "Help",
          items: [
            { text: "Help", link: "/help/" },
            { text: "Troubleshooting", link: "/help/troubleshooting" },
            { text: "FAQ", link: "/help/faq" },
          ],
        },
        {
          text: "Environment and Debugging",
          items: [
            { text: "Environment", link: "/environment" },
            { text: "Debugging", link: "/debugging" },
            { text: "Testing", link: "/testing" },
            { text: "Scripts", link: "/scripts" },
            { text: "Session Mgmt & Compaction", link: "/reference/session-management-compaction" },
          ],
        },
      ],
    },
  },
});
