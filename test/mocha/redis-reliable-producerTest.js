(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisReliableProducer = typeof require === 'function' ? require('../../rarefied-redis.js').RedisReliableProducer : window.RedisReliableProducer;
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

    describe('strproducer', function () {
        it('should produce a string element', function (done) {
            var k = randkey();
            var v = 'value';
            var producer = RedisReliableProducer.strproducer(rc).toPromiseStyle(Q.defer);
            producer
                .produce(k, v)
                .then(function () {
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
        it('should not produce anything if the key is not a string', function (done) {
            var k = randkey();
            var v = 'value', v2 = 'v2';
            var producer = RedisReliableProducer.strproducer(rc).toPromiseStyle(Q.defer);
            rc
                .lpush(k, v)
                .then(function () {
                    return producer.produce(k, v2);
                })
                .then(function () {
                    return rc.type(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal('list');
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
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
        it('should produce string key-values', function (done) {
            var k1 = randkey(), k2 = randkey(), k3 = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var producer = RedisReliableProducer.strproducer(rc).toPromiseStyle(Q.defer);
            producer
                .produce(k1, v1, k2, v2, k3, v3)
                .then(function () {
                    return rc.mget(k1, k2, k3);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(3);
                    expect(reply[0]).to.equal(v1);
                    expect(reply[1]).to.equal(v2);
                    expect(reply[2]).to.equal(v3);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should reliably produce string key-values');
    });
    
    describe('lproducer', function () {
        it('should produce a list value', function (done) {
            var k = randkey();
            var v = 'v';
            var producer = RedisReliableProducer.lproducer(rc).toPromiseStyle(Q.defer);
            producer
                .produce(k, v)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
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
        it('should not produce anything if the key is not a list', function (done) {
            var k = randkey();
            var v = 'v', v2 = 'v2';
            var producer = RedisReliableProducer.lproducer(rc).toPromiseStyle(Q.defer);
            rc
                .set(k, v)
                .then(function () {
                    return producer.produce(k, v2)
                })
                .then(function () {
                    return rc.type(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal('string');
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
        it('should produce list values', function (done) {
            var k = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var producer = RedisReliableProducer.lproducer(rc).toPromiseStyle(Q.defer);        
            producer
                .produce(k, v1, v2, v3)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return rc.lrange(k, 0, -1);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(3);
                    expect(reply[0]).to.equal(v1);
                    expect(reply[1]).to.equal(v2);
                    expect(reply[2]).to.equal(v3);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should reliably produce list elements');
    });

    describe('lproducerlpush', function () {
        it('should produce a list value', function (done) {
            var k = randkey();
            var v = 'v';
            var producer = RedisReliableProducer.lproducerlpush(rc).toPromiseStyle(Q.defer);
            producer
                .produce(k, v)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(1);
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
        it('should not produce anything if the key is not a list', function (done) {
            var k = randkey();
            var v = 'v', v2 = 'v2';
            var producer = RedisReliableProducer.lproducerlpush(rc).toPromiseStyle(Q.defer);
            rc
                .set(k, v)
                .then(function () {
                    return producer.produce(k, v2)
                })
                .then(function () {
                    return rc.type(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal('string');
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
        it('should produce list values', function (done) {
            var k = randkey();
            var v1 = 'v1', v2 = 'v2', v3 = 'v3';
            var producer = RedisReliableProducer.lproducerlpush(rc).toPromiseStyle(Q.defer);        
            producer
                .produce(k, v1, v2, v3)
                .then(function () {
                    return rc.llen(k);
                })
                .then(function (reply) {
                    expect(reply).to.equal(3);
                    return rc.lrange(k, 0, -1);
                })
                .then(function (reply) {
                    expect(reply).to.have.lengthOf(3);
                    expect(reply[0]).to.equal(v3);
                    expect(reply[1]).to.equal(v2);
                    expect(reply[2]).to.equal(v1);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should reliably produce list elements');
    });

    describe('sproducer', function () {
    });

    describe('zproducer', function () {
    });

    describe('hproducer', function () {
    });

    describe('produce', function () {
    });

}).call(this);