from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from bson import ObjectId
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import httpx
import json
from passlib.context import CryptContext
from neo4j import AsyncGraphDatabase
import pandas as pd
import numpy as np
from prophet import Prophet
from pyod.models.knn import KNN
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

neo4j_driver = AsyncGraphDatabase.driver(
    os.environ['NEO4J_URI'],
    auth=(os.environ['NEO4J_USERNAME'], os.environ['NEO4J_PASSWORD'])
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "employee"  

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    full_name: str
    role: str
    created_at: datetime

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    name: str
    email: EmailStr
    department: str
    designation: str
    base_salary: float
    joining_date: str
    status: str = "active"  
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeCreate(BaseModel):
    employee_id: str
    name: str
    email: EmailStr
    department: str
    designation: str
    base_salary: float
    joining_date: str

class AttendanceLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    date: str
    hours_worked: float
    overtime_hours: float = 0.0
    leaves: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttendanceCreate(BaseModel):
    employee_id: str
    date: str
    hours_worked: float
    overtime_hours: float = 0.0
    leaves: int = 0

class PayrollRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    month: str
    year: int
    base_salary: float
    overtime_pay: float
    bonuses: float
    deductions: float
    tax: float
    net_salary: float
    status: str = "processed" 
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PayrollProcess(BaseModel):
    employee_id: str
    month: str
    year: int
    bonuses: float = 0.0
    deductions: float = 0.0

class ChatMessage(BaseModel):
    message: str
    session_id: str

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
def require_roles(*allowed_roles):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        role = current_user.get("role", "employee")
        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"Access denied for role: {role}")
        return current_user
    return role_checker
