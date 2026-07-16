import os
import json
import logging
from typing import Any, Optional, Dict
from aiokafka import AIOKafkaProducer


log = logging.getLogger(__name__)

class AsyncKafkaProducerSingleton:
    _instance: Optional['AsyncKafkaProducerSingleton'] = None
    _producer: Optional[AIOKafkaProducer] = None

    def __new__(cls):
        if not cls._instance:
            cls._instance = super(AsyncKafkaProducerSingleton, cls).__new__(cls)
        return cls._instance

    async def get_producer(self) -> AIOKafkaProducer:
        if self._producer is None:
            bootstrap_servers = os.environ.get("KAFKA_BOOTSTRAP_SERVERS")
            api_key = os.environ.get("KAFKA_API_KEY")
            api_secret = os.environ.get("KAFKA_API_SECRET")

            if not bootstrap_servers:
                log.warning("KAFKA_BOOTSTRAP_SERVERS environment variable is not set. Kafka producer will not be started.")
                raise RuntimeError("Kafka not configured: KAFKA_BOOTSTRAP_SERVERS is missing")

            kwargs: Dict[str, Any] = {
                "bootstrap_servers": bootstrap_servers
            }

            # Support Confluent Cloud credentials or other SASL-based authentications
            if api_key and api_secret:
                kwargs.update({
                    "security_protocol": "SASL_SSL",
                    "sasl_mechanism": "PLAIN",
                    "sasl_plain_username": api_key,
                    "sasl_plain_password": api_secret,
                })

            self._producer = AIOKafkaProducer(**kwargs)
            await self._producer.start()
            log.info("Async Kafka Producer started successfully.")
        return self._producer

    async def stop(self):
        if self._producer is not None:
            try:
                await self._producer.stop()
                log.info("Async Kafka Producer stopped successfully.")
            except Exception as e:
                log.error(f"Error stopping Async Kafka Producer: {e}")
            finally:
                self._producer = None

producer_singleton = AsyncKafkaProducerSingleton()

async def publish_event_async(topic: str, event: Any) -> None:
    """
    Publish an event asynchronously to a given Kafka topic.
    The event can be any JSON-serializable object.
    """
    try:
        producer = await producer_singleton.get_producer()
        value = json.dumps(event).encode("utf-8")
        await producer.send_and_wait(topic, value)
        log.info(f"Published event to topic '{topic}': {event}")
    except Exception as e:
        log.error(f"Failed to publish event to topic '{topic}': {e}")
        raise

async def stop_kafka_producer() -> None:
    """
    Gracefully shut down the async Kafka producer.
    """
    await producer_singleton.stop()
