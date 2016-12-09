/* global describe, it, beforeEach, afterEach */

const when = require('when');
const amqp = require('amqplib');
const sinon = require('sinon');
const { TopicMQ } = require('../lib');

describe('TopicMQ', () => {
  let topic_mq;
  let sandbox;

  describe('#connect', () => {
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('connects when username, password, host and port are passed on creation', () => {
      topic_mq = new TopicMQ({
        username: 'theusername',
        password: 'thepassword',
        host: 'thehost',
        port: 'theport'
      });

      sandbox.mock(topic_mq).expects('createChannel').once();
      sandbox.stub(amqp, 'connect').withArgs('amqp://theusername:thepassword@thehost:theport').returns(when(() => {}));

      topic_mq.connect();
    });

    it('connects when host and port are passed on creation', () => {
      topic_mq = new TopicMQ({
        host: 'thehost',
        port: 'theport'
      });

      sandbox.mock(topic_mq).expects('createChannel').once();
      sandbox.stub(amqp, 'connect').withArgs('amqp://thehost:theport').returns(when(() => {}));

      topic_mq.connect();
    });

    it('connects when host is passed on creation', () => {
      topic_mq = new TopicMQ({
        host: 'thehost'
      });

      sandbox.mock(topic_mq).expects('createChannel').once();
      sandbox.stub(amqp, 'connect').withArgs('amqp://thehost').returns(when(() => {}));

      topic_mq.connect();
    });

    it('connects to localhost when host is not passed on creation', () => {
      topic_mq = new TopicMQ();

      sandbox.mock(topic_mq).expects('createChannel');
      const stubbed_connect = sandbox.stub(amqp, 'connect').withArgs('amqp://localhost').returns(when(() => {}));

      topic_mq.connect();
      sinon.assert.calledOnce(stubbed_connect);
    });

    it('connects to the provided url', () => {
      topic_mq = new TopicMQ({
        username: 'theusername',
        password: 'thepassword',
        host: 'thehost',
        port: 'theport'
      });

      sandbox.mock(topic_mq).expects('createChannel');
      const stubbed_connect = sandbox.stub(amqp, 'connect').withArgs('the_provided_url').returns(when(() => {}));

      topic_mq.connect('the_provided_url');
      sinon.assert.calledOnce(stubbed_connect);
    });
  });
});
