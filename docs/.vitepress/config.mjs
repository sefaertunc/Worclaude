import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Worclaude',
  description: 'Professional Claude Code workflow system',
  base: '/Worclaude/',

  srcExclude: ['spec/**', 'phases/**'],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Reference', link: '/reference/commands' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Existing Projects', link: '/guide/existing-projects' },
            { text: 'Upgrading', link: '/guide/upgrading' },
            { text: 'Workflow Tips', link: '/guide/workflow-tips' },
            { text: 'Claude Code Integration', link: '/guide/claude-code-integration' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Commands', link: '/reference/commands' },
            { text: 'Agents', link: '/reference/agents' },
            { text: 'Skills', link: '/reference/skills' },
            { text: 'Slash Commands', link: '/reference/slash-commands' },
            { text: 'CLAUDE.md Template', link: '/reference/claude-md' },
            { text: 'Hooks', link: '/reference/hooks' },
            { text: 'Learnings', link: '/reference/learnings' },
            { text: 'Observability', link: '/reference/observability' },
            { text: 'Permissions', link: '/reference/permissions' },
            { text: 'Configuration', link: '/reference/configuration' },
            { text: 'Upstream Automation', link: '/reference/upstream-automation' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/sefaertunc/Worclaude' }],

    footer: {
      message: "Built with best practices from Boris Cherny's Claude Code tips.",
      copyright: 'MIT License',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/sefaertunc/Worclaude/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
});
