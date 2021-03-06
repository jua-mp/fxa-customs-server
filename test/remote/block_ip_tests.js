/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

var test = require('tap').test
var TestServer = require('../test_server')
var Promise = require('bluebird')
var restify = require('restify')
var mcHelper = require('../memcache-helper')

var TEST_EMAIL = 'test@example.com'
var TEST_IP = '192.0.2.1'
var ALLOWED_IP = '63.245.214.162'

var config = {
  listen: {
    port: 7000
  }
}
var testServer = new TestServer(config)

var client = restify.createJsonClient({
  url: 'http://127.0.0.1:' + config.listen.port
})

Promise.promisifyAll(client, { multiArgs: true })

test(
  'startup',
  function (t) {
    testServer.start(function (err) {
      t.type(testServer.server, 'object', 'test server was started')
      t.notOk(err, 'no errors were returned')
      t.end()
    })
  }
)

test(
  'clear everything',
  function (t) {
    mcHelper.clearEverything(
      function (err) {
        t.notOk(err, 'no errors were returned')
        t.end()
      }
    )
  }
)

test(
  'missing ip',
  function (t) {
    return client.postAsync('/blockIp', {})
      .then(function (req, res, obj) {
        //missing parameters
      }, function(err){
        t.equal(err.statusCode, 400, 'bad request returns a 400')
        t.type(err.restCode, 'string', 'bad request returns an error code')
        t.type(err.message, 'string', 'bad request returns an error message')
        t.end()
      })
  }
)

test(
  'well-formed request',
  function (t) {
    return client.postAsync('/check', { email: TEST_EMAIL, ip: TEST_IP, action: 'accountLogin' })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'check worked')
        t.equal(obj.block, false, 'request was not blocked')

        return client.postAsync('/blockIp', { ip: TEST_IP })
      })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'block request returns a 200')
        t.ok(obj, 'got an obj, make jshint happy')

        return client.postAsync('/check', { email: TEST_EMAIL, ip: TEST_IP, action: 'accountLogin' })
      })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'check worked')
        t.equal(obj.block, true, 'request was blocked')
        t.end()
      })
      .catch(function(err){
        t.fail(err)
        t.end()
      })
  }
)

test(
  'allowed ip is not blocked',
  function (t) {
    return client.postAsync('/check', { email: TEST_EMAIL, ip: ALLOWED_IP, action: 'accountLogin' })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'check worked')
        t.equal(obj.block, false, 'request was not blocked')

        return client.postAsync('/blockIp', { ip: ALLOWED_IP })
      })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'block request returns a 200')
        t.ok(obj, 'got an obj, make jshint happy')

        return client.postAsync('/check', { email: TEST_EMAIL, ip: ALLOWED_IP, action: 'accountLogin' })
      })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'check worked')
        t.equal(obj.block, true, 'request was blocked')
        t.end()
      })
      .catch(function(err){
        t.fail(err)
        t.end()
      })
  }
)

test(
  'teardown',
  function (t) {
    testServer.stop()
    t.equal(testServer.server.killed, true, 'test server has been killed')
    t.end()
  }
)
