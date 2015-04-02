(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisConcurrency = typeof require === 'function' ? require('../../rarefied-redis.js').RedisConcurrency : window.RedisConcurrency;
    var RedisReliableMover = typeof require === 'function' ? require('../../rarefied-redis.js').RedisReliableMover : window.RedisReliableMover;
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
    var mover = RedisReliableMover.strmover(rc).bind();
    var lockKey = randkey('lock-');
    var locker = new RedisReliableLocker(rc, lockKey);
    var concurrency = new RedisConcurrency(locker);

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

    describe('optimistic', function () {
        it('should be optimistic on a function', function (done) {
            var k1 = randkey(), k2 = randkey();
            var v = 'v';
            rc
                .set(k1, v)
                .then(function () {
                    concurrency
                        .should
                        .be
                        .optimistic
                        .about(mover.move)
                        .and
                        .tell(function (err, member) {
                            expect(err).to.not.exist;
                            expect(member).to.equal(v);
                            done();
                        })
                        .when
                        .invokedWith(k1, k2);
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        it('should be optimistic at most N times on a function', function (done) {
            this.timeout(6000);
            var called = 0;
            var fer = function (callback) {
                called += 1;
                callback(null, null);
            };
            concurrency
                .should
                .be
                .atMost(5)
                .times
                .optimistic
                .on(fer)
                .and
                .tell(function (err, reply) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('optimistic')).to.be.above(-1);
                    expect(called).to.equal(5);
                    done();
                })
                .when
                .invoked();
        });
        it('should be forever optimistic if N = 0 times on a function', function (done) {
            this.timeout(8000);
            var called = 0;
            var fer = function (callback) {
                called += 1;
                callback(null, called === 7 ? 1 : null);
            };
            concurrency
                .should
                .be
                .atMost(0)
                .times
                .optimistic
                .on(fer)
                .and
                .tell(function (err, reply) {
                    expect(err).to.not.exist;
                    expect(called).to.equal(7);
                    expect(reply).to.equal(1);
                    done();
                })
                .when
                .invoked();
        });
        it('should pass the context into the function', function (done) {
            var m = RedisReliableMover.strmover(redisClient);
            var k1 = randkey(), k2 = randkey();
            var v = 'v';
            rc
                .set(k1, v)
                .then(function () {
                    concurrency
                        .should
                        .be
                        .optimistic
                        .on(m.move, m)
                        .and
                        .tell(function (err, member) {
                            expect(err).to.not.exist;
                            expect(member).to.equal(v);
                            done();
                        })
                        .when
                        .invokedWith(k1, k2);
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
    });

    describe('pessimistic', function () {
        xit('should be pessimistic on a function', function (done) {
            var k1 = randkey(), k2 = randkey();
            var v = 'v';
            rc
                .set(k1, v)
                .then(function () {
                    concurrency
                        .should
                        .be
                        .pessimistic
                        .about(mover.move)
                        .and
                        .tell(function (err, member) {
                            expect(err).to.not.exist;
                            expect(member).to.equal(v);
                            done();
                        })
                        .when
                        .invokedWith(k1, k2);
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        xit('should be pessimistic at most N times on a function', function (done) {
            this.timeout(6000);
            locker.lock(30, function (err, locked, id) {
                expect(err).to.not.exist;
                expect(locked).to.equal('OK');
                concurrency
                    .should
                    .be
                    .atMost(5)
                    .times
                    .pessimistic
                    .on(mover.move)
                    .and
                    .tell(function (err, reply) {
                        expect(err).to.exist;
                        expect(err.message.indexOf('pessimistic')).to.be.above(-1);
                        locker.unlock(id, done);
                    })
                    .when
                    .invoked();
            });
        });
        xit('should be forever pessimistic if N = 0 times on a function', function (done) {
            this.timeout(10000);
            var _id;
            var fer = function (callback) {
                callback(null, 1);
            };
            var lockF;
            setTimeout(function () {
                locker.unlock(_id);
            }, 3000);
            lockF = function () {
                locker.lock(30, function (err, locked, id) {
                    expect(err).to.not.exist;
                    if (locked !== 'OK') {
                        setTimeout(lockF, 100);
                    }
                    expect(locked).to.equal('OK');
                    _id = id;
                    concurrency
                        .should
                        .be
                        .atMost(0)
                        .times
                        .pessimistic
                        .on(fer)
                        .and
                        .tell(function (err, reply) {
                            expect(err).to.not.exist;
                            expect(reply).to.equal(1);
                            done();
                        })
                        .when
                        .invoked();
                });
            };
            lockF();
        });
        xit('should pass the context into the function', function (done) {
            var m = new RedisReliableMover(redisClient);
            var k1 = randkey(), k2 = randkey();
            var v = 'v';
            rc
                .set(k1, v)
                .then(function () {
                    concurrency
                        .should
                        .be
                        .pessimistic
                        .on(m.move, m)
                        .and
                        .tell(function (err, member) {
                            expect(err).to.not.exist;
                            expect(member).to.equal(v);
                            done();
                        })
                        .when
                        .invokedWith(k1, k2);
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
    });

    describe('Optimistic', function () {
        it('should return an object that only implements optimistic concurrency', function (done) {
            var k1 = randkey(), k2 = randkey();
            var v = 'v';
            var optum = RedisConcurrency.Optimistic();
            expect(optum.pessimistic).to.not.exist;
            rc
                .set(k1, v)
                .then(function () {
                    optum
                        .should
                        .attempt(mover.move)
                        .and
                        .tell(function (err, member) {
                            expect(err).to.not.exist;
                            expect(member).to.equal(v);
                            done();
                        })
                        .when
                        .invokedWith(k1, k2);
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        it('should return an object that can limit its optimistic concurrency', function (done) {
            this.timeout(6000);
            var k1 = randkey(), k2 = randkey();
            var v = 'v';
            var optum = RedisConcurrency.Optimistic();
            var called = 0;
            var fer = function (callback) {
                called += 1;
                callback(null, null);
            };
            expect(optum.pessimistic).to.not.exist;
            optum
                .should
                .attempt(fer)
                .atMost(5)
                .times
                .and
                .tell(function (err, reply) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('optimistic')).to.be.above(-1);
                    expect(called).to.equal(5);
                    done();
                })
                .when
                .invoked();
        });
    });

    describe('Pessimistic', function () {
        xit('should return an object that only implements pessimistic concurrency', function (done) {
            var k1 = randkey(), k2 = randkey();
            var v = 'v';
            var pessum = RedisConcurrency.Pessimistic(locker);
            expect(pessum.optimistic).to.not.exist;
            rc
                .set(k1, v)
                .then(function () {
                    pessum
                        .should
                        .attempt(mover.move)
                        .and
                        .tell(function (err, member) {
                            expect(err).to.not.exist;
                            expect(member).to.equal(v);
                            done();
                        })
                        .when
                        .invokedWith(k1, k2);
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        xit('should return an object that can limit its pessimistic concurrency', function (done) {
            this.timeout(6000);
            var k1 = randkey(), k2 = randkey();
            var v = 'v';
            var optum = RedisConcurrency.Optimistic();
            var called = 0;
            var fer = function (callback) {
                called += 1;
                callback(null, null);
            };
            expect(optum.pessimistic).to.not.exist;
            optum
                .should
                .attempt(fer)
                .atMost(5)
                .times
                .and
                .tell(function (err, reply) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('optimistic')).to.be.above(-1);
                    expect(called).to.equal(5);
                    done();
                })
                .when
                .invoked();
        });
        xit('should Pessimistic');
    });

    describe('attempt', function () {
        it('should do optimistic concurrency on a naked concurrency object with attempt', function (done) {
            this.timeout(6000);
            var called = 0;
            var fer = function (callback) {
                called += 1;
                callback(null, null);
            };
            concurrency
                .should
                .attempt(fer)
                .atMost(5)
                .and
                .tell(function (err, reply) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('optimistic')).to.be.above(-1);
                    expect(called).to.equal(5);
                    done();
                })
                .when
                .invoked();
        });
    });

}).call(this);
