
# Environment Variables

This document provides a simplified guide to setting up the required environment variables for the transcript processing system.

## Essential Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PYTHON_BACKEND_URL` | URL of your Python backend for processing transcripts (e.g., http://your-api-domain.com/api) | Yes |
| `PYTHON_BACKEND_KEY` | Authentication key for the Python backend | No |

## Setting Up Environment Variables

### For Supabase Edge Functions

1. Navigate to your Supabase project dashboard
2. Go to Project Settings → Edge Functions → Environment Variables
3. Add the required environment variables:
   - `PYTHON_BACKEND_URL` - The URL to your Python backend service
   - `PYTHON_BACKEND_KEY` - The authentication key (if required)

### Testing Your Configuration

Once you've set up the environment variables, you can use the Transcript Diagnostics page to verify that everything is configured correctly:

1. Navigate to the Transcript Diagnostics page
2. Check the "Environment Configuration" section to see if your variables are properly set
3. The "Backend Connectivity" indicator will show if your system can successfully connect to the Python backend

## Troubleshooting

If you're experiencing issues with transcript processing:

1. Check that the PYTHON_BACKEND_URL environment variable is set correctly
2. Verify that your Python backend is running and accessible
3. Ensure your Python backend has a `/health` endpoint for connectivity checks
4. Review the Transcript Diagnostics page for any stuck or failed transcripts
5. Use the "Retry Processing" option for any stuck transcripts

## Next Steps

If you don't have a Python backend set up yet:
1. Create a simple Python API with FastAPI or Flask
2. Implement a `/health` endpoint that returns a 200 OK response
3. Deploy it to a hosting service (Heroku, AWS, GCP, etc.)
4. Add the URL to your Supabase environment variables

For more detailed information about the system architecture, please refer to the documentation in the project repository.
