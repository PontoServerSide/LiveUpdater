'use strict';

var gith = require('gith').create();

gith({
	repo: 'proxyer/LiveUpdater',
	branch: 'develop'
}).on('all', function (payload) {
	console.log(payload);
});

gith.listen(9001);