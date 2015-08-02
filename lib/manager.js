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
//var jQuery = require('jquery');
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
 * WARNING/BUG: this still tries to assemble the URL as a string and
 * does not create a proper POST.
 * 
 * While this engine will still do callbacks like normal, it will
 * return null.
 * 
 * @param {String} [url] - update resource target with string
 * @param {Object} [payload] - object to represent arguments
 * @param {String} [method - GET, POST, etc.
 * @returns {null} nothing, as this in an async engine
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
 * WARNING/BUG: this still tries to assemble the URL as a string and
 * does not create a proper POST.
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

    // Conditional merging of the remaining variant parts.
    var qurl = this.resource();
    var args = '';
    if( ! us.isEmpty(this.payload()) ){
	var asm = bbop.get_assemble(this.payload());
	args = '?' + asm;
    }

    //qurl = 'http://amigo.geneontology.org/amigo/term/GO:0022008/json';
    var final_url = qurl + args;

    // http://nodejs.org/api/url.html
    var purl = anchor._url_parser.parse(final_url);
    var req_opts = {
    	//'hostname': 'localhost',
    	//'path': '/amigo/term/GO:0022008/json',
	'port': 80,
	'method': anchor.method()
    };
    // Tranfer the interesting bit over.
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
    //console.log('req_opts', req_opts);
    var req = anchor._http_client.request(req_opts, on_connect);
    // var req = anchor._http_client.request(final_url, on_connect);

    req.on('error', on_error);
    
    // write data to request body
    //req.write('data\n');
    //req.write('data\n');
    req.end();
    
    return deferred.promise;
};

// ///
// /// Node sync engine.
// ///

// /**
//  * Contructor for the REST query manager; Rhino-style.
//  * 
//  * Be aware that this version is a synchronous call.
//  * 
//  * TODO/BUG: Does not handle "error" besides giving an "empty"
//  * response.
//  * 
//  * See also: <bbop.rest.manager>
//  * 
//  * @constructor
//  * @param {Object} response_handler
//  * @returns {manager_node_sync}
//   */
// var manager_node_sync = function(response_handler){
//     manager_base.call(this, response_handler);
//     this._is_a = 'bbop-rest-manager.node_sync';
// };
// bbop.extend(manager_node_sync, manager_base);

// /**
//  * See the documentation in {bbop-rest-manager} on update to get more
//  * of the story. This override function adds functionality for node
//  * using sync-request.
//  * 
//  * Also see: <fetch>
//  *
//  * Parameters: 
//  *  callback_type - callback type string
//  * Returns:
//  *  the query url (with any Rhino specific paramteters)
//  */
// manager_node_sync.prototype.update = function(callback_type){
//     var anchor = this;

//     // 
//     var qurl = this.assemble();

//     // Grab the data from the server.
//     var res = null;
//     try {
// 	res = sync_request('POST', qurl);
//     }
//     catch(e){
// 	console.log('ERROR in node_sync call, will try to recover');
//     }
    
//     //
//     var raw_str = null;
//     if( res && res.statusCode < 400 ){
// 	raw_str = res.getBody().toString();
//     }else if( res && res.body ){
// 	raw_str = res.body.toString();
//     }else{
// 	//
//     }

//     // Process and pick the right callback group accordingly.
//     var response = null;
//     if( raw_str && raw_str !== '' && res.statusCode < 400 ){
// 	response = new anchor._response_handler(raw_str);
// 	this.apply_callbacks(callback_type, [response, anchor]);
//     }else{
// 	response = new anchor._response_handler(null);
// 	this.apply_callbacks('error', [response, anchor]);
// 	//throw new Error('explody');
//     }

//     return qurl;
// };

// /**
//  * This is the synchronous data getter for Node (and technically the
//  * browser, but never never do that)--probably your best bet right now
//  * for scripting.
//  * 
//  * Also see: <update>
//  * 
//  * Parameters:
//  *  n/a 
//  * Returns:
//  *  a <bbop.rest.response> (or subclass) or null
//  */
// manager_node_sync.prototype.fetch = function(url, payload){
//     var anchor = this;

//     var retval = null;

//     // Update if necessary.
//     if( url ){ this.resource(url); }
//     if( payload ){ this.payload(payload); }

//     var qurl = this.assemble();
    
//     var res = null;
//     try {
// 	res = sync_request('POST', qurl);
//     }
//     catch(e){
// 	console.log('ERROR in node_sync call, will try to recover');
//     }
    
//     //
//     var raw_str = null;
//     if( res && res.statusCode < 400 ){
// 	raw_str = res.getBody().toString();
//     }else if( res && res.body ){
// 	raw_str = res.body.toString();
//     }else{
// 	//
//     }

//     // And pick the right callback group accordingly.
//     if( raw_str && raw_str !== '' && res.statusCode < 400 ){
// 	retval = new anchor._response_handler(raw_str);
//     }else{
// 	retval = new anchor._response_handler(null);
// 	//this.apply_callbacks('error', ['no data', this]);
// 	//throw new Error('explody');
//     }
    
//     return retval;
// };

///
/// TODO: jQuery engine.
///

//

///
/// Exportable body.
///

module.exports = {

    "base" : manager_base,
    "node" : manager_node//,
//    "node_sync" : manager_node_sync

};
