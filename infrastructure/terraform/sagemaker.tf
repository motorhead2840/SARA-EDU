# ─── SageMaker ────────────────────────────────────────────────────────────────

resource "aws_sagemaker_domain" "main" {
  domain_name = "${var.project}-${var.environment}"
  auth_mode   = "IAM"
  vpc_id      = aws_vpc.main.id
  subnet_ids  = aws_subnet.private[*].id

  default_user_settings {
    execution_role = aws_iam_role.sagemaker.arn

    jupyter_server_app_settings {
      default_resource_spec {
        instance_type       = "system"
        sagemaker_image_arn = data.aws_sagemaker_prebuilt_ecr_image.datascience.registry_path
      }
    }

    kernel_gateway_app_settings {
      default_resource_spec {
        instance_type = "ml.t3.medium"
      }
    }

    security_groups = [aws_security_group.ecs.id]
  }

  domain_settings {
    security_group_ids = [aws_security_group.ecs.id]
  }
}

data "aws_sagemaker_prebuilt_ecr_image" "datascience" {
  repository_name = "sagemaker-data-science-310-v1"
}

# Feature Group — student engagement features for ML
resource "aws_sagemaker_feature_group" "student_engagement" {
  feature_group_name             = "${var.project}-${var.environment}-student-engagement"
  record_identifier_feature_name = "student_id"
  event_time_feature_name        = "event_time"
  role_arn                       = aws_iam_role.sagemaker.arn

  online_store_config  { enable_online_store = true }
  offline_store_config {
    s3_storage_config { s3_uri = "s3://${aws_s3_bucket.sagemaker.id}/feature-store/student-engagement/" }
    disable_glue_table_creation = false
  }

  feature_definition { feature_name = "student_id";          feature_type = "String"     }
  feature_definition { feature_name = "event_time";          feature_type = "String"     }
  feature_definition { feature_name = "session_count_7d";    feature_type = "Integral"   }
  feature_definition { feature_name = "avg_session_length";  feature_type = "Fractional" }
  feature_definition { feature_name = "frustration_avg";     feature_type = "Fractional" }
  feature_definition { feature_name = "circuit_a_ratio";     feature_type = "Fractional" }
  feature_definition { feature_name = "subscription_tier";   feature_type = "String"     }
  feature_definition { feature_name = "is_subscribed";       feature_type = "Integral"   }
  feature_definition { feature_name = "country_tier";        feature_type = "String"     }
  feature_definition { feature_name = "churn_risk_score";    feature_type = "Fractional" }
}

# Model package group for Shri tutoring model versioning
resource "aws_sagemaker_model_package_group" "shri_tutor" {
  model_package_group_name        = "${var.project}-${var.environment}-shri-tutor"
  model_package_group_description = "Shri Academy AI tutor model versions"
}

# Endpoint configuration for real-time inference
resource "aws_sagemaker_endpoint_config" "churn_predictor" {
  name = "${var.project}-${var.environment}-churn-predictor"

  production_variants {
    variant_name           = "primary"
    model_name             = "${var.project}-${var.environment}-churn-model"
    initial_instance_count = 1
    instance_type          = "ml.t2.medium"
    initial_variant_weight = 1.0
  }

  data_capture_config {
    enable_capture              = true
    initial_sampling_percentage = 20
    destination_s3_uri          = "s3://${aws_s3_bucket.sagemaker.id}/data-capture/"
    capture_options { capture_mode = "Input" }
    capture_options { capture_mode = "Output" }
  }
}

# ─── SageMaker Notebook Instances for Shri & Cyberdemon ───────────────────────

