# 3db

A UI for using GitHub repositories as a CDN/file store. Also get masked cdn links



https://github.com/user-attachments/assets/8ba55030-f049-4248-baf9-cc471043b027







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
4. Direct CDN links are provided via GitHub's raw content URLs

## Features

- GitHub OAuth authentication
- **Copy masked CDN links**
- Create and connect multiple repositories
- ️Upload, rename and delete files

## Limitations

- Only public repositories are supported
- GitHub has a soft limit of 5GB per repository
- Files are publicly accessible
- API rate limits may apply
- Not suitable for sensitive data
