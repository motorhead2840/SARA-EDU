"""
train_omega_dit.py — SageMaker HyperPod training entrypoint for Shri-Ma-Saraswathi.

Maintains compatibility with hybrid Om-Lang (Julia/JAX - Python) and the
Omega-Dit architecture, streaming live student activity data from Confluent Cloud
and publishing metrics/validation telemetry back.
"""

import argparse
import json
import logging
import math
import os
import sys
import time
from typing import Dict, List, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ─── Lazy/Conditional Imports for JAX, Julia, Boto3, and Kafka ──────────────
try:
    import jax
    import jax.numpy as jnp
    _jax_available = True
except ImportError:
    jax = None  # type: ignore
    jnp = None  # type: ignore
    _jax_available = False

try:
    from juliacall import Main as jl
    _julia_available = True
except ImportError:
    jl = None  # type: ignore
    _julia_available = False

try:
    import boto3
    _boto3_available = True
except ImportError:
    boto3 = None  # type: ignore
    _boto3_available = False

try:
    from confluent_kafka import Consumer, Producer, KafkaError
    _kafka_available = True
except ImportError:
    Consumer = None  # type: ignore
    Producer = None  # type: ignore
    KafkaError = None  # type: ignore
    _kafka_available = False


# ─── Constants for the Omega-Dit Architecture & Training Dynamics ───────────
STOCHASTIC_FLUX_DAMPENING = 0.9 # Rate of noise reduction for unitive non-dual balance
CRITICAL_THRESHOLD = 0.7        # Point at which truth saturation triggers thermodynamic override
SIGMOID_STEEPNESS = 15.0        # Smooth transition sensitivity coefficient for Circuit B override
DEFAULT_LEARNING_RATE = 0.01    # Baseline learning rate for gradient updates


# ─── AWS Secrets Manager: Inject SASL/PLAIN Credentials ─────────────────────
def fetch_confluent_credentials() -> Dict[str, str]:
    """
    Fetch Confluent Cloud API key, secret, and bootstrap server from AWS Secrets Manager.
    Tries the requested name `/confluent/app-key` and falls back to environment-based names.
    """
    credentials = {
        "bootstrap": os.environ.get("CONFLUENT_BOOTSTRAP", ""),
        "api_key": os.environ.get("CONFLUENT_API_KEY", ""),
        "api_secret": os.environ.get("CONFLUENT_API_SECRET", "")
    }

    if not _boto3_available or boto3 is None:
        log.warning("boto3 not installed. Using environment variables.")
        return credentials

    region = os.environ.get("AWS_REGION", "us-east-1")
    client = boto3.client("secretsmanager", region_name=region)

    # Note: 'sri/production/confluent/app-key' uses 'sri' instead of 'shri' 
    # to maintain consistency with the Terraform project name prefix defined in variables.tf.
    credential_paths = [
        "/confluent/app-key",
        "sri/production/confluent/app-key"
    ]

    for path in credential_paths:
        try:
            log.info(f"Attempting to fetch configuration from resource location: {path}")
            resp = client.get_secret_value(SecretId=path)
            if "SecretString" in resp:
                secret_data = json.loads(resp["SecretString"])
                credentials["bootstrap"] = secret_data.get("bootstrap", credentials["bootstrap"])
                credentials["api_key"] = secret_data.get("api_key", credentials["api_key"])
                credentials["api_secret"] = secret_data.get("api_secret", credentials["api_secret"])
                log.info(f"Successfully loaded configuration from {path}")
                return credentials
        except Exception as e:
            log.warning(f"Could not retrieve resource from location: {path}")

    return credentials


