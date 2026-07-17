"""
pipeline.py - Orchestrates the full OpenCourseWare (OCW) Data Acquisition, Curation, and Processing pipeline.
Integrates MLflow for tracking dataset versions, artifacts, and curation metrics.
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path

# Set up module imports
sys.path.insert(0, str(Path(__file__).parent))

from crawler import OCWCrawler
from curator import OCWCurator
from processor import OCWProcessor

try:
    import mlflow
    _mlflow_available = True
except ImportError:
    mlflow = None
    _mlflow_available = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("OCWPipeline")


def main():
    repo_root = Path(__file__).resolve().parent.parent
    default_output_dir = str(repo_root / "data" / "ocw_curated")
    
    parser = argparse.ArgumentParser(description="SHRI-ACADEMY OCW Integration Pipeline")
    parser.add_argument("--output-dir", default=default_output_dir, help="Directory to save curated outputs")
    parser.add_argument("--quality-threshold", type=float, default=0.3, help="Minimum quality score for curation (0.0 to 1.0)")
    parser.add_argument("--pairs-per-doc", type=int, default=4, help="Q&A pairs to generate per curated document")
    parser.add_argument("--skip-simulation", action="store_true", help="Set to True to force live web-crawling instead of pre-packaged course data")
    parser.add_argument("--urls", nargs="+", help="Optional list of custom URLs to crawl")
    parser.add_argument("--mlflow-tracking-uri", default="sqlite:////tmp/mlflow.db", help="MLflow tracking URI")
    args = parser.parse_args()

    logger.info("🚀 Starting SHRI-ACADEMY OpenCourseWare (OCW) Integration Pipeline...")

    # 1. Initialize MLflow if available
    mlflow_run = None
    if _mlflow_available and mlflow:
        try:
            mlflow.set_tracking_uri(args.mlflow_tracking_uri)
            mlflow.set_experiment("shri-academy-ocw-pipeline")
            mlflow_run = mlflow.start_run(run_name="ocw-ingest-curate")
            mlflow.log_params({
                "quality_threshold": args.quality_threshold,
                "pairs_per_doc": args.pairs_per_doc,
                "simulation_mode": not args.skip_simulation,
                "custom_urls_count": len(args.urls) if args.urls else 0,
            })
            logger.info("Initialized MLflow run for tracking and versioning.")
        except Exception as e:
            logger.warning(f"Failed to initialize MLflow tracking: {e}")

    try:
        # 2. Step 1: Ingest / Crawl
        logger.info("Step 1: Data Acquisition / Crawling...")
        crawler = OCWCrawler(use_simulation=not args.skip_simulation)
        raw_docs = crawler.crawl(source_urls=args.urls)
        
        if _mlflow_available and mlflow_run:
            mlflow.log_metric("raw_docs_count", len(raw_docs))

        # 3. Step 2: Quality Curation & Safety Filters
        logger.info("Step 2: Quality Curation, Safety Screening, and Deduplication...")
        curator = OCWCurator()
        curated_docs = curator.curate(raw_docs, quality_threshold=args.quality_threshold)
        
        if _mlflow_available and mlflow_run:
            mlflow.log_metric("curated_docs_count", len(curated_docs))
            mlflow.log_metric("discarded_docs_count", len(raw_docs) - len(curated_docs))

        # 4. Step 3: Format & Process
        logger.info("Step 3: Conversion and Processing for Pre-training and SFT fine-tuning...")
        processor = OCWProcessor(output_dir=args.output_dir)
        
        pretrain_path = processor.process_for_pretraining(curated_docs)
        sft_path = processor.process_for_sft(curated_docs, pairs_per_doc=args.pairs_per_doc)

        # Convert paths to be relative to the repository root for maximum portability
        try:
            rel_pretrain = str(pretrain_path.relative_to(repo_root))
            rel_sft = str(sft_path.relative_to(repo_root))
        except ValueError:
            rel_pretrain = str(pretrain_path)
            rel_sft = str(sft_path)

        # 5. Step 4: Versioning and Manifest Generation
        manifest_data = {
            "pipeline_status": "success",
            "raw_documents_ingested": len(raw_docs),
            "curated_documents_retained": len(curated_docs),
            "pretrain_corpus_path": rel_pretrain,
            "sft_dataset_path": rel_sft,
            "quality_threshold": args.quality_threshold,
            "pairs_per_doc": args.pairs_per_doc,
        }

        manifest_path = Path(args.output_dir) / "manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as m_file:
            json.dump(manifest_data, m_file, indent=2)
            
        logger.info(f"Manifest written successfully to {manifest_path}")

        # Log artifacts to MLflow
        if _mlflow_available and mlflow_run:
            try:
                mlflow.log_artifact(str(pretrain_path), artifact_path="datasets/pretrain")
                mlflow.log_artifact(str(sft_path), artifact_path="datasets/sft")
                mlflow.log_artifact(str(manifest_path), artifact_path="manifests")
                logger.info("Logged datasets and manifest as MLflow run artifacts.")
            except Exception as e:
                logger.warning(f"Failed to log artifacts to MLflow: {e}")

        print(json.dumps(manifest_data, indent=2))

    except Exception as pipeline_err:
        logger.error(f"❌ Pipeline failed: {pipeline_err}")
        if _mlflow_available and mlflow_run:
            mlflow.set_tag("pipeline_status", "failed")
            mlflow.set_tag("error", str(pipeline_err))
        sys.exit(1)
        
    finally:
        if _mlflow_available and mlflow_run:
            try:
                mlflow.end_run()
                logger.info("Closed MLflow tracking run.")
            except Exception:
                pass


if __name__ == "__main__":
    main()
