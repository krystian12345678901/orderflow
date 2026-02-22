# 🔒 INSTRUKCJE ZABEZPIECZENIA ORDERFLOW

## ⚠️ KRYTYCZNE - Zastosuj NATYCHMIAST przed wdrożeniem

### 1. JWT Sekrety (auth.js)

**backend/src/auth.js** - zmień na:

```javascript
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// CRITICAL: Validate secrets at startup
if (!ACCESS_SECRET || ACCESS_SECRET.length < 32) {
  throw new Error("SECURITY: JWT_ACCESS_SECRET must be set and at least 32 characters!");
}
if (!REFRESH_SECRET || REFRESH_SECRET.length < 32) {
  throw new Error("SECURITY: JWT_REFRESH_SECRET must be set and at least 32 characters!");
}

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m", algorithm: "HS256" });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, { algorithms: ["HS256"] });  // CRITICAL: enforce algorithm
}

// Same for refresh tokens...
```

### 2. Validate UUID (files.js, orders.js)

Dodaj helper function:

```javascript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return UUID_REGEX.test(str);
}

// W każdym route:
router.get("/:orderId", (req, res) => {
  if (!isValidUUID(req.params.orderId)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  //...
});
```

### 3. Access Control - files.js

```javascript
// GET /api/files/orders/:orderId
router.get("/:orderId", authenticate, (req, res) => {
  if (!isValidUUID(req.params.orderId)) return res.status(400).json({ error: "Invalid ID" });
  
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  
  // CRITICAL: Check access rights
  const { user } = req;
  const isAdmin = user.roles.includes("administrator");
  const isOffice = user.roles.includes("office_employee");
  const isQC = user.roles.includes("quality_control");
  const isCreator = order.created_by === user.id;
  const isHolder = order.current_holder_id === user.id;
  
  if (!isAdmin && !isOffice && !isQC && !isCreator && !isHolder) {
    return res.status(403).json({ error: "No access to this order" });
  }
  
  // ... rest of code
});

// Same for download endpoint
```

### 4. Magic Bytes Validation

Install: `npm install file-type`

```javascript
const { fileTypeFromBuffer } = require('file-type');

router.post("/:orderId", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  
  // CRITICAL: Validate real file type (magic bytes)
  const buffer = await fs.promises.readFile(req.file.path);
  const type = await fileTypeFromBuffer(buffer);
  
  const allowedMimes = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'application/zip': '.zip',
    // Add more...
  };
  
  if (!type || !allowedMimes[type.mime]) {
    fs.unlinkSync(req.file.path);
    return res.status(415).json({ error: "Invalid file type" });
  }
  
  // Continue...
});
```

### 5. Remove SVG from allowed extensions

**backend/src/db.js** - seed section:

```javascript
const fileConfigs = [
  { role: "office_employee",  ext: ".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.zip,.rar" },  // NO .svg
  { role: "editor",           ext: ".pdf,.docx,.doc,.txt" },
  { role: "illustrator",      ext: ".ai,.pdf,.png,.eps,.zip" },  // NO .svg
  { role: "graphic_designer", ext: ".ai,.pdf,.indd,.png,.psd,.zip" },  // NO .svg
  { role: "printer",          ext: ".pdf" },
];
```

### 6. Max File Size 20MB

**backend/src/routes/files.js**:

```javascript
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },  // 20MB instead of 100MB
  //...
});
```

### 7. Trust Proxy (server.js)

```javascript
const app = express();
app.set("trust proxy", 1);  // ADD THIS LINE
```

### 8. Account Locking (auth.js route)

```javascript
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email=? AND is_active=1").get(email);
  
  if (!user) {
    // Log failed attempt
    db.prepare("INSERT INTO failed_logins (id,email,ip_address) VALUES (?,?,?)").run(
      uuidv4(), email, req.ip
    );
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  // Check if locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(429).json({ error: "Account temporarily locked" });
  }
  
  // Verify password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    // Increment failed attempts
    const attempts = user.failed_login_attempts + 1;
    if (attempts >= 5) {
      // Lock for 15 minutes
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      db.prepare("UPDATE users SET failed_login_attempts=?, locked_until=? WHERE id=?").run(attempts, lockedUntil, user.id);
    } else {
      db.prepare("UPDATE users SET failed_login_attempts=? WHERE id=?").run(attempts, user.id);
    }
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  // Reset failed attempts on successful login
  db.prepare("UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE id=?").run(user.id);
  
  // Continue with token generation...
});
```

### 9. Refresh Token Rotation (auth.js)

