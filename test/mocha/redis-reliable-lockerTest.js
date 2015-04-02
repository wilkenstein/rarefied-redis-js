(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisReliableLocker = typeof require === 'function' ? require('../../rarefied-redis.js').RedisReliableLocker : window.RedisReliableLocker;
    var chai = typeof require === 'function' ? require('chai') : window.chai;
    var Q = typeof require === 'function' ? require('q') : window.Q;
    chai.config.includeStack = true;
    var expect = chai.expect;

    function randkey(prefix) {
        if (!prefix) {
            prefix = 'k';
        }
        return prefix + Math.random();
    }

    var rc = redisClient.toPromiseStyle(Q.defer);

    before(function (done) {
        rc
            .flushdb()
            .then(function () {
                done();
            })
            .fail(function (err) {
                done(err);
            })
            .done();
    });

    describe('redlock2612', function () {
        it('should lock when no one has acquired the lock', function (done) {
            var k = randkey();
            var id;
            var locker = (new RedisReliableLocker(rc, k)).toPromiseStyle(Q.defer);
            locker
                .lock()
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.equal('OK');
                    expect(_id).to.exist;
                    id = _id;
                    return rc.get(k);
                })
                .then(function (_id) {
                    expect(_id).to.equal(id);
                    return locker.unlock(id);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        it('should not lock if someone has acquired the lock', function (done) {
            var k = randkey();
            var id;
            var locker = (new RedisReliableLocker(rc, k)).toPromiseStyle(Q.defer);
            locker.lock()
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.equal('OK');
                    expect(_id).to.exist;
                    id = _id;
                    return rc.get(k);
                })
                .then(function (_id) {
                    expect(_id).to.equal(id);
                    return locker.lock();
                })
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.not.exist;
                    expect(_id).to.not.equal(id);
                    return locker.unlock(id);
                })
                .then(function (unlocked) {
                    expect(unlocked).to.equal(1);
                    return locker.lock(1);
                })
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.equal('OK');
                    expect(_id).to.not.equal(id);
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        it('should timeout the lock', function (done) {
            var k = 'l' + Math.random();
            var id;
            var locker = (new RedisReliableLocker(rc, k)).toPromiseStyle(Q.defer);
            locker.lock(1)
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.equal('OK');
                    expect(_id).to.exist;
                    id = _id;
                    return rc.get(k);
                })
                .then(function (_id) {
                    expect(_id).to.equal(id);
                    var defer = Q.defer();
                    setTimeout(function () {
                        defer.resolve();
                    }, 1500);
                    return defer.promise;
                })
                .then(function () {
                    return rc.get(k);
                })
                .then(function (_id) {
                    expect(_id).to.not.exist;
                    return locker.lock(1);
                })
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.equal('OK');
                    expect(_id).to.not.equal(id);
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        xit('should not change the expiry time on subsequent lock calls');
    });

    describe('redlock2200', function () {
        it('should lock when no one has acquired the lock', function (done) {
            var k = randkey();
            var id;
            var locker = (new RedisReliableLocker(rc, k)).toPromiseStyle(Q.defer);
            locker.redlock2200()
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.equal('OK');
                    expect(_id).to.exist;
                    id = _id;
                    return rc.get(k);
                })
                .then(function (_id) {
                    expect(_id).to.equal(id);
                    return locker.unlock(id);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        it('should not lock if someone has acquired the lock', function (done) {
            var k = randkey();
            var id;
            var locker = (new RedisReliableLocker(rc, k)).toPromiseStyle(Q.defer);
            locker.redlock2200()
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.equal('OK');
                    expect(_id).to.exist;
                    id = _id;
                    return rc.get(k);
                })
                .then(function (_id) {
                    expect(_id).to.equal(id);
                    return locker.redlock2200(1);
                })
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.not.exist;
                    expect(_id).to.not.equal(id);
                    return locker.unlock(id);
                })
                .then(function (unlocked) {
                    expect(unlocked).to.equal(1);
                    return locker.redlock2200(1);
                })
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.equal('OK');
                    expect(_id).to.not.equal(id);
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        it('should timeout the lock', function (done) {
            var k = 'l' + Math.random();
            var id;
            var locker = (new RedisReliableLocker(rc, k)).toPromiseStyle(Q.defer);
            locker.redlock2200(1)
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.equal('OK');
                    expect(_id).to.exist;
                    id = _id;
                    return rc.get(k);
                })
                .then(function (_id) {
                    expect(_id).to.equal(id);
                    var defer = Q.defer();
                    setTimeout(function () {
                        defer.resolve();
                    }, 1500);
                    return defer.promise;
                })
                .then(function () {
                    return rc.get(k);
                })
                .then(function (_id) {
                    expect(_id).to.not.exist;
                    return locker.redlock2200(1);
                })
                .then(function (arr) {
                    var locked = arr[0];
                    var _id = arr[1];
                    expect(locked).to.equal('OK');
                    expect(_id).to.not.equal(id);
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        xit('should not change the expiry time on subsequent lock calls');
    });

    describe('locked', function () {
        xit('should locked');
    });

}).call(this);