' scripts/run-backend-silent.vbs
' Runs Django REST Backend completely hidden in the background full-time (24/7) on 0.0.0.0:8000
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\Amala-School-ERP"
WshShell.Run "cmd /c """"""D:\Amala-School-ERP\backend\venv\Scripts\python.exe"""" """"D:\Amala-School-ERP\backend\manage.py"""" runserver 0.0.0.0:8000 --noreload > """"D:\Amala-School-ERP\backend\server.log"""" 2>&1""", 0, False
