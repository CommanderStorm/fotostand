# Fotostand API Documentation

## File Upload Endpoint

### POST `/api/upload/:galleryId`

Upload images to a specific gallery.

#### Authentication

This endpoint requires Bearer token authentication. The token must be configured in your `config.user.ts`.

**Step 1: Generate a secure token:**
```bash
# Generate a random token
openssl rand -hex 32
```

**Step 2: Configure in `config.user.ts`:**
```typescript
export const config: Partial<FotostandConfig> = {
  server: {
    uploadToken: "your-generated-token-here"
  }
};
```

**Security Note:** 
- Uses constant-time comparison (timingSafeEqual) to prevent timing attacks
- Keep the token secure and don't commit it to version control
- Consider using environment variables for production deployments

#### Request

**Headers:**
- `Authorization: Bearer <your-upload-token>`
- `Content-Type: multipart/form-data`

**Parameters:**
- `galleryId` (path parameter): The gallery identifier (e.g., three-word code)

**Body:**
- `file`: The image file to upload

#### Constraints

- **Maximum file size:** 50MB
- **Allowed file types:**
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/webp`
  - `image/heic`
  - `image/heif`

#### Response

**Success (201 Created):**
```json
{
  "success": true,
  "filename": "1234567890_abc123.jpg",
  "galleryId": "happy-blue-sky"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid gallery ID, no file provided, file too large, or invalid file type
- `401 Unauthorized` - Missing or invalid authentication token
- `500 Internal Server Error` - Server error during upload
- `503 Service Unavailable` - Upload not configured (no token set)

#### Security Features

1. **Path Traversal Prevention**: Gallery IDs are validated to prevent directory traversal attacks
2. **Authentication**: Bearer token required for all uploads
3. **File Type Validation**: Only image files are accepted
4. **File Size Limits**: Maximum 50MB per file
5. **Unique Filenames**: Files are stored with timestamp and random suffix to prevent collisions

#### Example Usage

```bash
# Use the original token (NOT the hash) in the Authorization header
curl -X POST \
  -H "Authorization: Bearer your-original-token-here" \
  -F "file=@/path/to/image.jpg" \
  https://your-domain.com/api/upload/happy-blue-sky
```

#### File Storage

- Files are stored in `./data/{galleryId}/`
- Original filenames are replaced with unique identifiers
- Metadata is stored in `./data/{galleryId}/metadata.json`

#### Metadata Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "eventTitle": "MyEvent",
  "uploadedFiles": 5
}
```

The metadata file tracks the upload timestamp, event title, and total number of uploaded files in the gallery.
