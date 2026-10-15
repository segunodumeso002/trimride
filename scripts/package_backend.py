import os
import zipfile

backend_dir = r"c:\Users\SCHOOL\Desktop\Launch-codes\BarberBackend"
zip_path = r"c:\Users\SCHOOL\Desktop\Launch-codes\app-v11.zip"

excluded_dirs = {"node_modules", ".git", ".vscode", "coverage", "app_versions"}
excluded_files = {".env"}

if os.path.exists(zip_path):
    os.remove(zip_path)

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(backend_dir):
        # Filter directories in-place
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        
        for file in files:
            if file in excluded_files or file.endswith('.log') or file.startswith('temp'):
                continue
            
            full_path = os.path.join(root, file)
            # Compute relative path and normalize to POSIX forward slashes
            rel_path = os.path.relpath(full_path, backend_dir)
            posix_path = rel_path.replace('\\', '/')
            zipf.write(full_path, posix_path)

print(f"Created {zip_path} with size {os.path.getsize(zip_path)} bytes")
