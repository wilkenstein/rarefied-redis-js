/* jshint unused:true, undef:true, strict:true, plusplus:true */
/* global module:false, exports:true, require:false */

/**
 * @namespace RarefiedRedis
 */
(function () {

    // Baseline setup
    // --------------

    "use strict";

    // Establish the root object, `window` in the browser, or `exports` on the server.
    var root = this;

    /**
     * The base rarefied redis object. In CommonJS environments, it will include
     * and export all the rarefied abstractions.
     */
    var rarefied_redis = {};

    if (typeof require === 'function') {
        rarefied_redis.redis_util = require('./util/redis-util.js');
        rarefied_redis.redis_uuid = require('./util/redis-uuid.js');
        rarefied_redis.RedisListAdapter = require('./adapter/redis-list-adapter.js');
        rarefied_redis.RedisScanner = require('./util/redis-scanner.js');
        rarefied_redis.RedisExpirer = require('./util/redis-expirer.js');
        rarefied_redis.RedisReliableDeleter = require('./reliable/redis-reliable-deleter.js');
        rarefied_redis.RedisReliableLocker = require('./reliable/redis-reliable-locker.js');
        rarefied_redis.RedisReliableMover = require('./reliable/redis-reliable-mover.js');
        rarefied_redis.RedisReliableProducer = require('./reliable/redis-reliable-producer.js');
        rarefied_redis.RedisReliableConsumer = require('./reliable/redis-reliable-consumer.js');
        rarefied_redis.RedisConcurrency = require('./concurrency/redis-concurrency.js');
        rarefied_redis.redisCAS = require('./concurrency/redis-cas.js');
    }
    else {
        rarefied_redis.redis_util = root.redis_util;
        rarefied_redis.redis_uuid = root.redis_uuid;
        rarefied_redis.RedisListAdapter = root.RedisListAdapter;
        rarefied_redis.RedisScanner = root.RedisScanner;
        rarefied_redis.RedisExpirer = root.RedisExpirer;
        rarefied_redis.RedisReliableDeleter = root.RedisReliableDeleter;
        rarefied_redis.RedisReliableLocker = root.RedisReliableLocker;
        rarefied_redis.RedisReliableMover = root.RedisReliableMover;
        rarefied_redis.RedisReliableProducer = root.RedisReliableProducer;
        rarefied_redis.RedisReliableConsumer = root.RedisReliableConsumer;
        rarefied_redis.RedisConcurrency = root.RedisConcurrency;
        rarefied_redis.redisCAS = root.redisCAS;
    }

    function toPromise(f, context, deferFactory) {
        return function () {
            // Remove the formal callback parameter and make it a promise instead.
            var args = Array.prototype.slice.call(arguments);
            var deferred = deferFactory(), promise;
            var callback;
            while (args.length < f.length - 1) {
                args.push(undefined);
            }
            if (args.length === f.length && typeof args[args.length - 1] === 'function') {
                // Hm, someone passed in the callback, so we should probably honor it when we can.
                callback = args[args.length - 1];
                args.pop();
            }
            args.push(function (err/*, replies...*/) {
                var fargs = Array.prototype.slice.call(arguments).slice(1);
                if (err) {
                    if (callback && typeof callback === 'function') {
                        callback(err);
                    }
                    return deferred.reject(err);
                }
                if (callback && typeof callback === 'function') {
                    callback.apply(null, [null].concat(fargs));
                }
                if (fargs.length === 1) {
                    return deferred.resolve(fargs[0]);
                }
                deferred.resolve(fargs);
            });
            f.apply(context, args);
            promise = deferred.promise;
            if (typeof promise === 'function') {
                promise = promise();
            }
            return promise;
        };
    }
    rarefied_redis.toPromise = toPromise;

    var blacklist = [
        'debug'
    ];

    rarefied_redis.toPromiseStyle = function (abstraction, deferFactory) {
        var key, keys = [];
        for (key in abstraction) {
            keys.push(key);
        }
        return keys
            .filter(function (key) {
                return typeof abstraction[key] === 'function';
            })
            .map(function (key) {
                if (blacklist.indexOf(key) !== -1) {
                    return [key];
                }
                return [key, toPromise(abstraction[key], abstraction, deferFactory)];
            })
            .reduce(function (promised, f) {
                if (f.length === 1) {
                    promised[f[0]] = function () {
                        return abstraction[f[0]].apply(abstraction, arguments);
                    };
                }
                else {
                    promised[f[0]] = f[1];
                }
                return promised;
            }, {});
    };

    var fkeys = [];
    var fblacklist = ['toPromiseStyle', 'toPromise', 'RedisConcurrency', 'redisCAS'];
    for (var key in rarefied_redis) {
        if (typeof rarefied_redis[key] === 'function') {
            fkeys.push(key);
        }
    }
    fkeys.forEach(function (key) {
        if (fblacklist.indexOf(key) === -1) {
            rarefied_redis[key].prototype.toPromiseStyle = function (deferFactory) {
                return rarefied_redis.toPromiseStyle(this, deferFactory);
            };
            rarefied_redis[key].prototype.bind = function () {
                var that = this;
                var fs = [], k;
                for (k in this) {
                    if (typeof this[k] === 'function') {
                        fs.push(k);
                    }
                }
                return fs.reduce(function (bound, fkey) {
                    bound[fkey] = function () {
                        that[fkey].apply(that, arguments);
                    };
                    return bound;
                }, {});
            };
        }
    });

    // Export all the Rarefied Redis objects for **node.js/io.js** with
    // backwards-compatiblity for the old `require()` API. If we're in
    // the browser, re-export the abstractions.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = rarefied_redis;
        }
        fkeys.forEach(function (key) {
            exports[key] = rarefied_redis[key];
        });
    }
    else {
        fkeys.forEach(function (key) {
            root[key] = rarefied_redis[key];
        });
    }

}).call(this);

/**
 * The standard redis javascript callback.
 * @callback redisCallback
 * @param {err} err The error, or null if no error.
 * @param {reply} reply The redis reply.
 */

/**
 * The redis client.
 * @typedef {Object} redisClient
 */

/**
 * @memberof RarefiedRedis
 * @namespace Util
 */

/**
 * @memberof RarefiedRedis
 * @namespace Adapter
 */

/**
 * @memberof RarefiedRedis
 * @namespace Reliable
 */

/**
 * @memberof RarefiedRedis
 * @namespace Crypto
 */

/**
 * @memberof RarefiedRedis
 * @namespace Queue
 */

/**
 * @memberof RarefiedRedis
 * @namespace TimeSeries
 */
