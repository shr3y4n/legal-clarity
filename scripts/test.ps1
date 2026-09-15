# Legal Clarity Test Runner
Write-Host "Running Ruff Linter..." -ForegroundColor Cyan
.\.venv\Scripts\ruff.exe check backend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Lint check failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Running Pytest Test Suite with Coverage..." -ForegroundColor Cyan
.\.venv\Scripts\pytest.exe -v --cov=app --cov-report=term-missing

if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend tests failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Building & Typechecking Frontend..." -ForegroundColor Cyan
cd frontend
npm run build
cd ..

Write-Host "All Tests & Builds Passed Cleanly!" -ForegroundColor Green
