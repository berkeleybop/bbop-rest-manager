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

// For engines.
var Q = require('q');
var querystring = require('querystring');
var jQuery = require('jquery');
var sync_request = require('sync-request');

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
    this._qmethod = 'GET';

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

    // Ensure the necessary 
    this._ensure_arguments = function (url, payload, method){
	ll('ensure arguments...');
	
	// Allow default settings to be set at the moment.
	if( typeof(url) !== 'undefined' ){ this.resource(url); }
	if( typeof(payload) !== 'undefined' ){ this.payload(payload); }
	if( typeof(method) !== 'undefined' ){ this.method(method); }
	
	// Bail if no good resource to try.
	if( ! this.resource() ){
	    throw new Error('must have resource defined');
	}
    };

    // Apply the callbacks by the status of the response.
    this._apply_callbacks_by_response = function (response){
	ll('apply callbacks by response...');

	if( response && response.okay() ){
	    anchor.apply_callbacks('success', [response, anchor]);
	}else{
	    anchor.apply_callbacks('error', [response, anchor]);
	}
    };

    /**
     * The base target URL for our operations.
     * 
     * @param {String} [in_url] - update resource target with string
     * @returns {String|null} the url as string (or null)
     */
    this.resource = function(in_url){
	ll('resource called with: ' + in_url);

	if( typeof(in_url) !== 'undefined' && 
	    bbop.what_is(in_url) === 'string' ){
	    anchor._qurl = in_url;
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
	ll('payload called with: ' + payload);

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
	ll('method called with: ' + method);

	if( bbop.is_defined(method) && 
	    bbop.what_is(method) === 'string' ){
	    anchor._qmethod = method;
	}
	return anchor._qmethod;
    };
}
bbop.extend(manager_base, registry);

///
/// Overridables.
///

/**
 * Output writer for this object/class.
 * See the documentation in <core.js> on <dump> and <to_string>.
 * 
 * @returns {String}  string
 */
manager_base.prototype.to_string = function(){
    return '[' + this._is_a + ']';
};

/**
 * Assemble the resource and arguments into a URL string.
 * 
 * May not be appropriate for all subclasses or commands (and probably
 * only useful in the context of GET calls, etc.). Often used as a
 * helper, etc.
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
 * It should combine the URL, payload, and method in the ways
 * appropriate to the subclass engine.
 * 
 * This model class always returns true, with set messages; the
 * "payload" is fed as the argument into the response handler.
 * 
 * What we're aiming for is a system that:
 *  - runs callbacks (in order: success, error, return)
 *  - return response
 * 
 * @param {String} [url] - update resource target with string
 * @param {Object} [payload] - object to represent arguments
 * @param {String} [method - GET, POST, etc.
 * @returns {Object} response (given the incoming payload)
 */
manager_base.prototype.fetch = function(url, payload, method){

    var anchor = this;
    anchor._logger.kvetch('called fetch');

    this._ensure_arguments(url, payload, method);

    // This is an empty "sync" example, so just return the empty and
    // see.
    var response = new this._response_handler(this.payload());
    response.okay(true);
    response.message('empty');
    response.message_type('success');
    
    // Run through the callbacks--naturally always "success" in our
    // case.
    this._apply_callbacks_by_response(response);

    return response;
};

/**
 * It should combine the URL, payload, and method in the ways
 * appropriate to the subclass engine.
 * 
 * This model class always returns true, with set messages; the
 * "payload" is fed as the argument into the response handler.
 * 
 * What we're aiming for is a system that:
 *  - runs callbacks (in order: success, error, return)
 *  - return promise (delivering response)
 * 
 * @param {String} [url] - update resource target with string
 * @param {Object} [payload] - object to represent arguments
 * @param {String} [method - GET, POST, etc.
 * @returns {Object} promise for the processed response subclass
 */
manager_base.prototype.start = function(url, payload, method){

    var anchor = this;
    this._ensure_arguments(url, payload, method);

    // No actual async here, but do anyways.
    var deferred = Q.defer();

    // This is an empty "sync" example, so just return the empty and
    // see.
    var response = new this._response_handler(this.payload());
    response.okay(true);
    response.message('empty');
    response.message_type('success');
    
    // Run through the callbacks--naturally always "success" in our
    // case.
    this._apply_callbacks_by_response(response);

    deferred.resolve(response);

    return deferred.promise;
};