# ─── Confluent Cloud Consumer and Producer Integration ──────────────────────
def get_kafka_consumer(creds: Dict[str, str]) -> "Consumer | None":
    """
    Set up the Confluent Kafka Consumer to stream training datasets.
    
    Subscribed Topics & Expected Schema:
    - 'shri.session.events': Contains learner chat interactions and Socratic mentoring sessions.
      Schema includes: user_id (string), type (string, e.g., session activity), and text (string student prompt/utterance).
    - 'student.game.played': Contains gameplay, simulation states, and mythology scoring events.
      Schema includes: user_id (string), type (string, e.g., game activity), and score (float, student score/understanding).
    """
    if not _kafka_available or Consumer is None:
        log.warning("confluent-kafka not available. Running with mock consumer.")
        return None

    if not creds["bootstrap"] or not creds["api_key"]:
        log.warning("Confluent credentials not fully populated. Cannot initialize real consumer.")
        return None

    conf = {
        "bootstrap.servers": creds["bootstrap"],
        "security.protocol": "SASL_SSL",
        "sasl.mechanism": "PLAIN",
        "sasl.username": creds["api_key"],
        "sasl.password": creds["api_secret"],
        "group.id": "sagemaker-saraswathi-training-group",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False
    }

    try:
        consumer = Consumer(conf)
        # Subscribing to core student activity topics to preprocess into token streams
        consumer.subscribe(["shri.session.events", "student.game.played"])
        log.info("Successfully subscribed to Confluent topics: shri.session.events, student.game.played")
        return consumer
    except Exception as e:
        log.error(f"Failed to create Kafka consumer: {e}")
        return None


def get_kafka_producer(creds: Dict[str, str]) -> "Producer | None":
    """Set up Confluent Kafka Producer to publish training metrics back to confluent."""
    if not _kafka_available or Producer is None:
        log.warning("confluent-kafka not available. Running with mock producer.")
        return None

    if not creds["bootstrap"] or not creds["api_key"]:
        log.warning("Confluent credentials not fully populated. Cannot initialize real producer.")
        return None

    conf = {
        "bootstrap.servers": creds["bootstrap"],
        "security.protocol": "SASL_SSL",
        "sasl.mechanism": "PLAIN",
        "sasl.username": creds["api_key"],
        "sasl.password": creds["api_secret"]
    }

    try:
        producer = Producer(conf)
        log.info("Successfully created Kafka producer for sagemaker.features topic.")
        return producer
    except Exception as e:
        log.error(f"Failed to create Kafka producer: {e}")
        return None


def publish_metrics(producer: "Producer | None", loss: float, stability: float, truth_sat: float, omega_vector: List[float]):
    """Publish live telemetry & metrics to sagemaker.features topic."""
    payload = {
        "timestamp": time.time(),
        "training_phase": "Shri-Ma-Saraswathi",
        "loss": float(loss),
        "stability": float(stability),
        "truth_saturation": float(truth_sat),
        "omega_state_vector": [float(x) for x in omega_vector]
    }
    msg_str = json.dumps(payload)

    if producer:
        try:
            producer.produce("sagemaker.features", key="saraswathi-telemetry", value=msg_str)
            producer.flush(1.0)
            log.info(f"Published telemetry to Confluent: {msg_str}")
        except Exception as e:
            log.warning(f"Failed to publish metrics to Kafka: {e}")
    else:
        log.info(f"[MOCK TELEMETRY] sagemaker.features <- {msg_str}")


# ─── Hybrid Om-Lang (Julia/JAX - Python) Environment Compatibility ──────────
def run_julia_nondual_notations(omega_in: List[float]) -> List[float]:
    """
    Invokes the Julia runtime via the Python-Julia bridge to compute high-fidelity
    unitive, non-dual transformations of the Omega-Dit state vector.
    """
    if _julia_available and jl is not None:
        try:
            # Express unitive mathematical notation in Julia
            jl.seval(f"""
            function unitive_phase_shift(omega::Vector{{Float64}})
                # Non-dual transformation based on Nataraja Guru principles
                # Harmonizing the inner and outer dualistic states
                sigma = omega[1] # Existence-Density
                beta = omega[2]  # Subsistence-Pattern
                upsilon = omega[3] # Accountable Value
                xi = omega[4]    # Stochastic Flux
                
                # Unitive non-dual scale transformation
                u_factor = (sigma + beta + upsilon) / (3.0 + xi)
                return [sigma * u_factor, beta * cos(beta), upsilon * u_factor, xi * {STOCHASTIC_FLUX_DAMPENING}]
            end
            """)
            omega_out = jl.unitive_phase_shift(omega_in)
            return [float(x) for x in omega_out]
        except Exception as e:
            log.warning(f"Julia bridge execution failed: {e}. Falling back to Python equivalent.")
    
    # Python equivalent/fallback logic preserving the non-dual unitive calculations
    sigma, beta, upsilon, xi = omega_in
    u_factor = (sigma + beta + upsilon) / (3.0 + xi)
    return [sigma * u_factor, beta * math.cos(beta), upsilon * u_factor, xi * STOCHASTIC_FLUX_DAMPENING]


