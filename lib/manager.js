/** 
 * Generic BBOP manager for dealing with basic generic REST calls.
 * This specific one is designed to be overridden by its subclasses.
 * This one pretty much just uses its incoming resource string as the data.
 * Mostly for testing purposes.
 * 
 * Both a <bbop-rest-response> (or clean error data) and the manager
 * itself (this as anchor) should be passed to the callbacks.
 *
 * @module bbop-rest-manager
 */

// For base.
var us = require('underscore');
var each = us.each;
var bbop = require('bbop-core');
var registry = require('bbop-registry');

// For node engine.

///
/// Base class.
///

/**
 * Contructor for the REST manager.
 * 
 * See also: module:bbop-registry
 * 
 * @constructor
 * @param {Object} response_parser - the response handler class to use for each call
 * @returns {Object} rest manager object
 */
function manager_base(response_handler){
    registry.call(this, ['success', 'error']);
    this._is_a = 'bbop-rest-manager.base';

    // Get a good self-reference point.
    var anchor = this;

    // Per-manager logger.
    this._logger = new bbop.logger(this._is_a);
    //this._logger.DEBUG = true;
    this._logger.DEBUG = false;
    function ll(str){ anchor._logger.kvetch(str); }

    // Handler instance.
    this._response_handler = response_handler;

    // The URL to query.
    this._qurl = null;

    // The argument payload to deliver to the URL.
    this._qpayload = {};

    // The way to do the above.
    this._qmethod = null;

    // Whether or not to prevent ajax events from going.
    // This may not be usable, or applicable, to all backends.
    this._safety = false;

    /**
     * Turn on or off the verbose messages. Uses <bbop.logger>, so
     * they should come out everywhere.
     * 
     * @param {Boolean} [p] - true or false for debugging
     * @returns {Boolean} the current state of debugging
     */
    this.debug = function(p){
	if( p === true || p === false ){
	    this._logger.DEBUG = p;
	    // TODO: add debug parameter a la include_highlighting
	}
	return this._logger.DEBUG;
    };

    // The main callback function called after a successful AJAX call in
    // the update function.
    this._run_success_callbacks = function(in_data){
	ll('run success callbacks...');
	//var response = anchor.(in_data);
	var response = new anchor._response_handler(in_data);
	anchor.apply_callbacks('success', [response, anchor]);
    };

    // This set is called when we run into a problem.
    this._run_error_callbacks = function(in_data){
	ll('run error callbacks...');
	var response = new anchor._response_handler(in_data);
	anchor.apply_callbacks('error', [response, anchor]);
    };

    /**
     * The base target URL for our operations.
     * 
     * @param {String} [url] - update resource target with string
     * @returns {String|null} the url as string (or null)
     */
    this.resource = function(url){
	if( bbop.is_defined(url) && 
	    bbop.what_is(url) === 'string' ){
	    anchor._qurl = url;
	}
	return anchor._qurl;
    };

    /**
     * The information to deliver to the resource.
     * 
     * @param {Object} [payload] - update payload information
     * @returns {Object|null} a copy of the current payload
     */
    this.payload = function(payload){
	if( bbop.is_defined(payload) && 
	    bbop.what_is(payload) === 'object' ){
	    anchor._qpayload = payload;
	}
	return bbop.clone(anchor._qpayload);
    };

    /**
     * The method to use to get the resource, as a string.
     * 
     * @param {String} [method] - update aquisition method with string
     * @returns {String|null} the string or null
     */
    this.method = function(method){
	if( bbop.is_defined(method) && 
	    bbop.what_is(method) === 'string' ){
	    anchor._qmethod = method;
	}
	return anchor._qmethod;
    };

    /**
     * This method is the most fundamental operation. It should
     * combine the URL, payload, and method in the ways appropriate to
     * the subclass engine. This one merely combines the string.
     * 
     * The method argument is naturally ignored in this dummy class.
     * 
     * See also <update>.
     * 
     * @param {String} [url] - update resource target with string
     * @param {Object} [payload] - object to represent arguments
     * @param {String} [method - GET, POST, etc.
     * @returns {String} the combined URL argument as string
     */
    this.action = function(url, payload, method){
	if( bbop.is_defined(url) ){ anchor.resource(url); }
	if( bbop.is_defined(payload) ){ anchor.payload(payload); }
	if( bbop.is_defined(method) ){ anchor.method(method); }

	// Since there is no AJAX/REST in our case, we just loop back
	// with the argument string.
	if( bbop.is_defined(anchor.resource()) ){
	    return anchor.update('success');
	}else{
	    return anchor.update('error');
	}
    };
}
bbop.extend(manager_base, registry);

/**
 * Output writer for this object/class.
 * See the documentation in <core.js> on <dump> and <to_string>.
 * 
 * @returns {String}  string
 */
manager_base.prototype.to_string = function (){
    return '[' + this._is_a + ']';
};

/**
 * Assemble the resource and arguments into a URL string.
 * 
 * May not be appropriate for all subclasses. Often used as a helper,
 * etc.
 * 
 * Also see: <get_query_url>
 * 
 * @returns {String} url string
 */
