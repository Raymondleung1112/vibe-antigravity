const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;
const BUCKET_NAME = process.env.BUCKET_NAME;

// --- GCS & Multer Setup ---
const storage = new Storage();
// Use memory storage: keeps file in RAM buffer, ideal for stateless Cloud Run
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// Health check / serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload endpoint
app.post('/upload', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file received.' });
  }
  if (!BUCKET_NAME) {
    console.error('BUCKET_NAME environment variable is not set.');
    return res.status(500).json({ success: false, error: 'Server misconfiguration: BUCKET_NAME not set.' });
  }

  try {
    // Parse client-side EXIF metadata sent alongside the file
    let clientMetadata = {};
    if (req.body.metadata) {
      try {
        clientMetadata = JSON.parse(req.body.metadata);
      } catch (e) {
        console.warn('Could not parse metadata JSON from client:', e.message);
      }
    }

    // Build a unique, timestamped filename
    const timestamp = Date.now();
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const gcsFileName = `uploads/${timestamp}_${safeName}`;

    const bucket = storage.bucket(BUCKET_NAME);
    const blob = bucket.file(gcsFileName);

    // Build custom metadata object for the GCS object
    const customMetadata = {
      uploadedAt: new Date().toISOString(),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    };
    if (clientMetadata.dateTaken) customMetadata.dateTaken = clientMetadata.dateTaken;
    if (clientMetadata.latitude)  customMetadata.latitude  = String(clientMetadata.latitude);
    if (clientMetadata.longitude) customMetadata.longitude = String(clientMetadata.longitude);
    if (clientMetadata.altitude)  customMetadata.altitude  = String(clientMetadata.altitude);

    // Stream buffer to GCS
    await blob.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: customMetadata, // GCS custom metadata lives under this key
      },
    });

    console.log(`Uploaded ${gcsFileName} to gs://${BUCKET_NAME}`);
    res.json({
      success: true,
      message: 'Photo uploaded successfully!',
      gcsPath: `gs://${BUCKET_NAME}/${gcsFileName}`,
      metadata: customMetadata,
    });
  } catch (err) {
    console.error('GCS upload error:', err);
    res.status(500).json({ success: false, error: 'Upload to GCS failed.', details: err.message });
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
  console.log(`GCS Bucket: ${BUCKET_NAME || '(not configured)'}`);
});
