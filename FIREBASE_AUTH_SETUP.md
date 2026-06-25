# Firebase Auth Setup (Click-by-Click)

This enables managed authentication for both apps while keeping your existing backend APIs.

## What you will get
- Users create account with their own email and password.
- Password verification is handled by Firebase Authentication.
- Your backend still issues TrimRide JWT tokens so the current app flow continues to work.

## 1. Create Firebase project
1. Go to https://console.firebase.google.com
2. Click Create a project.
3. Enter project name, e.g. TrimRide.
4. Continue and finish project creation.

## 2. Enable Email/Password auth
1. In Firebase Console, open your project.
2. Left menu: Build > Authentication.
3. Click Get started.
4. Open the Sign-in method tab.
5. Click Email/Password.
6. Enable Email/Password.
7. Save.

## 3. Get Web API key
1. Left menu: Project settings (gear icon).
2. In General tab, find Your apps.
3. If no Web app exists, click Add app > Web.
4. Register app name, e.g. trimride-web-config.
5. Copy the apiKey value from SDK config.
6. Keep this value for backend env: FIREBASE_WEB_API_KEY.

## 4. Create service account key JSON
1. In Firebase Console, Project settings.
2. Open Service accounts tab.
3. Click Generate new private key.
4. Confirm and download JSON file.
5. Place JSON on your machine, for example:
   C:\Users\SCHOOL\Downloads\trimride-firebase-adminsdk.json

## 5. Configure backend environment
Edit BarberBackend/.env and add/update:

PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barber_app
DB_USER=postgres
DB_PASSWORD=replace_with_your_password
JWT_SECRET=replace_with_a_secure_random_secret
CLIENT_ORIGIN=http://localhost:8081
FIREBASE_SERVICE_ACCOUNT_PATH=C:\\Users\\SCHOOL\\Downloads\\trimride-firebase-adminsdk.json
FIREBASE_AUTH_ENABLED=true
FIREBASE_WEB_API_KEY=your_firebase_web_api_key

## 6. Restart backend
1. Stop backend process if running.
2. Start again from BarberBackend:
   npm run dev

## 7. Validate in app
1. Open TrimRide Customer app.
2. Tap Create account.
3. Register with your own email/password.
4. Sign out and sign in with the same credentials.
5. Repeat in TrimRide Barber app with a different barber email.

## 8. Investor demo checklist
- Use your own real email naming pattern, not seeded demo accounts.
- Show account creation live on screen.
- Show successful sign-in after sign-out.
- Show that booking flow still works with newly created accounts.

## Troubleshooting
- Error: Managed authentication is enabled, but Firebase Admin is not configured.
  - Check FIREBASE_SERVICE_ACCOUNT_PATH points to a real JSON file.
- Error: FIREBASE_WEB_API_KEY is missing.
  - Add FIREBASE_WEB_API_KEY in BarberBackend/.env and restart backend.
- Error: Email already exists.
  - Use login flow or another email address.
