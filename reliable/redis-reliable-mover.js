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
    var checkFunction = typeof require === 'function' ? require('../util/redis-util.js').checkFunction : root.redis_util.checkFunction;
    var exists = typeof require === 'function' ? require('../util/redis-util.js').exists : root.redis_util.exists;
    var gather = typeof require === 'function' ? require('../util/redis-util.js').gather : root.redis_util.gather;
    var RedisListAdapter = typeof require === 'function' ? require('../adapter/redis-list-adapter.js') : root.RedisListAdapter;

    function typeCheck(client, source, dest, type, values, onOk, onError, callback) {
        onOk = checkFunction(onOk);
        onError = checkFunction(onError);
        client.type(dest, function (err, t) {
            if (err) {
                return onError(err);
            }
            if (t !== type && t !== 'none') {
                return onError(new Error('WRONGTYPE Operation against a key holding the wrong kind of value'));
            }
            onOk(client, source, dest, values, callback);
        });
    }

    function execCallback(callback) {
        callback = checkFunction(callback);
        return function (err, replies, value) {
            if (err) {
                return callback(err);
            }
            if (replies === null) {
                return callback(null, null);
            }
            callback(err, value);
        };
    }

    function moveF(client, source, dest, type, values, getF, setMulti, callback) {
        cas(client, source, function (client, key, cb) {
            if (type === null) {
                return getF(client, source, dest, values, callback);
            }
            typeCheck(client, source, dest, type, values, getF, callback, cb);
        }, function (client, key, multi, value) {
            var args;
            if (!exists(value)) {
                return multi;
            }
            args = [client, source, dest, multi].concat(Array.prototype.slice.call(arguments).slice(3));
            return setMulti.apply(null, args);
        }, execCallback(callback));
    }

    function moverF(type, getF, multiF) {
        return function (client, source, dest, values, callback) {
            moveF(client, source, dest, type, values, getF, multiF, callback);
        };
    }

    /**
     * Reliably move elements from one abstraction to another. Convenience methods
     * for redis structures are provided.
     * <br/>
     * <br/>
     * The semantics of moving mean taking a abstraction's element, removing it from
     * that abstraction, and then putting it into another abstraction. Reliable moves
     * ensure that
     * <ul>
     * <li> if something goes wrong during the move, the element remains
     * in the original abstraction; </li>
     * <li> if the element is modified during the move, the element remains
     * in the original abstraction. </li>
     * </ul>
     *
     * @memberof! RarefiedRedis.Reliable
     * @class
     * @param {redisClient} client The client to use.
     */
    function RedisReliableMover(client, type, verifier, multier) {
        this.client = client;
        this.type = type;
        this.verifier = verifier;
        this.multier = multier;
        return this;
    }

    RedisReliableMover.prototype.move = function (source, dest, callback) {
        var g = gather(this.move).apply(null, arguments);
        callback = g.callback;
        moverF(this.type, this.verifier, this.multier)(this.client, source, dest, g.list.slice(1), callback);
        return this;
    };

    /**
     * Construct a string mover.
     */
    RedisReliableMover.strmover = function (client) {
        return new RedisReliableMover(client, 'string', function (client, source, dest, values, cb) {
            client.get(source, cb);
        }, function (client, source, dest, multi, value) {
            return multi.del(source).set(dest, value);
        });
    };

    /**
     * Construct a set mover.
     */
    RedisReliableMover.smover = function (client) {
        var ismember = function (client, source, m, cb) {
            client.sismember(source, m, function (err, reply) {
                return cb(err, reply === 1 ? m : null);
            });
        };
        return new RedisReliableMover(client, 'set', function (client, source, dest, values, cb) {
            var member = values[0];
            if (!exists(member)) {
                return client.srandmember(source, function (err, m) {
                    if (err) {
                        return cb(err);
                    }
                    ismember(client, source, m, cb);
                });
            }
            ismember(client, source, member, cb);
        }, function (client, source, dest, multi, value) {
            return multi.smove(source, dest, value);
        });
    };

    RedisReliableMover.zmover = function (client) {
        var score;
        var get = function (client, source, m, cb) {
            client.zscore(source, m, function (err, reply) {
                if (err) {
                    return cb(err);
                }
                score = reply;
                cb(null, !exists(score) ? null : m);
            });
        };
        return new RedisReliableMover(client, 'zset',  function (client, source, dest, values, cb) {
            var member = values[0];
            if (!member) {
                return client.zrange(source, 0, 0, function (err, reply) {
                    if (err) {
                        return cb(err);
                    }
                    get(client, source, reply[0], cb);
                });
            }
            get(client, source, member, cb);
        }, function (client, source, dest, multi, value) {
            return multi
                .zrem(source, value)
                .zadd(dest, score, value);
        });
    };

    RedisReliableMover.hmover = function (client) {
        return new RedisReliableMover(client, 'hash', function (client, source, dest, values, cb) {
            var field = values[0];
            client.hget(source, field, function (err, reply) {
                return cb(err, reply, field);
            });
        }, function (client, source, dest, multi, value, field) {
            return multi
                .hdel(source, field)
                .hset(dest, field, value);
        });      
    };

    function lmoveindex(client, source, dest, values, cb) {
        var sindex = values[0];
        var dindex = values[1];
        if (!exists(sindex)) {
            return cb(new Error('ERR index out of range'));
        }
        if (!exists(dindex)) {
            dindex = sindex;
        }
        client.llen(dest, function (err, len) {
            var indexF, pad;
            if (err) {
                return cb(err);
            }
            indexF = function () {
                client.lindex(source, sindex, function (err, value) {
                    if (err) {
                        return cb(err);
                    }
                    if (!exists(value)) {
                        return cb(new Error('ERR index out of range'));
                    }
                    cb(null, value, sindex, dindex);
                });
            };
            if (len <= dindex) {
                pad = [];
                while (len + pad.length <= dindex) {
                    pad.push('');
                }
                client.rpush.apply(client, [dest].concat(pad), function (err2) {
                    if (err2) {
                        return cb(err2);
                    }
                    indexF();
                });
            }
            indexF();
        });
    }

    function lmoveelement(client, source, dest, values, cb) {
        var element = values[0];
        (new RedisListAdapter(client, source)).indexOf(element, function (err, idx) {
            if (err) {
                return cb(err);
            }
            if (idx === -1) {
                return cb(new Error('ERR index out of range'));
            }
            lmoveindex(client, source, dest, [idx], cb);
        });
    }

    RedisReliableMover.lmover = function (client) {
        return new RedisReliableMover(client, 'list', function (client, source, dest, values, cb) {
            if (values.length === 0) {
                return client.lindex(source, -1, function (err, topop) {
                    return cb(err, topop);
                });
            }
            if (values.length === 1 && typeof values[0] !== 'number') {
                return lmoveelement(client, source, dest, values, function (err, value, sindex, dindex) {
                    return cb(err, value, sindex, dindex);
                });
            }
            lmoveindex(client, source, dest, values, function (err, value, sindex, dindex) {
                return cb(err, value, sindex, dindex);
            });
        }, function (client, source, dest, multi, value, sindex, dindex) {
            var val;
            if (!exists(sindex)) {
                return multi.rpoplpush(source, dest);
            }
            val = value + ';' + Math.random();
            return multi
                .lset(source, sindex, val)
                .lrem(source, 1, val)
                .lset(dest, dindex, value);
        });
    };

    // Export the reliable object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `RedisReliableMover` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = RedisReliableMover;
        }
        exports.RedisReliableMover = RedisReliableMover;
    } 
    else {
        root.RedisReliableMover = RedisReliableMover;
    }

}).call(this);
