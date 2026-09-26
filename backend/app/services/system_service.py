"""
NEXUS EDGE System Inspection Service
Provides truthful local host diagnostics without fabricating unverified hardware.
"""
import platform
import os
import psutil
from datetime import datetime, timezone


def get_system_metrics() -> dict:
    """
    Returns authentic system metrics inspected from the local host.
    Any hardware not confirmed by the platform runtime is explicitly marked
    as 'Not detected', 'Not configured', or 'Unknown'.
    """
    # Authentic OS details
    os_name = platform.system()
    os_release = platform.release()
    os_version = platform.version()
    machine = platform.machine()
    processor = platform.processor() or "Unknown"

    # Authentic Memory
    mem = psutil.virtual_memory()
    total_mem_gb = round(mem.total / (1024 ** 3), 2)
    available_mem_gb = round(mem.available / (1024 ** 3), 2)
    used_mem_percent = mem.percent

    # Authentic CPU
    cpu_count_physical = psutil.cpu_count(logical=False) or "Unknown"
    cpu_count_logical = psutil.cpu_count(logical=True) or "Unknown"

    return {
        "system": {
            "os": f"{os_name} {os_release}",
            "os_family": os_name,
            "os_version": os_version,
            "architecture": machine,
            "processor": processor,
            "cpu_physical_cores": cpu_count_physical,
            "cpu_logical_threads": cpu_count_logical,
            "total_memory_gb": total_mem_gb,
            "available_memory_gb": available_mem_gb,
            "memory_usage_percent": used_mem_percent,
        },
        "runtime": {
            "status": "Ready",
            "provider": "NEXUS Local Edge Engine",
            "model": "Not configured (Phase 2)",
            "execution_mode": "Local Edge Process",
            "phase": "Phase 1 - Product Foundation",
            "privacy_boundary": "Local-only / Zero Cloud Telemetry",
        },
        "acceleration": {
            "cpu": f"Detected ({processor})",
            "gpu": "Not configured",
            "npu": "Not detected",
            "qnn_runtime": "Not configured (Edge target runtime)",
            "inference_engine": "CPU Fallback (Phase 1 Baseline)",
            "tops_rating": "Unknown",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
