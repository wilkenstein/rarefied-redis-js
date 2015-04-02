/* jshint unused:true, undef:true, strict:true, plusplus:true */
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
    var exists = typeof require === 'function' ? require('../util/redis-util.js').exists : root.redis_util.exists;
    var RedisListAdapter = typeof require === 'function' ? require('../adapter/redis-list-adapter.js') : root.RedisListAdapter;

    function delF(client, key, element, getF, setMulti, callback) {
        cas(client, key, function (client, key, cb) {
            return getF(client, key, element, cb);
        }, function (client, key, multi, value) {
            var args;
            if (exists(element) && exists(value)) {
                if (value === element) {
                    args = [multi, key].concat(Array.prototype.slice.call(arguments).slice(3));
                    return setMulti.apply(null, args);
                }
            }
            return multi;
        }, callback);
    }

    /**
     * Reliably delete an abstraction. The semantics of reliable deletion are that
     * the element being deleted actually exists in the structure, and the structure
     * hasn't changed at the time of deletion. For instance, with redlocks, the unlocker
     * must know the current value of the lock in order to delete it.
     *
     * @memberof! RarefiedRedis.Reliable
     * @class
     * @param {redisClient} client The redis client
     */
    function RedisReliableDeleter(client, verifier, multier) {
        this.client = client;
        this.verifier = verifier;
        this.multier = multier;
        return this;
    }

    RedisReliableDeleter.prototype.del = function (key, element, callback) {
        delF(this.client, key, element, this.verifier, this.multier, callback);
        return this;
    };

    RedisReliableDeleter.strdeleter = function (client) {
        return new RedisReliableDeleter(client, function (client, key, element, cb) {
            return client.get(key, cb);
        }, function (multi, key) {
            return multi.del(key);
        });
    };

    RedisReliableDeleter.sdeleter = function (client) {
        return new RedisReliableDeleter(client, function (client, key, element, cb) {
            client.sismember(key, element, function (err, reply) {
                return cb(err, reply === 1 ? element : null);
            });
        }, function (multi, key, value) {
            return multi.srem(key, value);
        });
    };

    RedisReliableDeleter.zdeleter = function (client) {
        return new RedisReliableDeleter(client, function (client, key, element, cb) {
            client.zscore(key, element, function (err, reply) {
                if (err) {
                    return cb(err);
                }
                if (reply === null) {
                    return cb(null, null);
                }
                cb(null, element);
            });
        }, function (multi, key, value) {
            return multi.zrem(key, value);
        });
    };

    RedisReliableDeleter.hdeleter = function (client) {
        return new RedisReliableDeleter(client, function (client, key, field, cb) {
            client.hexists(key, field, cb);
        }, function (multi, key, value) {
            return multi.hdel(key, value);
        });
    };

    RedisReliableDeleter.ldeleter = function (client) {
        return new RedisReliableDeleter(client, function (client, key, element, cb) {
            if (typeof element === 'number') {
                return client.lindex(key, element, function (err, reply) {
                    if (err) {
                        return cb(err);
                    }
                    if (reply === null) {
                        return cb(null, null);
                    }
                    return cb(null, element, reply);
                });
            }
            (new RedisListAdapter(client, key)).indexOf(element, function (err, index) {
                if (err) {
                    return cb(err);
                }
                if (index === -1) {
                    return cb(new Error('ERR index out of range'));
                }
                cb(null, element, index);
            });
        }, function (multi, key, value, index) {
            var val, tmp;
            if (typeof value === 'number') {
                tmp = value;
                value = index;
                index = tmp;
            }
            // Make the value unique within the list so that we can delete it using lrem.
            // There is no way with redis to delete by index.
            val = value + ';' + Math.random();
            return multi
                .lset(key, index, val)
                .lrem(key, 1, val);
        });
    };

    // Export the reliable object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `RedisReliableDeleter` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = RedisReliableDeleter;
        }
        exports.RedisReliableDeleter = RedisReliableDeleter;
    } 
    else {
        root.RedisReliableDeleter = RedisReliableDeleter;
    }

}).call(this);
