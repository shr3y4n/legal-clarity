# Legal Clarity Development Runner
Write-Host "Starting Legal Clarity in Development Mode..." -ForegroundColor Cyan

# Check venv
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "Virtual environment not found. Run: python -m venv .venv; .\.venv\Scripts\pip.exe install -r backend/requirements.txt" -ForegroundColor Red
    exit 1
}

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Legal Clarity Backend...' -ForegroundColor Green; .\.venv\Scripts\uvicorn.exe app.main:app --app-dir backend --reload --port 8000"

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Legal Clarity Frontend...' -ForegroundColor Yellow; cd frontend; npm run dev"

Write-Host "Backend: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:5173" -ForegroundColor Yellow
