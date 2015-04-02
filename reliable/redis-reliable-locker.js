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
    var RedisReliableDeleter = typeof require === 'function' ? require('./redis-reliable-deleter.js') : root.RedisReliableDeleter;
    var uuidv4 = typeof require === 'function' ? require('../util/redis-uuid.js').v4 : root.redis_uuid.v4;
    var checkFunction = typeof require === 'function' ? require('../util/redis-util.js').checkFunction : root.redis_util.checkFunction;

    /**
     * Reliable lock. Reliable semantics here mean that a client can acquire the lock,
     * no other clients can acquire the lock while another client has the lock, and the
     * lock is <i>always</i> unlocked after some period of time. However....
     * <br/>
     * <br/>
     * ...the locks implemented in this class are only "reliable" in the sense that, if everyone
     * adheres to the given lock protocol, the resulting lock will be reliable. A malicious client
     * can always come along and <b>forever hold the lock</b> if it knows the key. It would
     * do this by creating a multi that dels the key and sets it without an expiration.
     * If this occurs, the lock can never be acquired by any client using RedisReliableLocker,
     * <b>and there's no way around it</b>.
     * <br/>
     * <br/>
     * The only way to create a compeletely reliable distributed redlock is with a cryptographic
     * locker running server-side scripts, and a redis instance the disables the "keys" and 
     * "scan" commands. The first part is provided by RedisCryptoLocker! However,
     * that class will only work with redis versions >= 2.6.0 that have the Lua scripting engine.
     * <br/>
     * <br/>
     * So, if you trust all of your client implementations, then this locker will provide
     * reliable lock semantics. If you do not trust all your client implementations, then
     * RedisCryptoLocker should be used.
     *
     * @memberof! RarefiedRedis.Reliable
     * @class
     * @param {redisClient} client The redis client.
     * @param {string} key The resource name to lock on.
     * @see {RarefiedRedis.Crypto.RedisCryptoLocker}
     */
    function RedisReliableLocker(client, key) {
        this.client = client;
        this.key = key;
        this.deleter = RedisReliableDeleter.strdeleter(this.client);
        return this;
    }

    /**
     * Implementation of the single instance Redlock protocol.
     * <br/>
     * <br/>
     * NOTE: This version of redlock <i>does not</i> work with redis versions below
     * 2.6.12, as they do not accept the nx & ex parameters in set. An error will be
     * returned by the redis server in response to this version if the redis sever's version is 
     * < 2.6.12.
     * <br/>
     * <br/>
     * NOTE 2: This version of redlock uses <b>seconds</b>, not milliseconds, for expiry of the
     * lock. This ensures that redlock2612 is compatible with other redlock implementations where
     * pexpire is not available.
     * <br/>
     * <br/>
     * NOTE 3: No version of redlock is completely reliable, because any client can
     * come along and, if they know the key, aquire the lock and keep it forever, starving all other
     * gentlemanly lockers out. All clients have to agree to adhere to the
     * protocol, and there's currently no mechanism in redis to enforce this agreement.
     * TODO: This shortcoming can be overcome through the use of cryptography, but that requires
     * the redis crypto abstractions, which have not been created yet! And that will only work
     * for redis version >= 2.6.0 when lua support was added.
     *
     * @param {seconds} timeout The number of seconds to hold the lock.
     * @param {function} callback Called with (err, locked, id). locked = OK if the lock was acquired, else null. id = the unique ID generated for the lock.
     *
     * @see {@link http://redis.io/topics/distlock}
     */
    RedisReliableLocker.prototype.redlock2612 = function (timeout, callback) {
        var id = uuidv4();
        var key = this.key;
        if (!timeout || typeof timeout !== 'number') {
            timeout = 1; // 1 second by default.
        }
        callback = checkFunction(callback);
        this.client.set(key, id, 'nx', 'ex', timeout, function (err, locked) {
            if (err) {
                return callback(err);
            }
            callback(null, locked, id);
        });
        return this;
    };
    /**
     * An alias for redlock2612. Should be set to redlock2200 if 2.2.0 <= redis version < 2.6.12.
     */
    RedisReliableLocker.prototype.redlock = RedisReliableLocker.prototype.redlock2612;
    /**
     * An alias for redlock2612. Should be set to redlock2200 if 2.2.0 <= redis version < 2.6.12.
     */
    RedisReliableLocker.prototype.lock = RedisReliableLocker.prototype.redlock2612;

    /**
     * Implementation of the single instance Redlock protocol.
     * <br/>
     * <br/>
     * NOTE: This version of redlock is compatible with versions of redis >= 2.2.0. However,
     * it is slower and more cumbersome than redlock2612. It uses optimistic concurrency
     * to implement redlock. For redis versions greater than or equal to 2.6.12,
     * redlock2612 should be preferred.
     * <br/>
     * <br/>
     * NOTE 2: No version of redlock is completely reliable, because any client can
     * come along and, if they know the key, aquire the lock and keep it forever, starving all other
     * gentlemanly lockers out. All clients have to agree to adhere to the
     * protocol, and there's currently no mechanism in redis to enforce this agreement.
     * TODO: This shortcoming can be overcome through the use of cryptography, but that requires
     * the redis crypto abstractions, which have not been created yet! And that will only work
     * for redis version >= 2.6.0 when lua support was added.
     *
     * @param {seconds} timeout The number of seconds to hold the lock.
     * @param {function} callback Called with (err, locked, id). locked = OK if the lock was acquired, else null. id = the unique ID generated for the lock.
     *
     * @see {@link http://redis.io/topics/distlock}
     */
    RedisReliableLocker.prototype.redlock2200 = function (timeout, callback) {
        var that = this;
        var id = uuidv4();
        if (!timeout || typeof timeout !== 'number') {
            timeout = 1; // 1 second by default.
        }
        callback = checkFunction(callback);
        cas(this.client, this.key, function (client, key, cb) {
            client.get(key, cb);
        }, function (client, key, multi, value) {
            if (value) {
                // No reason trying to lock, we won't be able to.
                return multi;
            }
            return multi
                .setnx(that.key, id)
                .expire(that.key, timeout);
        }, function (err, replies) {
            if (err) {
                return callback(err);
            }
            if (!replies || replies.length < 2) {
                return callback(null, null, id);
            }
            callback(null, 'OK', id);
        });
        return this;
    };

    /**
     * Implementation of the single instance Redlock protocol for almost any redis version.
     * <br/>
     * <br/>
     * This version is reliable, but a key could be held for an arb
     */
    RedisReliableLocker.prototype.redlockCompatible = function (timeout, maxTimeout, callback) {
        timeout = parseInt(timeout, 10);
        if (isNaN(timeout)) {
            timeout = 30; // 30s
        }
        maxTimeout = parseInt(maxTimeout, 10);
        if (isNaN(maxTimeout)) {
            maxTimeout = 3600; // 1h
        }
        timeout = Math.min(timeout, maxTimeout);
        // TODO
        return callback(new Error('UNIMPLEMENTED'));
    };

    /**
     * Unlock a redlock redis lock. Allows clients to specifically unlock a redlock
     * before its expiry.
     * <br/>
     * <br/>
     * NOTE: No version of redlock is completely reliable, because any client can
     * come along and, if they know the key, aquire the lock and keep it forever, starving all other
     * gentlemanly lockers out. All clients have to agree to adhere to the
     * protocol, and there's currently no mechanism in redis to enforce this agreement.
     * TODO: This shortcoming can be overcome through the use of cryptography, but that requires
     * the redis crypto abstractions, which have not been created yet! And that will only work
     * for redis version >= 2.6.0 when lua support was added.
     * <br/>
     * <br/>
     * @param {redisClient} client The client to unlock against
     * @param {string} key The name of the resource to unlock.
     * @param {string} id The unique ID that was generated for this redlock. Disallows other clients not holding the lock from releasing the lock.
     * @param {redisCallback} callback reply = 1 if unlocked, else = 0.
     */
    RedisReliableLocker.prototype.redlockUnlock = function (id, callback) {
        callback = checkFunction(callback);
        this.deleter.del(this.key, id, function (err, replies) {
            if (err) {
                return callback(err);
            }
            if (!replies) {
                return callback(null, 0);
            }
            callback(null, 1);
        });
        return this;
    };
    /**
     * An alias for redlockUnlock.
     */
    RedisReliableLocker.prototype.redunlock = RedisReliableLocker.prototype.redlockUnlock;
    /**
     * An alias for redlockUnlock.
     */
    RedisReliableLocker.prototype.unlockRedlock = RedisReliableLocker.prototype.redlockUnlock;
    /**
     * An alias for redlockUnlock.
     */
    RedisReliableLocker.prototype.unlock = RedisReliableLocker.prototype.redlockUnlock;

    /**
     * Is the lock locked?
     *
     * @param {string} id The id of this lock.
     * @param {redisCallback} callback reply = 1 if locked, = 0 if not locked.
     */
    RedisReliableLocker.prototype.locked = function (id, callback) {
        callback = checkFunction(callback);
        this.client.get(this.key, function (err, reply) {
            if (err) {
                return callback(err);
            }
            if (reply !== id) {
                return callback(null, 0);
            }
            callback(null, 1);
        });
        return this;
    };

    // Export the reliable object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `redismock` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = RedisReliableLocker;
        }
        exports.RedisReliableLocker = RedisReliableLocker;
    } 
    else {
        root.RedisReliableLocker = RedisReliableLocker;
    }

}).call(this);
