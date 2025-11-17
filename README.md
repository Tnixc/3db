# 3db

A UI for using GitHub repositories as a CDN/file store. Masks URLs.




https://github.com/user-attachments/assets/d866a86d-551b-4cad-918e-35fd61471477






> [!WARNING]
> This project is experimental and unstable. Use at your own risk and only for non-critical data.

## How it Works

3db provides a simple interface to:

1. Create and manage GitHub repositories as storage
2. Upload, browse and manage files
3. Get masked CDN links to your files

When you first authenticate:

1. A repository called '3db-service' is created to store metadata
2. You can create new repos or connect existing ones
3. Files uploaded are stored in public GitHub repositories
4. Files are accessible via encrypted short URLs that mask the underlying GitHub paths

## Features

- GitHub OAuth authentication
- **Encrypted URL masking for file links**
- Create and connect multiple repositories
- Upload and delete files
- Browse files and folders
- Copy CDN-friendly links
- Delete files and folders

## Limitations

- Only public repositories are supported
- GitHub has a soft limit of 5GB per repository
- Files are publicly accessible via masked URLs
- API rate limits may apply
- Not suitable for sensitive data
