/* jshint undef:true, strict:true, plusplus:true */
/* global module:false, exports:true, require:false */

/**
 * @memberof RarefiedRedis
 */
(function () {

    // Baseline setup
    // --------------

    "use strict";

    // Establish the root object, `window` in the browser, or `exports` on the server.
    var root = this;

    var cas = typeof require === 'function' ? require('../concurrency/redis-cas.js') : root.redisCAS;
    var gather = typeof require === 'function' ? require('../util/redis-util.js').gather : root.redis_util.gather;

    function setF(client, key, type, setMulti, callback) {
        cas(client, key, function (c, k, cb) {
            if (type === null) {
                return cb(null, 'none');
            }
            return c.type(k, cb);
        }, function (client, key, multi, t) {
            if (t !== 'none' && t !== type) {
                return multi;
            }
            return setMulti(multi, key);
        }, callback);
    }

    function produceF(client, key, type, multiF, callback) {
        var g = gather(produceF).apply(null, arguments);
        callback = g.callback;
        setF(client, key, type, function (multi) {
            return g
                .list
                .slice(1)
                .reduce(function (multi, value) {
                    return multiF(multi, value);
                }, multi);
        }, callback);
    }

    function xproduceF(type, gatherF, multiF) {
        var f;
        f = function (client, key, element, callback) {
            var g = gather(f, 3).apply(null, arguments);
            g.list = gatherF(g.list);
            g.list = [client, key, type, multiF].concat(g.list);
            callback = g.callback;
            produceF.apply(null, g.list.concat([callback]));
        };
        return f;
    }
    
    /**
     * Reliably produce an element into an abstraction. The semantics of reliable here
     * mean that a producer produces into a redis structure that contains the right type
     * or doesn't produce at all, and that producers do not starve consumers or other
     * produces out from the abstraction.
     *
     * @memberof! RarefiedRedis.Reliable
     * @class
     * @param {redisClient} client The client to use.
     */
    function RedisReliableProducer(client, type, gatherer, multier) {
        this.client = client;
        this.type = type;
        this.gatherer = gatherer;
        this.multier = multier;
        return this;
    }

    RedisReliableProducer.prototype.produce = function (key, value, callback) {
        xproduceF(this.type, this.gatherer, this.multier).apply(null, [this.client].concat(Array.prototype.slice.call(arguments)));
        return this;
    };

    RedisReliableProducer.strproducer = function (client) {
        return new RedisReliableProducer(client, 'string', function (keysvalues) {
            return keysvalues
                .map(function (kv, index) {
                    if (index % 2 === 0) {
                        return [kv, keysvalues[index + 1]];
                    }
                    return null;
                })
                .filter(function (kv) {
                    return kv !== null;
                });
        }, function (multi, keyvalue) {
            return multi.set(keyvalue[0], keyvalue[1]);
        });
    };

    RedisReliableProducer.sproducer = function (client) {
        return new RedisReliableProducer(client, 'set', function (keyvalues) {
            var key = keyvalues[0];
            return keyvalues
                .slice(1)
                .map(function (value) {
                    return [key, value];
                });
        }, function (multi, keyvalue) {
            return multi.sadd(keyvalue[0], keyvalue[1]);
        });
    };

    RedisReliableProducer.zproducer = function (client) {
        return new RedisReliableProducer(client, 'zset', function (keyscoresvalues) {
            var key = keyscoresvalues[0];
            return keyscoresvalues
                .slice(1)
                .map(function (sv, index) {
                    if (index % 2 === 0) {
                        return [key, sv, keyscoresvalues[index + 1]];
                    }
                    return null;
                })
                .filter(function (sv) {
                    return sv !== null;
                });
        }, function (multi, keyscorevalue) {
            return multi.zadd(keyscorevalue[0], keyscorevalue[1], keyscorevalue[2]);
        });
    };

    RedisReliableProducer.hproducer = function (client) {
        return new RedisReliableProducer(client, 'hash', function (keyfieldsvalues) {
            var key = keyfieldsvalues[0];
            return keyfieldsvalues
                .slice(1)
                .map(function (fv, index) {
                    if (index % 2 === 0) {
                        return [key, fv, keyfieldsvalues[index + 1]];
                    }
                    return null;
                })
                .filter(function (fv) {
                    return fv !== null;
                });
        }, function (multi, keyfieldvalue) {
            return multi.hset(keyfieldvalue[0], keyfieldvalue[1], keyfieldvalue[2]);
        });
    };

    RedisReliableProducer.lproducerrpush = function (client) {
        return new RedisReliableProducer(client, 'list', function (keyvalues) {
            var key = keyvalues[0];
            return keyvalues
                .slice(1)
                .map(function (v) {
                    return [key, v];
                });
        }, function (multi, keyvalue) {
            return multi.rpush(keyvalue[0], keyvalue[1]);
        });
    };
    RedisReliableProducer.lproducer = RedisReliableProducer.lproducerrpush;

    RedisReliableProducer.lproducerlpush = function (client) {
        return new RedisReliableProducer(client, 'list', function (keyvalues) {
            var key = keyvalues[0];
            return keyvalues
                .slice(1)
                .map(function (v) {
                    return [key, v];
                });
        }, function (multi, keyvalue) {
            return multi.lpush(keyvalue[0], keyvalue[1]);
        });
    };

    // Export the reliable object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `redismock` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = RedisReliableProducer;
        }
        exports.RedisReliableProducer = RedisReliableProducer;
    } 
    else {
        root.RedisReliableProducer = RedisReliableProducer;
    }

}).call(this);