async def send_welcome_email(email: str, full_name: str, role: str, event_type: str):
    try:
        smtp_host = os.environ['SMTP_HOST']
        smtp_port = int(os.environ['SMTP_PORT'])
        smtp_email = os.environ['SMTP_EMAIL']
        smtp_password = os.environ['SMTP_PASSWORD'].replace(' ', '')

        now_utc = datetime.now(timezone.utc)
        current_time_utc = now_utc.strftime("%B %d, %Y at %I:%M %p UTC")

        ist_offset = timedelta(hours=5, minutes=30)
        now_ist = now_utc + ist_offset
        current_time_ist = now_ist.strftime("%B %d, %Y at %I:%M %p (IST)")

        if event_type == "register":
            subject = "Welcome to Intelligent Payroll System"
            greeting = f"Welcome <strong>{role.title()}, {full_name}</strong>!"
            main_text = (
                "Your registration to the <strong>Intelligent Payroll Management System</strong> "
                "was successful. You can now securely access your HR and payroll dashboard."
            )
        else: 
            subject = "Login Notification — Intelligent Payroll System"
            greeting = f"Hello <strong>{role.title()}, {full_name}</strong>,"
            main_text = (
                "You have successfully logged in to your account on the "
                "<strong>Intelligent Payroll Management System</strong>."
            )

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = smtp_email
        message["To"] = email

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #2563eb;">{subject}</h2>
                    <p>{greeting}</p>
                    <p>{main_text}</p>
                    <p><strong>Login/Action Time:</strong><br>
                       {current_time_ist}<br>
                       {current_time_utc}</p>
                    <p>If you did not perform this action, please contact your administrator immediately.</p>
                    <br>
                    <p>Best regards,<br>Payroll System Team</p>
                </div>
            </body>
        </html>
        """

        part = MIMEText(html_content, "html")
        message.attach(part)

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, email, message.as_string())

        logging.info(f"Email ({event_type}) sent to {email}")

    except Exception as e:
        logging.error(f"Error sending {event_type} email: {str(e)}")

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_dict = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token({"sub": user_data.email, "role": user_data.role})
    asyncio.create_task(send_welcome_email(user_data.email, user_data.full_name, user_data.role, "register"))

    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role
        }
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user_data.email, "role": user["role"]})
    
    asyncio.create_task(send_welcome_email(user["email"], user["full_name"], user["role"], "login"))
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
def serialize_doc(doc):
    doc["_id"] = str(doc["_id"])
    if "user_id" in doc:
        doc["user_id"] = str(doc["user_id"])
    return doc

@api_router.get("/chatbot/history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get("_id") or current_user.get("id")

        if isinstance(user_id, str) and len(user_id) == 24:
            try:
                user_id = ObjectId(user_id)
            except Exception:
                pass

        chats = await db.chat_history.find({"user_id": user_id}).sort("timestamp", 1).to_list(None)

        chats = [serialize_doc(chat) for chat in chats]

        return chats

    except Exception as e:
        logging.error(f"Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving chat history")

@api_router.post("/employees", response_model=Employee)
async def create_employee(
    employee_data: EmployeeCreate,
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    existing = await db.employees.find_one({"employee_id": employee_data.employee_id})
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    employee = Employee(**employee_data.model_dump())
    doc = employee.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()

    await db.employees.insert_one(doc)
    async with neo4j_driver.session() as session:
        await session.run(
            """
            CREATE (e:Employee {
                id: $id,
                name: $name,
                department: $department,
                designation: $designation
            })
            """,
            id=employee.employee_id,  
            name=employee.name,
            department=employee.department,
            designation=employee.designation
        )
    return employee


@api_router.get("/employees", response_model=List[Employee])
async def get_employees(current_user: dict = Depends(get_current_user)):
    employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    for emp in employees:
        if isinstance(emp['created_at'], str):
            emp['created_at'] = datetime.fromisoformat(emp['created_at'])
    return employees

@api_router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    employee = await db.employees.find_one({"employee_id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if isinstance(employee['created_at'], str):
        employee['created_at'] = datetime.fromisoformat(employee['created_at'])
    return employee

@api_router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, employee_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = await db.employees.find_one({"employee_id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = employee_data.model_dump()
    await db.employees.update_one({"employee_id": employee_id}, {"$set": update_data})
    
    updated = await db.employees.find_one({"employee_id": employee_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.employees.delete_one({"employee_id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {"message": "Employee deleted successfully"}

@api_router.post("/attendance", response_model=AttendanceLog)
async def create_attendance(attendance_data: AttendanceCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    attendance = AttendanceLog(**attendance_data.model_dump())
    doc = attendance.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.attendance_logs.insert_one(doc)
    return attendance

@api_router.get("/attendance", response_model=List[AttendanceLog])
async def get_attendance(employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"employee_id": employee_id} if employee_id else {}
    logs = await db.attendance_logs.find(query, {"_id": 0}).to_list(1000)
    for log in logs:
        if isinstance(log['created_at'], str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    return logs

@api_router.post("/payroll/process", response_model=PayrollRecord)
async def process_payroll(payroll_data: PayrollProcess, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    employee = await db.employees.find_one({"employee_id": payroll_data.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    existing_payroll = await db.payroll_records.find_one({
    "employee_id": payroll_data.employee_id,
    "month": payroll_data.month,
    "year": payroll_data.year
    })
    if existing_payroll:
        raise HTTPException(
            status_code=400,
            detail=f"Payroll for {payroll_data.month}-{payroll_data.year} already exists for this employee"
            )
    
    # month_num = int(payroll_data.month)
    # month_str = f"{payroll_data.year}-{month_num:02d}"

    # attendance_logs = await db.attendance_logs.find({
    #     "employee_id": payroll_data.employee_id,
    #     "date": {"$regex": f"^{month_str}-"} }).to_list(1000)
    from datetime import datetime, timedelta
    year = int(payroll_data.year)
    month = int(payroll_data.month)
    month_start = datetime(year, month, 1)
    if month == 12:
        month_end = datetime(year + 1, 1, 1)
    else:
        month_end = datetime(year, month + 1, 1)

    attendance_logs = await db.attendance_logs.find({
        "employee_id": payroll_data.employee_id,
        "date": {
        "$gte": month_start.strftime("%Y-%m-%d"),
        "$lt": month_end.strftime("%Y-%m-%d")
    }}).to_list(None)

    if not attendance_logs:
        print(f"No attendance found for {payroll_data.employee_id} in {month}/{year}")
    total_overtime = sum(log.get("overtime_hours", 0) for log in attendance_logs)
    base_salary = employee["base_salary"]
    if total_overtime > 0:
        overtime_rate = base_salary / 160
        overtime_pay = round(total_overtime * overtime_rate * 1.5, 2)
    else:
        overtime_pay = 0

    
    # base_salary = employee["base_salary"]
    # overtime_rate = base_salary / 160 
    # overtime_pay = total_overtime * overtime_rate * 1.5
    
    gross_salary = base_salary + overtime_pay + payroll_data.bonuses
    tax = gross_salary * 0.15 
    net_salary = gross_salary - tax - payroll_data.deductions
    
    payroll_record = PayrollRecord(
        employee_id=payroll_data.employee_id,
        employee_name=employee["name"],
        month=payroll_data.month,
        year=payroll_data.year,
        base_salary=base_salary,
        overtime_pay=overtime_pay,
        bonuses=payroll_data.bonuses,
        deductions=payroll_data.deductions,
        tax=tax,
        net_salary=net_salary
    )
    
    doc = payroll_record.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.payroll_records.insert_one(doc)

    audit_doc = {
        "id": str(uuid.uuid4()),
        "action": "payroll_processed",
        "employee_id": payroll_data.employee_id,
        "performed_by": current_user["email"],
        "details": {"month": payroll_data.month, "year": payroll_data.year, "net_salary": net_salary},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_trail.insert_one(audit_doc)
    try:
        async with neo4j_driver.session() as session:
            await session.run(
            """
            MERGE (e:Employee {id: $employee_id})
            MERGE (p:Payroll {month: $month, year: $year})
            SET p.net_salary = $net_salary,
                p.base_salary = $base_salary,
                p.bonuses = $bonuses,
                p.deductions = $deductions,
                p.tax = $tax
            MERGE (e)-[:HAS_PAYROLL]->(p)
            """,
            {
                "employee_id": payroll_record.employee_id,
                "month": payroll_record.month,
                "year": payroll_record.year,
                "net_salary": payroll_record.net_salary,
                "base_salary": payroll_record.base_salary,
                "bonuses": payroll_record.bonuses,
                "deductions": payroll_record.deductions,
                "tax": payroll_record.tax,
            },
        )
    except Exception as e:
        print("⚠️ Neo4j write failed:", e)


    return payroll_record


@api_router.get("/payroll", response_model=List[PayrollRecord])
async def get_payroll(
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] in ["admin", "hr"]:
        query = {"employee_id": employee_id} if employee_id else {}

    else:
        employee = await db.employees.find_one({"email": current_user["email"]})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee record not found")

        query = {"employee_id": employee["employee_id"]}

    records = await db.payroll_records.find(query, {"_id": 0}).sort([
        ("year", 1),
        ("month", 1)
    ]).to_list(1000)

    for record in records:
        if isinstance(record.get("created_at"), str):
            record["created_at"] = datetime.fromisoformat(record["created_at"])

    return records


@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["admin", "hr"]:
        total_employees = await db.employees.count_documents({"status": "active"})
        total_payroll = await db.payroll_records.count_documents({})

        current_month = datetime.now(timezone.utc).strftime("%m")
        current_year = datetime.now(timezone.utc).year

        monthly_records = await db.payroll_records.find({
            "month": current_month,
            "year": current_year
        }).to_list(1000)

        total_cost = sum(record["net_salary"] for record in monthly_records)
        total_overtime = sum(record["overtime_pay"] for record in monthly_records)

        employees = await db.employees.find({"status": "active"}, {"_id": 0}).to_list(1000)
        department_dist = {}
        for emp in employees:
            dept = emp.get("department", "Unknown")
            department_dist[dept] = department_dist.get(dept, 0) + 1

        return {
            "total_employees": total_employees,
            "total_payroll_records": total_payroll,
            "monthly_payroll_cost": round(total_cost, 2),
            "total_overtime_pay": round(total_overtime, 2),
            "department_distribution": department_dist
        }
    elif current_user["role"] == "employee":
        employee = await db.employees.find_one({"email": current_user["email"]})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee record not found")

        payrolls = await db.payroll_records.find(
            {"employee_id": employee["employee_id"]}
        ).to_list(None)

        total_records = len(payrolls)
        total_overtime = sum(p.get("overtime_pay", 0) for p in payrolls)
        total_cost = sum(p.get("net_salary", 0) for p in payrolls)

        return {
            "total_employees": 1,
            "total_payroll_records": total_records,
            "monthly_payroll_cost": round(total_cost, 2),
            "total_overtime_pay": round(total_overtime, 2),
            "department_distribution": {employee.get("department", "Unknown"): 1}
        }
    else:
        raise HTTPException(status_code=403, detail="Not authorized")



@api_router.get("/analytics/forecast")
async def get_payroll_forecast(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        records = await db.payroll_records.find({}, {"_id": 0}).to_list(1000)
        
        if len(records) < 5:
            return {"message": "Not enough data for forecasting. Need at least 5 records.", "forecast": []}
        
        df_data = []
        for record in records:
            if not record.get("net_salary"):
                continue
            try:
                y_value = float(record["net_salary"])
            except (ValueError, TypeError):
                continue

            date_str = f"{record['year']}-{str(record['month']).zfill(2)}-01"
            df_data.append({
                "ds": pd.to_datetime(date_str),
                "y": y_value
            })
        
        df = pd.DataFrame(df_data)
        if df.empty or df["y"].sum() == 0:
            return {"message": "No valid numeric payroll data found", "forecast": []}

        df = pd.DataFrame(df_data)
        df = df.groupby('ds')['y'].sum().reset_index()

        df = df.set_index('ds').asfreq('MS')
        df['y'] = df['y'].interpolate(method='linear')
        df['y'] = df['y'].bfill().ffill()

        df = df.reset_index()
        print("Prophet input preview:")
        print(df.head(10))

        model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False,changepoint_prior_scale=1.5, interval_width=0.95, seasonality_mode="additive")
        model.add_seasonality(name='quarterly', period=90, fourier_order=3)
        model.fit(df)

        future = model.make_future_dataframe(periods=6, freq='MS')
        forecast = model.predict(future)

        forecast_data = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(12).to_dict("records")

        result = []
        for item in forecast_data:
            yhat = max(0, item['yhat'])  
            lower = max(0, item['yhat_lower'])
            upper = max(0, item['yhat_upper'])

            if upper > yhat * 2:
                upper = yhat * 1.5

            result.append({
                "date": item['ds'].strftime('%Y-%m'),
                "predicted_cost": round(yhat, 2),
                "lower_bound": round(lower, 2),
                "upper_bound": round(upper, 2)})

        return {"forecast": result}
    except Exception as e:
        logging.error(f"Forecast error: {str(e)}")
        return {"message": f"Error generating forecast: {str(e)}", "forecast": []}

@api_router.get("/analytics/anomalies")
async def detect_anomalies(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        records = await db.payroll_records.find({}, {"_id": 0}).to_list(1000)
        
        if len(records) < 10:
            return {"message": "Not enough data for anomaly detection. Need at least 10 records.", "anomalies": []}
        
        salaries = np.array([record["net_salary"] for record in records]).reshape(-1, 1)
        
        clf = KNN(contamination=0.1)  
        clf.fit(salaries)
        
        predictions = clf.labels_ 
        scores = clf.decision_scores_
        mean_salary = float(np.mean(salaries))

        
        anomalies = []
        for i, (record, is_anomaly, score) in enumerate(zip(records, predictions, scores)):
            if is_anomaly == 1:
                formatted_score = round(float(score) / 1000, 2)
                deviation = round(((record["net_salary"] - mean_salary) / mean_salary) * 100, 2)

                anomalies.append({
                    "employee_id": record["employee_id"],
                    "employee_name": record["employee_name"],
                    "month": record["month"],
                    "year": record["year"],
                    "net_salary": record["net_salary"],
                    "anomaly_score": formatted_score,
                    "deviation_percent": deviation,
                    "reason": "Unusual salary amount detected"
                })
        
        return {"note": "All numeric values are rounded off to 2 decimal places.","anomalies": anomalies}
    except Exception as e:
        logging.error(f"Anomaly detection error: {str(e)}")
        return {"message": "Error detecting anomalies", "anomalies": []}

import httpx

from datetime import datetime

@api_router.post("/chatbot")
async def chat_with_bot(chat_data: ChatMessage, current_user: dict = Depends(get_current_user)):
    try:
        user_id = str(current_user.get("_id") or current_user.get("id") or current_user.get("username") or current_user.get("email", "anonymous_user"))
        total_employees = await db.employees.count_documents({"status": "active"})
        recent_payroll = await db.payroll_records.find().sort("created_at", -1).limit(5).to_list(5)

        history_cursor = db.chat_history.find({"user_id": user_id}).sort("timestamp", -1).limit(10)
        previous_chats = await history_cursor.to_list(10)
        previous_chats = list(reversed(previous_chats))

        conversation_history = []
        for chat in previous_chats:
            conversation_history.append({"role": "user", "content": chat["user_message"]})
            conversation_history.append({"role": "assistant", "content": chat["bot_reply"]})

        context = f"System context: {total_employees} active employees. Recent payrolls processed: {len(recent_payroll)}."
        system_message = f"""
        You are an HR assistant for an Intelligent Payroll Management System.
        {context}
        Maintain context between chats, refer to past replies and respond accurately with payroll, HR and compliance logic.
        """

        messages = [{"role": "system", "content": system_message}] + conversation_history + [
            {"role": "user", "content": chat_data.message}
        ]

        payload = {
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": messages
        }

        headers = {
            "Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{os.environ['OPENROUTER_BASE_URL']}/chat/completions",
                headers=headers,
                json=payload
            )

        if response.status_code != 200:
            logging.error(f"OpenRouter API error: {response.text}")
            return {"response": "Chatbot service error. Please try again later."}

        data = response.json()
        reply = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            or data.get("choices", [{}])[0].get("text", "")
        )

        if not reply.strip():
            logging.warning(f"No content in chatbot reply: {data}")
            reply = "I'm having trouble processing your request right now. Please try again later."
        await db.chat_history.insert_one({
            "user_id": user_id,
            "user_message": chat_data.message,
            "bot_reply": reply,
            "timestamp": datetime.utcnow()
        })

        return {"response": reply.strip()}

    except Exception as e:
        logging.error(f"Chatbot error: {str(e)}")
        return {"response": "I'm having trouble processing your request. Please try again."}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    await neo4j_driver.close()