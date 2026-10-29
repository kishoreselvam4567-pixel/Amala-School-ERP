' scripts/run-backend-silent.vbs
' Runs Django REST Backend completely hidden in the background full-time (24/7)

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\Amala-School-ERP"
WshShell.Run """D:\Amala-School-ERP\backend\venv\Scripts\pythonw.exe"" ""D:\Amala-School-ERP\backend\manage.py"" runserver 127.0.0.1:8000 --noreload", 0, False

