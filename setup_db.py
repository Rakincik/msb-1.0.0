import psycopg2

conn = psycopg2.connect(host='localhost', port=5432, dbname='postgres', user='muro_user', password='muro_pass_2024')
conn.autocommit = True
cur = conn.cursor()

# User var mi?
cur.execute("SELECT 1 FROM pg_roles WHERE rolname='sorubankasi'")
if not cur.fetchone():
    cur.execute("CREATE USER sorubankasi WITH PASSWORD 'sorubankasi123' CREATEDB")
    print("User olusturuldu")
else:
    print("User zaten var")

# DB var mi?
cur.execute("SELECT 1 FROM pg_database WHERE datname='sorubankasi'")
if not cur.fetchone():
    cur.execute("CREATE DATABASE sorubankasi OWNER sorubankasi")
    print("DB olusturuldu")
else:
    print("DB zaten var")

cur.execute("GRANT ALL PRIVILEGES ON DATABASE sorubankasi TO sorubankasi")
print("Bitti!")
conn.close()
