/* jshint unused:true, undef:true, strict:true, plusplus:true */
/* global module:false, exports:true, setTimeout:false */

/**
 * @memberof RarefiedRedis
 */
(function () {

    // Baseline setup
    // --------------

    "use strict";

    // Establish the root object, `window` in the browser, or `exports` on the server.
    var root = this;

    function checkFunction(f) {
        if (!f || typeof f !== 'function') {
            return function () {
                if (typeof arguments[arguments.length - 1] === 'function') {
                    arguments[arguments.length - 1](new Error('checkFunction: given f was not a function'));
                }
            };
        }
        return f;
    }

    function optimism(f, context, maxOptimism, callback) {
        var tries = 1;
        var of;
        callback = checkFunction(callback);
        f = checkFunction(f);
        of = function () {
            var original = arguments;
            var args = Array.prototype.slice.call(arguments);
            while (args.length < f.length - 1) {
                args.push(undefined);
            }
            if (args.length === f.length && typeof args[args.length - 1] === 'function') {
                args.pop();
            }
            args.push(function (err, replies) {
                if (err) {
                    return callback(err);
                }
                if (replies === null) {
                    if (!maxOptimism || tries < maxOptimism) {
                        tries += 1;
                        return setTimeout(function () {
                            of.apply(null, original);
                        }, Math.ceil(Math.random()*100)); // Back off randomly anywhere between 0+ms - 999ms.
                    }
                    return callback(new Error('ERR optimistic concurrency failed'));
                }
                callback(null, replies);
            });
            f.apply(context, args);
        };
        return of;
    }

    function pessimism(f, context, maxPessimism, locker, timeout, callback) {
        var tries = 1;
        var pf;
        callback = checkFunction(callback);
        f = checkFunction(f);
        pf = function () {
            var original = arguments;
            locker.lock(timeout, function (err, locked, id) {
                var args = Array.prototype.slice.call(original);
                if (err) {
                    return callback(err);
                }
                if(!locked) {
                    if (!maxPessimism || tries < maxPessimism) {
                        tries += 1;
                        return setTimeout(function () {
                            pf.apply(null, original);
                        }, Math.ceil(Math.random()*100)); // Back off randomly anywhere between 0+ms - 999ms.
                    }
                    return callback(new Error('ERR pessimistic concurrency failed'));
                }
                while (args.length < f.length - 1) {
                    args.push(undefined);
                }
                if (args.length === f.length && typeof args[args.length - 1] === 'function') {
                    args.pop();
                }
                args.push(function (err, reply) {
                    if (err) {
                        return callback(err);
                    }
                    locker.unlock(id, function (err2, unlocked) {
                        if (err2) {
                            return callback(err2);
                        }
                        if (!unlocked) {
                            // We lost the lock before completion, so the operation
                            // is invalid.
                            return callback(null, null);
                        }
                        callback(null, reply);
                    });
                });
                args.push(locker);
                args.push(id);
                f.apply(context, args);
            });
        };
        return pf;
    }

    /**
     * Implement concurrency operations within redis. This abstraction exposes 2 interfaces
     * for concurrency: optimistic concurrency, and pessimistic concurrency. It's also
     * written in a literate style. An example of using this class:
     *
     * <pre><code>
     * var mover = new RedisReliableMover(redisClient);
     * (new RedisConcurrency(new RedisReliableLock(redisClient, lockKey)))
     *     .should
     *     .be
     *     .optimistic
     *     .on(mover.move, mover)
     *     .and
     *     .tell(function (err, member) {
     *           // Do stuff.
     *     })
     *     .when
     *     .invokedWith(key1, key2);
     * </code></pre>
     *
     * This piece of code will try optimistic concurrency 10 times on mover.move(key1, key2).
     * <br/>
     * <br/>
     * NOTE: Pessimistic concurrency uses a lock to enforce its pessimism. We only allow
     * that lock to be locked for some maximum time, currently 1h, in case the process dies
     * while holding the lock. Let's say the operation
     * pulls a key's value from redis, asks a different service to manipulate it, then sets
     * the key to this new value in redis. If that different service takes > 30s to respond,
     * the lock will have expired and is no longer valid. To allow pessimistic functions to
     * check this condition, the locker and lock id are passed to the function <i>after</i>
     * the callback. The operation can then check whether its lock is still valid before
     * setting the key in redis. This timeout can be extended using the 2nd parameter
     * to atMost, up to 1 hour (3600 seconds).
     * <br/>
     * <br/>
     * NOTE 2: Both optimistic concurrency and pessimistic concurrency are protocols, and
     * can be livelocked by a client not adhering to the protocol. For instance, in 
     * optimistic concurrency, a producer that is heavily modifying a structure while we're
     * trying to do optimistic concurrency can starve any optimistic producer out. Just like
     * with redlocks, redis currently has no ability to enforce these protocols.
     *
     * @memberof! RarefiedRedis.Reliable
     * @class
     * @param {Object=} locker An object that implements lock semantics. This locker does pessimistic locking. If only doing optimistic concurrency, this parameter is not required.
     */
    function RedisConcurrency(locker) {
        var that = this;
        this._times = 10;
        this._f = 0;
        this._locker = locker;
        this._timeout = 30; // seconds!
        this.should = this;
        this.be = this;
        this.times = this;
        this.and = this;
        this.when = this;
        this.optimistic = {
            on: function () {
                that.on.apply(that, arguments);
                return that.optimistic;
            },
            tell: function () {
                that.tell.apply(that, arguments);
                return that.optimistic;
            },
            invokedWith: function () {
                var args = arguments;
                var f;
                f = optimism(that._f, that._context, that._times, that._callback);
                setTimeout(function () {
                    f.apply(null, args);
                }, 0);
                return that;
            },
        };
        this.optimistic.about = this.optimistic.on;
        this.optimistic.attempt = this.optimistic;
        this.optimistic.and = this.optimistic;
        this.optimistic.when = this.optimistic;
        this.optimistic.invoked = this.optimistic.invokedWith;
        this.pessimistic = {
            on: function () {
                that.on.apply(that, arguments);
                return that.pessimistic;
            },
            tell: function () {
                that.tell.apply(that, arguments);
                return that.pessimistic;
            },
            invokedWith: function () {
                var args = arguments;
                var f;
                f = pessimism(that._f, that._context, that._times, that._locker, that._timeout, that._callback);
                setTimeout(function () {
                    f.apply(null, args);
                }, 0);
                return that;
            }
        };
        this.pessimistic.about = this.pessimistic.on;
        this.pessimistic.attempt = this.pessimistic;
        this.pessimistic.and = this.pessimistic;
        this.pessimistic.when = this.pessimistic;
        this.pessimistic.invoked = this.pessimistic.invokedWith;
        this.eeyore = this.pessimistic;
        return this;
    }

    /**
     * Specify the operation to do concurrency on.
     *
     * @param {Function} f The function that does the operation.
     * @param {Object} context The context to call f with.
     */
    RedisConcurrency.prototype.on = function (f, context) {
        this._f = checkFunction(f);
        this._context = context;
        return this;
    };
    RedisConcurrency.prototype.about = RedisConcurrency.prototype.on;
    RedisConcurrency.prototype.attempt = RedisConcurrency.prototype.on;

    /**
     * Specify who to tell on whether the operation succeeded or failed.
     *
     * @param {Function} callback The callback to call when the operation is done. The reply will always be (null, null) if the operation failed. Anything else is context-specific to the concurrenct function.
     */
    RedisConcurrency.prototype.tell = function (callback) {
        this._callback = checkFunction(callback);
        return this;
    };

    /**
     * Specify how many times the concurrency should try before giving up.
     *
     * For optimistic concurrency, this number decides how many times to
     * attempt the operation before bailing.
     *
     * For pessimistic concurrency, this number decides how many times to
     * attempt to lock the resource before bailing.
     *
     * If the number given here is 0, we will never bail on the operation,
     * just keep trying.
     *
     * Negative times numbers are equivalent to 1. So atMost(-5) = atMost(1).
     *
     * Also, for pessimistic concurrency, you can pass a second timeout parameter 
     * that determines how long the operation has to complete before being considered 
     * invalid. This number is validated to be greater than 0 and less than 1 hour
     * (3600 seconds). It is specified in seconds.
     *
     * @param {number} t times to attempt the operation. = 0 to attempt forever.
     * @param {number=} timeout Determines in pessimistic concurrency how long an operation has to complete. Always validated such that 0 < timeout <= 3600.
     */
    RedisConcurrency.prototype.atMost = function (t, timeout) {
        this._times = t;
        if (isNaN(parseInt(this._times, 10))) {
            this._times = 10;
        }
        this._timeout = timeout;
        if (!this._timeout || isNaN(parseInt(this._timeout, 10)) || this._timeout <= 0) {
            this._timeout = 30;
        }
        this._timeout = Math.min(3600, this._timeout);
        return this;
    };

    /**
     * Invoke the chain
     */
    RedisConcurrency.prototype.invokedWith = function () {
        // If we're called invokedWith on a naked concurrency object,
        // assume we are optimistic.
        this.optimistic.invokedWith.apply(null, arguments);
        return this.optimistic;
    };
    RedisConcurrency.prototype.invoked = RedisConcurrency.prototype.invokedWith;

    /**
     * Return a concurrency object that only does optimistic concurrency.
     */
    RedisConcurrency.Optimistic = function () {
        var concurrency = new RedisConcurrency();
        var invokedWith = function () {
            return concurrency
                .optimistic
                .invokedWith
                .apply(concurrency, arguments);
        };
        concurrency.pessimistic = undefined;
        concurrency.attempt = concurrency.about;
        concurrency.invokedWith = invokedWith;
        concurrency.invoked = invokedWith;
        return concurrency;
    };

    /**
     * Return a concurrency object that only does pessimistic concurrency.
     *
     * @param {Object} locker An object that implements lock semantics.
     */
    RedisConcurrency.Pessimistic = function (locker) {
        var concurrency = new RedisConcurrency(locker);
        var invokedWith = function () {
            return concurrency
                .pessimistic
                .invokedWith
                .apply(concurrency, arguments);
        };
        concurrency.optimistic = undefined;
        concurrency.attempt = concurrency.about;
        concurrency.invokedWith = invokedWith;
        concurrency.invoked = invokedWith;
        return concurrency;
    };

    // Export the reliable object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `RedisConcurrency` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = RedisConcurrency;
        }
        exports.RedisConcurrency = RedisConcurrency;
    } 
    else {
        root.RedisConcurrency = RedisConcurrency;
    }

}).call(this);