```javascript
router.post("/refresh", (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "No refresh token" });
  
  try {
    const payload = verifyRefreshToken(token);
    const stored = db.prepare("SELECT * FROM refresh_tokens WHERE user_id=? AND token_hash=? AND expires_at>datetime('now')").get(payload.sub, hashToken(token));
    if (!stored) return res.status(401).json({ error: "Token invalid" });
    
    // CRITICAL: Delete old token (rotation)
    db.prepare("DELETE FROM refresh_tokens WHERE id=?").run(stored.id);
    
    // Generate NEW refresh token
    const newRefresh = signRefreshToken({ sub: user.id });
    db.prepare("INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,datetime('now','+7 days'))").run(uuidv4(), user.id, hashToken(newRefresh));
    
    // Set new cookie
    res.cookie("refresh_token", newRefresh, { httpOnly:true, secure: process.env.NODE_ENV==="production", sameSite:"strict", maxAge: REFRESH_EXPIRES_MS, path:"/api/auth" });
    
    res.json({ accessToken: signAccessToken({ sub: user.id, roles }) });
  } catch { 
    res.status(401).json({ error: "Token invalid" });
  }
});
```

### 10. Input Validation (Joi)

Install: `npm install joi`

```javascript
const Joi = require('joi');

const orderSchema = Joi.object({
  clientName: Joi.string().min(2).max(200).required(),
  clientEmail: Joi.string().email().optional(),
  productType: Joi.string().min(2).max(100).required(),
  //...
});

router.post("/orders", authenticate, authorize("office_employee", "administrator"), (req, res) => {
  const { error, value } = orderSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  
  // Use validated 'value' instead of req.body
  //...
});
```

## 📦 Google Drive Integration

### Setup:

1. Utwórz Service Account w Google Cloud Console
2. Włącz Google Drive API
3. Pobierz JSON key file
4. Udostępnij folder na Drive dla service account email

**backend/.env**:
```
GOOGLE_DRIVE_ENABLED=true
GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
```

**backend/src/gdrive.js** (nowy plik):

```javascript
const { google } = require('googleapis');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

let drive = null;

function initDrive() {
  if (!process.env.GOOGLE_DRIVE_ENABLED || process.env.GOOGLE_DRIVE_ENABLED !== 'true') {
    return null;
  }
  
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: SCOPES,
  });
  
  drive = google.drive({ version: 'v3', auth });
  return drive;
}

async function uploadFile(filePath, fileName, mimeType) {
  if (!drive) initDrive();
  if (!drive) throw new Error("Google Drive not enabled");
  
  const fileMetadata = {
    name: fileName,
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
  };
  
  const media = {
    mimeType,
    body: fs.createReadStream(filePath)
  };
  
  const file = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id'
  });
  
  return file.data.id;
}

async function downloadFile(fileId, destPath) {
  if (!drive) initDrive();
  const dest = fs.createWriteStream(destPath);
  
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  
  return new Promise((resolve, reject) => {
    response.data
      .on('end', () => resolve())
      .on('error', reject)
      .pipe(dest);
  });
}

async function deleteFile(fileId) {
  if (!drive) initDrive();
  await drive.files.delete({ fileId });
}

module.exports = { uploadFile, downloadFile, deleteFile };
```

**W files.js - użyj GDrive**:

```javascript
const gdrive = require('../gdrive');

router.post("/:orderId", upload.single("file"), async (req, res) => {
  // ... validation ...
  
  let gdriveId = null;
  let storageType = 'local';
  
  if (process.env.GOOGLE_DRIVE_ENABLED === 'true') {
    try {
      gdriveId = await gdrive.uploadFile(req.file.path, req.file.filename, req.file.mimetype);
      storageType = 'gdrive';
      // Delete local file after successful upload
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error('GDrive upload failed, using local storage:', err);
      // Fall back to local storage
    }
  }
  
  db.prepare("INSERT INTO order_files (..., gdrive_id, storage_type) VALUES (..., ?, ?)").run(..., gdriveId, storageType);
  //...
});
```

## ✅ Checklist

Przed wdrożeniem na produkcję:

- [ ] JWT sekrety ustawione (min 32 znaki)
- [ ] UUID validation we wszystkich routes
- [ ] Access control w files.js
- [ ] Magic bytes validation
- [ ] SVG usunięte z allowed_extensions
- [ ] Max file size 20MB
- [ ] Trust proxy = 1
- [ ] Account locking (5 attempts)
- [ ] Refresh token rotation
- [ ] Input validation (Joi)
- [ ] Google Drive włączony (opcjonalnie)
- [ ] HTTPS na serwerze (nginx + certbot)
- [ ] Backup bazy danych codziennie

## 🔧 Testowanie

```bash
# Test JWT secrets
curl http://localhost:5000/api/health
# Should start without "dev-secret" in env

# Test file upload
curl -X POST http://localhost:5000/api/files/orders/INVALID_UUID
# Should return 400 "Invalid ID format"

# Test account locking
# Try 5 failed logins -> should lock account
```

## 📞 Wsparcie

W razie pytań o implementację - skonsultuj się z developerem.