///
/// Node async engine.
///

/**
 * Contructor for the REST query manager; NodeJS-style.
 * 
 * This is an asynchronous engine, so while both fetch and start will
 * run the callbacks, fetch will return null while start returns a
 * promise for the eventual result. Using the promise is entirely
 * optional--the main method is still considered to be the callbacks.
 * 
 * NodeJS BBOP manager for dealing with remote calls. Remember,
 * this is actually a "subclass" of <bbop.rest.manager>.
 * 
 * See also: {module:bbop-rest-manager#manager}
 *
 * @constructor
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
 * It should combine the URL, payload, and method in the ways
 * appropriate to the subclass engine.
 *
 * Runs callbacks, returns null.
 * 
 * @param {String} [url] - update resource target with string
 * @param {Object} [payload] - object to represent arguments
 * @param {String} [method - GET, POST, etc.
 * @returns {null} returns null
 */
manager_node.prototype.fetch = function(url, payload, method){

    var anchor = this;
    anchor._logger.kvetch('called fetch');

    // Pass off.
    this.start(url, payload, method);

    return null;
};

/**
 * It should combine the URL, payload, and method in the ways
 * appropriate to the subclass engine.
 * 
 * What we're aiming for is a system that:
 *  - runs callbacks (in order: success, error, return)
 *  - return promise (delivering response)
 * 
 * @param {String} [url] - update resource target with string
 * @param {Object} [payload] - object to represent arguments
 * @param {String} [method - GET, POST, etc.
 * @returns {Object} promise for the processed response subclass
 */
manager_node.prototype.start = function(url, payload, method){

    var anchor = this;

    this._ensure_arguments(url, payload, method);

    // Our eventual promise.
    var deferred = Q.defer();

    // What to do if an error is triggered.
    function on_error(e) {
	console.log('problem with request: ' + e.message);
	var response = new anchor._response_handler(null);
	response.okay(false);
	response.message(e.message);
	response.message_type('error');
	anchor.apply_callbacks('error', [response, anchor]);
	deferred.resolve(response);
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
		deferred.resolve(response);
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
		deferred.resolve(response);
	    }
	});
    }

    // http://nodejs.org/api/url.html
    var purl = anchor._url_parser.parse(anchor.resource());
    var req_opts = {
    	//'hostname': anchor.resource(),
    	//'path': '/amigo/term/GO:0022008/json',
	//'port': 80,
	'method': anchor.method()
    };
    // Tranfer the interesting bit over.
    each(['protocol', 'hostname', 'port', 'path'], function(purl_prop){
    	if( purl[purl_prop] ){
    	    req_opts[purl_prop] = purl[purl_prop];
    	}
    });

    // Add any payload if it exists. On an empty payload, post_data
    // will still be '', so no real harm done.
    var post_data = querystring.stringify(anchor.payload());
    req_opts['headers'] = {
	'Content-Type': 'application/x-www-form-urlencoded',
	'Content-Length': post_data.length
    };

    //console.log('req_opts', req_opts);

    var req = anchor._http_client.request(req_opts, on_connect);

    // Oh yeah, add the error responder.
    req.on('error', on_error);
    
    // Write data to request body.
    req.write(post_data);
    req.end();
    
    return deferred.promise;
};

///
/// Node sync engine.
///

/**
 * Contructor for the REST query manager--synchronous in node.
 * 
 * This is an synchronous engine, so while both fetch and start will
 * run the callbacks, fetch will return a response while start returns
 * an instantly resolvable promise. Using the response results is
 * entirely optional--the main method is still considered to be the
 * callbacks.
 * 
 * See also: <bbop.rest.manager>
 * 
 * @constructor
 * @param {Object} response_handler
 * @returns {manager_node_sync}
  */
