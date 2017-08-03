deepstream.io-msg-amqp ![Build](https://travis-ci.org/deepstreamIO/deepstream.io-msg-amqp.svg?branch=master) [![npm version](https://badge.fury.io/js/deepstream.io-msg-amqp.svg)](http://badge.fury.io/js/deepstream.io-msg-amqp)


A [deepstream.io](http://deepstream.io/) message connector for [amqp](https://www.amqp.org/)
This connector uses [the npm amqp package](https://www.npmjs.com/package/amqp). Please have a look there for detailed options.

#### What is AMQP?
The "Advanced Message Queueing Protocol" is implemented by a large number of brokers, e.g. [RabbitMQ](https://www.rabbitmq.com/), [Qpid](https://qpid.apache.org/), [HornetQ](http://hornetq.jboss.org/) or [ActiveMQ](http://activemq.apache.org/) to name just a few. AMQP supports powerful routing patterns and achieves high reliability through features such as persistent queues or guaranteed message delivery.

#### Why use AMQP with deepstream?
AMQP is reliable and widely adopted. It also comes fully managed as part of cloud hosting offerings like [Azure's Service Bus](https://azure.microsoft.com/en-us/services/service-bus/).

#### When not to use AMQP with deepstream?
deepstream doesn't actually use the advanced messaging and routing patterns that AMQP offers. Instead, it sets up a single `topic-exchange` for name based routing and binds a queue per topic and client to it to create a publish/subscribe workflow.

Equally, deepstream doesn't necessarily require the advanced persistence and guaranteed message delivery features that AMQP offers - data is stored within the storage layer and messaging is only used to propagate updates - meaning that subsequent messages will reconcile a corrupted state.

#### How to use AMQP with deepstream?
deepstream offers an official plugin to connect to AMQP-clusters. It can be installed via deepstream's Command Line Interface using the `msg` keyword, e.g.

```bash
deepstream install msg amqp
```

If you're using deepstream in Node, you can also install it via [NPM](https://www.npmjs.com/package/deepstream.io-msg-amqp)

#### How to configure the amqp connector?
You can configure the amqp connector in the `plugins` section of deepstream's config.yml file (by default either in the `conf` directory or in `/etc/deepstream` on Linux)

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
    AMQPConnector = require( 'deepstream.io-msg-amqp' ),
    server = new Deepstream();

server.set( 'messageConnector', new AMQPConnector( {
  port: 5672,
  host: 'localhost'
}));

server.start();
```
