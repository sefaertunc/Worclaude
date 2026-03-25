import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Worclaude',
  description: 'Professional Claude Code workflow system',
  base: '/Worclaude/',

  srcExclude: ['spec/**', 'RECORDING-INSTRUCTIONS.md'],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Reference', link: '/reference/commands' },
      { text: 'Demo', link: '/demo/' },
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
          ]
        }
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
            { text: 'Permissions', link: '/reference/permissions' },
            { text: 'Configuration', link: '/reference/configuration' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sefaertunc/Worclaude' }
    ],

    footer: {
      message: 'Built with best practices from Boris Cherny\'s 53 Claude Code tips.',
      copyright: 'MIT License'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/sefaertunc/Worclaude/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
