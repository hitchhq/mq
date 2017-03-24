const { TopicMQ } = require('../lib');

// Check http://www.squaremobius.net/amqp.node/channel_api.html to see all options.
const mq = new TopicMQ({
  exchange: 'logs',
  queue_options: {
    exclusive: false,
    durable: true,
    autoDelete: true
  },
  consumer_options: { noAck: true },
  topic: '#',
  queue: 'my.queue.name',
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 5672
});

mq.on('error', err => console.error(err));
mq.on('connect', () => {
  console.log('connected');
});

mq.on('reconnecting', (info) => {
  console.log('reconnecting:', info.attempts);
});

mq.on('reconnect', (info) => {
  console.log('reconnected on attempt', info.attempts);
});

mq.on('message', (msg) => {
  console.log(JSON.parse(msg.content.toString()));
});

mq.connect();
