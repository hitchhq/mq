const amqp = require('amqplib');
const util = require('util');
const { EventEmitter } = require('events');
let reconnection_attempts = 0;

module.exports = TopicMQ;

/**
 * Constructor for TopicMQ
 *
 * @param {Object} options
 * @param {String} [options.subscribe=true] Whether to subscribe or not
 * @param {String} options.exchange Exchange name
 * @param {String} options.queue Queue name
 * @param {Object} options.queue_options Queue options
 * @param {Object} options.consumer_options Consume options
 * @param {String} options.topic Topic name
 * @param {Boolean} [options.reconnect=true] Whether to auto-reconnect or not
 * @param {Number} [options.reconnectTimeout=5000] Number of milliseconds to wait until next reconnection
 */
function TopicMQ (options) {
  options = options || {};
  this.exchange = options.exchange;
  this.queue = options.queue || '';
  this.queue_options = options.queue_options || {};
  this.subscribe = options.subscribe === undefined ? true : options.subscribe;
  this.consumer_options = options.consumer_options || {};
  this.topic = options.topic;
  this.username = options.username;
  this.password = options.password;
  this.host = options.host;
  this.port = options.port;
  this.reconnect = options.reconnect === undefined ? true : options.reconnect;
  this.reconnectTimeout = options.reconnectTimeout || 5000;
};

// Inherit from EventEmitter
util.inherits(TopicMQ, EventEmitter);

TopicMQ.prototype._amqpConnect = function ({ url }) {
  amqp
    .connect(url)
    .then((conn) => {
      this.connection = conn;
      this.emit('connect', conn);
      if (reconnection_attempts) this.emit('reconnect', { attempts: reconnection_attempts });
      reconnection_attempts = 0;

      this.connection.on('error', (err) => {
        this.emit('error', err);
        if (this.reconnect) {
          ++reconnection_attempts;
          setTimeout(() => {
            this.emit('reconnecting', { attempts: reconnection_attempts });
            this._amqpConnect({ url });
          }, this.reconnectTimeout);
        }
      });

      return this.createChannel();
    })
    .catch((err) => {
      err.code = -100;
      this.emit('connect.error', err);
      this.emit('error', err);

      if (this.reconnect) {
        ++reconnection_attempts;
        setTimeout(() => {
          this.emit('reconnecting', { attempts: reconnection_attempts });
          this._amqpConnect({ url });
        }, this.reconnectTimeout);
      }
    });
};

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

  this._amqpConnect({ url: where || connection_string });
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
  const assert_queue = channel.assertQueue(this.queue, this.queue_options);

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
      this.emit('message', msg, q, this.consumer_options);
      channel.ack(msg);
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
