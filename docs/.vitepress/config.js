import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'XCoin',
  description: 'Next gerneration trading bot',
  appearance: true,
  base: '/xcoin/',
  lastUpdated: true,
  ignoreDeadLinks: true,
  cleanUrls: 'true',
  markdown: {
    theme: 'material-theme-palenight',
    lineNumbers: false
  },
  locales: {
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      description: '下一代交易机器人',
      themeConfig: {
        nav: nav_cn(),
        docFooter: {
          prev: '上一页',
          next: '下一页'
        },
        outlineTitle: '在此页',
        editLink: {
          pattern: 'https://github.com/rainfu/xcoin/docs/:path',
          text: '在GitHub上编辑此页面'
        },
        footer: {
          message: 'MIT 授权',
          copyright: '版权所有 © 2023 Rain Fu'
        },
        darkModeSwitchLabel: '外观',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回页首',
        langMenuLabel: '改变语言',
        lastUpdatedText: '最后更新'
      }
    },
    root: {
      label: 'English',
      lang: 'en-US',
      link: '/'
    }
  },

  // theme related configurations.
  themeConfig: {
    logo: '/images/logo.png',
    siteTitle: 'XCoin',
    i18nRouting: true,
    aside: 'true',
    docFooter: {
      prev: 'Previous Page',
      next: 'Next Page'
    },
    outlineTitle: 'On this page',
    editLink: {
      pattern: 'https://github.com/rainfu/xcoin/docs/:path',
      text: 'Edit this page on GitHub'
    },
    darkModeSwitchLabel: 'Appearance',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Return to top',
    langMenuLabel: 'Change Language',
    lastUpdatedText: 'Last Updated',
    outline: 'deep',
    nav: nav(),
    sidebar: {
      '/': sidebarGuide(),
      '/zh/': sidebarGuide_cn()
    },
    footer: {
      message: 'Released under the MIT License',
      copyright: 'Copyright © 2023-present Rain Fu'
    },
    /* algolia: {
      appId: '8J64VVRP8K',
      apiKey: 'a18e2f4cc5665f6602c5631fd868adfd',
      indexName: 'xcoin'
    }, */
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rainfu/xcoin' }
    ]
  }
})

function nav_cn() {
  return [
    { text: '指南', link: '/zh/start.md' },
    { text: '反馈', link: 'https://github.com/rainfu/xcoin/issues' }
  ]
}

function nav() {
  return [
    { text: 'Guide', link: '/start.md' },
    { text: 'Feedback', link: 'https://github.com/rainfu/xcoin/issues' }
  ]
}

function sidebarGuide_cn() {
  return [
    {
      text: '简介',
      collapsed: false,
      items: [
        { text: '新手指南', link: '/zh/start' },
        { text: '交易配置', link: '/zh/config' },
        { text: '交易策略', link: '/zh/strategy' },
        { text: '交易所', link: '/zh/exchange' }
      ]
    },
    {
      text: '高级',
      collapsed: false,
      items: [
        { text: '常见问题', link: '/zh/faq' },
        { text: 'PM2管理机器人', link: '/zh/pm2' },
        { text: '开发者', link: '/zh/developer' },
        { text: 'API', link: '/zh/api' }
      ]
    }
  ]
}

function sidebarGuide() {
  return [
    {
      text: 'Introduction',
      collapsed: false,
      items: [
        { text: 'Quick start', link: '/start' },
        { text: 'Bot config', link: '/config' },
        { text: 'Bot strategy', link: '/strategy' },
        { text: 'Exchange', link: '/exchange' }
      ]
    },
    {
      text: 'Advanced',
      collapsed: false,
      items: [
        { text: 'FAQ', link: '/faq' },
        { text: 'PM2', link: '/pm2' },
        { text: 'Developer', link: '/developer' },
        { text: 'API', link: '/api' }
      ]
    }
  ]
}
