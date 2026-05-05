from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import tender, evaluate, report

app = FastAPI(title="TenderTrace AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tender.router, prefix="/tender", tags=["Tender"])
app.include_router(evaluate.router, prefix="/evaluate", tags=["Evaluate"])
app.include_router(report.router, prefix="/report", tags=["Report"])

@app.get("/")
def home():
    return {"message": "TenderTrace AI Backend is Running! ✨"}