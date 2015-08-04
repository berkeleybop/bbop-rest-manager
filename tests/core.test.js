////
//// Some unit testing for package bbop-rest-manager.
////

var chai = require('chai');
chai.config.includeStack = true;
var assert = chai.assert;
var managers = require('..');

var us = require('underscore');
var each = us.each;

var manager_base = managers.base;
var manager_node = managers.node;
var manager_sync_request = managers.sync_request;
var manager_jquery = managers.jquery;

// var manager_meta_list = [
//     {'name': 'node',
//      'object': manager_node,
//      'type': 'async'}, 
//     {'name': 'sync_request',
//      'object': manager_sync_request,
//      'type': 'sync'}, 
//     {'name': 'jquery',
//      'object': manager_jquery,
//      'type': 'async'}
// ];

// Correct environment, ready testing.
var bbop = require('bbop-core');
var response_base = require('bbop-rest-response').base;
var response_json = require('bbop-rest-response').json;

// Standard test parameters.
var start_port = 3344;
var target = 'http://localhost:' + start_port.toString();

///
/// Start unit testing.
///

// No test server.
describe('bbop-rest-manager#base + bbop-rest-response#base', function(){

    it('basic sync (watch callback)', function(){

	// 
	var str = '';
	var m = new manager_base(response_base);
	//m.debug(true);
	m.register('success', function(resp, man){
	    str = str + 'A';
	});
	m.resource('foo');

	m.fetch();
	assert.equal(str, 'A', 'simple: round trip: A');
	m.fetch();
	assert.equal(str, 'AA', 'simple: another round trip: AA');
    });

    it('basic sync (watch response)', function(){

	// 
	var str = '';
	var m = new manager_base(response_base);
	m.resource('foo');

	var r = m.fetch();
	assert.equal(r.okay(), true, 'resp okay');
	assert.equal(r.message_type(), 'success', 'resp message type');
	assert.equal(r.message(), 'empty', 'resp message');
    });

    it('basic async (watch callback)', function(){

	// 
	var str = '';
	var m = new manager_base(response_base);
	//m.debug(true);
	m.register('success', function(resp, man){
	    str = str + 'A';
	});
	m.resource('foo');

	m.start();
	assert.equal(str, 'A', 'simple: round trip: A');
	m.start();
	assert.equal(str, 'AA', 'simple: another round trip: AA');
    });

    it('basic async (watch promise)', function(){

	// 
	var str = '';
	var m = new manager_base(response_base);
	m.resource('foo');

	var d = m.start();
	d.then(function(r){
	    assert.equal(r.okay(), true, 'resp okay');
	    assert.equal(r.message_type(), 'success', 'resp message type');
	    assert.equal(r.message(), 'empty', 'resp message');
	}).done();
    });
});

describe('bbop-rest-manager#base + bbop-rest-response#json', function(){
    
    it('mostly just testing the response here, tested manager above', function(){
	
	// 
	var total = 0;
	var m = new manager_base(response_json);
	//m.debug(true);
	m.register('success', function(resp, man){
	    //console.log('rr', resp.raw());
	    total += resp.raw()['foo']['bar'];
	});

	m.start('foo', {"foo": {"bar": 1}});
	assert.equal(total, 1, 'json round trip: 1');
	m.start();
	assert.equal(total, 2, 'json another trip: 2');
	m.start('bar', {"foo": {"bar": 2}});
	assert.equal(total, 4, 'json another trip: 4');
	
    });
});

describe('bbop-rest-manager#node + bbop-rest-response#json', function(){
    
    it('basic successful async (callbacks)', function(done){
	
    	var path = '/';
     
    	var m = new manager_node(response_json);
    	m.register('success', function(resp, man){
    	    var text = resp.raw()['text'];
    	    assert.equal(text, 'hello world', 'success callback');
	    done();
    	});
    	m.register('error', function(resp, man){
    	    assert.equal(true, false, 'error callback is not expected');
	    done();
    	});	    
    	m.start(target + path);
    });

    it('basic successful async (promise)', function(done){
	
    	var path = '/';
	
    	var m = new manager_node(response_json);
    	var d = m.start(target + path);
    	d.then(function(resp){
    	    var text = resp.raw()['text'];
    	    assert.equal(text, 'hello world', 'success callback');
	    done();
    	}).done();
	
    });

    it('basic error async (callback)', function(done){
	
    	// Remote 500 error.
    	var path = '/error';
     
    	var m = new manager_node(response_json);
    	m.register('error', function(resp, man){
    	    assert.equal(true, true, 'successful failure');
	    done();
    	});	    
    	m.start(target + path);

    });

    it('basic error async (promise)', function(done){
	
    	var path = '/error';
	
    	var m = new manager_node(response_json);
    	var d = m.start(target + path);
    	d.then(function(resp){
	    //console.log(resp);
    	    assert.equal(resp.okay(), false, 'bad response promise');
	    done();
    	}).done();
	
    });

    it('see if we can actually supply payload arguments (GET)', function(done){

    	// We want q=foo
    	var path = '/';
    	var pay = {'q': 'foo'};
    	var meth = 'GET';
	
    	var m = new manager_node(response_json);
    	m.start(target + path, pay, meth).then(function(resp){
    	    //console.log('resp',resp);
    	    var q = resp.raw()['q'];
    	    assert.equal(q, 'foo', 'payload success for ' + meth);
    	    done();
    	}).done();
    });

    it('see if we can actually supply payload arguments (POST)', function(done){

    	// We want q=foo
    	var path = '/';
    	var pay = {'q': 'foo'};
    	var meth = 'POST';
	
    	var m = new manager_node(response_json);
    	m.start(target + path, pay, meth).then(function(resp){
    	    //console.log('resp',resp);
    	    var q = resp.raw()['q'];
    	    assert.equal(q, 'foo', 'payload success for ' + meth);
    	    done();
    	}).done();
    });

});

