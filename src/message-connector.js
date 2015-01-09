var amqp = require('amqp'),
	events = require( 'events' ),
	util = require( 'util' ),
	EXCHANGE_NAME = 'DEEPSTREAM_PUB_SUB';


var AmqpConnector = function( config ) {
	this.isReady = false;
	this.name = 'deepstream.io-msg-amqp';
	this.version = '0.2.2';
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

AmqpConnector.prototype.unsubscribe = function( topic, callback ) {
	this._messageEventEmitter.removeListener( topic, callback );
};

AmqpConnector.prototype.subscribe = function( topic, callback ) {
	this._messageEventEmitter.on( topic, callback );

	if( this._queues[ topic ] === true ) {
		return;
	}

	var name = topic + '.' + this._sender,
		options = { autoDelete: true },
		callbackFn = this._bindListeners.bind( this, topic );

	this._queues[ topic ] = true;
	this._connection.queue( name, options, callbackFn );
};

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

AmqpConnector.prototype._init = function() {
	this._exchange = this._connection.exchange( EXCHANGE_NAME, { type: 'topic' } );
	this.isReady = true;
	this.emit( 'ready' );
};

AmqpConnector.prototype._bindListeners = function( topic, queue ) {
	queue.bind( EXCHANGE_NAME, topic );
	queue.subscribe( this._onMessage.bind( this ) );
};

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

AmqpConnector.prototype._onError = function( error ) {
	this.emit( 'error', error.toString() );
};

AmqpConnector.prototype._onClose = function() {
	this.emit( 'error', 'disconnected' );
};

AmqpConnector.prototype._validateConfig = function( config ) {
	if( typeof config.host !== 'string' ) {
		throw new Error( 'Missing config parameter "host"' );
	}

	if( typeof config.port !== 'number' ) {
		throw new Error( 'Missing config parameter "port"' );
	}
};

module.exports = AmqpConnector;