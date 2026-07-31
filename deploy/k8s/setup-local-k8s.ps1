# =============================================================================
# Eventify — Local Backend K8s & Skaffold Setup Script (PowerShell)
# =============================================================================

Write-Host '[INFO] Starting Eventify Backend Kubernetes & Skaffold Setup...' -ForegroundColor Green

# Add standard install paths to current session PATH
if (Test-Path 'C:\Program Files\Kubernetes\Minikube') {
    $env:Path += ';C:\Program Files\Kubernetes\Minikube'
}

# Function to Refresh System PATH inside running PowerShell session
function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
    if (Test-Path 'C:\Program Files\Kubernetes\Minikube') {
        $env:Path += ';C:\Program Files\Kubernetes\Minikube'
    }
}

# 1. Check & Auto-Install Minikube if missing
if (-not (Get-Command minikube -ErrorAction SilentlyContinue)) {
    Write-Host '[INFO] Minikube CLI is not found. Attempting automatic installation...' -ForegroundColor Yellow
    
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host '[INFO] Installing Minikube via Winget...' -ForegroundColor Yellow
        winget install Kubernetes.minikube --accept-source-agreements --accept-package-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host '[INFO] Installing Minikube via Chocolatey...' -ForegroundColor Yellow
        choco install minikube -y
    } else {
        Write-Host '[INFO] Downloading Minikube Windows installer...' -ForegroundColor Yellow
        $installerPath = "$env:TEMP\minikube-installer.exe"
        Invoke-WebRequest -Uri 'https://github.com/kubernetes/minikube/releases/latest/download/minikube-installer.exe' -OutFile $installerPath
        Write-Host '[INFO] Running Minikube silent installation...' -ForegroundColor Yellow
        Start-Process -FilePath $installerPath -ArgumentList '/S' -Wait
    }
    
    Refresh-Path
}

# 2. Check & Auto-Install kubectl if missing
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host '[INFO] kubectl CLI is not found. Attempting automatic installation...' -ForegroundColor Yellow
    
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host '[INFO] Installing kubectl via Winget...' -ForegroundColor Yellow
        winget install Kubernetes.kubectl --accept-source-agreements --accept-package-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host '[INFO] Installing kubectl via Chocolatey...' -ForegroundColor Yellow
        choco install kubernetes-cli -y
    }
    
    Refresh-Path
}

# Re-verify Minikube binary availability
if (-not (Get-Command minikube -ErrorAction SilentlyContinue)) {
    Write-Host '[ERROR] Minikube installation completed, but binary is not yet in PATH.' -ForegroundColor Red
    Write-Host '[INFO] Please restart your terminal window and re-run "pnpm k8s:setup".' -ForegroundColor Yellow
    exit 1
}

# 3. Start Minikube Cluster with Memory Limit matching Docker Desktop limits (2560MB)
Write-Host '[INFO] Checking Minikube cluster status...' -ForegroundColor Yellow
$status = minikube status --format '{{.Host}}' 2>$null
if ($status -ne 'Running') {
    Write-Host '[INFO] Starting Minikube cluster (2 CPUs, 2560MB RAM)...' -ForegroundColor Yellow
    minikube start --cpus=2 --memory=2560
} else {
    Write-Host '[OK] Minikube cluster is already running.' -ForegroundColor Green
}

# 4. Connect Docker CLI to Minikube's Docker Daemon
Write-Host '[INFO] Pointing Docker CLI to Minikube environment...' -ForegroundColor Yellow
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# 5. Build eventify/api Docker Image Inside Minikube Registry
Write-Host '[INFO] Building Docker image eventify/api:latest inside Minikube daemon...' -ForegroundColor Yellow
docker build -t eventify/api:latest -f docker/Dockerfile.api .

# 6. Apply Backend Kubernetes Manifests
Write-Host '[INFO] Applying Backend K8s Manifests (PostgreSQL, Redis, NestJS API, HPA)...' -ForegroundColor Yellow
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/postgres-deployment.yaml
kubectl apply -f deploy/k8s/redis-deployment.yaml
kubectl apply -f deploy/k8s/api-deployment.yaml
kubectl apply -f deploy/k8s/hpa.yaml

# 7. Restart API deployment to use newly built image
kubectl rollout restart deployment/eventify-api -n eventify-system

# 8. Wait for Backend Pods
Write-Host '[INFO] Waiting for Backend Pods to become ready...' -ForegroundColor Yellow
kubectl rollout status deployment/postgres -n eventify-system --timeout=90s
kubectl rollout status deployment/redis -n eventify-system --timeout=90s
kubectl rollout status deployment/eventify-api -n eventify-system --timeout=120s

Write-Host '[OK] Backend Kubernetes Stack Initialized Successfully!' -ForegroundColor Green
Write-Host '--------------------------------------------------------'
kubectl get pods -n eventify-system
Write-Host '--------------------------------------------------------'

# 9. Launch Skaffold Dev Mode if installed
if (Get-Command skaffold -ErrorAction SilentlyContinue) {
    Write-Host '[INFO] Launching Skaffold Dev Mode with Live File Sync...' -ForegroundColor Cyan
    skaffold dev
} else {
    Write-Host '[INFO] Skaffold CLI not detected. Starting port-forwarding to API service...' -ForegroundColor Yellow
    Write-Host '[INFO] Access API at: http://localhost:3000/health' -ForegroundColor Cyan
    kubectl port-forward svc/eventify-api-service 3000:3000 -n eventify-system
}
