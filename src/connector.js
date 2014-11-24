var amqp = require('amqp'),
	events = require( 'events' ),
	util = require( 'util' ),
	EXCHANGE_NAME = 'DEEPSTREAM_PUB_SUB';

var AmqpConnector = function( config ) {
	this.isReady = false;
	this._name = config.serverName || ( Math.random() * 10000000000000000000 ).toString( 36 );
	this._exchange = null;
	this._queues = {};
	this._messageEventEmitter = new events.EventEmitter();

	this._connection = amqp.createConnection( config );
	this._connection.on( 'ready', this._init.bind( this ) );
	this._connection.on( 'error', this._onError.bind( this ) );
	this._connection.on( 'close', this._onClose.bind( this ) );
};

util.inherits( AmqpConnector, events.EventEmitter );

AmqpConnector.prototype.subscribe = function( topic, callback ) {
	this._messageEventEmitter.on( topic, callback );

	if( this._queues[ topic ] === true ) {
		return;
	}

	var name = topic + '.' + this._name,
		options = { autoDelete: true },
		callbackFn = this._bindListeners.bind( this, topic );

	this._queues[ topic ] = true;
	this._connection.queue( name, options, callbackFn );
};

AmqpConnector.prototype.publish = function( topic, message ) {
	var stringifiedMessage;

	/**
	 * @todo
	 * 
	 * There has to be a better way to prevent
	 * the sender from receiving its own messages. Maybe a NOT in the
	 * routing key?
	 */
	message.amqpSender = this._name;

	try{
		stringifiedMessage = JSON.stringify( message );
	} catch( e ) {
		console.log( e ); //@TODO
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
		console.log( e ); //@TODO
	}

	if( parsedMessage.amqpSender === this._name ) {
		return;
	}

	delete parsedMessage.amqpSender;
	
	this._messageEventEmitter.emit( parsedMessage.topic, parsedMessage );
};

AmqpConnector.prototype._onError = function( error ) {
	throw error;
	console.log( 'ERROR', arguments ); //@TODO
};

AmqpConnector.prototype._onClose = function() {
	console.log( 'CLOSE', arguments ); //@TODO
};

module.exports = AmqpConnector;