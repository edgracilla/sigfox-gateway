/* global describe, it, after, before */
'use strict'

const async = require('async')
const should = require('should')
const request = require('request')

const PORT = 8182
const PLUGIN_ID = 'demo.gateway'
const BROKER = 'amqp://guest:guest@127.0.0.1/'
const OUTPUT_PIPES = 'demo.outpipe1,demo.outpipe2'
const COMMAND_RELAYS = 'demo.relay1,demo.relay2'

const Broker = require('../node_modules/reekoh/lib/broker.lib')

let conf = {
  port: PORT,
  dataPath: '/data'
}

let _app = null
let _broker = null

describe('Sigfox Gateway', () => {
  before('init', () => {
    process.env.BROKER = BROKER
    process.env.PLUGIN_ID = PLUGIN_ID
    process.env.OUTPUT_PIPES = OUTPUT_PIPES
    process.env.COMMAND_RELAYS = COMMAND_RELAYS
    process.env.CONFIG = JSON.stringify(conf)

    _broker = new Broker()
  })

  after('terminate', function () {

  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(10000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#test RPC preparation', () => {
    it('should connect to broker', (done) => {
      _broker.connect(BROKER).then(() => {
        return done() || null
      }).catch((err) => {
        done(err)
      })
    })

    it('should spawn temporary RPC server', (done) => {
      // if request arrives this proc will be called
      let sampleServerProcedure = (msg) => {
        // console.log(msg.content.toString('utf8'))
        return new Promise((resolve, reject) => {
          async.waterfall([
            async.constant(msg.content.toString('utf8')),
            async.asyncify(JSON.parse)
          ], (err, parsed) => {
            if (err) return reject(err)
            parsed.foo = 'bar'
            resolve(JSON.stringify(parsed))
          })
        })
      }

      _broker.createRPC('server', 'deviceinfo').then((queue) => {
        return queue.serverConsume(sampleServerProcedure)
      }).then(() => {
        // Awaiting RPC requests
        done()
      }).catch((err) => {
        done(err)
      })
    })
  })

  describe('#data', function () {
    it('should process the data', function (done) {
      this.timeout(10000)

      request.post({
        url: `http://localhost:${PORT}/data`,
        body: JSON.stringify({device: '567827489028375', data: 'test data'}),
        headers: {
          'Content-Type': 'application/json'
        }
      }, function (error, response, body) {
        should.ifError(error)
        should.equal(200, response.statusCode)
        should.ok(body.startsWith('Data Received.'))
        done()
      })

      _app.on('data.ok', done)
    })
  })
})
