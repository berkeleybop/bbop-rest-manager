////
//// Some unit testing for package bbop-rest-manager.
////

var chai = require('chai');
chai.config.includeStack = true;
var assert = chai.assert;
var manager = require('..');

// Correct environment, ready testing.
var bbop = require('bbop-core');
var response = require('bbop-rest-response').base;
var response_json = require('bbop-rest-response').json;

///
/// Start unit testing.
///

describe('bbop-rest-manager + bbop-rest-response', function(){

    it('basic', function(){

	// 
	var str = '';
	var m = new manager(response);
	m.register('success', function(resp, man){
	    str += resp.raw();
	});
	m.resource('foo');
	m.action();
	assert.equal(str, 'foo', 'simple: round trip: foo');
	m.action();
	assert.equal(str, 'foofoo', 'simple: another round trip: foofoo');
	m.action('bar');
	assert.equal(str, 'foofoobar', 'simple: final trip: foofoobar');
	
	//
	m.payload({'a': 'b', 'c': 'd'});
	m.action('bar');
	assert.equal(str, 'foofoobarbar?a=b&c=d', 'plus payload');	
	
    });
});

describe('bbop-rest-manager + bbop-response-json', function(){
    
    it('basic', function(){
	
	var j1 = '{"foo": {"bar": 1}}';
	var j2 = '{"foo": {"bar": 2}}';
	
	// 
	var total = 0;
	var m = new manager(response_json);
	m.register('success', function(resp, man){
	    total += resp.raw()['foo']['bar'];
	});
	m.resource(j1);
	m.action();
	assert.equal(total, 1, 'json round trip: 1');
	m.action();
	assert.equal(total, 2, 'json another trip: 2');
	m.action(j2);
	assert.equal(total, 4, 'json another trip: 4');
	
    });
});
