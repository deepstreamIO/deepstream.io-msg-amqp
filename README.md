deepstream.io-msg-amqp ![Build](https://travis-ci.org/deepstreamIO/deepstream.io-msg-amqp.svg?branch=master) [![npm version](https://badge.fury.io/js/deepstream.io-msg-amqp.svg)](http://badge.fury.io/js/deepstream.io-msg-amqp)


A [deepstream.io](http://deepstream.io/) cache connector for [amqp](https://www.amqp.org/)
This connector uses [the npm amqp package]. Please have a look there for detailed options.

##Basic Setup
```yaml
plugins:
  message:
    name: amqp
    options:
      host: ${AMQP_HOST}
      port: ${AMQP_PORT}
```

```javascript
var Deepstream = require( 'deepstream.io' ),
    AMQPConnector = require( 'deepstream.io-cache-amqp' ),
    server = new Deepstream();

server.set( 'cache', new AMQPConnector( {
  port: 5672,
  host: 'localhost'
}));

server.start();
```

