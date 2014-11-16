var Connector = require( '../src/connector' ),
	connector = new Connector({
		host: 'localhost',
		port: 5672
	});

connector.on( 'ready', function(){
	connector.subscribe( 'someTopic', function( buffer ){
		console.log( 'RECEIVED',  buffer.data.toString( 'utf-8' ) );
	});

	if( process.argv[ 2 ] === 'send' ) {
		setInterval(function(){
			var msg = (Math.random() * 10000).toString( 30 );
			console.log( 'SENDING', msg );
			connector.publish( 'someTopic', msg );
		}, 2000 );
	}
	
});

