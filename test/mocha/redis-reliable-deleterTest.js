(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisReliableDeleter = typeof require === 'function' ? require('../../rarefied-redis.js').RedisReliableDeleter : window.RedisReliableDeleter;
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

    describe('strdel', function () {
        it('should do nothing for a non-existent key', function (done) {
            var k = randkey();
            var v = 'v';
            var deleter = RedisReliableDeleter.strdeleter(rc).toPromiseStyle(Q.defer);
            deleter
                .del(k, v)
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply[0]).to.have.lengthOf(0);
                    expect(reply[1]).to.not.exist;
                    return rc.get(k);
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
        it('should not delete the key if the values do not match', function (done) {
            var k = randkey();
            var v = 'v', v2 = 'v2';
            var deleter = RedisReliableDeleter.strdeleter(rc).toPromiseStyle(Q.defer);
            rc
                .set(k, v)
                .then(function () {
                    return deleter.del(k, v2);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply[0]).to.have.lengthOf(0);
                    expect(reply[1]).to.equal(v);
                    return rc.get(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should not delete the key if no value is given', function (done) {
            var k = randkey();
            var v = 'v', v2 = 'v2';
            var deleter = RedisReliableDeleter.strdeleter(rc).toPromiseStyle(Q.defer);
            rc
                .set(k, v)
                .then(function () {
                    return deleter.del(k);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply[0]).to.have.lengthOf(0);
                    expect(reply[1]).to.equal(v);
                    return rc.get(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should delete the key if the value matches', function (done) {
            var k = randkey();
            var v = 'v';
            var deleter = RedisReliableDeleter.strdeleter(rc).toPromiseStyle(Q.defer);
            rc
                .set(k, v)
                .then(function () {
                    return deleter.del(k, v);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply[0]).to.have.lengthOf(1);
                    expect(reply[0][0]).to.equal(1);
                    expect(reply[1]).to.equal(v);
                    return rc.get(k);
                })
                .then(function (reply) {
                    expect(reply).to.not.exist
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
    });

    describe('ldel', function () {
        it('should do nothing for a non-existent key', function (done) {
            var k = randkey();
            var v = 'v';
            var deleter = RedisReliableDeleter.ldeleter(rc).toPromiseStyle(Q.defer);
            deleter
                .del(k, v)
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('ERR')).to.be.above(-1);
                    expect(err.message.indexOf('index')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should not delete the index if the index is out of range', function (done) {
            var k = randkey();
            var v = 'v';
            var deleter = RedisReliableDeleter.ldeleter(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(k, v)
                .then(function () {
                    return deleter.del(k, 2);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply[0]).to.have.lengthOf(0);
                    expect(reply[1]).to.not.exist;
                    return rc.lindex(k, 0);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should not delete the index if no index is given', function (done) {
            var k = randkey();
            var v = 'v', v2 = 'v2';
            var deleter = RedisReliableDeleter.ldeleter(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(k, v)
                .then(function () {
                    return deleter.del(k);
                })
                .fail(function (err) {
                    expect(err).to.exist;
                    expect(err.message.indexOf('ERR')).to.be.above(-1);
                    expect(err.message.indexOf('index')).to.be.above(-1);
                    done();
                })
                .done();
        });
        it('should delete the index for an in-range index', function (done) {
            var k = randkey();
            var v = 'v', v2 = 'v2', v3 = 'v3';
            var deleter = RedisReliableDeleter.ldeleter(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(k, v, v2, v3)
                .then(function () {
                    return deleter.del(k, 1);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply[0].length).to.be.above(0);
                    expect(reply[1]).to.equal(1);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(2);
                    return rc.lindex(k, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v3);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should delete the first occurrence of an element in the list', function (done) {
            var k = randkey();
            var v = 'v', v2 = 'v2', v3 = 'v3';
            var deleter = RedisReliableDeleter.ldeleter(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(k, v, v2, v3, v2, v, v, v)
                .then(function () {
                    return deleter.del(k, v2);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(2);
                    expect(reply[0].length).to.be.above(0);
                    expect(reply[1]).to.equal(v2);
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(6);
                    return rc.lindex(k, 1);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v3);
                    return rc.lindex(k, 2);
                })
                .then(function (reply) {
                    expect(reply).to.equal(v2);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should do nothing if the element is not in the list', function (done) {
            var k = randkey();
            var v = 'v', v2 = 'v2', v3 = 'v3';
            var deleter = RedisReliableDeleter.ldeleter(rc).toPromiseStyle(Q.defer);
            rc
                .rpush(k, v, v2, v3, v2, v, v, v)
                .then(function () {
                    return deleter.del(k, 'v4');
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

    describe('sdel', function () {
        xit('should sdel');
    });

    describe('zdel', function () {
        xit('should zdel');
    });

    describe('hdel', function () {
        xit('should hdel');
    });

    describe('del', function () {
        xit('should del');
    });

}).call(this);