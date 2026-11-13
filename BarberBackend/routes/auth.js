const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const requireAuth = require('../middleware/auth');
const { validate, Joi } = require('../middleware/validate');
const { parsePhoneNumberFromString } = require('libphonenumber-js/max');
const {
  isFirebaseAuthEnabled,
  createFirebaseUser,
  deleteFirebaseUser,
  deleteFirebaseUserByEmail,
  signInWithFirebasePassword,
} = require('../services/firebaseAuthService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

const registerSchema = Joi.object({
  email:     Joi.string().email().max(254).required(),
  password:  Joi.string().min(8).max(128).required(),
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName:  Joi.string().trim().min(1).max(50).required(),
  userType:  Joi.string().valid('customer', 'barber').required(),
  phone:     Joi.string().trim().max(30).optional().allow('', null).custom((value, helpers) => {
    if (value === '' || value == null) {
      return value;
    }

    const parsedPhone = parsePhoneNumberFromString(value);
    if (!parsedPhone || !parsedPhone.isValid()) {
      return helpers.error('string.invalidPhone');
    }

    return parsedPhone.number;
  }).messages({
    'string.invalidPhone': 'Enter a valid phone number with its country calling code.',
  }),
  address:   Joi.string().trim().optional().allow('', null),
  city:      Joi.string().trim().optional().allow('', null),
  state:     Joi.string().trim().optional().allow('', null),
  country:   Joi.string().trim().optional().allow('', null),
  latitude:  Joi.number().optional().allow('', null).empty(''),
  longitude: Joi.number().optional().allow('', null).empty(''),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().max(254).required(),
  password: Joi.string().min(1).max(128).required(),
});

const gmailSignupSchema = Joi.object({
  email:     Joi.string().email().max(254).required(),
  userType:  Joi.string().valid('customer', 'barber').required(),
  firstName: Joi.string().trim().max(50).optional().allow('', null),
  lastName:  Joi.string().trim().max(50).optional().allow('', null),
  phone:     Joi.string().trim().max(30).optional().allow('', null),
  country:   Joi.string().trim().max(100).optional().allow('', null),
  latitude:  Joi.number().optional().allow('', null).empty(''),
  longitude: Joi.number().optional().allow('', null).empty(''),
});

function deriveNamesFromGmail(email, firstName, lastName, userType) {
  const cleanFirst = String(firstName || '').trim();
  const cleanLast = String(lastName || '').trim();
  if (cleanFirst && cleanLast) {
    return { firstName: cleanFirst, lastName: cleanLast };
  }
  const handle = String(email || '').split('@')[0].replace(/\d+$/, '') || 'trimride';
  const parts = handle.split(/[._-]+/).filter(Boolean);
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  const derivedFirst = cleanFirst || (parts[0] ? capitalize(parts[0]) : 'TrimRide');
  const derivedLast = cleanLast || (parts[1] ? capitalize(parts[1]) : (userType === 'barber' ? 'Barber' : 'Member'));
  return { firstName: derivedFirst, lastName: derivedLast };
}

function createJwtForUser(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function createLocalUser({ email, password, firstName, lastName, userType, phone, profile_image, address, city, state, country }) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    'INSERT INTO users (email, password_hash, first_name, last_name, user_type, phone, profile_image, address, city, state, country) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, email, first_name, last_name, user_type, phone, country',
    [email, hashedPassword, firstName, lastName, userType, phone || null, profile_image, address || null, city || null, state || null, country || null]
  );

  return result.rows[0];
}

async function ensureBarberProfile(userType, userId, firstName, lastName, address, city, state, country, shop_image, latitude, longitude) {
  if (userType !== 'barber') {
    return;
  }

  const shopName = `${firstName} ${lastName} Barber`;
  const defaultAddress = address || 'Setup pending';
  
  await pool.query(
    `INSERT INTO barber_profiles (
       user_id, shop_name, shop_address, address, city, state, country, shop_image, latitude, longitude, description,
       is_active, rating, queue_count, estimated_wait_time
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, 0.00, 0, 0)`,
    [
      userId,
      shopName,
      defaultAddress,
      address || null,
      city || null,
      state || null,
      country || 'USA',
      shop_image || null,
      latitude || 0,
      longitude || 0,
      'Profile setup pending',
    ]
  );
}