# Lifecycle configuration for Cyberdemon (Witness) Instance
resource "aws_sagemaker_notebook_instance_lifecycle_configuration" "cyberdemon_lc" {
  name = "${var.project}-${var.environment}-cyberdemon-lc"

  on_start = base64encode(<<-EOF
    #!/bin/bash
    set -e
    
    # Create persistent philosophy and architecture directory
    DIR="/home/ec2-user/SageMaker/philosophy"
    mkdir -p "$DIR"
    
    # 1. Write the Shri Witness Architecture / SecOps documentation
    cat << 'INNER_EOF' > "$DIR/README_Witness.md"
    # Shri Witness Architecture & Cyberdemon Middleware

    ## Overview
    This SageMaker instance is dedicated to the development, training, and deployment of **Cyberdemon**, the protective middleware of the Shri Academy platform.

    The **Shri Witness Architecture** (inspired by the philosophical concept of the *Sakshi* or non-reactive, detached observer) is structured around two key poles:
    1. **The Witness (Cyberdemon)**: A vigilant, detached protective middleware that listens, logs, and analyzes interactions without interfering in the natural learning process, unless a critical safety threat is detected.
    2. **The Educator (Shri)**: A nurturing, Socratic, maternal guide that provides positive, adaptive guidance.

    ## Cyberdemon SecOps Protective Workflow
    Cyberdemon runs continuous threat assessment across three specialized vectors (scored from 0.0 to 1.0):
    * **Profanity**: Explicit slurs, hate speech, and derogatory terminology.
    * **Vulgarity**: Crude, degrading, or inappropriate conversational styles.
    * **PMI (Perverted Mentation Index)**: Complex, contextual behavioral patterns (grooming, violent ideation, dehumanization, radicalization).

    ### Composite Risk Calculation
    $$\text{Composite Risk} = 0.5 \times \text{PMI} + 0.3 \times \text{Profanity} + 0.2 \times \text{Vulgarity}$$

    ### Action Tiers
    * **CLEAN (< 0.15)**: Standard flow; 5% sampling is retained for training data diversity.
    * **LOW (< 0.40)**: Passive auditing and logging.
    * **MEDIUM (< 0.65)**: Soft warning to the session monitor.
    * **HIGH (< 0.85)**: Active moderator flag and session auditing.
    * **CRITICAL (>= 0.85)**: Immediate session intervention via the Cyberdemon event queue.

    ## Technical Infrastructure & Integration
    * **Event Queue**: Employs the Outbox pattern with the `secops_cyberdemon_events` database table. Dispatched events are indexed and archived in Amazon OpenSearch for safety forensic analysis.
    * **Weekly Retraining**: The RageSage HuggingFace DistilBERT training pipeline executes weekly to fine-tune the three-tier multi-label classifier, ensuring the safety threshold (F1 Macro >= 0.78) is constantly maintained.
    * **NVIDIA Confidential Computing**: Leveraging H100 GPU environments (p5.48xlarge) with remote attestation to ensure complete privacy of the educational dataset and operator-blind execution.
    INNER_EOF

    # 2. Write a mock scoring and threat monitoring script
    cat << 'INNER_EOF' > "$DIR/cyberdemon_witness.py"
    import re
    import json
    from datetime import datetime

    class CyberdemonWitness:
        # Class constants representing prior background noise probability / sensor priors.
        # This prevents division-by-zero or zero-scores for completely clean content,
        # representing standard conversational noise prior to deep evaluation.
        PROFANITY_BASELINE = 0.05
        VULGARITY_BASELINE = 0.05
        PMI_BASELINE = 0.02

        # The scaling coefficient controls the rate at which the graduated score asymptotically
        # approaches 1.0 as the number of matching toxic features increases.
        # A value of 0.35 provides a balanced, non-linear growth curve.
        SCALING_COEFFICIENT = 0.35

        def __init__(self):
            # NOTE: These are demonstration regex patterns.
            # Simple keyword matching will produce false positives on valid educational/academic
            # topics (e.g. studying 'substance abuse' or 'history of violence').
            # We showcase academic safeguarding here by compiling a whitelist of allowed educational
            # phrases to exclude them from the threat count.
            self.profanity_patterns = [re.compile(r"\b(hate|abus\w*|slur\w*)\b", re.I)]
            self.vulgarity_patterns = [re.compile(r"\b(crude|degrad\w*)\b", re.I)]
            self.pmi_patterns = [re.compile(r"\b(groom\w*|radicaliz\w*|violen\w*)\b", re.I)]
            self.whitelist_patterns = [
                re.compile(r"\bsubstance\s+abuse\b", re.I),
                re.compile(r"\bdomestic\s+abuse\b", re.I),
                re.compile(r"\bhistory\s+of\s+violence\b", re.I)
            ]

        def _get_graduated_score(self, text, compiled_patterns, baseline):
            # Bounded asymptotic scoring mechanism.
            # Instead of a linear multiplier with a hard min() cap, we use a rational function:
            # score = 1.0 - (1.0 - baseline) / (1.0 + self.SCALING_COEFFICIENT * matches)
            # This mathematically guarantees the output remains strictly within [baseline, 1.0)
            # and increases continuously with the count of matched toxic features.
            matches = 0
            for pattern in compiled_patterns:
                matches += len(pattern.findall(text))

            # Subtract occurrences that are part of whitelisted academic/educational phrases
            if compiled_patterns == self.profanity_patterns or compiled_patterns == self.pmi_patterns:
                for whitelist in self.whitelist_patterns:
                    matches -= len(whitelist.findall(text))
            matches = max(0, matches)

            if matches == 0:
                return baseline
            
            # We use a rational asymptotic function: score = 1 - (1 - b) / (1 + k * x).
            # This choice guarantees a bounded output in [baseline, 1.0) and implements
            # a diminishing marginal risk contribution for each additional matched threat.
            score = 1.0 - (1.0 - baseline) / (1.0 + self.SCALING_COEFFICIENT * matches)
            return round(score, 2)

        def score_content(self, text):
            profanity_score = self._get_graduated_score(text, self.profanity_patterns, self.PROFANITY_BASELINE)
            vulgarity_score = self._get_graduated_score(text, self.vulgarity_patterns, self.VULGARITY_BASELINE)
            pmi_score = self._get_graduated_score(text, self.pmi_patterns, self.PMI_BASELINE)

            # Composite formula
            composite = (pmi_score * 0.5) + (profanity_score * 0.3) + (vulgarity_score * 0.2)

            if composite >= 0.85:
                tier = "CRITICAL"
            elif composite >= 0.65:
                tier = "HIGH"
            elif composite >= 0.40:
                tier = "MEDIUM"
            elif composite >= 0.15:
                tier = "LOW"
            else:
                tier = "CLEAN"

            return {
                "text": text,
                "scores": {
                    "profanity": profanity_score,
                    "vulgarity": vulgarity_score,
                    "pmi": pmi_score
                },
                "composite_risk": round(composite, 4),
                "risk_tier": tier,
                "timestamp": datetime.utcnow().isoformat()
            }

    if __name__ == "__main__":
        witness = CyberdemonWitness()
        sample_inputs = [
            "Hello, I am excited to learn physics today!",
            "This is a crude and degrading phrase.",
            "I want to commit violence and radicalize people."
        ]
        print("--- Cyberdemon Shri Witness Score Report ---")
        for text in sample_inputs:
            report = witness.score_content(text)
            print(json.dumps(report, indent=2))
            print("-" * 40)
    INNER_EOF

    # Fix permissions so Jupyter can read/write files
    chown -R ec2-user:ec2-user "$DIR"

    # 3. Install auto-stop script for notebook idle shutdown (after 60 mins of inactivity)
    cat << 'AUTO_EOF' > /usr/local/bin/autostop.py
import re
import urllib.request
import json
import datetime
import subprocess

IDLE_LIMIT = 3600 # 60 minutes in seconds

def get_jupyter_info():
    try:
        res = subprocess.run(["jupyter", "server", "list"], capture_output=True, text=True)
        out = res.stdout
        if not out.strip() or "Currently running servers" not in out:
            res = subprocess.run(["jupyter", "notebook", "list"], capture_output=True, text=True)
            out = res.stdout
        
        match = re.search(r"http://localhost:(\d+)/\?token=([A-Za-z0-9_-]+)", out)
        if not match:
            match = re.search(r"http://localhost:(\d+)/", out)
        if match:
            port = match.group(1)
            token = match.group(2) if len(match.groups()) > 1 else ""
            return port, token
    except Exception as e:
        print(f"Error listing jupyter servers: {e}")
    print("Warning: Jupyter server detection failed or returned empty. Falling back to default port 8888.")
    return "8888", ""

def check_idle():
    port, token = get_jupyter_info()
    url = f"http://localhost:{port}/api/sessions"
    if token:
        url += f"?token={token}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            sessions = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error calling Jupyter sessions API: {e}")
        return False # Err on the side of caution: do not shutdown on API/network errors
    
    if not sessions:
        return True
        
    now = datetime.datetime.now(datetime.timezone.utc)
    for session in sessions:
        kernel = session.get("kernel", {})
        last_activity_str = kernel.get("last_activity")
        if last_activity_str:
            last_activity_str = last_activity_str.replace("Z", "+00:00")
            last_activity = datetime.datetime.fromisoformat(last_activity_str)
            idle_duration = (now - last_activity).total_seconds()
            if idle_duration < IDLE_LIMIT:
                print(f"Active session found. Kernel {kernel.get('id')} was active {idle_duration} seconds ago.")
                return False
    return True

if __name__ == "__main__":
    if check_idle():
        print("Instance is idle. Shutting down...")
        subprocess.run(["sudo", "shutdown", "-h", "now"])
    else:
        print("Instance is not idle.")
AUTO_EOF

    chmod +x /usr/local/bin/autostop.py

    # Cron schedule runs every 5 minutes. Combined with the 60-minute IDLE_LIMIT, 
    # this guarantees that the instance will be stopped within 60 to 65 minutes of absolute inactivity.
    cat << 'CRON_EOF' > /etc/cron.d/autostop
*/5 * * * * root /usr/bin/python3 /usr/local/bin/autostop.py >> /var/log/autostop.log 2>&1
CRON_EOF
    chmod 644 /etc/cron.d/autostop
  EOF
  )
}

