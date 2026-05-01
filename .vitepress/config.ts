import { defineConfig } from "vitepress";

export default defineConfig({
  title: "EdwinPAI Docs",
  description: "EdwinPAI is a personal AI runtime and gateway that connects agents, tools, and messaging surfaces.",
  cleanUrls: true,
  mpa: true,
  ignoreDeadLinks: true,
  head: [["link", { rel: "icon", href: "/assets/favicon-32x32.png" }]],
  themeConfig: {
    logo: "/assets/edwin-logo.png",
    nav: [
      { text: "GitHub", link: "https://github.com/jonesj38/edwin" },
      { text: "Releases", link: "https://github.com/jonesj38/edwin/releases" },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/jonesj38/edwin" },
    ],
    footer: {
      message: "Built with VitePress",
      copyright: "© EdwinPAI",
    },
    search: {
      provider: "local",
    },
  },
});
