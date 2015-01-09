var amqp = require('amqp'),
	events = require( 'events' ),
	util = require( 'util' ),
	pckg = require( '../package.json' ),
	EXCHANGE_NAME = 'DEEPSTREAM_PUB_SUB';

/**
 * Connects deepstreams messaging to an AMQP broker (ActiveMQ, Qpid, HornetQ, RabbitMQ etc.)
 *
 * It's worth noting that deepstream uses a pub-sub message pattern whereas AMQP brokers are queue-based. This isn't
 * too much of a difference, but it means that some mapping between the concepts needs to occur.
 *
 * Deepstream creates a non-persistant queue per topic (RECORD, EVENT, RPC) and adds itself as a listener. Since the
 * topics are very coarse, a lot of messages will be send per queue.  If this leads to performance problems it might
 * make sense to break the topics down into more granular parts going forward, e.g. by introducing event and record name
 * spaces or by creating a queue per RPC, rather than a generic queue for all RPCs
 *
 * This connector uses the node amqp library (https://www.npmjs.com/package/amqp). Please consult its website for
 * configuration options
 *
 * @author Wolfram Hempel
 * @copyright 2015 Hoxton One Ltd.
 * 
 * @param {Object} config Connection configuration. Basically all options listed on https://www.npmjs.com/package/amqp plus serverName
 *
 * @constructor
 */
var AmqpConnector = function( config ) {
	this.isReady = false;
	this.name = pckg.name;
	this.version = pckg.version;
	this._sender = config.serverName || ( Math.random() * 10000000000000000000 ).toString( 36 );
	this._exchange = null;
	this._queues = {};
	this._messageEventEmitter = new events.EventEmitter();

	this._validateConfig( config );
	this._connection = amqp.createConnection( config );
	this._connection.on( 'ready', this._init.bind( this ) );
	this._connection.on( 'error', this._onError.bind( this ) );
	this._connection.on( 'close', this._onClose.bind( this ) );
};

util.inherits( AmqpConnector, events.EventEmitter );

/**
 * Removes a listener for a topic. If all listeners for the topic
 * are unsubscribed the client will unbind itself from the queue.
 *
 * If all clients have unbound itself from the queue, the queue
 * will be automatically deleted ( as specified by the autoDelete: true option )
 *
 * @param   {String}   topic
 * @param   {Function} callback
 *
 * @public
 * @returns {void}
 */
AmqpConnector.prototype.unsubscribe = function( topic, callback ) {
	this._messageEventEmitter.removeListener( topic, callback );

	if( this._messageEventEmitter.listeners( topic ).length === 0 ) {
		this._queues[ topic ].queue.unbind( EXCHANGE_NAME, topic );
		delete this._queues[ topic ];
	}
};

/**
 * Adds a listener for a topic.
 * 
 * If this is the first listener for the topic, a new queue will be
 * requested (or an existing one) and the client will bind itself as a listener to it
 *
 * @param   {String}   topic
 * @param   {Function} callback
 *
 * @public
 * @returns {void}
 */
AmqpConnector.prototype.subscribe = function( topic, callback ) {
	this._messageEventEmitter.on( topic, callback );

	if( this._queues[ topic ] ) {
		return;
	}

	var name = topic + '.' + this._sender,
		options = { autoDelete: true },
		callbackFn = this._onQueue.bind( this, topic );

	this._queues[ topic ] = { created: true };
	this._connection.queue( name, options, callbackFn );
};

/**
 * Publish a message on the queue.
 *
 * This implementation will add a senderId (_s) to the message
 * to filter out incoming messages that have been send by itself
 *
 * @param   {String}   topic
 * @param   {Object}   message
 *
 * @public
 * @returns {void}
 */
AmqpConnector.prototype.publish = function( topic, message ) {
	var stringifiedMessage;

	message._s = this._sender;

	try{
		stringifiedMessage = JSON.stringify( message );
	} catch( e ) {
		this.emit( 'error', e.toString() );
	}

	this._exchange.publish( topic, stringifiedMessage );
};

/**
 * Callback for established connections.
 *
 * Asks the AMQP broker to create a topic exchange (if it doesn't
 * already exist)
 *
 * @private
 * @returns {void}
 */
AmqpConnector.prototype._init = function() {
	this._exchange = this._connection.exchange( EXCHANGE_NAME, { type: 'topic' } );
	this.isReady = true;
	this.emit( 'ready' );
};

/**
 * Callback for created / returned queues.
 *
 * Binds the queue to the exchange via
 * <topic> and adds the client as a listener
 *
 * @param   {String} topic
 * @param   {AmqpQueue} queue
 *
 * @private
 * @returns {void}
 */
AmqpConnector.prototype._onQueue = function( topic, queue ) {
	this._queues[ topic ].queue = queue;
	queue.bind( EXCHANGE_NAME, topic );
	queue.subscribe( this._onMessage.bind( this ) );
};

/**
 * Callback for incoming messages.
 *
 * Parses the message, removes the sender flag and notifies the subscribers
 *
 * @param   {Buffer} message       A buffer containing the JSON stringified message
 * @param   {Object} headers       Meta information added by the sender - should be empty
 * @param   {Object} deliveryInfo  Meta information, added by the AMQP broker
 * @param   {MessageObject} messageObject An object, exposing methods to ack the message etc.
 * 
 * @private
 * @returns {void}
 */
AmqpConnector.prototype._onMessage = function( message, headers, deliveryInfo, messageObject ) {
	var parsedMessage;

	try{
		parsedMessage = JSON.parse( message.data.toString( 'utf-8' )  );
	} catch( e ) {
		this.emit( 'error', 'message parse error ' + e.toString() );
	}

	if( parsedMessage._s === this._sender ) {
		return;
	}
	delete parsedMessage._s;
	this._messageEventEmitter.emit( deliveryInfo.routingKey, parsedMessage );
};

/**
 * Callback for error messages
 *
 * @param   {String} error
 *
 * @private
 * @returns {void}
 */
AmqpConnector.prototype._onError = function( error ) {
	this.emit( 'error', error.toString() );
};

/**
 * Callback for closed connections. The only time the connection
 * is expected to close is when deepstream is shut down - so lets
 * raise an error if it happens at some other point
 * 
 * @param   {String} error
 *
 * @private
 * @returns {void}
 */
AmqpConnector.prototype._onClose = function() {
	this.emit( 'error', 'disconnected' );
};

/**
 * Check that the configuration contains all mandatory parameters
 *
 * @param   {Object} config
 *
 * @private
 * @returns {void}
 */
AmqpConnector.prototype._validateConfig = function( config ) {
	if( typeof config.host !== 'string' ) {
		throw new Error( 'Missing config parameter "host"' );
	}

	if( typeof config.port !== 'number' ) {
		throw new Error( 'Missing config parameter "port"' );
	}
};

module.exports = AmqpConnector;
