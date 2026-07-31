#!/usr/bin/env bash

# =============================================================================
# Eventify — Local Backend K8s & Skaffold Setup Script (Bash)
# =============================================================================

set -e

echo "🚀 Starting Eventify Backend Kubernetes & Skaffold Setup..."

# 1. Check & Auto-Install Minikube if missing
if ! command -v minikube &> /dev/null; then
    echo "⚡ Minikube is not installed. Attempting automatic installation..."
    if command -v brew &> /dev/null; then
        echo "Installing Minikube via Homebrew..."
        brew install minikube
    else
        echo "Downloading Minikube binary..."
        curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
        chmod +x minikube
        sudo mv minikube /usr/local/bin/
    fi
fi

# 2. Check & Auto-Install kubectl if missing
if ! command -v kubectl &> /dev/null; then
    echo "⚡ kubectl is not installed. Attempting automatic installation..."
    if command -v brew &> /dev/null; then
        brew install kubectl
    else
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        chmod +x kubectl
        sudo mv kubectl /usr/local/bin/
    fi
fi

# 3. Start Minikube Cluster
if ! minikube status | grep -q "Running"; then
    echo "⚡ Starting Minikube cluster (2 CPUs, 2560MB RAM)..."
    minikube start --cpus=2 --memory=2560
else
    echo "✓ Minikube cluster is already running."
fi

# 4. Connect Docker CLI to Minikube's Docker Daemon
echo "🔌 Pointing Docker CLI to Minikube environment..."
eval $(minikube -p minikube docker-env)

# 5. Apply Backend Kubernetes Manifests
echo "⚙️ Applying Backend K8s Manifests (PostgreSQL, Redis, NestJS API, HPA)..."
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/postgres-deployment.yaml
kubectl apply -f deploy/k8s/redis-deployment.yaml
kubectl apply -f deploy/k8s/api-deployment.yaml
kubectl apply -f deploy/k8s/hpa.yaml

# 6. Wait for Backend Pods
echo "⏳ Waiting for Backend Pods to become ready..."
kubectl rollout status deployment/postgres -n eventify-system --timeout=90s
kubectl rollout status deployment/redis -n eventify-system --timeout=90s
kubectl rollout status deployment/eventify-api -n eventify-system --timeout=90s

echo ""
echo "🎉 Backend Kubernetes Stack Initialized Successfully!"
echo "--------------------------------------------------------"
kubectl get pods -n eventify-system
echo "--------------------------------------------------------"

# 7. Launch Skaffold Dev Mode if installed
if command -v skaffold &> /dev/null; then
    echo "🔥 Launching Skaffold Dev Mode with Live File Sync..."
    skaffold dev
else
    echo "💡 Skaffold is not installed. Running port-forward manually."
    echo "🔗 Access API at: http://localhost:3000/health"
    kubectl port-forward svc/eventify-api-service 3000:3000 -n eventify-system
fi
