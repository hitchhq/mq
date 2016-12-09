const { TopicMQ } = require('@hitch/mq');

// Check http://www.squaremobius.net/amqp.node/channel_api.html to see all options.
const mq = new TopicMQ({
  exchange: 'exchange name',
  queue_options: { exclusive: true },
  consumer_options: { noAck: true },
  topic: 'v1.user.signup',
  consumer: consumeMessage,
  username: 'username',
  password: 'password',
  host: 'myhost',
  port: '5672'
});

mq.on('error', err => console.error(err));
mq.on('connect', () => {
  console.log('connected');
});

mq.connect();

function consumeMessage (msg) {
  console.log(msg.content.toString());
}
