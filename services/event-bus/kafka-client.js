const { Kafka } = require('kafkajs');

class KafkaEventBus {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'quantflow-event-bus',
      brokers: ['localhost:9092']
    });
    
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'quantflow-consumer-group' });
  }

  async connect() {
    await this.producer.connect();
    await this.consumer.connect();
    console.log('Kafka event bus connected');
  }

  async disconnect() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    console.log('Kafka event bus disconnected');
  }

  async publish(topic, message) {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }]
    });
    console.log(`Published message to topic ${topic}:`, message);
  }

  async subscribe(topic, handler) {
    await this.consumer.subscribe({ topic, fromBeginning: true });
    
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const data = JSON.parse(message.value.toString());
        console.log(`Received message from topic ${topic}:`, data);
        await handler(data);
      },
    });
  }
}

module.exports = KafkaEventBus;