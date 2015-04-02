(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var redisCAS = typeof require === 'function' ? require('../../rarefied-redis.js').redisCAS : window.redisCAS;
    var toPromise = typeof require === 'function' ? require('../../rarefied-redis.js').toPromise : window.toPromise;
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

    redisClient = redisClient.toPromiseStyle(Q.defer);
    redisCAS = toPromise(redisCAS, null, Q.defer);

    before(function (done) {
        redisClient
            .flushdb()
            .then(function () {
                done();
            })
            .fail(function (err) {
                done(err);
            })
            .done();
    });

    describe('redisCAS', function () {
        it('should check-and-set a key that is unchanging', function (done) {
            var k = randkey();
            var v = 'v', v2 = 'v2';
            redisClient
                .set(k, v)
                .then(function () {
                    return redisCAS(redisClient, k, function (client, key, cb) {
                        client.get(key, cb);
                    }, function (client, key, multi) {
                        return multi.set(key, v2);
                    });
                })
                .then(function (replies) {
                    expect(replies).to.have.lengthOf(2);
                    expect(replies[0]).to.have.lengthOf(1);
                    expect(replies[0][0]).to.equal('OK');
                    expect(replies[1]).to.equal(v);
                    return redisClient.get(k);
                })
                .then(function (value) {
                    expect(value).to.equal(v2);
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
        it('should fail if a key changes before the multi is execd', function (done) {
            var k = randkey();
            var v = 'v', v2 = 'v2', v3 = 'v3';
            redisClient
                .set(k, v)
                .then(function () {
                    return redisCAS(redisClient, k, function (client, key, cb) {
                        client.get(key, cb);
                    }, function (client, key, multi) {
                        redisClient.set(key, v3);
                        return multi.set(key, v2);
                    });
                })
                .then(function (replies) {
                    expect(replies).to.have.lengthOf(2);
                    expect(replies[0]).to.not.exist;
                    expect(replies[1]).to.equal(v);
                    return redisClient.get(k);
                })
                .then(function (value) {
                    expect(value).to.equal(v3);
                    done();
                })
                .fail(function (err) {
                    done(new Error(err));
                })
                .done();
        });
    });

}).call(this);