describe('bbop-rest-manager#sync_request + bbop-rest-response#json', function(){
    
    it('basic successful sync (direct reponse)', function(done){
	
    	var path = '/';
     
    	var m = new manager_sync_request(response_json);
    	var resp = m.fetch(target + path);
    	var text = resp.raw()['text'];
    	assert.equal(text, 'hello world', 'success callback');
	done();
    });

    it('basic successful sync (callback)', function(done){
	
    	var path = '/';
     
    	var m = new manager_sync_request(response_json);
    	m.register('success', function(resp, man){
    	    var text = resp.raw()['text'];
    	    assert.equal(text, 'hello world', 'success callback');
	    done();
    	});
    	m.register('error', function(resp, man){
    	    assert.equal(true, false, 'error callback is not expected');
	    done();
    	});	    
    	var qurl = m.fetch(target + path);
	
    });

    it('basic error sync (callback)', function(done){
	
    	// Remote 500 error.
	var path = '/error';
     
    	var m = new manager_sync_request(response_json);
    	m.register('success', function(resp, man){
    	    assert.equal(true, false, 'syncr success callback is not expected');
	    done();
    	});
    	m.register('error', function(resp, man){
    	    assert.equal(true, true, 'successful failure');
	    done();
    	});	    
    	m.fetch(target + path);
    });

    it('basic success sync (instant deferred)', function(done){
	
	var path = '/';
     
    	var m = new manager_sync_request(response_json);
    	m.start(target + path).then(function(resp){
    	    var text = resp.raw()['text'];
    	    assert.equal(text, 'hello world', 'success callback not expected');
	    done();
	}).done();
    });

    it('see if we can actually supply payload arguments (GET)', function(done){

    	// We want q=foo
	var path = '/';
	var pay = {'q': 'foo'};
	var meth = 'GET';
	
    	var m = new manager_sync_request(response_json);
    	m.start(target + path, pay, meth).then(function(resp){
	    //console.log('resp',resp);
    	    var q = resp.raw()['q'];
    	    assert.equal(q, 'foo', 'payload success for ' + meth);
	    done();
    	}).done();
    });

    it('see if we can actually supply payload arguments (POST)', function(done){

    	// We want q=foo
	var path = '/';
	var pay = {'q': 'foo'};
	var meth = 'POST';
	
    	var m = new manager_sync_request(response_json);
    	m.start(target + path, pay, meth).then(function(resp){
	    //console.log('resp',resp);
    	    var q = resp.raw()['q'];
    	    assert.equal(q, 'foo', 'payload success for ' + meth);
	    done();
    	}).done();
    });

});

describe('bbop-rest-manager#jquery + bbop-rest-response#json', function(){

    var mock_jQuery = null;
    before(function(){
	// Modify the manager into functioning--will need this to get
	// tests working for jQuery in this environment.
	var domino = require('domino');
	mock_jQuery = require('jquery')(domino.createWindow());
	var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
	mock_jQuery.support.cors = true;
	mock_jQuery.ajaxSettings.xhr = function() {
	    return new XMLHttpRequest();
	};
    });

    it('test out mock jquery call with callback', function(done){
	
	var path = '/';
     
	// Goose jQuery into functioning here.
    	var m = new manager_jquery(response_json);
	m.JQ = mock_jQuery;

    	m.register('success', function(resp, man){
    	    var text = resp.raw()['text'];
    	    assert.equal(text, 'hello world', 'successful failure');
	    done();
    	});
    	m.register('error', function(resp, man){
    	    assert.equal(true, false, 'jquery success callback is not expected');
	    done();
    	});	    
    	m.start(target + path);

    });

    it('test out mock jquery call with promise', function(done){
	
	var path = '/';
     
	// Goose jQuery into functioning here.
    	var m = new manager_jquery(response_json);
	m.JQ = mock_jQuery;

	// Try it out.
    	m.start(target + path).then(function(resp){
    	    var text = resp.raw()['text'];
    	    assert.equal(text, 'hello world', 'success callback not expected');
	    done();
	}).done();

    });

    it('see if we can actually supply payload arguments (GET)', function(done){

    	// We want q=foo
    	var path = '/';
    	var pay = {'q': 'foo'};
    	var meth = 'GET';
	
    	var m = new manager_jquery(response_json);
	m.JQ = mock_jQuery;

    	m.start(target + path, pay, meth).then(function(resp){
    	    //console.log('resp',resp);
    	    var q = resp.raw()['q'];
    	    assert.equal(q, 'foo', 'payload success for ' + meth);
    	    done();
    	}).done();
    });

    it('see if we can actually supply payload arguments (POST)', function(done){

    	// We want q=foo
    	var path = '/';
    	var pay = {'q': 'foo'};
    	var meth = 'POST';
	
    	var m = new manager_jquery(response_json);
	m.JQ = mock_jQuery;

    	m.start(target + path, pay, meth).then(function(resp){
    	    //console.log('resp',resp);
    	    var q = resp.raw()['q'];
    	    assert.equal(q, 'foo', 'payload success for ' + meth);
    	    done();
    	}).done();
    });

});
