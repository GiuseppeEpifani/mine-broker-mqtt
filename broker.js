const aedes = require('aedes')()
const server = require('net').createServer(aedes.handle)
const httpServer = require('http').createServer()
const ws = require('websocket-stream')
MQTT_Port = 1884
const wsPort = 8884
server.listen(MQTT_Port, function () {
  console.log('Aedes MQTT server started and listening on port', MQTT_Port)
}),
ws.createServer({ server: httpServer }, aedes.handle)
httpServer.listen(wsPort, function () {
  console.log('websocket server listening on port ', wsPort)
})

// Lista de client IDs válidos o asignados
const validClientIDs = new Set();

function isValidClientID(clientID) {
  // Regla para validar que el client ID siga el patrón "station-*"
  const regex = /^station-.+/;
  return clientID && regex.test(clientID);
}

function isValidTopic(topic) {
  const topics = ['topic-station-1', 'topic-station-2', 'topic-station-3', 'topic-station-4']
  return topic && topic.includes(topics);
}

// emitted when a client connects to the broker
aedes.on('client', function (client) {
  let clientID = client ? client.id : null;

  if (!isValidClientID(clientID)) {
    // Desconectar al cliente si no tiene un ID válido
    console.log(`INVALID_CLIENT_ID : MQTT Client ${clientID} has invalid ID. Disconnecting.`);
    client.close();
    return;
  }

  validClientIDs.add(clientID);
  console.log(`CLIENT_CONNECTED : MQTT Client ${clientID} connected to aedes broker ${aedes.id}`);
});

// emitted when a client disconnects from the broker
aedes.on('clientDisconnect', function (client) {
  const clientID = client ? client.id : null;
  validClientIDs.delete(clientID);
  console.log(`CLIENT_DISCONNECTED : MQTT Client ${clientID} disconnected from the aedes broker ${aedes.id}`);
});


// emitted when a client subscribes to a message topic
aedes.on('subscribe', function (subscriptions, client) {
  const clientID = client ? client.id : null;
  const invalidSubscriptions = subscriptions.filter(sub => !isValidTopic(sub.topic));

  if (invalidSubscriptions.length > 0) {
    // Desconectar al cliente si intenta suscribirse a topics inválidos
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
aedes.on('publish', function (packet, client) {/* if (client) {
  console.log(`MESSAGE_PUBLISHED : MQTT Client ${(client ? client.id : 'AEDES BROKER_' + aedes.id)} has published message "${packet.payload}" on ${packet.topic} to aedes broker ${aedes.id}`)} */
})


aedes.authorizeSubscribe = function (client, sub, callback) {
  if (!isValidTopic(sub.topic)) {
    console.log(`INVALID_TOPIC_SUBSCRIPTION : MQTT Client ${client.id} tried to subscribe to invalid topic: ${sub.topic}`);
    const error = new Error('Suscripción no permitida a tópico inválido.');
    error.returnCode = 128; // Código de error para denegar suscripción en MQTT
    client.close();
    return callback(error, null);
  }
  console.log(`TOPIC_SUBSCRIBED : MQTT Client ${client.id} subscribed to topic: ${sub.topic} on aedes broker ${aedes.id}`);
  callback(null, sub);
};

// Middleware for validating publications
aedes.authorizePublish = function (client, packet, callback) {
  if (!isValidTopic(packet.topic)) {
    console.log(`INVALID_TOPIC_PUBLICATION : MQTT Client ${client.id} tried to publish to invalid topic: ${packet.topic}`);
    const error = new Error('Publicación no permitida en tópico inválido.');
    error.returnCode = 128; // Código de error para denegar suscripción en MQTT
    client.close();
    return callback(error);
  }
  console.log(`MESSAGE_PUBLISHED : MQTT Client ${client.id} has published message "${packet.payload}" on ${packet.topic} to aedes broker ${aedes.id}`);
  callback(null);
};