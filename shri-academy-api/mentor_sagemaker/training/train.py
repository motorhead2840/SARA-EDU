"""
train.py — SageMaker training entrypoint for Shri mentor fine-tuning.

Runs inside the SageMaker HuggingFace training container.
Fine-tunes nvidia/Nemotron-Mini-4B-Instruct with LoRA via trl.SFTTrainer.

SageMaker injects:
    /opt/ml/input/data/training/train.jsonl  — training data
    /opt/ml/model/                           — output model artefacts
    Hyperparameters via --<key> <value> CLI args
"""

import argparse
import json
import logging
import os
import shutil

import torch
from datasets import load_dataset
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer, DataCollatorForCompletionOnlyLM

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

try:
    import mlflow
except ImportError:
    mlflow = None

# ── SageMaker paths ───────────────────────────────────────────────────────────
SM_TRAIN_DIR = os.environ.get("SM_CHANNEL_TRAINING", "/opt/ml/input/data/training")
SM_MODEL_DIR = os.environ.get("SM_MODEL_DIR", "/opt/ml/model")
SM_OUTPUT_DIR = os.environ.get("SM_OUTPUT_DATA_DIR", "/opt/ml/output/data")


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--model_id", default="nvidia/Nemotron-Mini-4B-Instruct")
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--per_device_train_batch_size", type=int, default=4)
    p.add_argument("--gradient_accumulation_steps", type=int, default=4)
    p.add_argument("--learning_rate", type=float, default=2e-4)
    p.add_argument("--max_seq_length", type=int, default=2048)
    p.add_argument("--lora_r", type=int, default=16)
    p.add_argument("--lora_alpha", type=int, default=32)
    p.add_argument("--lora_dropout", type=float, default=0.1)
    p.add_argument("--warmup_ratio", type=float, default=0.05)
    p.add_argument("--lr_scheduler_type", default="cosine")
    p.add_argument("--registered_model_name", default="Shri-Ma-Saraswathi")
    return p.parse_args()


def load_train_data(train_dir: str):
    jsonl_path = os.path.join(train_dir, "train.jsonl")
    log.info(f"Loading training data from {jsonl_path}")
    dataset = load_dataset("json", data_files={"train": jsonl_path}, split="train")
    log.info(f"Loaded {len(dataset)} training records")
    return dataset


def format_chat(example: dict, tokenizer) -> dict:
    """Apply chat template to the messages list."""
    text = tokenizer.apply_chat_template(
        example["messages"],
        tokenize=False,
        add_generation_prompt=False,
    )
    return {"text": text}


def main():
    args = parse_args()
    log.info(f"Training config: {vars(args)}")

    hf_token = os.environ.get("HF_TOKEN")

    # ── Load tokenizer ────────────────────────────────────────────────────────
    log.info(f"Loading tokenizer: {args.model_id}")
    tokenizer = AutoTokenizer.from_pretrained(
        args.model_id,
        token=hf_token,
        trust_remote_code=True,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # ── Load base model (4-bit QLoRA) ─────────────────────────────────────────
    log.info(f"Loading model: {args.model_id}")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )
    model = AutoModelForCausalLM.from_pretrained(
        args.model_id,
        quantization_config=bnb_config,
        device_map="auto",
        token=hf_token,
        trust_remote_code=True,
    )
    model.config.use_cache = False
    model.config.pretraining_tp = 1

    # ── LoRA config ───────────────────────────────────────────────────────────
    # Nemotron-Mini is Mistral-based; these modules cover all projection layers
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        bias="none",
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # ── Dataset ───────────────────────────────────────────────────────────────
    dataset = load_train_data(SM_TRAIN_DIR)
    dataset = dataset.map(
        lambda ex: format_chat(ex, tokenizer),
        remove_columns=dataset.column_names,
    )

    # ── Training arguments ────────────────────────────────────────────────────
    training_args = TrainingArguments(
        output_dir=SM_MODEL_DIR,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.per_device_train_batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        learning_rate=args.learning_rate,
        lr_scheduler_type=args.lr_scheduler_type,
        warmup_ratio=args.warmup_ratio,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=10,
        save_strategy="epoch",
        save_total_limit=1,
        load_best_model_at_end=False,
        report_to="none",
        optim="paged_adamw_8bit",
    )

    # ── Trainer ───────────────────────────────────────────────────────────────
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
        tokenizer=tokenizer,
        packing=False,
    )

    # Set up MLflow if imported
    db_path = None
    mlflow_run = None
    if mlflow:
        try:
            db_path = os.path.abspath("/tmp/mlflow.db")
            mlflow.set_tracking_uri(f"sqlite:///{db_path}")
            mlflow.set_experiment("shri-academy-mentor")
            mlflow_run = mlflow.start_run()
            mlflow.log_params(vars(args))
            log.info("Initialized MLflow tracking run.")
        except Exception as mlflow_init_err:
            log.warning(f"Failed to initialize MLflow tracking: {mlflow_init_err}")

    log.info("Starting fine-tuning ...")
    trainer.train()

    # ── Save final model ──────────────────────────────────────────────────────
    log.info(f"Saving model to {SM_MODEL_DIR}")
    trainer.save_model(SM_MODEL_DIR)
    tokenizer.save_pretrained(SM_MODEL_DIR)

    # Write training metrics for SageMaker
    metrics = trainer.state.log_history
    metrics_path = os.path.join(SM_OUTPUT_DIR, "metrics.json")
    os.makedirs(SM_OUTPUT_DIR, exist_ok=True)
    with open(metrics_path, "w") as f:
        json.dump({"training_loss": metrics[-1].get("train_loss", -1) if metrics else -1}, f)

    # Log metrics and model registry details to MLflow
    if mlflow and mlflow_run:
        try:
            # Log training metrics
            for idx, metric_step in enumerate(metrics):
                step = metric_step.get("step", idx)
                for metric_name, value in metric_step.items():
                    if metric_name != "step" and isinstance(value, (int, float)):
                        mlflow.log_metric(metric_name, value, step=step)

            # Log directory as artifact and register
            mlflow.log_artifacts(SM_MODEL_DIR, artifact_path="model")
            
            model_uri = f"runs:/{mlflow_run.info.run_id}/model"
            registered_name = getattr(args, "registered_model_name", "Shri-Ma-Saraswathi")
            log.info(f"Registering model in MLflow Model Registry as '{registered_name}' with URI '{model_uri}'")
            mlflow.register_model(model_uri=model_uri, name=registered_name)
            log.info("Successfully registered model in MLflow Model Registry.")
            
            # Copy local mlflow database to SM_MODEL_DIR so it packages inside model.tar.gz
            if db_path and os.path.exists(db_path):
                dest_db_path = os.path.join(SM_MODEL_DIR, "mlflow.db")
                log.info(f"Copying MLflow local DB from {db_path} to {dest_db_path} for packaging...")
                shutil.copy(db_path, dest_db_path)
        except Exception as mlflow_log_err:
            log.warning(f"Error logging or registering with MLflow: {mlflow_log_err}")
        finally:
            try:
                mlflow.end_run()
            except Exception:
                pass

    log.info("Training complete.")


if __name__ == "__main__":
    main()
