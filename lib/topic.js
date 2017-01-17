const amqp = require('amqplib');
const util = require('util');
const { EventEmitter } = require('events');

module.exports = TopicMQ;

/**
 * Constructor for TopicMQ
 *
 * @param {Object} options
 * @param {String} [options.subscribe=true] Whether to subscribe or not
 * @param {String} options.exchange Exchange name
 * @param {Object} options.queue_options Queue options
 * @param {Object} options.consumer_options Consume options
 * @param {String} options.topic Topic name
 * @param {Function} options.consumer Callback function which consumes the messages
 */
function TopicMQ (options) {
  options = options || {};
  this.exchange = options.exchange;
  this.queue_options = options.queue_options || {};
  this.subscribe = options.subscribe === undefined ? true : options.subscribe;
  this.consumer_options = options.consumer_options || {};
  this.topic = options.topic;
  this.consumer = options.consumer;
  this.username = options.username;
  this.password = options.password;
  this.host = options.host;
  this.port = options.port;
  if (typeof this.consumer !== 'function') this.consumer = () => {};
};

// Inherit from EventEmitter
util.inherits(TopicMQ, EventEmitter);

/**
 * Connects to MQ server
 *
 * @param {String} where URL to connect to
 */
TopicMQ.prototype.connect = function (where) {
  let connection_string = 'amqp://';

  if (this.username && this.password) connection_string += `${this.username}:${this.password}@`;

  if (this.host && this.port) {
    connection_string += `${this.host}:${this.port}`;
  } else if (this.host) {
    connection_string += `${this.host}`;
  } else {
    connection_string += 'localhost';
    connection_string += this.port ? `:${this.port}` : '';
  }

  amqp
    .connect(where || connection_string)
    .then((conn) => {
      this.connection = conn;
      this.emit('connect', conn);
      return this.createChannel();
    })
    .catch((err) => {
      err.code = -100;
      this.emit('connect.error', err);
      this.emit('error', err);
    });
};

/**
 * Creates a channel
 *
 * @return {Promise} Channel creation promise
 */
TopicMQ.prototype.createChannel = function () {
  const create_channel = this.connection.createChannel();

  create_channel
    .then((channel) => {
      this.emit('channel.create', channel);
      this.assertQueue(channel);
    })
    .catch((err) => {
      err.code = -200;
      this.emit('channel.create.error', err);
      this.emit('error', err);
    });

  return create_channel;
};

/**
 * Asserts the queue
 *
 * @param {MQChannel} channel
 * @return {Promise} Queue assertion promise
 */
TopicMQ.prototype.assertQueue = function (channel) {
  const assert_queue = channel.assertQueue('', this.queue_options);

  assert_queue
    .then((q) => {
      this.emit('queue.assert', q);
      this.configQueue(q, channel);
    })
    .catch((err) => {
      err.code = -300;
      this.emit('queue.assert.error', err);
      this.emit('error', err);
    });

  return assert_queue;
};

/**
 * Configures the message queue.
 *
 * @param {MQQueue} q
 * @param {MQChannel} channel
 */
TopicMQ.prototype.configQueue = function (q, channel) {
  channel.bindQueue(q.queue, this.exchange, this.topic);
  if (this.subscribe) {
    channel.consume(q.queue, (msg) => {
      this.emit('consume', msg, q, this.consumer_options);
    }, this.consumer_options);
  }
};

/**
 * Publishes a message to the exchange
 *
 * @param {String} topic
 * @param {String} content
 * @param {Object} options
 */
TopicMQ.prototype.publish = function (topic, content, options) {
  if (!this.connection) return;

  const create_channel = this.connection.createChannel();
  options = options || {};
  options.persistent = options.persistent || false;
  options.timestamp = options.timestamp || Date.now();

  const content_string = (typeof content === 'object') ?
    JSON.stringify(content) : content; 

  create_channel.then((channel) => {
    channel.publish(this.exchange, topic, Buffer.from(content_string), options);
  });
};
