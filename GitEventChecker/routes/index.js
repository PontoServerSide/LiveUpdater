var express = require('express'),
	router = express.Router(),
	net = require('net'),
	fs = require('fs');


/* GET home page. */
router.post('/', function(req, res) {
	// console.log(req.body);
	// you can get commit information from request body

	var client = net.createConnection(socketPath);

	client.on('connect', function () {
		console.log('check connection');

		var turnoffCnt = 0;

		if (haproxyStat !== null) {
			
			

			for(var j=0; j<servers.count; j++) {
				var min = null;
				for(var i=0; i<haproxyStat.length; i++) {
					var status = haproxyStat[i];

					if (status.svname !== 'FRONTEND' && status.svname !== 'BACKEND') {

						if (min === null || status.scur < min.scur) {
							min = status;
						}
					}
				}

				if (min === null) {
					console.error('Server list is not valid');
					return;
				}else {
					var writeResult = client.write('disable server '+min['# pxname']+'/'+min['svname']+'\r\n');
				}
			}

			
		}

		client.on('data', function (data) {
			if (data === '\r\n') {
				turnoffCnt++;
			}else {
				console.error('Disable server failed');
				return;
			}
		});

		client.on('error', function (error) {
			console.log('Error Connection: '+error);
		});
	});

	res.send('complete');
});

module.exports = router;
