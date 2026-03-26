// Storage — saves letters to /tmp (Lambda) or local ./storage

const fs   = require('fs');
const path = require('path');

function getStoragePath() {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  return isLambda
    ? '/tmp/storage'
    : (process.env.STORAGE_PATH || path.join(__dirname, 'storage'));
}

function getS3Client() {
  // AWS SDK v3 is built into Lambda Node 20 runtime — no install needed
  const { S3Client } = require('@aws-sdk/client-s3');
  return new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
}

async function save(letterTypeId, text, pdfBuffer) {
  const storagePath = getStoragePath();
  fs.mkdirSync(storagePath, { recursive: true });

  const base    = `${letterTypeId}_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const mdPath  = path.join(storagePath, `${base}.md`);
  const pdfPath = path.join(storagePath, `${base}.pdf`);

  await fs.promises.writeFile(mdPath, text, 'utf8');
  await fs.promises.writeFile(pdfPath, pdfBuffer);

  if (process.env.S3_BUCKET) {
    try {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      const s3 = getS3Client();
      await Promise.all([
        s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: `${base}.md`,  Body: text,      ContentType: 'text/markdown' })),
        s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: `${base}.pdf`, Body: pdfBuffer, ContentType: 'application/pdf' })),
      ]);
    } catch (err) {
      console.error('S3 save error (non-fatal):', err.message);
    }
  }

  return { mdPath, pdfPath };
}

async function list() {
  // S3 path
  if (process.env.S3_BUCKET) {
    try {
      const { ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
      const s3 = getS3Client();

      const res = await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET }));
      const mdKeys = (res.Contents || [])
        .map(o => o.Key)
        .filter(k => k.endsWith('.md'))
        .sort()
        .reverse()
        .slice(0, 20);

      const letters = await Promise.all(mdKeys.map(async (key) => {
        try {
          const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
          const chunks = [];
          for await (const chunk of obj.Body) chunks.push(chunk);
          const text   = Buffer.concat(chunks).toString('utf8');
          const id     = key.replace('.md', '');
          const parts  = id.split('_');
          const dateStr = parts.slice(-1)[0];
          return { id, letterTypeId: parts.slice(0, -1).join('_'), text, createdAt: dateStr };
        } catch (err) {
          console.error('S3 get object error:', err.message);
          return null;
        }
      }));

      return letters.filter(Boolean);
    } catch (err) {
      console.error('S3 list error, falling back to local:', err.message);
      // fall through to local
    }
  }

  // Local filesystem fallback
  try {
    const storagePath = getStoragePath();
    if (!fs.existsSync(storagePath)) return [];

    const files = fs.readdirSync(storagePath)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, 20);

    return Promise.all(files.map(async (file) => {
      const id    = file.replace('.md', '');
      const text  = await fs.promises.readFile(path.join(storagePath, file), 'utf8');
      const parts = id.split('_');
      return { id, letterTypeId: parts.slice(0, -1).join('_'), text, createdAt: parts.slice(-1)[0] };
    }));
  } catch (err) {
    console.error('Local list error:', err.message);
    return []; // never throw — always return something
  }
}

module.exports = { save, list };
