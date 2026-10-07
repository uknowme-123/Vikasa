# Vikāsa ESP32 Firmware - Build Version Script
# Generates version information for the firmware

Import("env")
import datetime
import subprocess

def get_git_version():
    """Get version from git tags or commit hash."""
    try:
        # Try to get latest tag
        tag = subprocess.check_output(
            ["git", "describe", "--tags", "--always", "--dirty"],
            stderr=subprocess.DEVNULL,
            cwd=env.subst("$PROJECT_DIR")
        ).decode().strip()
        return tag
    except:
        pass
    
    try:
        # Fallback to short commit hash
        hash = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            cwd=env.subst("$PROJECT_DIR")
        ).decode().strip()
        return f"dev-{hash}"
    except:
        pass
    
    return "unknown"

def generate_version_header():
    """Generate version.h with build information."""
    version = get_git_version()
    build_date = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    
    header_content = f'''// Auto-generated version header - DO NOT EDIT
// Generated on {build_date}

#ifndef VERSION_H
#define VERSION_H

#define FIRMWARE_GIT_VERSION "{version}"
#define FIRMWARE_BUILD_DATE "{build_date}"

#endif // VERSION_H
'''
    
    version_path = env.subst("$PROJECT_DIR/include/version.h")
    with open(version_path, "w") as f:
        f.write(header_content)
    
    print(f"Generated version.h: {version}")

# Generate version header before build
generate_version_header()

# Also add as build flag
env.Append(BUILD_FLAGS=[f'-D FIRMWARE_GIT_VERSION="{get_git_version()}"'])