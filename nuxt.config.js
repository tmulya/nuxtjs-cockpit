require('dotenv').config()
const PurgecssPlugin = require('purgecss-webpack-plugin')
const glob = require('glob-all')
const path = require('path')
const collect = require('collect.js')
import axios from 'axios'

class TailwindExtractor {
  static extract(content) {
    return content.match(/[A-z0-9-:\/]+/g) || [];
  }
}

const pkg = require('./package')

module.exports = {
  mode: 'universal',

  /*
  ** Headers of the page
  */
  head: {
    title: pkg.name,
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: pkg.description }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#fff' },

  /*
  ** Global CSS
  */
  css: [
    '@/assets/css/main.css',
    'highlight.js/styles/dracula.css'
  ],

  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
    '~/plugins/filters.js'
  ],

  /*
  ** Nuxt.js modules
  */
  modules: [
    // Doc: https://github.com/nuxt-community/axios-module#usage
    '@nuxtjs/axios',
    '@nuxtjs/sitemap'
  ],
  /*
  ** Axios module configuration
  */
  axios: {
    // See https://github.com/nuxt-community/axios-module#options
  },

  /*
  ** Build configuration
  */
  build: {
    extractCSS: true,
    /*
    ** You can extend webpack config here
    */
    extend(config, { isDev }) {
      if(!isDev) {
        // Remove unused CSS using purgecss. See https://github.com/FullHuman/purgecss
        // for more information about purgecss.
        config.plugins.push(
          new PurgecssPlugin({
            // Specify the locations of any files you want to scan for class names.
            paths: glob.sync([
              path.join(__dirname, './pages/**/*.vue'),
              path.join(__dirname, './layouts/**/*.vue'),
              path.join(__dirname, './components/**/*.vue')
            ]),
            extractors: [
              {
                extractor: TailwindExtractor,
                // Specify the file extensions to include when scanning for
                // class names.
                extensions: ["html", "vue"]
              }
            ],
            whitelist:[
              "html",
              "body",
              "ul",
              "ol",
              "pre",
              "code",
              "blockquote"
            ],
            whitelistPatterns: [/\bhljs\S*/]
          })
        )
      }
    }
  },

  generate: {
    routes: async () => {
      let { data } = await axios.post(process.env.POSTS_URL, JSON.stringify({
        filter: { published: true},
        sort: {_created:-1},
        populate: 1
      }),
      {
        headers: { 'Content-Type': 'application/json'}
      })

      const collection = collect(data.entries)

      let tags = collection.map(post => post.tags)
      .flatten()
      .unique()
      .map(tag => {
        let payload = collection.filter(item => {
          return collect(item.tags).contains(tag)
        }).all()

        return {
          route: 'category/${tag}',
          payload: payload
        }
      }).all()

      let posts = collection.map(post => {
        return {
          route: post.title_slug,
          paylod: post
        }
      }).all()

      return posts.concat(tags)
    }
  },
  sitemap: {
    path: '/sitemap.xml',
    hostname: process.env.URL,
    cacheTime: 1000 * 60 * 15,
    generate: true, // Enable me when using nuxt generate
    async routes () {
      let { data } = await axios.post(process.env.POSTS_URL,
      JSON.stringify({
        filter: { published: true},
        sort: {_created:-1},
        populate: 1
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      })

      const collection = collect(data.entries)

      let tags = collection.map(post => post.tags)
      .flatten()
      .unique()
      .map(tag => 'category/${tag}')
      .all()

      let posts = collection.map(post => post.title_slug).all()

      return posts.concat(tags)
    }

  }
}
