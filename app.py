from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import sqlite3
from datetime import datetime, timedelta
from functools import wraps
import os

app = Flask(__name__)
app.secret_key = "xerox_secret_key_2024"

import json as _json, os as _os, sys as _sys
stu_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "students.json")
user_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.json")

if not os.path.exists(stu_path):
    open(stu_path, 'w').close()
if not os.path.exists(user_path):
    open(user_path, 'w').close()

def get_base_path():
    if getattr(_sys, 'frozen', False):
        return _os.path.dirname(_sys.executable)
    return _os.path.dirname(_os.path.abspath(__file__))

def load_users():
    path = _os.path.join(get_base_path(), "users.json")
    
    with open(path, "r") as f:
        return _json.load(f)

def init_db():
    conn = sqlite3.connect(_os.path.join(get_base_path(), "database.db"))
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        reg TEXT,
        type TEXT,
        pages INTEGER,
        total INTEGER,
        date TEXT,
        status TEXT DEFAULT 'due',
        added_by TEXT,
        added_at TEXT,
        category TEXT DEFAULT 'student'
    )
    """)
    for col in ["status", "added_by", "added_at", "category"]:
        try:
            cursor.execute(f"ALTER TABLE records ADD COLUMN {col} TEXT")
        except:
            pass
    conn.commit()
    conn.close()

def auto_delete_old_paid():
    conn = sqlite3.connect(_os.path.join(get_base_path(), "database.db"))
    cursor = conn.cursor()
    cursor.execute("SELECT id, date FROM records WHERE status = 'paid'")
    rows = cursor.fetchall()
    to_delete = []
    for row in rows:
        try:
            record_date = None
            for fmt in ("%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d"):
                try:
                    record_date = datetime.strptime(row[1], fmt)
                    break
                except:
                    continue
            if record_date and record_date < datetime.now() - timedelta(days=60):
                to_delete.append(row[0])
        except:
            pass
    if to_delete:
        cursor.executemany("DELETE FROM records WHERE id = ?", [(i,) for i in to_delete])
        conn.commit()
    conn.close()

init_db()
auto_delete_old_paid()

def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("authorized"):
            return jsonify({"error": "unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    AUTHORIZED_USERS = load_users()
    if username in AUTHORIZED_USERS and AUTHORIZED_USERS[username] == password:
        session["authorized"] = True
        session["username"] = username
        return jsonify({"status": "ok", "username": username})
    return jsonify({"status": "fail"}), 401

@app.route("/students")
def get_students():
    import json, os
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "students.json")
    with open(path, "r") as f:
        data = json.load(f)
    return jsonify(data)

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"status": "ok"})

@app.route("/")
def home():
    conn = sqlite3.connect(_os.path.join(get_base_path(), "database.db"))
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM records WHERE status = 'due' AND (category = 'student' OR category IS NULL)")
    dues = cursor.fetchall()
    cursor.execute("SELECT * FROM records WHERE status = 'due' AND category = 'department'")
    dept = cursor.fetchall()
    cursor.execute("SELECT * FROM records WHERE status = 'paid'")
    paid = cursor.fetchall()
    conn.close()
    import json, os
    spath = os.path.join(get_base_path(), "students.json")
    with open(spath, "r") as f:
        students_data = json.load(f)
    return render_template("index.html", records=dues, dept_records=dept, paid_records=paid, students=students_data)

@app.route("/save", methods=["POST"])
@auth_required
def save():
    data = request.json
    added_by = session.get("username", "Unknown")
    added_at = datetime.now().strftime("%d/%m/%Y %I:%M %p")
    category = data.get("category", "student")
    conn = sqlite3.connect(_os.path.join(get_base_path(), "database.db"))
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO records (name, reg, type, pages, total, date, status, added_by, added_at, category) VALUES (?, ?, ?, ?, ?, ?, 'due', ?, ?, ?)",
        (data["name"], data["reg"], data["type"], data["pages"], data["total"], data["date"], added_by, added_at, category)
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"status": "saved", "id": new_id, "added_by": added_by, "added_at": added_at})

@app.route("/mark_paid", methods=["POST"])
@auth_required
def mark_paid():
    data = request.json
    conn = sqlite3.connect(_os.path.join(get_base_path(), "database.db"))
    cursor = conn.cursor()
    cursor.execute("UPDATE records SET status = 'paid' WHERE id = ?", (data["id"],))
    conn.commit()
    conn.close()
    return jsonify({"status": "marked_paid"})

@app.route("/delete_record", methods=["POST"])
@auth_required
def delete_record():
    data = request.json
    conn = sqlite3.connect(_os.path.join(get_base_path(), "database.db"))
    cursor = conn.cursor()
    cursor.execute("DELETE FROM records WHERE id = ?", (data["id"],))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})


@app.route("/admin/students", methods=["GET"])
def admin_get_students():
    if not session.get("authorized"):
        return jsonify({"error": "unauthorized"}), 401
    path = _os.path.join(get_base_path(), "students.json")
    with open(path, "r") as f:
        return jsonify(_json.load(f))

@app.route("/admin/students/add", methods=["POST"])
def admin_add_student():
    if not session.get("authorized"):
        return jsonify({"error": "unauthorized"}), 401
    data = request.json
    path = _os.path.join(get_base_path(), "students.json")
    with open(path, "r") as f:
        students = _json.load(f)
    students[data["name"]] = data["reg"]
    with open(path, "w") as f:
        _json.dump(students, f, indent=2)
    return jsonify({"status": "added"})

@app.route("/admin/students/remove", methods=["POST"])
def admin_remove_student():
    if not session.get("authorized"):
        return jsonify({"error": "unauthorized"}), 401
    data = request.json
    path = _os.path.join(get_base_path(), "students.json")
    with open(path, "r") as f:
        students = _json.load(f)
    students.pop(data["name"], None)
    with open(path, "w") as f:
        _json.dump(students, f, indent=2)
    return jsonify({"status": "removed"})

SUPER_ADMIN = "Smaran"

@app.route("/admin/users", methods=["GET"])
def admin_get_users():
    if not session.get("authorized") or session.get("username") != SUPER_ADMIN:
        return jsonify({"error": "unauthorized"}), 401
    return jsonify(load_users())

@app.route("/admin/users/add", methods=["POST"])
def admin_add_user():
    if not session.get("authorized") or session.get("username") != SUPER_ADMIN:
        return jsonify({"error": "unauthorized"}), 401
    data = request.json
    path = _os.path.join(get_base_path(), "users.json")
    with open(path, "r") as f:
        users = _json.load(f)
    users[data["name"]] = data["password"]
    with open(path, "w") as f:
        _json.dump(users, f, indent=2)
    return jsonify({"status": "added"})

@app.route("/admin/users/remove", methods=["POST"])
def admin_remove_user():
    if not session.get("authorized") or session.get("username") != SUPER_ADMIN:
        return jsonify({"error": "unauthorized"}), 401
    data = request.json
    # Protect super admin from being removed
    if data["name"] == SUPER_ADMIN:
        return jsonify({"error": "protected"}), 403
    path = _os.path.join(get_base_path(), "users.json")
    with open(path, "r") as f:
        users = _json.load(f)
    users.pop(data["name"], None)
    with open(path, "w") as f:
        _json.dump(users, f, indent=2)
    return jsonify({"status": "removed"})

@app.route("/admin/is_super")
def is_super():
    if session.get("authorized") and session.get("username") == SUPER_ADMIN:
        return jsonify({"super": True})
    return jsonify({"super": False})


@app.route("/export_data")
def export_data():
    conn = sqlite3.connect(_os.path.join(get_base_path(), "database.db"))
    cursor = conn.cursor()
    cursor.execute("SELECT name, reg, total FROM records WHERE status = 'due' AND (category = 'student' OR category IS NULL)")
    students = cursor.fetchall()
    cursor.execute("SELECT name, total FROM records WHERE status = 'due' AND category = 'department'")
    depts = cursor.fetchall()
    conn.close()

    # Combine by reg for students
    student_summary = {}
    for name, reg, total in students:
        key = reg or name
        if key in student_summary:
            student_summary[key]['total'] += total
        else:
            student_summary[key] = {'name': name, 'reg': reg, 'total': total}

    # Combine by name for departments
    dept_summary = {}
    for name, total in depts:
        if name in dept_summary:
            dept_summary[name] += total
        else:
            dept_summary[name] = total

    return jsonify({
        'students': list(student_summary.values()),
        'departments': [{'name': k, 'total': v} for k, v in dept_summary.items()]
    })

if __name__ == "__main__":
    app.run(debug=True)
