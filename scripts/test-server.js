////
//// ...
////

// Standard test parameters.
var start_port = 3344;
var target = 'http://localhost:' + start_port.toString();

// Server to test against.
var express = require('express');
var body_parser = require('body-parser');
var server = null;
var app = null;
//

function ll(req){
    console.log("req", req);
};

//
app = express();
app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true }));
app.get('/error', function(req, res) {
    //ll(req);
    var q = null;
    if( req && req.query && req.query['q'] ){ q = req.query['q']; }
    res.status(500);
    res.send({'text': 'error','q': q,'method': 'GET'});
});
app.get('/', function(req, res) {
    //ll(req);
    var q = null;
    if( req && req.query && req.query['q'] ){ q = req.query['q']; }
    res.send({'text': 'hello world','q': q,'method': 'GET'});
});
app.post('/', function(req, res) {
    //ll(req);
    var q = null;
    if( req && req.body && req.body['q'] ){ q = req.body['q']; }
    res.send({'text': 'hello world','q': q,'method': 'POST'});
});
server = app.listen(start_port);
