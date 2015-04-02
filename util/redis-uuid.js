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

    var redis_uuid = {};

    /**
     * Generate a UUID v4 universally unique identifier according to RFC4122.
     * Taken from http://stackoverflow.com/a/8809472.
     *
     * @memberof! RarefiedRedis.Util
     * @see {@link http://www.ietf.org/rfc/rfc4122.txt}
     * @see {@link http://stackoverflow.com/a/8809472}
     */
    redis_uuid.v4 = function () {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    };

    // Export the uuid object for **node.js/io.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `redismock` as a global object.
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = redis_uuid;
        }
        exports.redis_uuid = redis_uuid;
    } 
    else {
        root.redis_uuid = redis_uuid;
    }


}).call(this);
