# School ERP — Setup Guide (Public site + Internal, split)

Same Firebase project, but now **two separate front-ends**:

```
school-erp-final/              → deploy this whole folder as your website root
  index.html                    → public landing page
  login.html                    → Student & Parent login ONLY
  register.html                 → Student & Parent self-registration
  student/dashboard.html
  parent/dashboard.html
  css/, js/                     → shared styles + Firebase helpers for the public site

  internal/                     → NOT linked from anywhere on the public site
    login.html                  → Staff & Admin login ONLY
    staff/dashboard.html
    admin/dashboard.html
    css/, js/                   → its own copy, so it's fully independent of the public site
  robots.txt                    → tells search engines not to index /internal/
```

Nothing on `index.html`, `login.html`, or anywhere a student/parent can click leads to `/internal/`.
The only way in is knowing the URL directly: `yoursite.com/internal/login.html`.

## Important: this is obscurity, not security

Hiding the path stops it from being *discovered* casually or indexed by Google — it does **not**
stop someone who guesses/finds the URL from trying to log in. The real access control is still the
Firestore rules: `internal/login.html` checks the signed-in user's role in Firestore and immediately
signs out + rejects anyone who isn't `staff` or `admin`, and `login.html` on the public site does the
same in reverse (rejects staff/admin accounts). So even if someone finds `/internal/` and tries a
student's email/password, they get bounced. Firestore rules (below) enforce this server-side too —
the login page check is just a friendly redirect, not the actual gate.

If you want a stronger wall later, options in order of effort:
1. **Keep as-is** — fine for a school where "hidden path" + role-checked login is enough deterrent.
2. Put `/internal/` behind **HTTP Basic Auth** at the hosting/CDN level (Firebase Hosting doesn't
   support this natively — you'd need Cloudflare in front, or host `/internal/` separately on
   something like Netlify with password protection).
3. Deploy `/internal/` to a **completely different domain/subdomain** you don't publish anywhere
   (e.g. an unguessable one like `mgmt-8f2a.yourschool.edu.in`) with its own DNS record.

## Everything else is unchanged

Same Firebase project, same Firestore/Storage rules, same `js/firebase-config.js` values — just
**paste your config into both copies**: `js/firebase-config.js` AND `internal/js/firebase-config.js`
(they're separate files so the two sites don't depend on each other, but they must point at the
same Firebase project so data is shared).

Firestore rules, Storage rules, first-admin creation steps, and day-one workflow are all identical
to before — see the rules block below, or reuse what you already set up if you're just replacing
files on top of your existing deploy.

### Firestore Rules (paste into Firestore → Rules)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function myRole() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
    function isAdmin() { return signedIn() && myRole() == 'admin'; }
    function isStaff() { return signedIn() && myRole() == 'staff'; }
    function isAdminOrStaff() { return isAdmin() || isStaff(); }

    match /users/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isAdminOrStaff());
      allow create: if signedIn() && request.auth.uid == uid;
      allow update, delete: if isAdmin();
    }
    match /classes/{classId} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }
    match /students/{studentUid} {
      allow read: if signedIn() && (
        request.auth.uid == studentUid || resource.data.parentUid == request.auth.uid || isAdminOrStaff()
      );
      allow create: if signedIn() && request.auth.uid == studentUid;
      allow update: if isAdminOrStaff() || (signedIn() && request.auth.uid == studentUid);
      allow delete: if isAdmin();
    }
    match /staff/{staffUid} {
      allow read: if signedIn() && (request.auth.uid == staffUid || isAdminOrStaff());
      allow write: if isAdmin();
    }
    match /parents/{parentUid} {
      allow read: if signedIn() && (request.auth.uid == parentUid || isAdminOrStaff());
      allow create: if signedIn() && request.auth.uid == parentUid;
      allow update, delete: if isAdmin();
    }
    match /attendance/{docId} { allow read: if signedIn(); allow write: if isAdminOrStaff(); }
    match /marks/{docId}      { allow read: if signedIn(); allow write: if isAdminOrStaff(); }
    match /exams/{docId}      { allow read: if signedIn(); allow write: if isAdminOrStaff(); }
    match /notes/{docId}      { allow read: if signedIn(); allow write: if isAdminOrStaff(); }
    match /homework/{docId}   { allow read: if signedIn(); allow write: if isAdminOrStaff(); }
  }
}
```

### Storage Rules (paste into Storage → Rules)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /notes/{allPaths=**}    { allow read: if request.auth != null; allow write: if request.auth != null; }
    match /homework/{allPaths=**} { allow read: if request.auth != null; allow write: if request.auth != null; }
  }
}
```

## Creating your first Admin account (manual, one time)

1. Firebase Console → **Authentication → Users → Add user** — create admin's email + password.
2. Copy the generated **User UID**.
3. **Firestore → users** collection → new doc, ID = that UID → fields: `role: "admin"`, `name`, `email`.
4. Log in at `yoursite.com/internal/login.html`.

From there, Admin creates every staff login from **Admin → Staff → Create Staff Account** — that
still uses a secondary Firebase Auth instance internally so creating a staff account doesn't log
the admin out, same as before.

## Deploying

Deploy the whole `school-erp-final/` folder as one static site (Firebase Hosting, Netlify, etc.) —
`/internal/` just becomes a normal subfolder on the same domain that nothing links to:

```
npm install -g firebase-tools
firebase login
firebase init hosting     # public directory = this folder, single-page app: No
firebase deploy
```
