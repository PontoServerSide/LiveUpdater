'use strict';

var gith = require('gith').create(9001);

gith().on('all', function (payload) {
	console.log(payload);
});