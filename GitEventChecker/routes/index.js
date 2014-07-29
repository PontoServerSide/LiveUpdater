var express = require('express'),
	router = express.Router(),
	net = require('net'),
	winston = require('winston'),
	fs = require('fs');

function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function() {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function() {
            return index - 1;
        },

        break: function() {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}

var stopServer = function (sock, backend, frontend, callback) {
	var now = new Date();
	winston.info('['+now.toLocaleTimeString()+'] Send command to '+backend+'/'+frontend);

	if (!sock.write('disable server '+backend+'/'+frontend+'\r\n')) {
		// if something wrong to write through socket
		return callback(new Error('Can not send command to HAProxy'));
	}

	// when the response arrived
	sock.on('data', function (data) {
		var strData = data.toString();

		if (strData.match(/\n/)) {
			var now = new Date();
			winston.info('['+now.toLocaleTimeString()+'] '+backend+'/'+frontend+' stopped');
			return callback(null);
		}else {
			return callback(new Error('Disable server failed'));
		}
	});

	sock.on('error', function (error) {
		winston.error(error.toString());
	});

	sock.on('end', function () {
		winston.info('arrived here');
	});
};

var waitResponse = function (host, port, callback) {
	var server = net.createServer();

	// wait client response
	server.on('listening', function () {
		winston.debug('Waiting client response IP:'+host+' PORT'+port);
	});

	server.on('connection', function (socket) {
		winston.debug('Connection established with client');

		// DO SOMETHING WITH CLIENT

		server.close();
	});

	server.on('close', function () {
		winston.debug('Connection with client ended');
		callback(null);
	});

	server.on('error', function (error) {
		callback(error);
	});

	server.listen(port, host);
};

var isFineToStop = function (server) {
	return !(server.status === 'MAINT' || 
			 server.svname === 'BACKEND' || 
			 server.svname === 'FRONTEND' || 
			 server.svname === undefined);
};

router.post('/', function(req, res) {
	// console.log(req.body);
	// you can get commit information from request body
	
	var turnoffCnt = 0;

	if (global.haproxyStat.length !== 0) {
		// start stopping servers
		try{
			asyncLoop(global.haproxyStat.length, function(loop) {
				var idx = loop.iteration();
				var server = global.haproxyStat[idx];

				// check the server status
				if(isFineToStop(server)) {
					var client = net.createConnection(socketPath);

					client.on('connect', function () {
						stopServer(client, server['# pxname'],server['svname'],function(error) {
							if (error) {
								throw error;
							}
							client.destroy();
							loop.next();
						});

						client.on('error', function (error) {
							winston.error(error);
						});
					});
				}else {
					loop.next();
				}
			},
			function () {
				// end of loop
			});
		}
		catch(err) {
			// when an error occured, destory connection and show error message
			winston.error(err.toString());
			client.destroy();
		}
	}else {
		winston.warn('No valid HAProxy status');
	}

	return res.send('complete');
});

module.exports = router;
