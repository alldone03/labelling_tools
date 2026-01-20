# Make-Sense Backend

Backend API untuk image annotation menggunakan YOLO.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
```

2. Activate virtual environment:
- Windows:
  ```bash
  venv\Scripts\activate
  ```
- Linux/Mac:
  ```bash
  source venv/bin/activate
  ```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server akan berjalan di: `http://localhost:8000`

## API Endpoints

### POST /annotate
Upload gambar untuk mendapatkan anotasi dari model YOLO.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file (image file)

**Response:**
```json
{
  "success": true,
  "annotations": [
    {
      "bbox": [x, y, width, height],
      "class": "person",
      "score": 0.95
    }
  ],
  "count": 1
}
```

## Notes

- Model YOLO yang digunakan: `yolov8n.pt` (nano version)
- Model akan otomatis didownload saat pertama kali dijalankan
- CORS sudah dikonfigurasi untuk `http://localhost:3000`
