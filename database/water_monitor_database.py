import sqlite3
from pathlib import Path

DATABASE_NAME = str(Path(__file__).resolve().parent.parent / "water_monitor.db")


def create_database():
    """Create the database, measurements table, and timestamp index."""

    with sqlite3.connect(DATABASE_NAME) as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                temperature REAL,
                ph REAL,
                oxygen REAL
            )
        """)

        # Alarm table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alarms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                sensor TEXT,
                value REAL,
                status TEXT
            )
        """)


        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_measurements_timestamp
            ON measurements(timestamp)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_alarms_timestamp
            ON alarms(timestamp)
        """)


def insert_measurement(temperature, ph, oxygen):
    """Store one set of sensor readings."""

    with sqlite3.connect(DATABASE_NAME) as conn:
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO measurements (
                temperature,
                ph,
                oxygen
            )
            VALUES (?, ?, ?)
        """, (temperature, ph, oxygen))

        return cursor.lastrowid


def get_latest_measurements(limit=10):
    """Return the most recent measurements, newest first."""

    if limit < 1:
        raise ValueError("limit must be at least 1")

    with sqlite3.connect(DATABASE_NAME) as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, timestamp, temperature, ph, oxygen
            FROM measurements
            ORDER BY timestamp DESC, id DESC
            LIMIT ?
        """, (limit,))

        return cursor.fetchall()


def get_measurements_between(start_time, end_time):
    """
    Return measurements within a time range.

    Timestamps should use SQLite's timestamp format:
    YYYY-MM-DD HH:MM:SS
    """

    with sqlite3.connect(DATABASE_NAME) as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, timestamp, temperature, ph, oxygen
            FROM measurements
            WHERE timestamp >= ?
              AND timestamp <= ?
            ORDER BY timestamp ASC, id ASC
        """, (start_time, end_time))

        return cursor.fetchall()

def insert_alarm(sensor, value, status):

    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO alarms
        (
            sensor,
            value,
            status
        )
        VALUES (?, ?, ?)
    """, (sensor, value, status))
 
    conn.commit()
    conn.close()

def get_alarm_history(limit=50):

    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM alarms
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))

    alarms = cursor.fetchall()

    conn.close()

    return alarms
