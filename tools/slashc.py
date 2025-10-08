#!/usr/bin/env python3
import sys
import os
import re
import json
import subprocess
from pathlib import Path
from argparse import ArgumentParser

try:
    import yaml
    from jsonschema import validate
except ImportError:
    print("Error: Required Python packages 'PyYAML' and 'jsonschema' are not installed.")
    print("Please install them using: pip install PyYAML jsonschema")
    sys.exit(1)

# --- Configuration ---
SCHEMA_PATH = Path("tools/schemas/command.schema.json")
TEMP_DIR = Path(".out/tmp")
LOG_DIR = Path(".out/logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)

# --- Core Logic ---

def load_schema():
    """Loads the JSON schema for command front-matter."""
    if not SCHEMA_PATH.exists():
        print(f"Error: Schema file not found at {SCHEMA_PATH}")
        sys.exit(1)
    with open(SCHEMA_PATH, 'r') as f:
        return json.load(f)

def parse_markdown(file_path: Path):
    """
    Parses Markdown for YAML front-matter and bash blocks.
    Validates that only front-matter and fenced code blocks are present.
    """
    content = file_path.read_text()
    parts = re.split(r'^(?:---\s*\n|\s*```)', content, flags=re.MULTILINE)
    
    # The split results in: [pre-yaml-prose, yaml-content, post-yaml-prose, bash-lang, bash-content, post-bash-prose, ...]
    # We expect the first element (pre-yaml-prose) to be empty or whitespace.
    
    if len(parts) < 3 or parts[1].strip() == '':
        print(f"Error: Missing YAML front-matter in {file_path}")
        sys.exit(1)

    # Check for prose outside of blocks
    # Remove YAML front-matter block completely, including surrounding whitespace/newlines
    # Remove YAML front-matter block completely, including surrounding whitespace/newlines
    # Remove YAML front-matter block completely, including surrounding whitespace/newlines
    prose_check = re.sub(r'^\s*---\s*.*?^\s*---\s*', '', content, flags=re.MULTILINE | re.DOTALL)
    
    # Match fenced code blocks globally, including language specifiers and attributes on the opening line.
    # We remove the '$' anchor to allow matching multiple blocks and trailing whitespace/newlines.
    prose_check = re.sub(r'^\s*```.*?^\s*```\s*', '', prose_check, flags=re.MULTILINE | re.DOTALL)
    
    # Strip all remaining whitespace and newlines before checking for prose
    if prose_check.strip():
        print(f"Validation Error: Found non-block prose in {file_path}. Only YAML front-matter and fenced ```bash blocks are allowed.")
        sys.exit(1)

    # Extract YAML
    try:
        front_matter = yaml.safe_load(parts[1])
    except yaml.YAMLError as e:
        print(f"YAML Parsing Error in {file_path}: {e}")
        sys.exit(1)

    # Extract Bash blocks
    bash_blocks = []
    block_names = set()
    
    # Iterate through the remaining parts, looking for code fences
    i = 2
    while i < len(parts):
        if parts[i].strip().startswith('yaml'):
            # Skip YAML blocks after the first one (which is handled above)
            i += 2
            continue
        
        if parts[i].strip().startswith('bash'):
            header = parts[i].strip()
            if i + 1 >= len(parts):
                print(f"Validation Error: Incomplete bash block in {file_path}")
                sys.exit(1)
            
            bash_content = parts[i+1].strip()
            
            # Check for unique name=
            name_match = re.search(r'name=(\w+)', header)
            if not name_match:
                print(f"Validation Error: Bash block missing 'name=' attribute in {file_path}")
                sys.exit(1)
            
            block_name = name_match.group(1)
            if block_name in block_names:
                print(f"Validation Error: Duplicate bash block name '{block_name}' in {file_path}")
                sys.exit(1)
            block_names.add(block_name)
            
            bash_blocks.append(bash_content)
            i += 2
        else:
            # This should not happen if prose_check passed, but as a safeguard
            if parts[i].strip():
                print(f"Validation Error: Found non-bash code fence or unexpected content in {file_path}")
                sys.exit(1)
            i += 1

    if not bash_blocks:
        print(f"Validation Error: No bash code blocks found in {file_path}")
        sys.exit(1)

    return front_matter, bash_blocks

def validate_front_matter(data, schema):
    """Validates front-matter data against the JSON schema."""
    try:
        validate(instance=data, schema=schema)
    except Exception as e:
        print(f"Schema Validation Error: {e}")
        sys.exit(1)

def compile_script(slash_name: str, bash_blocks: list) -> Path:
    """Concatenates bash blocks into a temporary executable script."""
    script_content = ["#!/bin/bash", "set -euxo pipefail", ""]
    
    for block in bash_blocks:
        script_content.append(block)
        script_content.append("")
        
    compiled_script_path = TEMP_DIR / f"{slash_name}.sh"
    compiled_script_path.write_text('\n'.join(script_content))
    
    # Make the script executable (important for Docker execution)
    os.chmod(compiled_script_path, 0o755)
    
    return compiled_script_path

def run_docker(image: str, compiled_script_path: Path, slash_name: str, outputs: list):
    """
    Executes the compiled script inside a Docker container.
    Mounts $PWD as /src (read-only) and $PWD/.out as /out (write-only).
    """
    print(f"--- Running /{slash_name} in Docker ---")
    
    # Ensure .out directory exists for volume mount
    Path(".out").mkdir(exist_ok=True)
    
    # Docker command construction
    # We execute the script using /bin/sh, which is standard for Alpine images.
    # The script itself contains the necessary shebang and set flags.
    
    # We execute the script directly from the host's /tmp directory, which is mounted
    # into the container's /tmp directory by Docker implicitly.
    
    # The script needs to be executed from /src (the working directory)
    
    docker_cmd = [
        "docker", "run", "--rm",
        "-v", f"{Path.cwd()}:/src:ro",
        "-v", f"{Path.cwd() / '.out'}:/out",
        "-w", "/src",
        "--entrypoint", "/bin/sh",
        image,
        f"/tmp/{compiled_script_path.name}"
    ]
    
    log_file = LOG_DIR / f"{slash_name}.log"
    
    try:
        with open(log_file, "w") as log:
            process = subprocess.run(
                docker_cmd,
                check=True,
                stdout=log,
                stderr=subprocess.STDOUT,
                text=True
            )
        print(f"Docker run successful. Logs written to {log_file}")
        
        # Verify declared outputs exist
        print("--- Verifying Outputs ---")
        all_outputs_exist = True
        for output in outputs:
            # Check if the output path exists relative to the current working directory
            if not Path(output).exists():
                print(f"Output Verification Failed: Declared output '{output}' does not exist.")
                all_outputs_exist = False
            else:
                print(f"Output Verified: '{output}' exists.")
                
        if not all_outputs_exist:
            print(f"Error: One or more declared outputs are missing for /{slash_name}.")
            sys.exit(1)
            
    except subprocess.CalledProcessError as e:
        print(f"Docker run failed for /{slash_name}. Exit code: {e.returncode}")
        print(f"Check logs at {log_file} for details.")
        sys.exit(e.returncode)
    except FileNotFoundError:
        print("Error: 'docker' command not found. Is Docker installed and in your PATH?")
        sys.exit(1)


def handle_file(file_path: Path, schema, mode: str):
    """Handles validation or running of a single slash command file."""
    print(f"Processing file: {file_path} (Mode: {mode})")
    
    front_matter, bash_blocks = parse_markdown(file_path)
    validate_front_matter(front_matter, schema)
    
    if mode == 'validate':
        print(f"Validation successful for {file_path}.")
        return

    # Mode == 'run'
    slash_name = front_matter['slash']
    image = front_matter['image']
    outputs = front_matter['outputs']
    
    compiled_script_path = compile_script(slash_name, bash_blocks)
    
    # Note: Policy enforcement (e.g., network=install-only) is complex and requires
    # advanced Docker/iptables setup. For this implementation, we focus on the core
    # parsing, validation, compilation, and execution flow.
    
    run_docker(image, compiled_script_path, slash_name, outputs)
    
    # Clean up temporary script
    compiled_script_path.unlink()
    print(f"Execution of /{slash_name} completed successfully.")


def main():
    parser = ArgumentParser(description="Slash Command Compiler and Runner (slashc)")
    subparsers = parser.add_subparsers(dest='command', required=True)

    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate one or more slash command Markdown files.')
    validate_parser.add_argument('files', nargs='+', type=Path, help='Paths to the Markdown files.')

    # Run command
    run_parser = subparsers.add_parser('run', help='Compile and run a single slash command Markdown file.')
    run_parser.add_argument('file', type=Path, help='Path to the Markdown file.')

    args = parser.parse_args()
    
    schema = load_schema()

    if args.command == 'validate':
        for file_path in args.files:
            if not file_path.exists():
                print(f"Error: File not found: {file_path}")
                sys.exit(1)
            handle_file(file_path, schema, 'validate')
        print("\nAll files validated successfully.")
        
    elif args.command == 'run':
        if not args.file.exists():
            print(f"Error: File not found: {args.file}")
            sys.exit(1)
        handle_file(args.file, schema, 'run')

if __name__ == "__main__":
    main()