var express = require('express');
var router = express.Router();

/* GET home page. */
router.post('/', function(req, res) {
	var param = JSON.parse(req.body.payload);
	console.log(param);

	res.send('complete');
});

module.exports = router;
