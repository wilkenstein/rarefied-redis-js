__report = {"info":{"file":"reliable/redis-reliable-locker.js","fileShort":"reliable/redis-reliable-locker.js","fileSafe":"reliable_redis_reliable_locker_js","link":"files/reliable_redis_reliable_locker_js/index.html"},"complexity":{"aggregate":{"line":7,"complexity":{"sloc":{"physical":255,"logical":79},"cyclomatic":22,"halstead":{"operators":{"distinct":17,"total":222,"identifiers":["__stripped__"]},"operands":{"distinct":72,"total":293,"identifiers":["__stripped__"]},"length":515,"vocabulary":89,"difficulty":34.59027777777778,"volume":3335.002716947695,"effort":115358.67036886436,"bugs":1.1116675723158982,"time":6408.815020492464},"params":28}},"functions":[{"name":"<anonymous>","line":7,"complexity":{"sloc":{"physical":255,"logical":23},"cyclomatic":7,"halstead":{"operators":{"distinct":12,"total":96,"identifiers":["__stripped__"]},"operands":{"distinct":33,"total":102,"identifiers":["__stripped__"]},"length":198,"vocabulary":45,"difficulty":18.545454545454547,"volume":1087.3869130732755,"effort":20166.084569722567,"bugs":0.3624623043577585,"time":1120.3380316512537},"params":0}},{"name":"RedisReliableLocker","line":52,"complexity":{"sloc":{"physical":6,"logical":4},"cyclomatic":1,"halstead":{"operators":{"distinct":4,"total":10,"identifiers":["__stripped__"]},"operands":{"distinct":6,"total":15,"identifiers":["__stripped__"]},"length":25,"vocabulary":10,"difficulty":5,"volume":83.04820237218406,"effort":415.2410118609203,"bugs":0.027682734124061355,"time":23.06894510338446},"params":2}},{"name":"<anonymous>.redlock2612","line":87,"complexity":{"sloc":{"physical":15,"logical":7},"cyclomatic":3,"halstead":{"operators":{"distinct":11,"total":19,"identifiers":["__stripped__"]},"operands":{"distinct":14,"total":25,"identifiers":["__stripped__"]},"length":44,"vocabulary":25,"difficulty":9.821428571428571,"volume":204.32967235008786,"effort":2006.8092820097913,"bugs":0.06810989078336262,"time":111.48940455609952},"params":2}},{"name":"<anonymous>","line":94,"complexity":{"sloc":{"physical":6,"logical":3},"cyclomatic":2,"halstead":{"operators":{"distinct":3,"total":4,"identifiers":["__stripped__"]},"operands":{"distinct":5,"total":9,"identifiers":["__stripped__"]},"length":13,"vocabulary":8,"difficulty":2.7,"volume":39,"effort":105.30000000000001,"bugs":0.013,"time":5.8500000000000005},"params":2}},{"name":"<anonymous>.redlock2200","line":134,"complexity":{"sloc":{"physical":28,"logical":7},"cyclomatic":3,"halstead":{"operators":{"distinct":11,"total":20,"identifiers":["__stripped__"]},"operands":{"distinct":13,"total":23,"identifiers":["__stripped__"]},"length":43,"vocabulary":24,"difficulty":9.73076923076923,"volume":197.15338753100974,"effort":1918.4541171286714,"bugs":0.06571779584366991,"time":106.5807842849262},"params":2}},{"name":"<anonymous>","line":141,"complexity":{"sloc":{"physical":3,"logical":1},"cyclomatic":1,"halstead":{"operators":{"distinct":2,"total":2,"identifiers":["__stripped__"]},"operands":{"distinct":4,"total":7,"identifiers":["__stripped__"]},"length":9,"vocabulary":6,"difficulty":1.75,"volume":23.264662506490403,"effort":40.71315938635821,"bugs":0.007754887502163467,"time":2.2618421881310113},"params":3}},{"name":"<anonymous>","line":143,"complexity":{"sloc":{"physical":9,"logical":3},"cyclomatic":2,"halstead":{"operators":{"distinct":4,"total":9,"identifiers":["__stripped__"]},"operands":{"distinct":9,"total":15,"identifiers":["__stripped__"]},"length":24,"vocabulary":13,"difficulty":3.3333333333333335,"volume":88.81055323538621,"effort":296.0351774512874,"bugs":0.029603517745128736,"time":16.446398747293742},"params":4}},{"name":"<anonymous>","line":151,"complexity":{"sloc":{"physical":9,"logical":5},"cyclomatic":4,"halstead":{"operators":{"distinct":7,"total":11,"identifiers":["__stripped__"]},"operands":{"distinct":8,"total":17,"identifiers":["__stripped__"]},"length":28,"vocabulary":15,"difficulty":7.4375,"volume":109.39293667703852,"effort":813.609966535474,"bugs":0.03646431222567951,"time":45.20055369641522},"params":2}},{"name":"<anonymous>.redlockCompatible","line":169,"complexity":{"sloc":{"physical":13,"logical":8},"cyclomatic":3,"halstead":{"operators":{"distinct":6,"total":16,"identifiers":["__stripped__"]},"operands":{"distinct":12,"total":27,"identifiers":["__stripped__"]},"length":43,"vocabulary":18,"difficulty":6.75,"volume":179.30677506201943,"effort":1210.3207316686312,"bugs":0.059768925020673144,"time":67.24004064825729},"params":3}},{"name":"<anonymous>.redlockUnlock","line":202,"complexity":{"sloc":{"physical":13,"logical":3},"cyclomatic":1,"halstead":{"operators":{"distinct":5,"total":8,"identifiers":["__stripped__"]},"operands":{"distinct":8,"total":13,"identifiers":["__stripped__"]},"length":21,"vocabulary":13,"difficulty":4.0625,"volume":77.70923408096293,"effort":315.6937634539119,"bugs":0.025903078026987644,"time":17.538542414106217},"params":2}},{"name":"<anonymous>","line":204,"complexity":{"sloc":{"physical":9,"logical":5},"cyclomatic":3,"halstead":{"operators":{"distinct":4,"total":8,"identifiers":["__stripped__"]},"operands":{"distinct":6,"total":12,"identifiers":["__stripped__"]},"length":20,"vocabulary":10,"difficulty":4,"volume":66.43856189774725,"effort":265.754247590989,"bugs":0.02214618729924908,"time":14.764124866166055},"params":2}},{"name":"<anonymous>.locked","line":234,"complexity":{"sloc":{"physical":13,"logical":3},"cyclomatic":1,"halstead":{"operators":{"distinct":5,"total":8,"identifiers":["__stripped__"]},"operands":{"distinct":8,"total":12,"identifiers":["__stripped__"]},"length":20,"vocabulary":13,"difficulty":3.75,"volume":74.00879436282185,"effort":277.5329788605819,"bugs":0.024669598120940616,"time":15.418498825587884},"params":2}},{"name":"<anonymous>","line":236,"complexity":{"sloc":{"physical":9,"logical":5},"cyclomatic":3,"halstead":{"operators":{"distinct":4,"total":8,"identifiers":["__stripped__"]},"operands":{"distinct":7,"total":13,"identifiers":["__stripped__"]},"length":21,"vocabulary":11,"difficulty":3.7142857142857144,"volume":72.64806399138325,"effort":269.83566625370923,"bugs":0.024216021330461083,"time":14.990870347428292},"params":2}}],"maintainability":67.66111723038881,"params":2.1538461538461537,"module":"reliable/redis-reliable-locker.js"},"jshint":{"messages":[]}}