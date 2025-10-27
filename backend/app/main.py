# backend/app/main.py

from datetime import datetime
from typing import Optional, List, Dict, Any

import os
from uuid import uuid4

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from dotenv import load_dotenv

# Firebase Admin / Firestore
import firebase_admin
from firebase_admin import credentials, firestore


# -------------------------------
# Create app and enable CORS for calls
# -------------------------------
app = FastAPI(title="Event Planner API", version="0.3.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------
# Firestore init
# -------------------------------
# load the backend/.env
load_dotenv()
# Get firebase credentials path
cred_path = os.getenv("FIREBASE_CREDENTIALS")
if not cred_path or not os.path.exists(cred_path):
    raise RuntimeError("FIREBASE_CREDENTIALS env var not set or file not found")
# Initialize the firebase admin SDK
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

# Create the Firestore client
db = firestore.client()
# Define a collection for events
events_col = db.collection("events")


# -------------------------------
# Schemas for data formatting
# -------------------------------

# Creating a new event
class EventCreate(BaseModel):
    # Title: Required string
    title: str = Field(..., min_length=1)
    # dateTime should be formatted like "2025-11-01T14:30:00"
    date: datetime
    # Description: Not required
    description: Optional[str] = None

# Updating an event
class EventUpdate(BaseModel):
    # Each field is optional, so users can edit whichever field when necessary
    title: Optional[str] = Field(None, min_length=1)
    date: Optional[datetime] = None
    description: Optional[str] = None

# Defines what API returns to front end
class Event(BaseModel):
    id: str
    title: str
    date: datetime
    description: Optional[str] = None


# -------------------------------
# Helper functions
# -------------------------------
# Takes data from Firestore and converts to Event model
def event_doc_to_model(doc: firestore.DocumentSnapshot) -> Event:
    # Check if document exists
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    # convert doc to dictionary
    d = doc.to_dict() or {}

    # Convert Firestore Timestamp to Python datetime
    date_value = d.get("date")
    if hasattr(date_value, "to_datetime"):
        date_value = date_value.to_datetime()  # returns timezone-aware UTC datetime

    # Return as an event model
    return Event(
        id=doc.id,
        title=d.get("title", ""),
        date=date_value,
        description=d.get("description"),
    )


# -------------------------------
# Basic routes
# -------------------------------
@app.get("/")
def root():
    return {"message": "Welcome to the Event Planner API!", "version": app.version}


@app.get("/health")
def health_check():
    return {"status": "ok"}


# -------------------------------
# Events
# -------------------------------

# Create a new event in Firestore
@app.post("/events", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event(body: EventCreate):
    # Generate a unique ID for the event
    event_id = uuid4().hex

    # Build the dictionary that will be stored in Firestore
    data = {
        # event title (string)
        "title": body.title,
        # datetime object; Firestore stores as a Timestamp
        "date": body.date,
        # optional description
        "description": body.description,
        # Firestore adds the current server time
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    # Save the new event to the "events" collection in Firestore
    events_col.document(event_id).set(data)

    # Return the new Event as a response
    return Event(
        id=event_id,
        title=body.title,
        date=body.date,
        description=body.description,
    )


# List all events from Firestore
@app.get("/events", response_model=List[Event])
def list_events():
    # Try to order events chronologically by "date"
    try:
        docs = events_col.order_by("date", direction=firestore.Query.ASCENDING).stream()
    except Exception:
        docs = events_col.stream()

    # Convert each Firestore document into an Event model
    # (Handles Timestamp → datetime conversion)
    return [event_doc_to_model(doc) for doc in docs]


# Retrieve a single event by its ID
@app.get("/events/{event_id}", response_model=Event)
def get_event(event_id: str):
    # Fetch the Firestore document that matches the given ID
    doc = events_col.document(event_id).get()

    # Convert the document to an Event model and return it
    # Raises a 404 error if it doesn’t exist
    return event_doc_to_model(doc)


# Update an existing event (partial update)
@app.put("/events/{event_id}", response_model=Event)
def update_event(event_id: str, patch: EventUpdate):
    # Reference the event document by ID
    ref = events_col.document(event_id)
    doc = ref.get()

    # If it doesn’t exist, return a 404 error
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")

    # Build a dict of only the fields that were provided in the request
    # (ignore any that are None, so partial updates work)
    updates: Dict[str, Any] = {
        k: v for k, v in patch.model_dump().items() if v is not None
    }

    # If no valid fields were given (empty request), return the current document unchanged
    if not updates:
        return event_doc_to_model(doc)

    # Add an updated timestamp (server-side)
    updates["updatedAt"] = firestore.SERVER_TIMESTAMP

    # Apply the updates to the Firestore document
    ref.update(updates)

    # Re-fetch the updated event and return it as an Event model
    return event_doc_to_model(ref.get())


# Delete an existing event
@app.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str):
    # Reference the event document
    ref = events_col.document(event_id)

    # Check if it exists first
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Event not found")

    # Delete the document from Firestore
    ref.delete()

    # Return no content (204 = success with empty response body)
    return
