import sqlite3

DATABASE_NAME = "water_monitor.db"


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

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_measurements_timestamp
            ON measurements(timestamp)
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
