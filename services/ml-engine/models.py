from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    country = Column(String, default="India")
    created_at = Column(DateTime, default=datetime.utcnow)

    incidents = relationship("Incident", back_populates="reporter")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    status = Column(String, default="Draft")
    created_at = Column(DateTime, default=datetime.utcnow)

    reporter = relationship("User", back_populates="incidents")
    evidence = relationship("Evidence", back_populates="incident")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    file_path = Column(String, nullable=False)
    file_type = Column(String)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="evidence")

class PhishingLog(Base):
    __tablename__ = "phishing_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False) # URL or Text
    type = Column(String, nullable=False) # "URL" or "TEXT"
    risk_score = Column(Integer)
    is_phishing = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AppScan(Base):
    __tablename__ = "app_scans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    app_name = Column(String, nullable=False)
    package_name = Column(String)
    risk_level = Column(String) # "SAFE", "MEDIUM", "HIGH"
    permissions = Column(Text) # JSON string of permissions
    created_at = Column(DateTime, default=datetime.utcnow)

class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    phone_number = Column(String, nullable=False)
    caller_name = Column(String, nullable=True)
    risk_score = Column(Integer)
    is_spam = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class QRScan(Base):
    __tablename__ = "qr_scans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    is_safe = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class VaultItem(Base):
    __tablename__ = "vault_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    encrypted_data = Column(Text, nullable=False)
    item_type = Column(String, nullable=False) # "PASSWORD" or "FILE"
    created_at = Column(DateTime, default=datetime.utcnow)
