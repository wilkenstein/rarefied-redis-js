# rarefied-redis-js
Pure javascript implementations of redis Abstractions. Part of the [Rarefied Redis Project](http://wilkenstein.github.io/rarefied-redis/).

### Status

[![Build Status](https://travis-ci.org/wilkenstein/rarefied-redis-js.svg?branch=master)](https://travis-ci.org/wilkenstein/rarefied-redis-js)

## Installation

### npm

````bash
$ npm install rarefied-redis-js
````

### Browser

TODO

## Basic Usage

All Abstractions are exported by the rarefied_redis object if the Abstraction exists.

### node.js/io.js

All Abstractions are available by requiring `rarefied-redis-js`. Example:

````javascript
var Q = require('q');
var client = require('redis-js').toNodeRedis().toPromiseStyle(Q.defer);
var rarefied_redis = require('rarefied-redis-js');

var scanner = rarefied_redis.RedisScanner.lscanner(client).toPromiseStyle(Q.defer);

client
    .rpush('key', 'v1', 'v2')
    .then(function () {
        return scanner.scan('key', function (range) {
            console.log(range);
        });
    })
    .fail(function (err) {
        throw err;
    })      
    .done();

// Script will print ['v1', 'v2'] to the console.
````

### Browser

Abstractions that have been loaded before the `rarefied-redis.js` (or its minified version) will be exported onto the global `window` object. Example:

````javascript
(function () {

    var client = window.redismock;
    var scanner = window.RedisScanner.lscanner(client);

    client.rpush('key', 'v1', 'v2', function () {
        scanner.scan('key', function (range) {
            console.log(range);
        });
    });

// Script will print ['v1', 'v2'] to the console.
})();
````

## Abstractions

* Adapters
  - RedisListAdapter: adapter/redis-list-adapter.js
* Util
  - RedisScanner: util/redis-scanner.js
  - RedisExpirer: util/redis-expirer.js
* Reliable
  - RedisReliableDeleter: reliable/redis-reliable-deleter.js
  - RedisReliableMover: reliable/redis-reliable-mover.js
  - RedisReliableLocker: reliable/redis-reliable-locker.js
  - RedisReliableConsumer: reliable/redis-reliable-consumer.js
  - RedisReliableProducer: reliable/redis-reliable-producer.js
* Guaranteed
* Crypto
  - TODO: Not really implemented yet....
* Concurrency
  - redisCAS: concurrency/redis-cas.js
  - RedisConcurrency: concurrency/redis-concurrency.js (Pessimistic concurrency not fully vetted yet).

## Contributing

All contributions welcome! Issues or Pull Requests. For PRs, `npm test`, `npm
run test-phantomjs`, and `npm run test-integrations` must
all succeed and test the new code before the PR will be considered.

## Testing

This project users karma + mocha + chai + <a href="https://www.npmjs.com/package/redis-js">redis-js</a>.

To run the full test suite from source, issue the standard npm command:

````bash
$ npm test
````

This will run jshint against all the source files, run the full mocha suite with a coverage report, and finally run a complexity report against all the source files.

To run the mocha tests against an actual redis server instead of in-memory redis-js, issue the following command:

````bash
$ npm run test-integrations
````

This command will substitute the node redis client for the in-memory redis-js client. This command tests against a localhost redis server on port 6379. To test against a different redis server, set `REDIS_JS_NODE_REDIS_PORT`, `REDIS_JS_NODE_REDIS_HOST`, and `REDIS_JS_NODE_REDIS_OPTIONS` as documented in <a href="https://www.npmjs.com/package/redis-js">redis-js</a>.

To run the mocha tests within a particular browser using karma, issue the following npm commands:

````bash
$ npm run test-phantomjs
$ npm run test-firefox
$ npm run test-chrome
$ npm run test-safari
$ npm run test-opera
$ npm run test-ie
````

These tests use the various karma-*-launcher projects to launch the browsers. If the browser is not installed on the system, the corresponding test command will print an error and hang.

test-phantomjs is the only test command that does not rely on external
dependencies. test-phantomjs will install the latest compatible
version of phantomjs in a tmp directory, and use that binary to run
the tests.

Creating a test is as easy as adding a new test file in
`test/mocha/`. In order for the test to run across different
JavaScript engines, a somewhat specific style is required:

````javascript
(function() {
    var redismock = typeof require === 'function' ? require('redis-js') : window.redismock;
    if (typeof chai === 'undefined') {
        var chai = typeof require === 'function' ? require('chai') : window.chai;
    }
    chai.config.includeStack = true;
    var expect = chai.expect;

    /* Put describe & it blocks here */
    
}).call(this);
````

Tests should use the rarefied_redis object to get at the Abstraction. For example:

````javascript
    var RedisReliableMover = typeof require === 'function' ? require('../../rarefied-redis.js').RedisReliableMover : window.RedisReliableMover;
````

## Roadmap

## Versions
* 0.0.1-2
  - Some Abstractions implemented.
  - Implemented Abstractions unit-tested against node.
  - Implemented Abstractions unit-tested against browsers.
  - Implemented Abstractions integration-tested.