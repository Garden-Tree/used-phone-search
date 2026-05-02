import psycopg2
import os
from urllib.parse import urlparse

def clean_database_url(url: str) -> str:
    url = url.strip('"').strip("'")
    parsed = urlparse(url)
    clean_url = f"{parsed.scheme}://{parsed.username}:{parsed.password}@{parsed.hostname}:{parsed.port}{parsed.path}"
    return clean_url

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
db_url = None
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip()
            break

clean_url = clean_database_url(db_url)
conn = psycopg2.connect(clean_url)
cur = conn.cursor()
cur.execute('SELECT "modelName", "color", "storage" FROM "DeviceInventory" WHERE "shopName" = \'ゲオモバイル\' LIMIT 20')
rows = cur.fetchall()
for r in rows:
    print(f"Model: {r[0]}, Color: {r[1]}, Storage: {r[2]}GB")
cur.close()
conn.close()
