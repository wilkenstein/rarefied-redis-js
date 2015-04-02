(function() {
    var redisClient = typeof require === 'function' ? require('redis-js') : window.redismock;
    var RedisListAdapter = typeof require === 'function' ? require('../../rarefied-redis.js').RedisListAdapter : window.RedisListAdapter;
    var Q = typeof require === 'function' ? require('q') : window.Q;
    var chai = typeof require === 'function' ? require('chai') : window.chai;
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

    describe('concat', function () {
        it('should concat an array onto this array', function (done) {
            var k = randkey();
            var adapter = new RedisListAdapter(rc, k).toPromiseStyle(Q.defer);
            adapter
                .push('1', '2', '3')
                .then(function () {
                    return adapter.concat(['4', '5', '6']);
                })
                .then(function (arr) {
                    expect(arr).to.have.lengthOf(6);
                    expect(arr[0]).to.equal('1');
                    expect(arr[1]).to.equal('2');
                    expect(arr[2]).to.equal('3');
                    expect(arr[3]).to.equal('4');
                    expect(arr[4]).to.equal('5');
                    expect(arr[5]).to.equal('6');
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should return an error for a key that is not a list');
    });

    describe('every', function () {
        it('should return true if every element passes the predicate', function (done) {
            var k = randkey();
            var adapter = new RedisListAdapter(rc, k).toPromiseStyle(Q.defer);
            var arr = [];
            var idx, len = 20;
            for (idx = 0; idx < len; idx += 1) {
                arr.push(idx.toString());
            }
            adapter
                .push
                .apply(adapter, arr)
                .then(function () {
                    return adapter.every(function (elem) {
                        return !isNaN(parseInt(elem, 10));
                    })
                })
                .then(function (reply) {
                    expect(reply).to.be.true;
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should return false if one element does not pass the predicate', function (done) {
            var k = randkey();
            var adapter = new RedisListAdapter(rc, k).toPromiseStyle(Q.defer);
            var arr = [];
            var idx, len = 30;
            for (idx = 0; idx < len; idx += 1) {
                if (idx !== 27) {
                    arr.push(idx.toString());
                }
                else {
                    arr.push('NaN');
                }
            }
            adapter
                .push
                .apply(adapter, arr)
                .then(function () {
                    return adapter.every(function (elem) {
                        return !isNaN(parseInt(elem, 10));
                    })
                })
                .then(function (reply) {
                    expect(reply).to.be.false;
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should return an error for a key that is not a list');
    });

    describe('filter', function () {
        xit('should filter');
        xit('should return an error for a key that is not a list');
    });

    describe('forEach', function () {
        xit('should forEach');
        xit('should return an error for a key that is not a list');
    });

    describe('indexOf', function () {
        it('should return -1 for an element not in the list', function (done) {
            var k = randkey();
            var adapter = new RedisListAdapter(rc, k).toPromiseStyle(Q.defer);
            var arr = [];
            var idx, len = 25;
            for (idx = 0; idx < len; idx += 1) {
                arr.push(idx.toString());
            }
            adapter
                .push
                .apply(adapter, arr)
                .then(function () {
                    return adapter.indexOf('25');
                })
                .then(function (reply) {
                    expect(reply).to.equal(-1);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should return the index for an element in the list', function (done) {
            var k = randkey();
            var adapter = new RedisListAdapter(rc, k).toPromiseStyle(Q.defer);
            var arr = [];
            var idx, len = 25;
            for (idx = 0; idx < len; idx += 1) {
                arr.push(idx.toString());
            }
            adapter
                .push
                .apply(adapter, arr)
                .then(function () {
                    return adapter.indexOf('14');
                })
                .then(function (reply) {
                    expect(reply).to.equal(14);
                    return adapter.indexOf('0');
                })
                .then(function (reply) {
                    expect(reply).to.equal(0);
                    return adapter.indexOf('24');
                })
                .then(function (reply) {
                    expect(reply).to.equal(24);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should return an error for a key that is not a list');
    });

    describe('join', function () {
        xit('should join');
        xit('should return an error for a key that is not a list');
    });

    describe('lastIndexOf', function () {
        it('should return -1 for an element not in the list', function (done) {
            var k = randkey();
            var adapter = new RedisListAdapter(rc, k).toPromiseStyle(Q.defer);
            var arr = [];
            var idx, len = 25;
            for (idx = 0; idx < len; idx += 1) {
                arr.push((idx % 8).toString());
            }
            adapter
                .push
                .apply(adapter, arr)
                .then(function () {
                    return adapter.lastIndexOf('25');
                })
                .then(function (reply) {
                    expect(reply).to.equal(-1);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        it('should return the last index for an element in the list', function (done) {
            var k = randkey();
            var adapter = new RedisListAdapter(rc, k).toPromiseStyle(Q.defer);
            var arr = [];
            var idx, len = 32;
            for (idx = 0; idx < len; idx += 1) {
                arr.push((idx % 8).toString());
            }
            adapter
                .push
                .apply(adapter, arr)
                .then(function () {
                    return adapter.lastIndexOf('0');
                })
                .then(function (reply) {
                    expect(reply).to.equal(24);
                    return adapter.lastIndexOf('7');
                })
                .then(function (reply) {
                    expect(reply).to.equal(31);
                    return adapter.lastIndexOf('2');
                })
                .then(function (reply) {
                    expect(reply).to.equal(26);
                    done();
                })
                .fail(function (err) {
                    done(err);
                })
                .done();
        });
        xit('should return an error for a key that is not a list');
    });

    describe('length', function () {
        xit('should length');
        xit('should return an error for a key that is not a list');
    });

    describe('map', function () {
        xit('should map');
        xit('should return an error for a key that is not a list');
    });

    describe('pop', function () {
        xit('should pop');
        xit('should return an error for a key that is not a list');
    });

    describe('push', function () {
        xit('should push');
        xit('should return an error for a key that is not a list');
    });

    describe('reduce', function () {
        xit('should reduce');
        xit('should return an error for a key that is not a list');
    });

    describe('reduceRight', function () {
        xit('should reduceRight');
        xit('should return an error for a key that is not a list');
    });

    describe('reverse', function () {
        xit('should reverse');
        xit('should return an error for a key that is not a list');
    });

    describe('shift', function () {
        xit('should shift');
        xit('should return an error for a key that is not a list');
    });

    describe('slice', function () {
        xit('should slice');
        xit('should return an error for a key that is not a list');
    });

    describe('some', function () {
        xit('should some');
        xit('should return an error for a key that is not a list');
    });

    describe('sort', function () {
        xit('should sort');
        xit('should return an error for a key that is not a list');
    });

    describe('splice', function () {
        xit('should splice');
        xit('should return an error for a key that is not a list');
    });

    describe('toString', function () {
        xit('should toString');
        xit('should return an error for a key that is not a list');
    });

    describe('unshift', function () {
        xit('should unshift');
        xit('should return an error for a key that is not a list');
    });

    describe('valueOf', function () {
        xit('should valueOf');
        xit('should return an error for a key that is not a list');
    });

}).call(this);