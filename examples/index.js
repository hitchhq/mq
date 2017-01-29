const { TopicMQ } = require('../lib');

// Check http://www.squaremobius.net/amqp.node/channel_api.html to see all options.
const mq = new TopicMQ({
  exchange: 'hitch',
  queue_options: { exclusive: true },
  consumer_options: { noAck: true },
  topic: 'v1.user.signup',
  queue: 'test',
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 5672
});

mq.on('error', err => console.error(err));
mq.on('connect', () => {
  console.log('connected');
});

mq.on('consume', (msg) => {
  console.log(msg.content.toString());
});

mq.connect();
