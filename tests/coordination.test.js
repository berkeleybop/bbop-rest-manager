////
//// Some unit testing for coordination functions.
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

// Correct environment, ready testing.
var bbop = require('bbop-core');
var response_base = require('bbop-rest-response').base;
var response_json = require('bbop-rest-response').json;

// Standard test parameters.
var start_port = 3344;
var target = 'http://localhost:' + start_port.toString();

var test_server = null;
before(function(done){

    //console.log('Starting test-server.js, with pid: ' + test_server.pid);
    console.log('Starting test-server.js...');

    // Spawn the test server (necessary because if we have it in here,
    // sync-request will block it too, leading to a deadlock) and give
    // in a second to start functioning.
    var spawn = require('child_process').spawn;
    test_server = spawn('node', ['./scripts/test-server.js']);
    var sleep = require('sleep').sleep(1);
    //test_server.stdin.end();    

    test_server.on('err', function(err){
	console.log('test-server.js failed with error: ', err);
    });
    test_server.on('exit', function(code, signal){
	//console.log('test-server.js exitted (with signal ' + signal + ')');
    });
    test_server.on('close', function(code, signal){
	console.log('test-server.js closed (by signal ' + signal + ')');
    });

    done();
});

after(function(done){
    if( test_server ){
	test_server.kill('SIGHUP');
    }
    done();
});

///
/// Start unit testing.
///

describe('node + json + coordination', function(){

    it('make things work in the best case', function(done){

    	// We want q=foo
    	var path = '/';
    	var meth = 'GET';
	
    	var m = new manager_node(response_json);

	// Define three promise producing functions.
	function f1(){
    	    return m.start(target + path, {'q': 'f1'}, meth);
	}
	function f2(){
    	    return m.start(target + path, {'q': 'f2'}, meth);
	}
	function f3(){
    	    return m.start(target + path, {'q': 'f3'}, meth);
	}

	var count = 0;
	var str ='';
	function acc_fun(resp, man){
	    // Get what we passed as an argument.
    	    var q = resp.raw()['q'];
	    count++;
	    str += q;
	}

	function fin_fun(man){
    	    assert.equal(count, 3, 'got three calls: ' + count);
    	    assert.equal(str, 'f1f2f3', 'ordered correctly: ' + str);
    	    done();
	}

	function err_fun(err, man){
    	    assert.isTrue(false, 'died on error');
    	    done();
	}

	// Run.
	m.run_promise_functions([f1, f2, f3], acc_fun, fin_fun, err_fun);

    });

    it('breaking stuff, trigger error', function(done){

    	// We want q=foo
    	var path = '/';
    	var meth = 'GET';
	
    	var m = new manager_node(response_json);

	// Define three promise producing functions.
	function f1(){
    	    return m.start(target + path, {'q': 'f1'}, meth);
	}
	function f2(){
    	    return m.start(target + path, {'q': 'f2'}, meth);
	}
	function f3(){
    	    return m.start(target + path, {'q': 'f3'}, meth);
	}

	var count = 0;
	var str ='';
	function acc_fun(resp, man){
	    // Get what we passed as an argument.
    	    var q = resp.raw()['q'];
	    count++;
	    str += q;
	    throw new Error('NYO!');
	}

	function fin_fun(man){
	    // Should never get here.
	    assert.isTrue(false, 'should never be in final function');
    	    done();
	}

	function err_fun(err, man){
    	    assert.equal('Error: NYO!', err.toString(), 'caught error');
	    //console.log(err);
    	    done();
	}

	// Run.
	m.run_promise_functions([f1, f2, f3], acc_fun, fin_fun, err_fun);

    });

});

