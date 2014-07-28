var express = require('express'),
	router = express.Router(),
	net = require('net'),
	fs = require('fs'),
	socketPath = '/tmp/haproxy';


/* GET home page. */
router.post('/', function(req, res) {
	// console.log(req.body);
	// you can get commit information from request body

	var client = net.createConnection(socketPath);

	client.on('connect', function () {
		console.log('check connection');

		var writeResult = client.write('show health');
		console.log(writeResult);
	});

	client.on('data', function (data) {
		console.log('read here');
		console.log('DATA: '+data);

		res.send('complete');
	});

	client.on('error', function (error) {
		console.log('Error Connection: '+error);

		res.send('complete');
	});
});

module.exports = router;
