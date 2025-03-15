#!/usr/bin/env python3
"""
Batch File Processor for Memory-Optimized Vectorization

This script processes a batch of files for vectorization, which helps
reduce memory usage when dealing with large codebases.
"""

import argparse
import json
import os
import sys
import time
from typing import Dict, List, Any, Set
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("batch_processor")

# Placeholder for actual vectorization functions if Python is available
try:
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    PYTHON_DEPS_AVAILABLE = True
except ImportError:
    logger.warning("Scientific Python dependencies not available, using mock implementation")
    PYTHON_DEPS_AVAILABLE = False


def detect_language(file_path: str) -> str:
    """Detect the programming language of a file based on its extension and content."""
    ext = os.path.splitext(file_path)[1].lower()
    
    language_map = {
        '.js': 'javascript',
        '.jsx': 'jsx',
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.py': 'python',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.h': 'c',
        '.hpp': 'cpp',
        '.cs': 'csharp',
        '.go': 'go',
        '.rb': 'ruby',
        '.php': 'php',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.rs': 'rust',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.json': 'json',
        '.md': 'markdown',
        '.xml': 'xml',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.sh': 'shell',
        '.bat': 'batch',
        '.ps1': 'powershell',
    }
    
    return language_map.get(ext, 'unknown')


def read_file_content(file_path: str, max_size: int = 1024 * 1024) -> str:
    """Read file content with safety limits for large files."""
    try:
        file_size = os.path.getsize(file_path)
        if file_size > max_size:
            logger.warning(f"File too large, truncating: {file_path} ({file_size} bytes)")
            with open(file_path, 'r', errors='replace') as f:
                return f.read(max_size)
        else:
            with open(file_path, 'r', errors='replace') as f:
                return f.read()
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {str(e)}")
        return ""


def vectorize_content(content: str, file_path: str) -> Dict[str, Any]:
    """Generate vector for file content."""
    if not PYTHON_DEPS_AVAILABLE:
        # Mock implementation
        return {
            "success": True,
            "vector_size": 100,
            "vector_type": "mock"
        }
    
    try:
        # Simple TF-IDF vectorization for demonstration
        vectorizer = TfidfVectorizer(max_features=100)
        vector = vectorizer.fit_transform([content])
        
        # Convert to a storable format
        dense_vector = vector.toarray()[0]
        
        return {
            "success": True,
            "vector": dense_vector.tolist(),
            "vector_size": len(dense_vector),
            "vector_type": "tfidf"
        }
    except Exception as e:
        logger.error(f"Error vectorizing {file_path}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def process_file(file_path: str, output_dir: str) -> Dict[str, Any]:
    """Process a single file and generate its vector."""
    if not os.path.exists(file_path):
        return {"success": False, "error": f"File not found: {file_path}"}
    
    try:
        # Detect language
        language = detect_language(file_path)
        
        # Read content
        content = read_file_content(file_path)
        if not content:
            return {"success": False, "error": "Empty or unreadable file"}
        
        # Generate vectors
        vector_result = vectorize_content(content, file_path)
        if not vector_result["success"]:
            return vector_result
        
        # Create relative path for storage
        file_basename = os.path.basename(file_path)
        
        # Create vector data
        vector_data = {
            "file": file_path,
            "language": language,
            "timestamp": time.time(),
            "vectorization": vector_result
        }
        
        # Generate output filename
        output_filename = os.path.join(
            output_dir, 
            f"{hash(file_path) % 10000}_{file_basename}.vec.json"
        )
        
        # Save vector to file
        with open(output_filename, 'w') as f:
            json.dump(vector_data, f)
        
        return {
            "success": True,
            "language": language,
            "output_file": output_filename
        }
        
    except Exception as e:
        logger.error(f"Error processing {file_path}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def process_batch(batch_file: str, output_dir: str, job_id: str) -> Dict[str, Any]:
    """Process a batch of files for vectorization."""
    start_time = time.time()
    
    try:
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Load batch file
        with open(batch_file, 'r') as f:
            batch_data = json.load(f)
        
        files = batch_data.get("files", [])
        if not files:
            return {
                "success": False,
                "message": "No files in batch",
                "files_processed": 0,
                "processing_time": time.time() - start_time
            }
        
        logger.info(f"Processing batch of {len(files)} files for job {job_id}")
        
        # Process each file
        results = []
        processed_count = 0
        failed_count = 0
        languages_detected: Set[str] = set()
        
        for file_path in files:
            result = process_file(file_path, output_dir)
            results.append(result)
            
            if result["success"]:
                processed_count += 1
                languages_detected.add(result.get("language", "unknown"))
            else:
                failed_count += 1
        
        total_time = time.time() - start_time
        
        return {
            "success": True,
            "message": f"Processed {processed_count} files, {failed_count} failed",
            "files_processed": processed_count,
            "files_failed": failed_count,
            "vectors_created": processed_count,  # Assume one vector per file
            "languages_detected": list(languages_detected),
            "processing_time": total_time,
            "files_per_second": processed_count / total_time if total_time > 0 else 0
        }
    
    except Exception as e:
        logger.error(f"Error processing batch: {str(e)}")
        return {
            "success": False,
            "message": f"Batch processing error: {str(e)}",
            "files_processed": 0,
            "processing_time": time.time() - start_time
        }


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Process a batch of files for vectorization")
    parser.add_argument("batch_file", help="JSON file containing the list of files to process")
    parser.add_argument("output_dir", help="Directory to store vector outputs")
    parser.add_argument("--job-id", help="Job identifier", default="unknown")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.batch_file):
        logger.error(f"Batch file not found: {args.batch_file}")
        return 1
    
    # Process the batch
    result = process_batch(args.batch_file, args.output_dir, args.job_id)
    
    # Output result as JSON
    print(json.dumps(result))
    
    return 0 if result["success"] else 1


if __name__ == "__main__":
    sys.exit(main()) 