manager_base.prototype.assemble = function(){

    // Conditional merging of the remaining variant parts.
    var qurl = this.resource();
    if( ! bbop.is_empty(this.payload()) ){
	var asm = bbop.get_assemble(this.payload());
	qurl = qurl + '?' + asm;
    }
    return qurl;
};

/**
 * The user code to select the type of update (and thus the type
 * of callbacks to be called on data return).
 * 
 * Also see: <get_query_url>
 * 
 * @param {String} callback_type - callback type string; 'success' and 'error' (see subclasses)
 * @returns {String} the query url
 */
manager_base.prototype.update = function(callback_type){

    // Conditional merging of the remaining variant parts.
    var qurl = this.resource();
    if( ! bbop.is_empty(this.payload()) ){
	var asm = bbop.get_assemble(this.payload());
	qurl = qurl + '?' + asm;
    }

    // Callbacks accordingly.
    if( callback_type === 'success' ){
	this._run_success_callbacks(qurl);
    }else if( callback_type === 'error' ){
	this._run_error_callbacks(qurl);
    }else{
    	throw new Error("Unknown callback_type: " + callback_type);
    }
    
    //ll('qurl: ' + qurl);
    return qurl;
};

///
/// Node async engine.
///

/**
 * Contructor for the REST query manager; NodeJS-style.
 * 
 * NodeJS BBOP manager for dealing with remote calls. Remember,
 * this is actually a "subclass" of <bbop.rest.manager>.
 * 
 * TODO/BUG: Does not handle "error" besides giving an "empty"
 * response.
 *
 * This assumes we're in a node environment so that the require
 * for commonjs is around.
 * 
 * See also: {module:bbop-rest-manager#manager}
 *
 * @param {Object} response_handler
 * @returns {manager_node}
 */
var manager_node = function(response_handler){
    manager_base.call(this, response_handler);
    this._is_a = 'bbop-rest-manager.node';

    // Grab an http client.
    this._http_client = require('http');
    this._url_parser = require('url');
};
bbop.extend(manager_node, manager_base);

/**
 * See the documentation in {module:bbop-rest-manager} on update to
 * get more of the story. This override function adds functionality to
 * NodeJS.
 *
 * @param {String} callback_type - callback type string (so far unused)
 * @returns {String} the query url (with any NodeJS specific parameters)
 */
manager_node.prototype.update = function(callback_type){

    var anchor = this;

    // What to do if an error is triggered.
    function on_error(e) {
	console.log('problem with request: ' + e.message);
	var response = new anchor._response_handler(null);
	response.okay(false);
	response.message(e.message);
	response.message_type('error');
	anchor.apply_callbacks('error', [response, anchor]);
    }

    // Two things to do here: 1) collect data and 2) what to do with
    // it when we're done (create response).
    function on_connect(res){
	//console.log('STATUS: ' + res.statusCode);
	//console.log('HEADERS: ' + JSON.stringify(res.headers));
	res.setEncoding('utf8');
	var raw_data = '';
	res.on('data', function (chunk) {
	    //console.log('BODY: ' + chunk);
	    raw_data = raw_data + chunk;
	});
	// Throw to .
	res.on('end', function () {
	    //console.log('END with: ' + raw_data);
	    var response = new anchor._response_handler(raw_data);
	    if( response && response.okay() ){
		anchor.apply_callbacks('success', [response, anchor]);
	    }else{
		// Make sure that there is something there to
		// hold on to.
		if( ! response ){
		    response = new anchor._response_handler(null);
		    response.okay(false);
		    response.message_type('error');
		    response.message('null response');
		}else{
		    response.message_type('error');
		    response.message('bad response');
		}
		anchor.apply_callbacks('error', [response, anchor]);
	    }
	});
    }

    // Conditional merging of the remaining variant parts.
    var qurl = this.resource();
    var args = '';
    if( ! us.isEmpty(this.payload()) ){
	var asm = bbop.get_assemble(this.payload());
	args = '?' + asm;
    }

    //qurl = 'http://amigo2.berkeleybop.org/cgi-bin/amigo2/amigo/term/GO:0022008/json';
    var final_url = qurl + args;

    // http://nodejs.org/api/url.html
    var purl = anchor._url_parser.parse(final_url);
    var req_opts = {
    	//'hostname': 'localhost',
    	//'path': '/cgi-bin/amigo2/amigo/term/GO:0022008/json',
	'port': 80,
	'method': 'GET'
    };
    // Tranfer the intersting bit over.
    each(['protocol', 'hostname', 'port', 'path'], function(purl_prop){
	if( purl[purl_prop] ){
	    req_opts[purl_prop] = purl[purl_prop];
	}
    });
    // And the method.
    var mth = anchor.method();
    if( mth && mth !=='get' ){
    	req_opts['method'] = mth;
    }
    var req = anchor._http_client.request(req_opts, on_connect);
    // var req = anchor._http_client.request(final_url, on_connect);

    req.on('error', on_error);
    
    // write data to request body
    //req.write('data\n');
    //req.write('data\n');
    req.end();
    
    return final_url;
};

///
///
///



///
/// Exportable body.
///

module.exports = {

    "base" : manager_base,
    "node" : manager_node    

};

