import tkinter as tk
from tkinter import ttk
import subprocess
import threading
import time
import webbrowser
import os
import sys

# Windows flag to completely hide child console windows
CREATE_NO_WINDOW = 0x08000000

def run_tasks(update_text, update_progress, finish, error_handler):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    try:
        # Step 1: Database
        update_text("Starting Postgres & pgAdmin Containers...")
        update_progress(20)
        res = subprocess.run(["docker", "compose", "up", "-d", "postgres", "pgadmin"], cwd=base_dir, capture_output=True, text=True, creationflags=CREATE_NO_WINDOW)
        if res.returncode != 0:
            raise Exception(f"Docker Error: {res.stderr}")
        time.sleep(1)

        # Step 2: Models
        update_text("Checking AI Models (qwen2.5, moondream, nomic)...")
        update_progress(40)
        subprocess.Popen(["ollama", "pull", "qwen2.5:3b"], creationflags=CREATE_NO_WINDOW)
        subprocess.Popen(["ollama", "pull", "moondream"], creationflags=CREATE_NO_WINDOW)
        subprocess.Popen(["ollama", "pull", "nomic-embed-text"], creationflags=CREATE_NO_WINDOW)
        time.sleep(2)
        
        # Step 3: Ollama Server
        update_text("Initializing Inference Server...")
        update_progress(60)
        p_ollama = subprocess.Popen(["ollama", "serve"], creationflags=CREATE_NO_WINDOW, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(2)
        if p_ollama.poll() is not None and p_ollama.returncode != 0:
            err = p_ollama.stderr.read().decode().lower()
            if "address already in use" not in err and "only one usage" not in err:
                raise Exception(f"Ollama Error: {err}")
        
        # Step 4: Backend API
        update_text("Starting API Gateway (FastAPI)...")
        update_progress(80)
        backend_dir = os.path.join(base_dir, "backend")
        python_exe = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        p_back = subprocess.Popen([python_exe, "run.py"], cwd=backend_dir, creationflags=CREATE_NO_WINDOW, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(3)
        if p_back.poll() is not None and p_back.returncode != 0:
            raise Exception(f"Backend Error: {p_back.stderr.read().decode()}")
        
        # Step 5: Frontend UI
        update_text("Building Client Interface (React)...")
        update_progress(95)
        frontend_dir = os.path.join(base_dir, "frontend")
        p_front = subprocess.Popen(["cmd.exe", "/c", "npm", "run", "dev"], cwd=frontend_dir, creationflags=CREATE_NO_WINDOW, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(3)
        if p_front.poll() is not None and p_front.returncode != 0:
            raise Exception(f"Frontend Error: {p_front.stderr.read().decode()}")
        
        update_text("All Systems Go! Launching Dashboard...")
        update_progress(100)
        time.sleep(1.5)
        
        webbrowser.open("http://localhost:5173")
        finish()
    except Exception as e:
        error_handler(str(e))

class SplashLauncher:
    def __init__(self):
        self.root = tk.Tk()
        self.root.overrideredirect(True) # Remove windows borders/titlebar
        self.root.attributes("-topmost", True) # Keep on top
        
        # Center the window
        window_width = 500
        window_height = 400
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = int((screen_width/2) - (window_width/2))
        y = int((screen_height/2) - (window_height/2))
        self.root.geometry(f"{window_width}x{window_height}+{x}+{y}")
        
        # Colors matching your UI
        bg_color = '#111827' # gray-900
        text_color = '#FCD535' # yellow
        subtext_color = '#9CA3AF' # gray-400
        
        self.root.configure(bg=bg_color)
        
        # Main Logo Text
        title = tk.Label(self.root, text="INVOICE AI", font=("Arial Black", 36, "bold"), fg=text_color, bg=bg_color)
        title.pack(pady=(40, 5))
        
        # Subtitle
        subtitle = tk.Label(self.root, text="ENTERPRISE SYSTEM BOOTLOADER", font=("Arial", 9, "bold"), fg=subtext_color, bg=bg_color)
        subtitle.pack(pady=(0, 20))
        
        # Animation Canvas
        self.canvas = tk.Canvas(self.root, width=80, height=80, bg=bg_color, highlightthickness=0)
        self.canvas.pack(pady=(0, 15))
        
        # Status Text
        self.status_var = tk.StringVar(value="Initializing...")
        status = tk.Label(self.root, textvariable=self.status_var, font=("Segoe UI", 10), fg="white", bg=bg_color)
        status.pack(pady=(0, 10))
        
        # Custom Progress Bar Styling
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("Yellow.Horizontal.TProgressbar", 
                        foreground=text_color, 
                        background=text_color, 
                        troughcolor='#374151', # gray-700
                        bordercolor=bg_color, 
                        lightcolor=text_color, 
                        darkcolor=text_color)
        
        self.progress = ttk.Progressbar(self.root, style="Yellow.Horizontal.TProgressbar", orient="horizontal", length=350, mode="determinate")
        self.progress.pack()
        
        # Start animation and background tasks
        self.angle = 0
        self.animate_spinner()
        threading.Thread(target=run_tasks, args=(self.update_text, self.update_progress, self.finish, self.handle_error), daemon=True).start()
        
    def animate_spinner(self):
        # Only animate if canvas is visible
        if not self.canvas.winfo_ismapped(): return
        
        self.canvas.delete("spinner")
        # Outer ring (rotates clockwise)
        self.canvas.create_arc(10, 10, 70, 70, start=self.angle, extent=100, outline="#FCD535", width=4, style=tk.ARC, tags="spinner")
        self.canvas.create_arc(10, 10, 70, 70, start=self.angle + 180, extent=100, outline="#FCD535", width=4, style=tk.ARC, tags="spinner")
        
        # Inner ring (rotates counter-clockwise)
        self.canvas.create_arc(22, 22, 58, 58, start=-self.angle * 1.5, extent=120, outline="#9CA3AF", width=3, style=tk.ARC, tags="spinner")
        self.canvas.create_arc(22, 22, 58, 58, start=-self.angle * 1.5 + 180, extent=120, outline="#9CA3AF", width=3, style=tk.ARC, tags="spinner")
        
        self.angle = (self.angle - 6) % 360
        self.root.after(30, self.animate_spinner) # ~30 fps
        
    def update_text(self, text):
        self.root.after(0, lambda: self.status_var.set(text))
        
    def update_progress(self, val):
        self.root.after(0, lambda: self.progress.configure(value=val))
        
    def finish(self):
        self.root.after(0, self.root.destroy)
        
    def handle_error(self, err_msg):
        self.root.after(0, lambda: self._show_error(err_msg))

    def _show_error(self, err_msg):
        self.status_var.set("SYSTEM FAILURE")
        self.progress.pack_forget()
        self.canvas.pack_forget()
        
        err_text = tk.Text(self.root, height=6, width=45, bg="#374151", fg="#FCA5A5", font=("Consolas", 9), wrap="word")
        err_text.insert("1.0", f"CRITICAL ERROR ENCOUNTERED:\n{err_msg}")
        err_text.configure(state="disabled")
        err_text.pack(pady=5, padx=20)
        
        btn = tk.Button(self.root, text="CLOSE", command=self.root.destroy, bg="#EF4444", fg="white", font=("Arial", 10, "bold"), relief="flat")
        btn.pack(pady=10)
        
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    SplashLauncher().run()
