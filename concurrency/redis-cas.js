/* jshint unused:true, undef:true, strict:true, plusplus:true */
/* global module:false, exports:true */

/**
 * @memberof RarefiedRedis
 */
(function () {

    // Baseline setup
    // --------------

    "use strict";

    // Establish the root object, `window` in the browser, or `exports` on the server.
    var root = this;

    /**
     * Re-usable pattern for Check-And-Set (CAS) optimistic concurrency.
     * We watch for changes in a key, get it, and set something
     * based on the get. If, during our get-set, the key changes, the set will not
     * occur and we will return (null, null) to the callback. Otherwise, we will return
     * (null, [command replies], value), where the Array of command replies is the return of
     * each command in the set step, and value is the original value we got.
     *
     * @memberof! RarefiedRedis.Concurrency
     * @param {redisClient} client The redis client to use
     * @param {string} key The key to perform operations on.
     * @param {function} getF The function that gets the value from redis.
     * @param {function} setMulti Function that sets the commands to execute (within a redis multi).
     * @param {function} callback Callback. Parameters returned are (err, replies, val). replies is an array of values from executing each set command. val is the original value.
     */
    function redisCAS(client, key, getF, setMulti, callback) {
        var multiF;
        if (!getF || typeof getF !== 'function') {
            getF = function (c, k, cb) {
                cb(null, null);
            };
        }
        if (!setMulti || typeof setMulti !== 'function') {
            setMulti = function (v, m/*, c, k*/) {
                return m;
            };
        }
        if (!callback || typeof callback !== 'function') {
            callback = function () {};
        }
        // TODO: watch is unavailable in redis versions < 2.2.0
        client.watch(key);
        multiF = function (err, value) {
            var args;
            if (err) {
                return callback(err);
            }
            args = [client, key, client.multi()].concat(Array.prototype.slice.call(arguments).slice(1));
            setMulti
                .apply(null, args)
                .exec(function (err, replies) {
                    callback(err, replies, value);
                });
        };
        getF(client, key, multiF);
    }

    // Export the reliable object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `redismock` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = redisCAS;
        }
        exports.redisCAS = redisCAS;
    } 
    else {
        root.redisCAS = redisCAS;
    }

}).call(this);