var manager_node_sync = function(response_handler){
    manager_base.call(this, response_handler);
    this._is_a = 'bbop-rest-manager.node_sync';
};
bbop.extend(manager_node_sync, manager_base);

/**
 * It should combine the URL, payload, and method in the ways
 * appropriate to the subclass engine.
 * 
 * @param {String} [url] - update resource target with string
 * @param {Object} [payload] - object to represent arguments
 * @param {String} [method - GET, POST, etc.
 * @returns {Object} returns response
 */
manager_node_sync.prototype.fetch = function(url, payload, method){
    var anchor = this;

    this._ensure_arguments(url, payload, method);

    // Grab the data from the server.
    var res = null;
    try {
	res = sync_request(anchor.method(), anchor.resource(), anchor.payload());
    }
    catch(e){
	console.log('ERROR in node_sync call, will try to recover');
    }
    
    //
    var raw_str = null;
    if( res && res.statusCode < 400 ){
	raw_str = res.getBody().toString();
    }else if( res && res.body ){
	raw_str = res.body.toString();
    }else{
	//
    }

    // Process and pick the right callback group accordingly.
    var response = null;
    if( raw_str && raw_str !== '' && res.statusCode < 400 ){
	response = new anchor._response_handler(raw_str);
	this.apply_callbacks('success', [response, anchor]);
    }else{
	response = new anchor._response_handler(null);
	this.apply_callbacks('error', [response, anchor]);
	//throw new Error('explody');
    }

    return response;
};

/**
 * This is the synchronous data getter for Node (and technically the
 * browser, but never never do that)--probably your best bet right now
 * for scripting.
 * 
 * Works as fetch, except returns an (already resolved) promise.
 * 
 * @param {String} [url] - update resource target with string
 * @param {Object} [payload] - object to represent arguments
 * @param {String} [method - GET, POST, etc.
 * @returns {Object} returns promise
 */
manager_node_sync.prototype.start = function(url, payload, method){
    var anchor = this;

    var response = anchor.fetch(url, payload, method);

    // .
    var deferred = Q.defer();
    deferred.resolve(response);
    return deferred.promise;
};

///
/// jQuery engine.
///

/**
 * Contructor for the jQuery REST manager
 * 
 * jQuery BBOP manager for dealing with actual ajax calls. Remember,
 * this is actually a "subclass" of {bbop-rest-manager}.
 * 
 * Use <use_jsonp> is you are working against a JSONP service instead
 * of a non-cross-site JSON service.
 * 
 * See also:
 *  <bbop.rest.manager>
 *
 * @constructor
 * @param {Object} response_handler
 * @returns {manager_node_sync}
 */
var manager_jquery = function(response_handler){
    manager_base.call(this, response_handler);
    this._is_a = 'bbop-rest-manager.jquery';

    this._use_jsonp = false;
    this._jsonp_callback = 'json.wrf';
    this._headers = null;
    
    // Track down and try jQuery.
    var anchor = this;
    //anchor.JQ = new bbop.rest.manager.jquery_faux_ajax();
    try{ // some interpreters might not like this kind of probing
    	if( typeof(jQuery) !== 'undefined' ){
    	    anchor.JQ = jQuery;
    	    //anchor.JQ = jQuery.noConflict();
    	}
    }catch (x){
	throw new Error('unable to find "jQuery" in the environment');
    }
};
bbop.extend(manager_jquery, manager_base);

/**
 * Set the jQuery engine to use JSONP handling instead of the default
 * JSON. If set, the callback function to use will be given my the
 * argument "json.wrf" (like Solr), so consider that special.
 * 
 * @param {Boolean} [use_p] - external setter for 
 * @returns {Boolean} boolean
 */
manager_jquery.prototype.use_jsonp = function(use_p){
    var anchor = this;
    if( typeof(use_p) !== 'undefined' ){
	if( use_p === true || use_p === false ){
	    anchor._use_jsonp = use_p;
	}
    }
    return anchor._use_jsonp;
};

/**
 * Get/set the jQuery jsonp callback string to something other than
 * "json.wrf".
 * 
 * @param {String} [cstring] - setter string
 * @returns {String} string
 */
