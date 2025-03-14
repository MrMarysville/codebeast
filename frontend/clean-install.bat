@echo off
echo Cleaning up node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo Installing dependencies...
call npm install

echo Starting the application...
call npm start 