function isFirebaseInvalidCredential(errorCode) {
  return [
    'INVALID_LOGIN_CREDENTIALS',
    'EMAIL_NOT_FOUND',
    'INVALID_PASSWORD',
    'USER_DISABLED',
  ].includes(errorCode);
}

// Register
router.post('/register', upload.fields([{ name: 'profile_image', maxCount: 1 }, { name: 'shop_image', maxCount: 1 }]), validate(registerSchema), async (req, res) => {
  const { email, password, firstName, lastName, userType, phone, address, city, state, country, latitude, longitude } = req.body;
  
  let profile_image = null;
  let shop_image = null;

  if (req.files) {
    if (req.files.profile_image) {
      profile_image = '/uploads/' + req.files.profile_image[0].filename;
    }
    if (req.files.shop_image) {
      shop_image = '/uploads/' + req.files.shop_image[0].filename;
    }
  }

  const firebaseAuthEnabled = isFirebaseAuthEnabled();
  let createdFirebaseUid = null;

  try {
    if (firebaseAuthEnabled) {
      const firebaseUser = await createFirebaseUser({
        email,
        password,
        firstName,
        lastName,
        phone,
      });
      createdFirebaseUid = firebaseUser.uid;
    }

    const user = await createLocalUser({
      email,
      password,
      firstName,
      lastName,
      userType,
      phone,
      profile_image,
      address,
      city,
      state,
      country,
    });

    await ensureBarberProfile(userType, user.id, firstName, lastName, address, city, state, country, shop_image, latitude, longitude);

    const token = createJwtForUser(user.id);
    res.json({ token, user });
  } catch (error) {
    if (createdFirebaseUid && error.code === '23505') {
      await deleteFirebaseUser(createdFirebaseUid);
    }

    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Email already exists' });
    }

    if (
      error.code === 'auth/invalid-phone-number' ||
      String(error.message || '').toUpperCase().includes('TOO_SHORT')
    ) {
      return res.status(400).json({
        error: 'Phone number is too short or invalid. Enter it with its country code, for example +27 71 234 5678.',
      });
    }

    if (error.code === 'firebase/admin-not-configured') {
      return res.status(500).json({
        error: 'Managed authentication is enabled, but Firebase Admin is not configured.',
      });
    }

    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    } else {
      return res.status(500).json({ error: error.message });
    }
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    const firebaseAuthEnabled = isFirebaseAuthEnabled();

    if (firebaseAuthEnabled) {
      try {
        await signInWithFirebasePassword(email, password);

        const localResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (localResult.rows.length === 0) {
          return res.status(401).json({
            error: 'Account exists in Firebase but not in TrimRide. Please create account in the app first.',
          });
        }

        const firebaseUser = localResult.rows[0];
        const token = createJwtForUser(firebaseUser.id);
        const userPayload = {
          id: firebaseUser.id,
          email: firebaseUser.email,
          firstName: firebaseUser.first_name,
          lastName: firebaseUser.last_name,
          userType: firebaseUser.user_type,
        };
        if (firebaseUser.phone) userPayload.phone = firebaseUser.phone;
        if (firebaseUser.country) userPayload.country = firebaseUser.country;
        return res.json({
          token,
          user: userPayload,
        });
      } catch (firebaseError) {
        if (firebaseError.code === 'firebase/web-api-key-missing') {
          return res.status(500).json({
            error: 'Managed authentication is enabled, but FIREBASE_WEB_API_KEY is missing.',
          });
        }

        if (!isFirebaseInvalidCredential(firebaseError.code)) {
          return res.status(500).json({ error: firebaseError.message });
        }
        // Invalid Firebase credentials can still be a legacy local user, so continue to local check.
      }
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createJwtForUser(user.id);
    const userPayload = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
    };
    if (user.phone) userPayload.phone = user.phone;
    if (user.country) userPayload.country = user.country;
    res.json({ token, user: userPayload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Current authenticated user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, user_type, phone, country FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result.rows[0];
    const userPayload = {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      userType: row.user_type,
    };
    if (row.country) userPayload.country = row.country;

    return res.json({
      user: userPayload,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Quick Gmail Sign-Up / Sign-In for Customer and Barber apps
router.post('/gmail-signup', validate(gmailSignupSchema), async (req, res) => {
  const { email, userType, firstName, lastName, phone, country, latitude, longitude } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail.endsWith('@gmail.com') && !normalizedEmail.endsWith('@googlemail.com')) {
    return res.status(400).json({ error: 'Please enter a valid @gmail.com address.' });
  }

  try {
    const existingResult = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);

    if (existingResult.rows.length > 0) {
      const existingUser = existingResult.rows[0];
      if (userType === 'barber') {
        const bpResult = await pool.query('SELECT id FROM barber_profiles WHERE user_id = $1', [existingUser.id]);
        if (bpResult.rows.length === 0) {
          await ensureBarberProfile(
            'barber',
            existingUser.id,
            existingUser.first_name || 'TrimRide',
            existingUser.last_name || 'Barber',
            existingUser.address,
            existingUser.city,
            existingUser.state,
            existingUser.country || country || 'South Africa',
            null,
            latitude || -26.2041,
            longitude || 28.0473
          );
        }
      }

      const token = createJwtForUser(existingUser.id);
      const userPayload = {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.first_name,
        lastName: existingUser.last_name,
        userType: existingUser.user_type,
      };
      if (existingUser.phone) userPayload.phone = existingUser.phone;
      if (existingUser.country) userPayload.country = existingUser.country;

      return res.json({
        token,
        user: userPayload,
        isNewUser: false,
      });
    }

    const names = deriveNamesFromGmail(normalizedEmail, firstName, lastName, userType);
    const autoPassword = `GmailAuth#${Date.now()}!${Math.random().toString(36).slice(2, 10)}`;
    const resolvedCountry = country || 'South Africa';

    if (isFirebaseAuthEnabled()) {
      try {
        await createFirebaseUser({
          email: normalizedEmail,
          password: autoPassword,
          firstName: names.firstName,
          lastName: names.lastName,
        });
      } catch (_fbErr) {
        // Best-effort Firebase sync so Gmail quick signup is never blocked
      }
    }

    const newUser = await createLocalUser({
      email: normalizedEmail,
      password: autoPassword,
      firstName: names.firstName,
      lastName: names.lastName,
      userType,
      phone: phone || null,
      profile_image: null,
      address: null,
      city: null,
      state: null,
      country: resolvedCountry,
    });

    await ensureBarberProfile(
      userType,
      newUser.id,
      names.firstName,
      names.lastName,
      null,
      null,
      null,
      resolvedCountry,
      null,
      latitude || -26.2041,
      longitude || 28.0473
    );

    const token = createJwtForUser(newUser.id);
    const userPayload = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name || names.firstName,
      lastName: newUser.last_name || names.lastName,
      userType: newUser.user_type || userType,
      country: newUser.country || resolvedCountry,
    };
    if (newUser.phone) userPayload.phone = newUser.phone;

    return res.json({
      token,
      user: userPayload,
      isNewUser: true,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Permanently delete user account (Mandatory for Google Play compliance)
router.delete('/delete-account', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { email } = userResult.rows[0];

    // Remove from Firebase auth if enabled
    if (isFirebaseAuthEnabled() && email) {
      await deleteFirebaseUserByEmail(email);
    }

    // Delete user from DB (cascades to barber_profiles, bookings, favorites, reviews, user_push_tokens)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.json({
      success: true,
      message: 'Account and associated data have been permanently deleted.',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;