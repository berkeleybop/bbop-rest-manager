////
//// Some unit testing for package bbop-rest-manager.
////

var chai = require('chai');
chai.config.includeStack = true;
var assert = chai.assert;
var managers = require('..');

var manager_base = managers.base;
var manager_node = managers.node;

// Correct environment, ready testing.
var bbop = require('bbop-core');
var response_base = require('bbop-rest-response').base;
var response_json = require('bbop-rest-response').json;

///
/// Start unit testing.
///

describe('bbop-rest-manager#base + bbop-rest-response#basae', function(){

    it('basic', function(){

	// 
	var str = '';
	var m = new manager_base(response_base);
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

describe('bbop-rest-manager#base + bbop-rest-response#json', function(){
    
    it('basic', function(){
	
	var j1 = '{"foo": {"bar": 1}}';
	var j2 = '{"foo": {"bar": 2}}';
	
	// 
	var total = 0;
	var m = new manager_base(response_json);
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

describe('bbop-rest-manager#node + bbop-rest-response#json', function(){
    
    it('basic successful async callback', function(){
	
	var target = 'http://amigo.geneontology.org/amigo/term/GO:0022008/json';
     
	var m = new manager_node(response_json);
	m.register('success', function(resp, man){
	    var type = resp.raw()['type'];
	    assert.equal(type, 'term', 'success callback');
	});
	m.register('error', function(resp, man){
	    assert.equal(true, false, 'error callback is not expected');
	});	    
	var qurl = m.action(target);
	
    });

    it('basic error async callback', function(){
	
	// Remote 500 error.
	var target = 'http://amigo.geneontology.org/amigo/term/GO:0022008/jso';
     
	var m = new manager_node(response_json);
	m.register('success', function(resp, man){
	    var type = resp.raw()['type'];
	    assert.equal(true, false, 'success callback is nit expected');
	});
	m.register('error', function(resp, man){
	    assert.equal(true, true, 'successful failure');
	});	    
	var qurl = m.action(target);
	
    });
});