manager_jquery.prototype.jsonp_callback = function(cstring){
    var anchor = this;
    if( typeof(cstring) !== 'undefined'  ){
	anchor._jsonp_callback = cstring;
    }
    return anchor._jsonp_callback;
};

/**
 * Try and control the server with the headers.
 * 
 * @param {Object} [header_set] - hash of headers; jQuery internal default
 * @returns {Object} hash of headers
 */
manager_jquery.prototype.headers = function(header_set){
    var anchor = this;
    if( typeof(header_set) !== 'undefined' ){
	anchor._headers = header_set;
    }
    return anchor._headers;
};

/**
 * It should combine the URL, payload, and method in the ways
 * appropriate to the subclass engine.
 *
 * Runs callbacks, returns null.
 * 
 * @param {String} [url] - update resource target with string
 * @param {Object} [payload] - object to represent arguments
 * @param {String} [method - GET, POST, etc.
 * @returns {null} returns null
 */
manager_jquery.prototype.fetch = function(url, payload, method){

    var anchor = this;
    anchor._logger.kvetch('called fetch');

    // Pass off.
    anchor.start(url, payload, method);

    return null;
};

/**
 * See the documentation in <manager.js> on update to get more
 * of the story. This override function adds functionality for
 * jQuery.
 * 
 * @param {String} [url] - update resource target with string
 * @param {Object} [payload] - object to represent arguments
 * @param {String} [method - GET, POST, etc.
 * @returns {Object} promise for the processed response subclass
 */
manager_jquery.prototype.start = function(url, payload, method){

    var anchor = this;
    
    this._ensure_arguments(url, payload, method);

    // Our eventual promise.
    var deferred = Q.defer();

    // URL and payload (jQuery will just append as arg for GETs).
    var qurl = anchor.resource();
    var pl = anchor.payload();

    // The base jQuery Ajax args we need with the setup we have.
    var jq_vars = {
    	url: qurl,
	data: pl,
    	dataType: 'json',
	headers: {
	    "Content-Type": "application/javascript",
	    "Accept": "application/javascript"
	},
    	type: anchor.method()
    };

    // If we're going to use JSONP instead of the defaults, set that now.
    if( anchor.use_jsonp() ){
	jq_vars['dataType'] = 'jsonp';
	jq_vars['jsonp'] = anchor._jsonp_callback;
    }
    if( anchor.headers() ){
    	jq_vars['headers'] = anchor.headers();
    }

    // What to do if an error is triggered.
    // Remember that with jQuery, when using JSONP, there is no error.
    function on_error(xhr, status, error) {
	var response = new anchor._response_handler(null);
	response.okay(false);
	response.message(error);
	response.message_type(status);
	anchor.apply_callbacks('error', [response, anchor]);
	deferred.resolve(response);
    }

    function on_success(raw_data, status, xhr){
	var response = new anchor._response_handler(raw_data);
	if( response && response.okay() ){
	    anchor.apply_callbacks('success', [response, anchor]);
	    deferred.resolve(response);
	}else{
	    // Make sure that there is something there to
	    // hold on to.
	    if( ! response ){
		response = new anchor._response_handler(null);
		response.okay(false);
		response.message_type(status);
		response.message('null response');
	    }else{
		response.message_type(status);
		response.message('bad response');
	    }
	    //anchor.apply_callbacks('error', [response, anchor]);
	    //anchor.apply_callbacks('error', [raw_data, anchor]);
	    anchor.apply_callbacks('error', [response, anchor]);
	    deferred.resolve(response);
	}
    }

    // Setup JSONP for Solr and jQuery ajax-specific parameters.
    jq_vars['success'] = on_success;
    jq_vars['error'] = on_error;
    //done: _callback_type_decider, // decide & run search or reset
    //fail: _run_error_callbacks, // run error callbacks
    //always: function(){} // do I need this?
    anchor.JQ.ajax(jq_vars);

    return deferred.promise;
};

///
/// Exportable body.
///

module.exports = {

    "base" : manager_base,
    "node" : manager_node,
    "node_sync" : manager_node_sync,
    "jquery" : manager_jquery

};
