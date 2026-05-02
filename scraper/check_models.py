import psycopg2

conn = psycopg2.connect('postgresql://user:password@localhost:5432/used_phone_db')
cur = conn.cursor()
cur.execute("SELECT DISTINCT \"modelName\" FROM \"DeviceInventory\" ORDER BY \"modelName\"")
models = [row[0] for row in cur.fetchall()]
for m in models:
    print(m)
