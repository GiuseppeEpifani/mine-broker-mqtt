const aedes = require('aedes')();
const server = require('net').createServer(aedes.handle);
const httpServer = require('http').createServer();
require('websocket-stream').createServer({ server: httpServer }, aedes.handle);

const MQTT_PORT = 1884;
const WS_PORT = 8884;

server.listen(MQTT_PORT, function () {
  console.log('Aedes MQTT server started and listening on port', MQTT_PORT)
});

httpServer.listen(WS_PORT, function () {
  console.log('websocket server listening on port ', WS_PORT)
});

const isValidTopic = (topic) => {
  const topics = ['topic-station-1', 'topic-station-2', 'topic-station-3', 'topic-station-4'];
  return topic && topics.includes(topic);
}

// emitted when a client connects to the broker
aedes.on('client', function (client) {
  const clientID = client ? client.id : null;
  console.log(`CLIENT_CONNECTED : MQTT Client ${clientID} connected to aedes broker ${aedes.id}`);
});

// emitted when a client disconnects from the broker
aedes.on('clientDisconnect', function (client) {
  const clientID = client ? client.id : null;
  console.log(`CLIENT_DISCONNECTED : MQTT Client ${clientID} disconnected from the aedes broker ${aedes.id}`);
});

// emitted when a client subscribes to a message topic
aedes.on('subscribe', function (subscriptions, client) {
  const clientID = client ? client.id : null;
  const invalidSubscriptions = subscriptions.filter(sub => !isValidTopic(sub.topic));

  if (invalidSubscriptions.length > 0) {
    console.log(`INVALID_TOPIC_SUBSCRIPTION : MQTT Client ${clientID} tried to subscribe to invalid topics: ${invalidSubscriptions.map(s => s.topic).join(',')}. Disconnecting.`);
    client.close();
    return new Error('Suscripción no permitida a uno o más tópicos inválidos.');
  }

  console.log(`TOPIC_SUBSCRIBED : MQTT Client ${clientID} subscribed to topic: ${subscriptions.map(s => s.topic).join(',')} on aedes broker ${aedes.id}`);
});


// emitted when a client unsubscribes from a message topic
aedes.on('unsubscribe', function (subscriptions, client) {
  const clientID = client ? client.id : null;
  console.log(`TOPIC_UNSUBSCRIBED : MQTT Client ${clientID} unsubscribed to topic: ${subscriptions.join(',')} from aedes broker ${aedes.id}`);
});


// emitted when a client publishes a message packet on the topic
aedes.on('publish', function (packet, client) {
})


aedes.authorizeSubscribe = function (client, sub, callback) {
  if (!isValidTopic(sub.topic)) {
    console.log(`INVALID_TOPIC_SUBSCRIPTION : MQTT Client ${client.id} tried to subscribe to invalid topic: ${sub.topic}`);
    const error = new Error('Suscripción no permitida a tópico inválido.');
    error.returnCode = 128;
    client.close();
    return callback(error, null);
  }

  callback(null, sub);
};

// Middleware for validating publications
aedes.authorizePublish = function (client, packet, callback) {
  if (!isValidTopic(packet.topic)) {
    console.log(`INVALID_TOPIC_PUBLICATION : MQTT Client ${client.id} tried to publish to invalid topic: ${packet.topic}`);
    const error = new Error('Publicación no permitida en tópico inválido.');
    error.returnCode = 128;
    client.close();
    return callback(error);
  }

  callback(null);
};