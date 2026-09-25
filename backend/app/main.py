from fastapi import FastAPI

app = FastAPI(
    title="AI-Assisted Forensic Recovery API",
    description="Backend API for intelligent data recovery and digital evidence reconstruction",
    version="1.0.0",
)


@app.get("/")
def root():
    return {
        "message": "Forensic Recovery API is running",
        "status": "success"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }