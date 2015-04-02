(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisReliableMover = typeof require === 'function' ? require('../../rarefied-redis.js').RedisReliableMover : window.RedisReliableMover;
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

    describe('strmover', function () {
        it('should move a string from one key to a non-existent key', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v';
            var mover = RedisReliableMover.strmover(rc).toPromiseStyle(Q.defer);
            rc
                .set(s, v)
                .then(function () {
                    return mover.move(s, d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    return rc.get(d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    return rc.get(s);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should move a string from one key to another', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v', oldv = 'oldv';
            var mover = RedisReliableMover.strmover(rc).toPromiseStyle(Q.defer);
            rc
                .set(s, v)
                .then(function () {
                    return rc.set(d, oldv);
                })
                .then(function () {
                    return mover.move(s, d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    return rc.get(d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    return rc.get(s);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should not move a string into a non-string key', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v';
            var mover = RedisReliableMover.strmover(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(d, v)
                .then(function () {
                    return mover.move(s, d);
                })
                .then(function () {
                    expect(true).to.be.false;
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        xit('should allow the nx option');
        xit('should allow the xx option');
        xit('should allow the ex option');
        xit('should allow the px option');
        xit('should allow any combination of nx/xx/ex/px options');
    });

    describe('smover', function () {
        it('should move a member from one set to a non-existent key', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v';
            var mover = RedisReliableMover.smover(rc).toPromiseStyle(Q.defer);
            rc
                .sadd(s, v)
                .then(function () {
                    return mover.move(s, d, v);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    return rc.exists(d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.type(d);
                })
                .then(function (reply) {
                    expect(reply).to.equal('set');
                    return rc.sismember(d, v);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.sismember(s, v);
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
        it('should move a member from one set to another', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v', v2 = 'v2';
            var mover = RedisReliableMover.smover(rc).toPromiseStyle(Q.defer);
            rc
                .sadd(s, v)
                .then(function () {
                    return rc.sadd(d, v2);
                })
                .then(function () {
                    return mover.move(s, d, v);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    return rc.sismember(d, v);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.sismember(s, v);
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
        it('should not move a member into a non-set key', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v';
            var mover = RedisReliableMover.smover(rc).toPromiseStyle(Q.defer);
            rc
                .sadd(s, v)
                .then(function () {
                    return rc.set(s, v);
                })
                .then(function () {
                    return mover.move(s, d, v);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
    });

    describe('spopmove', function () {
        it('should move a random member from one set to a non-existent key', function (done) {
            var s = randkey(), d = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var popped;
            var mover = RedisReliableMover.smover(rc).toPromiseStyle(Q.defer);
            rc
                .sadd(s, v1, v2, v3)
                .then(function () {
                    return mover.move(s, d);
                })
                .then(function (reply) {
                    expect([v1, v2, v3].indexOf(reply)).to.be.above(-1);
                    popped = reply;
                    return rc.sismember(d, reply);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.sismember(s, popped);
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
        it('should move a random member from one set to another', function (done) {
            var s = randkey(), d = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var popped;
            var mover = RedisReliableMover.smover(rc).toPromiseStyle(Q.defer);
            rc
                .sadd(s, v1, v2, v3)
                .then(function () {
                    return rc.sadd(d, 'e');
                })
                .then(function () {
                    return mover.move(s, d);
                })
                .then(function (reply) {
                    expect([v1, v2, v3].indexOf(reply)).to.be.above(-1);
                    popped = reply;
                    return rc.sismember(d, reply);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
                    return rc.sismember(s, popped);
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
        it('should not pop a member into a non-set key', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v';
            var mover = RedisReliableMover.smover(rc).toPromiseStyle(Q.defer);
            rc
                .sadd(s, v)
                .then(function () {
                    return rc.set(s, v);
                })
                .then(function () {
                    return mover.move(s, d);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
    });

    describe('zmover', function () {
        it('should move a member from one sorted set to a non-existent key', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v';
            var mover = RedisReliableMover.zmover(rc).toPromiseStyle(Q.defer);
            rc
                .zadd(s, 1, v)
                .then(function () {
                    return mover.move(s, d, v);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    return rc.zscore(d, v);
                })
                .then(function (reply) {
                    expect(parseInt(reply, 10)).to.equal(1);
                    return rc.zscore(s, v);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should move a member from one sorted set to another', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v', v2 = 'v2';
            var mover = RedisReliableMover.zmover(rc).toPromiseStyle(Q.defer);
            rc
                .zadd(s, 1, v)
                .then(function () {
                    return rc.zadd(d, 2, v2);
                })
                .then(function () {
                    return mover.move(s, d, v);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    return rc.zscore(d, v);
                })
                .then(function (reply) {
                    expect(parseInt(reply, 10)).to.equal(1);
                    return rc.zscore(s, v);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should not move a member into a non-sorted-set key', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v', v2 = 'v2';
            var mover = RedisReliableMover.zmover(rc).toPromiseStyle(Q.defer);
            rc
                .zadd(s, 1, v)
                .then(function () {
                    return rc.sadd(d, v2);
                })
                .then(function () {
                    return mover.move(s, d, v);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1)
                    done();
                })
                .done();
        });
    });

    describe('zpopmove', function () {
        it('should move the first member from one sorted set to a non-existent key', function (done) {
            var s = randkey(), d = randkey();
            var v1 = 'v1', v2 = 'v2';
            var mover = RedisReliableMover.zmover(rc).toPromiseStyle(Q.defer);
            rc
                .zadd(s, 1, v1, 2, v2)
                .then(function () {
                    return mover.move(s, d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.zscore(d, v1);
                })
                .then(function (reply) {
                    expect(parseInt(reply, 10)).to.equal(1);
                    return rc.zscore(s, v1);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should move the first member from one sorted set to another', function (done) {
            var s = randkey(), d = randkey();
            var v1 = 'v1', v2 = 'v2', v11 = 'v11';
            var mover = RedisReliableMover.zmover(rc).toPromiseStyle(Q.defer);
            rc
                .zadd(s, 1, v1, 2, v2)
                .then(function () {
                    return rc.zadd(d, 1, v11);
                })
                .then(function () {
                    return mover.move(s, d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.zscore(d, v1);
                })
                .then(function (reply) {
                    expect(parseInt(reply, 10)).to.equal(1);
                    return rc.zscore(s, v1);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist;
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should not pop a member into a non-sorted-set key', function (done) {
            var s = randkey(), d = randkey();
            var v = 'v', v2 = 'v2';
            var mover = RedisReliableMover.zmover(rc).toPromiseStyle(Q.defer);
            rc
                .zadd(s, 1, v)
                .then(function () {
                    return rc.sadd(d, v2);
                })
                .then(function () {
                    return mover.move(s, d);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1)
                    done();
                })
                .done();
        });
    });

    describe('hmove', function () {
        xit('should move a field from one hash to another');
        xit('should not move a field into a non-hash key');
    });

    describe('hpopmove', function () {
        xit('should move a random field from one hash to another');
        xit('should not pop a random field into a non-hash key');
    });

    describe('lmove', function () {
        it('should move an index from one list to another', function (done) {
            var s = randkey(), d = randkey();
            var v11 = 'v11', v12 = 'v12', v13 = 'v13', v21 = 'v21', v22 = 'v22', v23 = 'v23';
            var mover = RedisReliableMover.lmover(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(s, v11, v12, v13)
                .then(function () {
                    return rc.rpush(d, v21, v22, v23);
                })
                .then(function () {
                    return mover.move(s, d, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v12);
                    return rc.lindex(d, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v12);
                    return rc.lindex(s, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v13);
                    return rc.llen(s);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return rc.llen(d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should not move an index into a non-list key', function (done) {
            var s = randkey(), d = randkey();
            var v11 = 'v11', v12 = 'v12', v13 = 'v13', v21 = 'v21', v22 = 'v22', v23 = 'v23';
            var mover = RedisReliableMover.lmover(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(s, v11, v12, v13)
                .then(function () {
                    return rc.sadd(d, v21, v22, v23);
                })
                .then(function () {
                    return mover.move(s, d, 1);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should not move an out-of-range index from one list to another', function (done) {
            var s = randkey(), d = randkey();
            var v11 = 'v11', v12 = 'v12', v13 = 'v13', v21 = 'v21', v22 = 'v22', v23 = 'v23', v24 = 'v24';
            var mover = RedisReliableMover.lmover(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(s, v11, v12, v13)
                .then(function () {
                    return rc.lpush(d, v21, v22, v23, v24);
                })
                .then(function () {
                    return mover.move(s, d, 3);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('ERR')).to.be.above(-1);
                    expect(err.message.indexOf('index')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should pad out the destination if the source index is greater than the destination length', function (done) {
            var s = randkey(), d = randkey();
            var v11 = 'v11', v12 = 'v12', v13 = 'v13', v21 = 'v21', v22 = 'v22', v23 = 'v23';
            var mover = RedisReliableMover.lmover(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(s, v11, v12, v12, v13)
                .then(function () {
                    return rc.rpush(d, v21, v22);
                })
                .then(function () {
                    return mover.move(s, d, 3);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v13);
                    return rc.llen(d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(4);
                    return rc.lindex(d, 3);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v13);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should only move the element at index', function (done) {
            var s = randkey(), d = randkey();
            var v1 = 'v1', v2 = 'v2';
            var mover = RedisReliableMover.lmover(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(s, v1, v1, v1, v1, v1)
                .then(function () {
                    return rc.lpush(d, v2, v2, v2, v2, v2);
                })
                .then(function () {
                    return mover.move(s, d, 3);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.lindex(d, 3);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.lrange(s, 0, 2);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(3);
                    expect(reply[0]).to.equal(v1);
                    expect(reply[1]).to.equal(v1);
                    expect(reply[2]).to.equal(v1);
                    return rc.lindex(s, 3);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v1);
                    return rc.llen(s);
                })
                .then(function (reply) {
                    expect(reply).to.equal(4);
                    return rc.llen(d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(5);
                    return rc.lrange(d, 0, 2);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(3);
                    expect(reply[0]).to.equal(v2);
                    expect(reply[1]).to.equal(v2);
                    expect(reply[2]).to.equal(v2);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should move sindex to dindex', function (done) {
            var s = randkey(), d = randkey();
            var v11 = 'v11', v12 = 'v12', v13 = 'v13', v21 = 'v21', v22 = 'v22', v23 = 'v23';
            var mover = RedisReliableMover.lmover(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(s, v11, v12, v13)
                .then(function () {
                    return rc.rpush(d, v21, v22, v23);
                })
                .then(function () {
                    return mover.move(s, d, 1, 0);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v12);
                    return rc.lindex(d, 0);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v12);
                    return rc.lindex(s, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v13);
                    return rc.llen(s);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return rc.llen(d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should move an element from one list to another', function (done) {
            var s = randkey(), d = randkey();
            var v11 = 'v11', v12 = 'v12', v13 = 'v13', v21 = 'v21', v22 = 'v22', v23 = 'v23';
            var mover = RedisReliableMover.lmover(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(s, v11, v12, v13, v13, v12, v11)
                .then(function () {
                    return rc.lpush(d, v21, v22, v23);
                })
                .then(function () {
                    return mover.move(s, d, v13);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v13);
                    return rc.lindex(d, 2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v13);
                    return rc.lindex(s, 3);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v12);
                    return rc.llen(s);
                })
                .then(function (reply) {
                    expect(reply).to.equal(5);
                    return rc.llen(d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should return an error if the element is not in the list', function (done) {
            var s = randkey(), d = randkey();
            var v11 = 'v11', v12 = 'v12', v13 = 'v13', v21 = 'v21', v22 = 'v22', v23 = 'v23';
            var mover = RedisReliableMover.lmover(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(s, v11, v12, v13, v13, v12, v11)
                .then(function () {
                    return rc.lpush(d, v21, v22, v23);
                })
                .then(function () {
                    return mover.move(s, d, 'v14');
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('ERR')).to.be.above(-1);
                    expect(err.message.indexOf('index')).to.be.above(-1);
                    done();
                })
                .done();
        });
    });

    describe('lpopmove', function () {
        it('should move an element from one list to another', function (done) {
            var s = randkey(), d = randkey();
            var v11 = 'v11', v12 = 'v12', v13 = 'v13', v21 = 'v21', v22 = 'v22', v23 = 'v23';
            var mover = RedisReliableMover.lmover(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(s, v11, v12, v13)
                .then(function () {
                    return rc.lpush(d, v21, v22, v23);
                })
                .then(function () {
                    return mover.move(s, d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v13);
                    return rc.lindex(d, 0);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v13);
                    return rc.lindex(s, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v12);
                    return rc.llen(s);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return rc.llen(d);
                })
                .then(function (reply) {
                    expect(reply).to.equal(4);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should not move an element into a non-list key', function (done) {
            var s = randkey(), d = randkey();
            var v11 = 'v11', v12 = 'v12', v13 = 'v13', v21 = 'v21', v22 = 'v22', v23 = 'v23';
            var mover = RedisReliableMover.lmover(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(s, v11, v12, v13)
                .then(function () {
                    return rc.sadd(d, v21, v22, v23);
                })
                .then(function () {
                    return mover.move(s, d);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('WRONGTYPE')).to.be.above(-1);
                    done();
                })
                .done();
        });
    });

    describe('move', function () {
    });
    
    describe('with concurrency', function () {
        xit('should move with optimistic concurrency');
    });

}).call(this);
