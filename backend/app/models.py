import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    # Email verification
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(128), nullable=True, index=True)
    verification_token_expires = Column(DateTime, nullable=True)

    # Password reset
    reset_token = Column(String(128), nullable=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    qa_pairs = relationship("QAPair", back_populates="user", cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="user", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    phone = Column(String(50), default="")
    linkedin = Column(String(255), default="")
    github = Column(String(255), default="")
    website = Column(String(255), default="")
    skills = Column(JSON, default=list)
    experience = Column(JSON, default=list)
    education = Column(JSON, default=list)
    summary = Column(Text, default="")

    user = relationship("User", back_populates="profile")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False, default="")
    drive_link = Column(String(1000), nullable=True)
    is_r2 = Column(Boolean, default=False, nullable=False)   # True = filepath is an R2 object key
    is_default = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    user = relationship("User", back_populates="resumes")

    __table_args__ = (
        Index("ix_resumes_user_id", "user_id"),
    )


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company = Column(String(255), nullable=False)
    position = Column(String(255), nullable=False)
    url = Column(String(500), default="")
    status = Column(String(50), default="applied")  # draft, applied, interview, offer, rejected
    match_score = Column(Float, nullable=True)
    applied_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    notes = Column(Text, default="")

    user = relationship("User", back_populates="applications")

    __table_args__ = (
        Index("ix_applications_user_id", "user_id"),
        Index("ix_applications_status", "user_id", "status"),
    )


class QAPair(Base):
    __tablename__ = "qa_pairs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)

    user = relationship("User", back_populates="qa_pairs")

    __table_args__ = (
        Index("ix_qa_pairs_user_id", "user_id"),
    )


class EmailLog(Base):
    """Tracks all outbound emails for debugging and rate limiting."""
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_email = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    email_type = Column(String(50), nullable=False)  # verification, password_reset
    status = Column(String(20), nullable=False)       # sent, failed
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    user = relationship("User", back_populates="email_logs")

    __table_args__ = (
        Index("ix_email_logs_user_id", "user_id"),
        Index("ix_email_logs_sent_at", "sent_at"),
    )
