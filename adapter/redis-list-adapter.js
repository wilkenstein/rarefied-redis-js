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

    var gather = typeof require === 'function' ? require('../util/redis-util.js').gather : root.redis_util.gather;
    var each = typeof require === 'function' ? require('../util/redis-util.js').asyncForEach : root.redis_util.asyncForEach;

    /**
     * Adapt a redis list structure into a Javascript Array. The adaptation adds all the methods
     * one expects of an Array, and duplicates their functionality. The only difference
     * is that each method on this adapter also takes a callback as its last parameter, returns
     * the adapter as the return value, and calls the callback with the result.
     *
     * @memberof! RarefiedRedis.Adapter
     */
    function RedisListAdapter(client, key) {
        this.client = client;
        this.key = key;
        return this;
    }

    function loopThroughList(client, key, atATime, start, rangeF, callback) {
        var that = this;
        var stop = start + atATime - 1;
        var f;
        f = function () {
            client.lrange(key, start, stop, function (err, range) {
                if (err) {
                    return callback(err);
                }
                rangeF(range, function (rangeErr, done, reply) {
                    if (rangeErr) {
                        return callback(err);
                    }
                    if (done) {
                        return callback(null, reply);
                    }
                    if (start < 0) {
                        start = start - atATime;
                    }
                    else {
                        start = stop + 1;
                    }
                    stop = start + atATime - 1;
                    f();
                });
            });
        };
        return f;
    }

    RedisListAdapter.prototype.concat = function (other, callback) {
        var that = this;
        var me = [];
        loopThroughList(this.client, this.key, 10, 0, function (range, cb) {
            if (range.length === 0) {
                return cb(null, true, me.concat(other));
            }
            me = me.concat(range);
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.every = function (predicate, callback) {
        loopThroughList(this.client, this.key, 10, 0, function (range, cb) {
            if (range.length === 0) {
                return cb(null, true, true);
            }
            if (!range.every(predicate)) {
                return cb(null, true, false);
            }
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.filter = function (predicate, callback) {
        var that = this;
        var filtered = [];
        loopThroughList(this.client, this.key, 10, 0, function (range, cb) {
            if (range.length === 0) {
                return cb(null, true, filtered);
            }
            filtered = filtered.concat(range.filter(predicate));
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.forEach = function (f, callback) {
        loopThroughList(this.client, this.key, 10, 0, function (range, cb) {
            if (range.length === 0) {
                return cb(null, true, null);
            }
            range.forEach(f);
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.indexOf = function (element, callback) {
        var idx = 0;
        loopThroughList(this.client, this.key, 10, 0, function (range, cb) {
            if (range.length === 0) {
                return callback(null, -1);
            }
            if (range.some(function (elem) {
                if (elem === element) {
                    return true;
                }
                idx += 1;
                return false;
            })) {
                return cb(null, true, idx);
            }
            return cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.join = function (separator, callback) {
        var that = this;
        var arr = [];
        var g = gather(this.join).apply(null, arguments);
        separator = g.list[0];
        callback = g.callback;
        loopThroughList(this.client, this.key, 10, 0, function (range, cb) {
            if (range.length === 0) {
                return cb(null, true, arr.join(separator));
            }
            arr = arr.concat(range);
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.lastIndexOf = function (element, callback) {
        var that = this;
        this.length(function (err, len) {
            var idx;
            if (err) {
                return callback(err);
            }
            idx = len - 1;
            loopThroughList(that.client, that.key, 10, -10, function (range, cb) {
                if (range.length === 0) {
                    return callback(null, -1);
                }
                range.reverse();
                if (range.some(function (elem) {
                    if (elem === element) {
                        return true;
                    }
                    idx -= 1;
                    return false;
                })) {
                    return cb(null, true, idx);
                }
                return cb(null, false);
            }, callback)();
        });
        return this;
    };

    RedisListAdapter.prototype.length = function (callback) {
        this.client.llen(this.key, callback);
        return this;
    };

    RedisListAdapter.prototype.map = function (mapper, callback) {
        var that = this;
        var mapped = [];
        loopThroughList(this.client, this.key, 10, 0, function (range, cb) {
            if (range.length === 0) {
                return cb(null, true, mapped);
            }
            mapped = mapped.concat(range.map(mapper));
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.pop = function (callback) {
        this.client.rpop(this.key, callback);
        return this;
    };

    RedisListAdapter.prototype.push = function (element1, callback) {
        var that = this;
        var g = gather(this.push).apply(null, arguments);
        callback = g.callback;
        each(g.list, function (element, cb) {
            that.client.rpush(that.key, element, cb);
        }, callback);
        return this;
    };

    RedisListAdapter.prototype.reduce = function (reducer, initialValue, callback) {
        var reduced;
        var that = this;
        var g = gather(this.reduce).apply(null, arguments);
        initialValue = g.list[0];
        callback = g.callback;
        reduced = initialValue;
        loopThroughList(this.client, this.key, 10, 0, function (range, cb) {
            if (range.length === 0) {
                return cb(null, true, reduced);
            }
            reduced = range.reduce(reducer, reduced);
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.reduceRight = function (reducer, callback) {
        var reduced;
        var that = this;
        var g = gather(this.reduce).apply(null, arguments);
        initialValue = g.list[0];
        callback = g.callback;
        reduced = initialValue;
        loopThroughList(this.client, this.key, 10, -10, function (range, cb) {
            if (range.length === 0) {
                return cb(null, true, reduced);
            }
            reduced = range.reverse().reduce(reducer, reduced);
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.reverse = function (callback) {
        var that = this;
        var reversed = [];
        loopThroughList(this.client, this.key, 10, -10, function (range, cb) {
            var multi;
            if (range.length === 0) {
                multi = that.client.multi();
                return multi
                    .del(that.key)
                    .lpush.apply(multi, [that.key].concat(reversed))
                    .exec(function (err, replies) {
                        cb(err, true, reversed);
                    });
            }
            reversed = reversed.concat(range.reverse());
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.shift = function (callback) {
        this.client.lpop(this.key, callback);
        return this;
    };

    RedisListAdapter.prototype.slice = function (start, end, destkey, callback) {
    };
    
    RedisListAdapter.prototype.some = function (predicate, callback) {
        loopThroughList(this.client, this.key, 10, 0, function (range, cb) {
            if (range.length === 0) {
                return cb(null, true, false);
            }
            if (range.some(predicate)) {
                return cb(null, true, true);
            }
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.sort = function (compareFunction, callback) {
        var sorted = [];
        loopThroughList(this.client, this.key, 10, 0, function (range, cb) {
            var multi;
            if (range.length === 0) {
                sorted.sort(compareFunction);
                multi = that.client.multi();
                return multi
                    .del(that.key)
                    .lpush.apply(multi, [that.key].concat(sorted))
                    .exec(function (err, replies) {
                        cb(err, true, sorted);
                    });
            }
            sorted = sorted.concat(range);
            cb(null, false);
        }, callback)();
        return this;
    };

    RedisListAdapter.prototype.splice = function (index, howmany, callback) {
        var g = gather(this.splice).apply(null, arguments);
        callback = g.callback;
        return this;
    };

    RedisListAdapter.prototype.toString = function (destkey, callback) {
    };

    RedisListAdapter.prototype.unshift = function (element1, callback) {
        var that = this;
        var g = gather(this.unshift).apply(null, arguments);
        callback = g.callback;
        each(g.list, function (element, cb) {
            that.client.lpush(that.key, element, cb);
        }, callback);
        return this;
    };

    RedisListAdapter.prototype.valueOf = function (destkey, callback) {
    };

    // Export the RedisListAdapter object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `redismock` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = RedisListAdapter;
        }
        exports.RedisListAdapter = RedisListAdapter;
    } 
    else {
        root.RedisListAdapter = RedisListAdapter;
    }

}).call(this);