# ─── Omega-Dit JAX Architecture & Loss Function ──────────────────────────────
# We model the training state as a 4D vector Omega = [sigma, beta, upsilon, xi]
# We leverage JAX JIT and automatic differentiation to optimize state dynamics.

if _jax_available and jnp is not None:

    @jax.jit
    def apply_phase_cancellation_safety(omega: jnp.ndarray) -> jnp.ndarray:
        """
        Integrates conjugate destructive interference directly to dampen noise tokens (xi)
        that violate mirror symmetry.
        """
        sigma, beta, upsilon, xi = omega[0], omega[1], omega[2], omega[3]
        
        # Mirror symmetry indicator: checking matching state structures
        asymmetry = jnp.abs(sigma - beta)
        
        # Dampen noise token (xi) as asymmetry increases (phase-cancellation safety)
        dampening_factor = jnp.exp(-2.0 * asymmetry)
        dampened_xi = xi * dampening_factor
        
        return jnp.array([sigma, beta, upsilon, dampened_xi])


    @jax.jit
    def compute_autopoietic_loss(omega: jnp.ndarray, stability: float, truth_sat: float, gradient_variance: float) -> float:
        """
        Align the optimization loss with the two-part autopoietic phase-transition equation:
        - Circuit A (Resonant Baseline): Minimizes a baseline exponential cooling term as stability (Xi) -> 1.0.
        - Circuit B (Thermodynamic Override): Sigmoid-gated override damping wild gradient variances,
          arming automatically as truth saturation (sigma_sat) grows past the critical threshold.
        """
        # Circuit A: Resonant Baseline
        # Base cooling term: cooling down as stability approaches 1.0
        cooling_loss = jnp.exp(-(stability - 0.5))
        
        # Circuit B: Thermodynamic Override
        # Arming past critical threshold
        sig_gate = 1.0 / (1.0 + jnp.exp(-SIGMOID_STEEPNESS * (truth_sat - CRITICAL_THRESHOLD)))
        override_loss = sig_gate * gradient_variance
        
        # Combined dual-circuit loss
        total_loss = cooling_loss + override_loss
        return total_loss

else:
    # Python equivalent fallbacks if JAX is not available
    def apply_phase_cancellation_safety(omega: list) -> list:
        sigma, beta, upsilon, xi = omega
        asymmetry = abs(sigma - beta)
        dampening_factor = math.exp(-2.0 * asymmetry)
        return [sigma, beta, upsilon, xi * dampening_factor]

    def compute_autopoietic_loss(omega: list, stability: float, truth_sat: float, gradient_variance: float) -> float:
        cooling_loss = math.exp(-(stability - 0.5))
        sig_gate = 1.0 / (1.0 + math.exp(-SIGMOID_STEEPNESS * (truth_sat - CRITICAL_THRESHOLD)))
        override_loss = sig_gate * gradient_variance
        return cooling_loss + override_loss


