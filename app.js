'use strict'

const reekoh = require('reekoh')
const plugin = new reekoh.plugins.Gateway()

const isEmpty = require('lodash.isempty')

let server = null

plugin.once('ready', () => {
  let hpp = require('hpp')
  let helmet = require('helmet')
  let config = require('./config.json')
  let express = require('express')
  let bodyParser = require('body-parser')

  let options = plugin.config

  if (isEmpty(options.dataPath)) {
    options.dataPath = config.dataPath
  }

  let app = express()

  app.use(bodyParser.json())

  app.disable('x-powered-by')
  app.use(helmet.xssFilter({setOnOldIE: true}))
  app.use(helmet.frameguard('deny'))
  app.use(helmet.ieNoOpen())
  app.use(helmet.noSniff())
  app.use(hpp())

  if (!isEmpty(options.username)) {
    let basicAuth = require('basic-auth')

    app.use((req, res, next) => {
      let unauthorized = (res) => {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
        return res.sendStatus(401)
      }

      let user = basicAuth(req)

      if (isEmpty(user)) {
        return unauthorized(res)
      }
      if (user.name === options.username && isEmpty(options.password)) { return next() }
      if (user.name === options.username && user.pass === options.password) {
        return next()
      } else {
        return unauthorized(res)
      }
    })
  }

  app.post((options.dataPath.startsWith('/')) ? options.dataPath : `/${options.dataPath}`, (req, res) => {
    let data = req.body

    res.set('Content-Type', 'text/plain')
    res.status(200).send(`Data Received. Device ID: ${data.device}. Data: ${JSON.stringify(data)}\n`)

    if (isEmpty(data) || isEmpty(data.device)) {
      plugin.logException(new Error('Invalid data sent. Data must be a valid JSON String with at least a "device" field which corresponds to a registered Device ID.'))
    }

    plugin.requestDeviceInfo(data.device).then((deviceInfo) => {
      if (isEmpty(deviceInfo)) {
        return plugin.log(JSON.stringify({
          title: 'SIGFOX Gateway - Access Denied. Unauthorized Device',
          device: data.device
        }))
      }

      return plugin.pipe(data).then(() => {
        plugin.log(JSON.stringify({
          title: 'SIGFOX Gateway - Data Received',
          device: data.device,
          data: data
        }))

        plugin.emit('data.ok')
      })
    }).catch((err) => {
      plugin.logException(err)
      console.error(err)
    })
  })

  app.use((error, req, res, next) => {
    res.set('Content-Type', 'text/plain')
    res.status(500).send('An unexpected error has occurred. Please contact support.\n')
    plugin.logException(error)
  })

  app.use((req, res) => {
    res.set('Content-Type', 'text/plain')
    res.status(404).send(`Invalid Path. ${req.originalUrl} Not Found\n`)
  })

  server = require('http').Server(app)

  server.once('error', function (error) {
    console.error('SIGFOX Gateway Error', error)
    plugin.logException(error)

    setTimeout(() => {
      server.close(() => {
        server.removeAllListeners()
        process.exit()
      })
    }, 5000)
  })

  server.once('close', () => {
    plugin.log(`SIGFOX Gateway closed on port ${options.port}`)
  })

  server.listen(options.port, () => {
    plugin.log(`SIGFOX Gateway has been initialized on port ${options.port}`)
    plugin.emit('init')
  })
})

module.exports = plugin
