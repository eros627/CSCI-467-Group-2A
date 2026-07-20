# Datadase setup:
PostgreSQL and MariaDB are required.
PostgreSQL link https://www.pgadmin.org/download/pgadmin-4-windows/. 
PostrgeSQL I have v 9.15 and server PostgreSQL 18.
PostrgeSQL: Create database and import product_system.sql
MariaDB link https://mariadb.com/downloads/community/community-server/
MariaDB: Create database and import csci467.sql

# Test backend:
use .env.example to make your backend/.env 
Update to your passwords for databases.

cd backend
npm install

# Startup:

cd backend
npm start

from root directory
npm run dev

Pages to explore:

http://localhost:5173/
http://localhost:5173/warehouse/fulfillment
http://localhost:5173/receiving
http://localhost:5173/admin