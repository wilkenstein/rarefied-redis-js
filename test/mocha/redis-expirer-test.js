(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisExpirer = typeof require === 'function' ? require('../../rarefied-redis.js').RedisExpirer : window.RedisExpirer;
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

    describe('expire', function () {
        it('should expire a list element', function (done) {
            this.timeout(5000);
            var k = randkey(), lk = randkey();
            var v = 'v';
            var expirer = new RedisExpirer(rc, lk).toPromiseStyle(Q.defer);
            rc
                .lpush(k, v)
                .then(function () {
                    return expirer.expire(function (err, key, value) {
                        expect(err).to.not.exist;
                        expect(key).to.equal(k);
                        expect(value).to.equal(v);
                        done();
                    }, k, 1, v);
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should expire list elements', function (done) {
            this.timeout(5000);
            var k = randkey(), lk = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3', v4 = 'v4', v5 = 'v5';
            var expirer = new RedisExpirer(rc, lk).toPromiseStyle(Q.defer);
            var expired = [];
            rc
                .lpush(k, v1, v2, v3, v4, v5)
                .then(function () {
                    return expirer.expire(function (err, key, value) {
                        expect(err).to.not.exist;
                        expect(key).to.equal(k);
                        expect([v1, v3, v5].indexOf(value)).to.be.above(-1);
                        expired.push(value);
                        rc.lrem(key, 1, value);
                        if (expired.length === 3) {
                            rc
                                .llen(k)
                                .then(function (reply) {
                                    expect(reply).to.equal(2);
                                    return rc.lrange(k, 0, -1);
                                })
                                .then(function (reply) {
                                    expect(reply).to.have.lengthOf(2);
                                    expect(reply[0]).to.equal(v4);
                                    expect(reply[1]).to.equal(v2);
                                    done();
                                })
                                .fail(function (err) {
                                    done(err);
                                })
                                .done();
                        }
                    }, k, 1, v1, v3, v5);
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should expire a set element', function (done) {
            this.timeout(5000);
            var k = randkey(), lk = randkey();
            var v = 'v';
            var expirer = new RedisExpirer(rc, lk).toPromiseStyle(Q.defer);
            rc
                .sadd(k, v)
                .then(function () {
                    return expirer.expire(function (err, key, value) {
                        expect(err).to.not.exist;
                        expect(key).to.equal(k);
                        expect(value).to.equal(v);
                        done();
                    }, k, 1, v);
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should expire set elements', function (done) {
            this.timeout(5000);
            var k = randkey(), lk = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3', v4 = 'v4', v5 = 'v5';
            var expirer = new RedisExpirer(rc, lk).toPromiseStyle(Q.defer);
            var expired = [];
            rc
                .sadd(k, v1, v2, v3, v4, v5)
                .then(function () {
                    return expirer.expire(function (err, key, value) {
                        expect(err).to.not.exist;
                        expect(key).to.equal(k);
                        expect([v1, v3, v5].indexOf(value)).to.be.above(-1);
                        expired.push(value);
                        rc.srem(key, value);
                        if (expired.length === 3) {
                            rc
                                .scard(k)
                                .then(function (reply) {
                                    expect(reply).to.equal(2);
                                    return rc.smembers(k);
                                })
                                .then(function (reply) {
                                    expect(reply).to.have.lengthOf(2);
                                    expect(reply.indexOf(v2)).to.be.above(-1);
                                    expect(reply.indexOf(v4)).to.be.above(-1);
                                    done();
                                })
                                .fail(function (err) {
                                    done(err);
                                })
                                .done();
                        }
                    }, k, 1, v1, v3, v5);
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should expire a zset element');
        xit('should expire a hash field');
        xit('should expire');
    });
    
    describe('persist', function () {
        it('should set an expiry, then persist the element and not expire it', function (done) {
            this.timeout(5000);
            var k = randkey(), lk = randkey();
            var v = 'v';
            var expirer = new RedisExpirer(rc, lk).toPromiseStyle(Q.defer);
            var expired = false;
            rc
                .lpush(k, v)
                .then(function () {
                    return expirer.expire(function (err, key, value) {
                        expired = true;
                    }, k, 1, v);
                })
                .then(function () {
                    return expirer.persist(k, v);
                })
                .then(function () {
                    setTimeout(function () {
                        expect(expired).to.be.false;
                        done();
                    }, 1200);
                }) 
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should persist');
    });

    describe('exists', function () {
        it('should return 0 if the element is not set to expire', function (done) {
            var k = randkey(), lk = randkey();
            var v = 'v';
            var expirer = new RedisExpirer(rc, lk).toPromiseStyle(Q.defer);
            rc
                .lpush(k, v)
                .then(function () {
                    return expirer.exists(k, v);
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should return 1 for an element that has an expiry', function (done) {
            this.timeout(5000);
            var k = randkey(), lk = randkey();
            var v = 'v';
            var expirer = new RedisExpirer(rc, lk).toPromiseStyle(Q.defer);
            rc
                .lpush(k, v)
                .then(function () {
                    return expirer.expire(function (err, key, value) {
                        expect(err).to.not.exist;
                        expect(key).to.equal(k);
                        expect(value).to.equal(v);
                        done();
                    }, k, 1, v);
                })
                .then(function () {
                    return expirer.exists(k, v);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should exists');
    });

    describe('check', function () {
        it('should not remove elements that have yet to expire', function (done) {
            this.timeout(5000);
            var k = randkey(), lk = randkey();
            var v = 'v';
            var expirer = new RedisExpirer(rc, lk).toPromiseStyle(Q.defer);
            var checkExpired = false;
            rc
                .lpush(k, v)
                .then(function () {
                    return expirer.expire(function (err, key, value) {
                        expect(err).to.not.exist;
                        expect(key).to.equal(k);
                        expect(value).to.equal(v);
                        expect(checkExpired).to.be.false;
                        done();
                    }, k, 1, v);
                })
                .then(function () {
                    return expirer.check(function () {
                        checkExpired = true;
                    });
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should check');
    });

}).call(this);
