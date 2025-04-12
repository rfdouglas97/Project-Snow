
# Flask + Supabase OAuth and Storage Demo

A modern web application that demonstrates integration between a Flask backend and Supabase services for authentication, database management, and file storage.

## Project info

**URL**: https://lovable.dev/projects/80abf56c-759b-449a-9d84-dc9ecb2b2969

## Features

- **OAuth Authentication**: Support for Google and Apple sign-in
- **Secure File Storage**: Upload and manage files with Supabase Storage
- **User Management**: User registration and profile management
- **API Testing Interface**: Interactive UI to test backend endpoints

## Getting Started with the Backend

### Prerequisites

- Python 3.8 or higher
- Supabase account and project

### Setup Instructions

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up environment variables (in a production environment):
   ```
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_KEY=your_supabase_key
   export SECRET_KEY=your_flask_secret_key
   ```

4. Run the Flask application:
   ```
   flask run
   ```

## Frontend Development

The frontend is built with React and communicates with the Flask backend. To run the frontend:

```
npm run dev
```

## Connecting to Supabase

To enable the full functionality of this application, you need to connect it to Supabase:

1. Open Lovable and click on the green Supabase button in the top right
2. Connect to your Supabase project or create a new one
3. Configure the necessary Supabase resources:
   - Auth providers (Google, Apple)
   - Storage buckets
   - Database tables

## API Endpoints

### Authentication
- `/api/auth/google` - Initiate Google OAuth flow
- `/api/auth/apple` - Initiate Apple OAuth flow

### Storage
- `/api/storage/upload` - Upload files to Supabase Storage
- `/api/storage/files` - List files from Supabase Storage

### User Management
- `/api/users/me` - Get current user information

### System
- `/api/health` - Health check endpoint

## Security Considerations

- All API endpoints that handle user data or files are protected with authentication
- Files are securely uploaded with proper validation
- OAuth flows follow security best practices
