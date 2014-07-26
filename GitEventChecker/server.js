'use strict';

var gith = require('gith').create(9001);
var winston = require('winston');

gith({
	repo: 'proxyer/LiveUpdater'
}).on('all', function (payload) {
	winston.debug(payload);
});