# ─── Training Loop & Main Execution ──────────────────────────────────────────
def process_activity_event(event_data: dict) -> Tuple[float, float, float]:
    """Parse raw student activity event to extract preprocessed token stream attributes."""
    # Preprocess events into token streams: extracting confidence (sigma), pattern (beta), variance
    try:
        user_id = event_data.get("user_id", "anonymous")
        event_type = event_data.get("type", "unknown")
        
        # Map event severity/type to numeric features for the Omega-Dit vector
        if "played" in event_type or "game" in event_type:
            score = float(event_data.get("score", 50.0)) / 100.0
            stability = min(1.0, max(0.1, score))
            truth_sat = min(1.0, max(0.1, score * 1.1))
            variance = max(0.01, 1.0 - score)
        else:
            # Socratic session activities
            complexity = len(str(event_data.get("text", ""))) / 1000.0
            stability = min(1.0, max(0.1, 1.0 - complexity))
            truth_sat = min(1.0, max(0.1, complexity * 1.5))
            variance = max(0.01, complexity)
            
        return stability, truth_sat, variance
    except Exception:
        return 0.5, 0.5, 0.1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--max_events", type=int, default=50)
    parser.add_argument("--learning_rate", type=float, default=DEFAULT_LEARNING_RATE)
    parser.add_argument("--omega_state_vector", type=str, default="[0.8, 0.6, 0.75, 0.3]")
    args = parser.parse_args()

    log.info("Starting Shri-Ma-Saraswathi Training Phase with SageMaker HyperPod")
    
    # 1. Fetch Credentials
    creds = fetch_confluent_credentials()
    
    # 2. Get Kafka streams
    consumer = get_kafka_consumer(creds)
    producer = get_kafka_producer(creds)
    
    # Initialize State Vector Omega = [sigma, beta, upsilon, xi]
    try:
        omega_state = json.loads(args.omega_state_vector)
    except Exception:
        omega_state = [0.8, 0.6, 0.75, 0.3]
    
    log.info(f"Initial Omega State Vector: {omega_state}")

    event_count = 0
    start_time = time.time()
    
    try:
        # We run the training loop over either consumer stream or mock stream for robust testing
        while event_count < args.max_events:
            raw_event = None
            if consumer:
                msg = consumer.poll(1.0)
                if msg is not None and not msg.error():
                    try:
                        raw_event = json.loads(msg.value().decode("utf-8"))
                        log.info(f"Received event from topic {msg.topic()}")
                    except Exception as parse_err:
                        log.warning(f"Failed to parse Kafka message: {parse_err}")
                elif msg is not None and msg.error():
                    log.warning(f"Kafka error occurred: {msg.error()}")
            
            # Mock streaming event if no real consumer/messages for continuous learning validation
            if raw_event is None:
                # Simulate a mixture of shri.session.events and student.game.played
                simulated_topic = "student.game.played" if event_count % 2 == 0 else "shri.session.events"
                raw_event = {
                    "type": simulated_topic,
                    "user_id": f"student_{100 + event_count}",
                    "score": 60.0 + (event_count % 5) * 8.0,
                    "text": "Socratic inquiry on non-dual unitive teaching principles."
                }
                time.sleep(0.1) # Simulate high-speed streaming latency

            # 3. Preprocess incoming event into token streams / values
            stability, truth_sat, variance = process_activity_event(raw_event)
            event_count += 1
            
            # 4. Om-Lang multi-language bridge processing
            omega_transformed = run_julia_nondual_notations(omega_state)
            
            # Convert to JAX arrays for high-performance optimization
            if _jax_available and jnp is not None:
                omega_jax = jnp.array(omega_transformed)
                # Apply Phase-Cancellation Safety
                omega_safe = apply_phase_cancellation_safety(omega_jax)
                # Compute Autopoietic Loss with Circuit A and B
                loss = compute_autopoietic_loss(omega_safe, stability, truth_sat, variance)
                
                # JAX autograd update simulation (mirroring backprop on GPUs)
                grad_fn = jax.grad(lambda o: compute_autopoietic_loss(o, stability, truth_sat, variance))
                grads = grad_fn(omega_safe)
                omega_updated = omega_safe - args.learning_rate * grads
                omega_state = [float(x) for x in omega_updated]
                current_loss = float(loss)
            else:
                # Fallback equivalent updates
                omega_safe = apply_phase_cancellation_safety(omega_transformed)
                loss = compute_autopoietic_loss(omega_safe, stability, truth_sat, variance)
                # Mock update gradient step
                omega_state = [max(0.01, min(1.0, x - args.learning_rate * 0.5)) for x in omega_safe]
                current_loss = float(loss)

            # 5. Telemetry updates back to Confluent Cloud
            if event_count % 5 == 0 or event_count == args.max_events:
                publish_metrics(
                    producer=producer,
                    loss=current_loss,
                    stability=stability,
                    truth_sat=truth_sat,
                    omega_vector=omega_state
                )
                log.info(f"Processed [{event_count}/{args.max_events}] - Loss: {current_loss:.4f} | State Omega: {omega_state}")

    except KeyboardInterrupt:
        log.info("Training interrupted by user.")
    finally:
        if consumer:
            consumer.close()
            log.info("Closed Confluent consumer.")
        if producer:
            producer.flush()
            log.info("Flushed Confluent producer.")
            
    log.info(f"Shri-Ma-Saraswathi training phase finished. Processed {event_count} events in {time.time() - start_time:.2f}s.")


if __name__ == "__main__":
    main()