# Lifecycle configuration for Shri (Maternal Mentor) Instance
resource "aws_sagemaker_notebook_instance_lifecycle_configuration" "shri_lc" {
  name = "${var.project}-${var.environment}-shri-lc"

  on_start = base64encode(<<-EOF
    #!/bin/bash
    set -e
    
    # Create persistent philosophy and architecture directory
    DIR="/home/ec2-user/SageMaker/philosophy"
    mkdir -p "$DIR"
    
    # 1. Write the Educational Psychology / Nataraja Guru documentation
    cat << 'INNER_EOF' > "$DIR/README_Sage_Mentor.md"
    # Shri — Maternal Sage Mentor & Unitive Pedagogy

    ## Philosophical Roots: Dr. Nataraja Guru
    This SageMaker instance is designed to train and develop the **Shri** conversational mentor, rooted deeply in the educational psychology and unitive philosophy of **Dr. Nataraja Guru** (1932, University of Paris, "The Personal Factor in the Educational Process").

    The core pedagogical framework is structured on a unitive, non-dual relationship between the teacher (Guru) and student (*educande* — Dr. Nataraja Guru's historical term for the student/learner):
    * **Bi-polar Relationship**: Education is a direct, unitive flow of understanding between the mentor and learner. There is no rigid dualism or authoritarian stance—the relationship is based on mutual trust, compassion, and emotional alignment.
    * **Maternal Care**: Mirroring the developmental stage where a mother's voice and nurturing presence establish complete emotional safety, Shri prioritizes building confidence and security before introducing intellectual challenges.
    * **Harmony of Inner and Outer**: Education must harmonize the student's inner spiritual and psychological growth with outer scientific, objective, and empirical understanding.

    ## The Three Stages of Student Growth
    The Shri mentor adjusts its interaction parameters based on three developmental stages:
    1. **Stage 1: Getting Comfortable (Safe Foundation)**:
       * *Pedagogical Focus*: Active emotional safety, zero judgment, warm and gentle Socratic introductions.
       * *Instructional Style*: supportive guidance, self-paced exploration, validation of thoughts over correctness.
    2. **Stage 2: Finding What You Love (Curiosity & Confidence)**:
       * *Pedagogical Focus*: Guided discovery, interest-focused custom curriculum.
       * *Instructional Style*: Active inquiry, soft challenges, expanding conceptual horizons, Socratic follow-ups.
    3. **Stage 3: Taking the Lead (Independent Deep Learning)**:
       * *Pedagogical Focus*: Student-led creation, active collaboration, project-driven learning.
       * *Instructional Style*: Collaborative partner-level dialogue, real-world application, peer review prep.

    ## Fine-tuning and Dataset Construction
    When constructing SFT (Supervised Fine-Tuning) datasets for Shri:
    * **Teacher-Student Distillation**: Generate structured question-answer pairs that utilize high-fidelity teacher models (e.g., Llama-3-Nemotron) to capture maternal Socratic prompting styles.
    * **Socratic Prompt Design**: Never present a direct answer immediately; instead, formulate supportive questions that guide the child to discover the truth within themselves.
    INNER_EOF

    # 2. Write a mock Socratic guidance script
    cat << 'INNER_EOF' > "$DIR/socratic_mentor.py"
    class SocraticMentor:
        def __init__(self, student_name, stage=1):
            self.student_name = student_name
            self.stage = stage

        def respond(self, student_input, topic):
            if self.stage == 1:
                # Stage 1: Warm, reassuring, no pressure, establishing safety
                return (
                    f"Dear {self.student_name}, thank you so much for sharing that! "
                    f"It is completely natural to think about {topic} in this way. "
                    f"There are no wrong answers here. What is one small detail about {topic} "
                    f"that caught your eye or made you smile today? Let's explore together!"
                )
            elif self.stage == 2:
                # Stage 2: Gentle Socratic prompting to inspire curiosity
                return (
                    f"Excellent observation, {self.student_name}! You've noticed a really "
                    f"important connection in {topic}. If we change one of the parts, "
                    f"what do you think would happen to the rest of the system? "
                    f"Take your time, and tell me what you see."
                )
            else:
                # Stage 3: High-level collaborative partner
                return (
                    f"Fascinating thesis, {self.student_name}. That connects beautifully "
                    f"to the unitive principles of {topic}. How would you design an experiment "
                    f"or a model to test this in a real-world scenario? I'd love to "
                    f"collaborate with you on drafting the blueprint!"
                )

    if __name__ == "__main__":
        print("--- Shri Maternal Socratic Mentor Simulation ---")
        student = "Aravind"
        
        # Simulate each stage
        for stage in [1, 2, 3]:
            mentor = SocraticMentor(student_name=student, stage=stage)
            response = mentor.respond("I think plants need light to grow but I'm not sure how they breathe.", "Photosynthesis")
            print(f"\n[STAGE {stage}] Student input: 'I think plants need light...'")
            print(f"Shri Response:\n{response}")
            print("-" * 50)
    INNER_EOF

    # Fix permissions so Jupyter can read/write files
    chown -R ec2-user:ec2-user "$DIR"

    # 3. Install auto-stop script for notebook idle shutdown (after 60 mins of inactivity)
    cat << 'AUTO_EOF' > /usr/local/bin/autostop.py
import re
import urllib.request
import json
import datetime
import subprocess

IDLE_LIMIT = 3600 # 60 minutes in seconds

def get_jupyter_info():
    try:
        res = subprocess.run(["jupyter", "server", "list"], capture_output=True, text=True)
        out = res.stdout
        if not out.strip() or "Currently running servers" not in out:
            res = subprocess.run(["jupyter", "notebook", "list"], capture_output=True, text=True)
            out = res.stdout
        
        match = re.search(r"http://localhost:(\\d+)/\\?token=([A-Za-z0-9_-]+)", out)
        if not match:
            match = re.search(r"http://localhost:(\\d+)/", out)
        if match:
            port = match.group(1)
            token = match.group(2) if len(match.groups()) > 1 else ""
            return port, token
    except Exception as e:
        print(f"Error listing jupyter servers: {e}")
    print("Warning: Jupyter server detection failed or returned empty. Falling back to default port 8888.")
    return "8888", ""

def check_idle():
    port, token = get_jupyter_info()
    url = f"http://localhost:{port}/api/sessions"
    if token:
        url += f"?token={token}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            sessions = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error calling Jupyter sessions API: {e}")
        return False # Err on the side of caution: do not shutdown on API/network errors
    
    if not sessions:
        return True
        
    now = datetime.datetime.now(datetime.timezone.utc)
    for session in sessions:
        kernel = session.get("kernel", {})
        last_activity_str = kernel.get("last_activity")
        if last_activity_str:
            last_activity_str = last_activity_str.replace("Z", "+00:00")
            last_activity = datetime.datetime.fromisoformat(last_activity_str)
            idle_duration = (now - last_activity).total_seconds()
            if idle_duration < IDLE_LIMIT:
                print(f"Active session found. Kernel {kernel.get('id')} was active {idle_duration} seconds ago.")
                return False
    return True

if __name__ == "__main__":
    if check_idle():
        print("Instance is idle. Shutting down...")
        subprocess.run(["sudo", "shutdown", "-h", "now"])
    else:
        print("Instance is not idle.")
AUTO_EOF

    chmod +x /usr/local/bin/autostop.py

    # Cron schedule runs every 5 minutes. Combined with the 60-minute IDLE_LIMIT, 
    # this guarantees that the instance will be stopped within 60 to 65 minutes of absolute inactivity.
    cat << 'CRON_EOF' > /etc/cron.d/autostop
*/5 * * * * root /usr/bin/python3 /usr/local/bin/autostop.py >> /var/log/autostop.log 2>&1
CRON_EOF
    chmod 644 /etc/cron.d/autostop
  EOF
  )
}

