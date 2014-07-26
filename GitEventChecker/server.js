'use strict';

var gith = require('gith').create(9001);

gith({
	repo: 'proxyer/LiveUpdater',
	branch: 'develop'
}).on('all', function (payload) {
	console.log('CHECK');
	console.log(payload);
});