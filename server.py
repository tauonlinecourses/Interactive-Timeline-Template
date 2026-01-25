#!/usr/bin/env python3
"""
Simple HTTP server to run the timeline locally.
This solves CORS issues when opening HTML files directly.

Usage:
    python server.py

Then open: http://localhost:8888/index.html
Or from your phone: http://YOUR_LOCAL_IP:8888/index.html
"""

import http.server
import socketserver
import os
import socket

PORT = 8888

def get_local_ip():
    """Get the local IP address for network access."""
    try:
        # Connect to a remote address to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local file access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Bind to all interfaces (0.0.0.0) to allow network access
    with socketserver.TCPServer(("0.0.0.0", PORT), MyHTTPRequestHandler) as httpd:
        local_ip = get_local_ip()
        
        print("=" * 60)
        print(f"Server running on port {PORT}")
        print("=" * 60)
        print(f"Local access:  http://localhost:{PORT}/index.html")
        if local_ip:
            print(f"Mobile access: http://{local_ip}:{PORT}/index.html")
            print(f"\nOn your phone, open: http://{local_ip}:{PORT}/index.html")
        else:
            print("Could not determine local IP address.")
            print("Make sure your phone is on the same Wi-Fi network.")
        print("=" * 60)
        print("Press Ctrl+C to stop the server")
        print()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