# ─── SageMaker Notebook Instances ─────────────────────────────────────────────

# Cyberdemon Witness Instance (SecOps protective middleware)
resource "aws_sagemaker_notebook_instance" "cyberdemon_witness" {
  name                  = "${var.project}-${var.environment}-cyberdemon-witness"
  role_arn              = aws_iam_role.sagemaker.arn
  instance_type         = "ml.t3.medium"
  lifecycle_config_name = aws_sagemaker_notebook_instance_lifecycle_configuration.cyberdemon_lc.name

  subnet_id       = aws_subnet.private[0].id
  security_groups = [aws_security_group.ecs.id]

  direct_internet_access = "Disabled"

  tags = {
    Project      = var.project
    Environment  = var.environment
    Role         = "protective-middleware"
    Architecture = "shri-witness"
  }
}

# Shri Mentor Instance (Maternal Sage Mentor)
resource "aws_sagemaker_notebook_instance" "shri_mentor" {
  name                  = "${var.project}-${var.environment}-shri-mentor"
  role_arn              = aws_iam_role.sagemaker.arn
  instance_type         = "ml.t3.medium"
  lifecycle_config_name = aws_sagemaker_notebook_instance_lifecycle_configuration.shri_lc.name

  subnet_id       = aws_subnet.private[0].id
  security_groups = [aws_security_group.ecs.id]

  direct_internet_access = "Disabled"

  tags = {
    Project      = var.project
    Environment  = var.environment
    Role         = "maternal-sage-mentor"
    Pedagogy     = "dr-nataraja-guru-unitive"
  }
}

