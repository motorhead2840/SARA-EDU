# ─── Custom SageMaker HyperPod Container Image ────────────────────────────────
# Built with: Python 3.11, CUDA 12.1 compatibility, JAX, Julia, and the Python-Julia bridge.

# Start from NVIDIA CUDA runtime with devel tools for compiling CUDA extensions
FROM nvidia/cuda:12.1.1-devel-ubuntu22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    JULIA_PATH=/usr/local/julia \
    PATH=/usr/local/julia/bin:${PATH}

# Install essential system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    ca-certificates \
    libgomp1 \
    python3.11 \
    python3.11-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set python3.11 as default python
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Install Julia
RUN JULIA_VERSION=1.10.2 && \
    curl -fL -o julia.tar.gz "https://julialang-s3.julialang.org/bin/linux/x64/${JULIA_VERSION%.*}/julia-${JULIA_VERSION}-linux-x86_64.tar.gz" && \
    mkdir -p "${JULIA_PATH}" && \
    tar -xzf julia.tar.gz -C "${JULIA_PATH}" --strip-components=1 && \
    rm julia.tar.gz

# Pre-install key Python and JAX-with-CUDA dependencies
RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel && \
    pip3 install --no-cache-dir \
    "jax[cuda12_pip]" -f https://storage.googleapis.com/jax-releases/jax_cuda_releases.html && \
    pip3 install --no-cache-dir \
    boto3 \
    confluent-kafka \
    juliacall \
    numpy \
    pandas \
    sympy

# Install and precompile Julia packages for Om-Lang support
RUN julia -e 'using Pkg; Pkg.add(["DifferentialEquations", "StaticArrays", "LinearAlgebra", "JSON"]); using DifferentialEquations, StaticArrays, LinearAlgebra, JSON'

# Verify installation of hybrid environment
RUN python3 -c "import jax; print('JAX version:', jax.__version__)" && \
    julia -e 'println("Julia initialized successfully.")'

# Set working directory for training jobs
WORKDIR /opt/ml/code

# Default entrypoint for SageMaker HyperPod training
ENTRYPOINT ["python3"]
